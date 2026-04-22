/**
 * AnalysisService - Handles text analysis and emotional feedback
 * Currently uses basic keyword matching and rules
 * Future: will integrate LLM for more intelligent analysis
 */

const {
  getSentences,
  hasExcessiveCaps,
  countExclamations,
  countConsecutivePeriods
} = require('../utils/textProcessing');

const NEGATIVE_WORDS = [
  'hate', 'terrible', 'awful', 'horrible', 'disgusting', 'worst',
  'sad', 'angry', 'frustrated', 'disappointed', 'devastated', 'miserable',
  'bad', 'wrong', 'fail', 'useless', 'pathetic', 'annoyed', 'upset'
];

const POSITIVE_WORDS = [
  'great', 'wonderful', 'amazing', 'excellent', 'fantastic', 'love',
  'happy', 'glad', 'appreciate', 'grateful', 'proud', 'beautiful',
  'awesome', 'brilliant', 'cool', 'thanks', 'thank you'
];

const CONFLICT_RULES = [
  {
    category: 'accusatory',
    pattern: /\byou\s+(always|never)\b/gi,
    severity: 0.82,
    confidence: 0.78,
    dimension: 'blame',
    explanation: 'Absolute language aimed at the recipient can sound like repeated blame.',
    suggestion: 'Name the specific situation and use an "I noticed..." statement.'
  },
  {
    category: 'demanding',
    pattern: /\b(you must|you have to|you need to|no choice|that'?s final)\b/gi,
    severity: 0.72,
    confidence: 0.76,
    dimension: 'directness',
    explanation: 'Commanding language can make the recipient feel controlled.',
    suggestion: 'Turn the demand into a clear request with room for response.'
  },
  {
    category: 'dismissive',
    pattern: /\b(whatever|i don'?t care|fine|nevermind|forget it|just drop it)\b/gi,
    severity: 0.68,
    confidence: 0.72,
    dimension: 'warmth',
    explanation: 'Dismissive wording can make the other person feel unheard.',
    suggestion: 'Say what you actually need or feel instead of shutting the exchange down.'
  },
  {
    category: 'insulting',
    pattern: /\b(stupid|idiot|dumb|crazy|insane|pathetic|useless|loser)\b/gi,
    severity: 0.9,
    confidence: 0.82,
    dimension: 'respect',
    explanation: 'Insults or harsh labels can escalate conflict quickly.',
    suggestion: 'Focus on the behavior, problem, or impact rather than character.'
  },
  {
    category: 'blame',
    pattern: /\b(it'?s your fault|you caused this|because of you|you made me|your fault)\b/gi,
    severity: 0.86,
    confidence: 0.84,
    dimension: 'blame',
    explanation: 'Blame language makes problem solving harder.',
    suggestion: 'Describe the impact and the next step you want.'
  },
  {
    category: 'aggressive_tone',
    pattern: /\b(obviously|clearly|everyone knows|it'?s obvious|of course|duh)\b/gi,
    severity: 0.56,
    confidence: 0.68,
    dimension: 'respect',
    explanation: 'Condescending language can make the recipient feel talked down to.',
    suggestion: 'Frame this as your perspective instead of a universal fact.'
  }
];

const PROTECTIVE_RULES = [
  {
    category: 'appreciation',
    pattern: /\b(thank you|thanks|i appreciate|grateful|appreciate your)\b/gi,
    impact: 0.16
  },
  {
    category: 'softener',
    pattern: /\b(could you|would you|when you have a chance|if possible|i wonder if|would it be possible)\b/gi,
    impact: 0.14
  },
  {
    category: 'ownership',
    pattern: /\b(i feel|i noticed|i may be missing|from my perspective|i understand)\b/gi,
    impact: 0.12
  },
  {
    category: 'specific_request',
    pattern: /\b(can you|could you|would you|please|by tomorrow|today|next step|follow up)\b/gi,
    impact: 0.1
  }
];

const CONTEXT_WEIGHTS = {
  work: {
    boss: { demanding: 1.35, accusatory: 1.25, aggressive_tone: 1.25, insulting: 1.2 },
    colleague: { dismissive: 1.25, demanding: 1.15, blame: 1.2 }
  },
  relationship: {
    partner: { dismissive: 1.45, blame: 1.35, accusatory: 1.3 }
  },
  friend: {
    friend: { dismissive: 1.2, insulting: 1.15, blame: 1.1 }
  },
  customer_service: {
    customer: { blame: 1.45, aggressive_tone: 1.35, dismissive: 1.3, demanding: 1.2 }
  },
  family: {
    parent: { dismissive: 1.25, blame: 1.25, accusatory: 1.2, aggressive_tone: 1.15 },
    child: { insulting: 1.35, blame: 1.25, aggressive_tone: 1.2 }
  },
  other: {
    other: { blame: 1.1, dismissive: 1.1, demanding: 1.1 }
  }
};

const DIMENSION_BASELINES = {
  blame: { neutral: 0.15, concern: 'higher_is_riskier' },
  warmth: { neutral: 0.58, concern: 'lower_is_riskier' },
  respect: { neutral: 0.72, concern: 'lower_is_riskier' },
  clarity: { neutral: 0.72, concern: 'lower_is_riskier' },
  directness: { neutral: 0.35, concern: 'higher_is_riskier_when_too_high' },
  intensity: { neutral: 0.15, concern: 'higher_is_riskier' }
};

const PROMPT_SAFE_PATTERN = /[^a-zA-Z0-9_.,: /()-]/g;

function clamp(value, min = 0, max = 1) {
  return Math.min(max, Math.max(min, value));
}

function countWords(text) {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

function countWordHits(text, words) {
  const lowerText = text.toLowerCase();
  return words.reduce((count, word) => {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = lowerText.match(new RegExp(`\\b${escaped}\\b`, 'g'));
    return count + (matches ? matches.length : 0);
  }, 0);
}

function promptSafe(value) {
  return String(value)
    .replace(PROMPT_SAFE_PATTERN, '')
    .slice(0, 120);
}

function getContextWeight(context, recipient, category) {
  return CONTEXT_WEIGHTS[context]?.[recipient]?.[category] || 1;
}

function extractRuleMatches(text, rule) {
  const matches = [];
  const regex = new RegExp(rule.pattern.source, rule.pattern.flags);
  let match;

  while ((match = regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    const contextStart = Math.max(0, start - 30);
    const contextEnd = Math.min(text.length, end + 30);
    const phrase = text.slice(contextStart, contextEnd).trim();

    matches.push({
      text: phrase,
      matchedText: match[0],
      category: rule.category,
      severity: rule.severity,
      confidence: rule.confidence,
      dimension: rule.dimension,
      explanation: rule.explanation,
      suggestion: rule.suggestion,
      span: { start, end }
    });
  }

  return matches;
}

/**
 * Calculate sentiment score
 * @param {string} text - Input text
 * @returns {object} Sentiment analysis result
 */
function analyzeSentiment(text) {
  let negativeScore = countWordHits(text, NEGATIVE_WORDS) * 2;
  let positiveScore = countWordHits(text, POSITIVE_WORDS) * 2;

  const excessiveExclamations = countExclamations(text);
  const excessiveCaps = hasExcessiveCaps(text);
  const consecutivePeriods = countConsecutivePeriods(text);

  if (excessiveExclamations > 3) negativeScore += 1;
  if (excessiveCaps) negativeScore += 2;
  if (consecutivePeriods > 0) negativeScore += 1;

  const sentimentScore = ((positiveScore - negativeScore) / (positiveScore + negativeScore || 1)) * 100;
  const intensity = clamp((negativeScore + positiveScore + Math.min(excessiveExclamations, 6)) / 14);

  let sentiment = 'Neutral';
  if (sentimentScore > 20) {
    sentiment = 'Positive';
  } else if (sentimentScore < -20) {
    sentiment = 'Negative';
  }

  return {
    sentiment,
    score: Math.round(sentimentScore),
    positiveScore,
    negativeScore,
    polarity: Math.round(sentimentScore) / 100,
    intensity: Number(intensity.toFixed(2)),
    punctuationSignals: {
      exclamationCount: excessiveExclamations,
      excessiveCaps,
      consecutivePeriods
    }
  };
}

/**
 * Detect conflict phrases
 * @param {string} text - Input text
 * @returns {array} List of conflict phrases
 */
function detectConflictPhrases(text, context = 'general', recipient = 'general') {
  const signals = CONFLICT_RULES.flatMap(rule => {
    const weight = getContextWeight(context, recipient, rule.category);
    return extractRuleMatches(text, rule)
      .filter(signal => {
        const localContext = text
          .slice(signal.span.start, Math.min(text.length, signal.span.end + 24))
          .toLowerCase();

        if (rule.category === 'dismissive' && /^whatever$/i.test(signal.matchedText)) {
          return !/whatever\s+(works|is best|you prefer|best fits|makes sense)/i.test(localContext);
        }

        return true;
      })
      .map(signal => {
        const localContext = text
          .slice(signal.span.start, Math.min(text.length, signal.span.end + 18))
          .toLowerCase();
        const objectFocusedInsult = rule.category === 'insulting'
          && /\b(stupid|dumb|crazy|insane)\s+(bug|issue|problem|error|situation)\b/.test(localContext);

        return {
          ...signal,
          severity: Number(clamp(signal.severity * weight * (objectFocusedInsult ? 0.45 : 1)).toFixed(2)),
          confidence: Number(clamp(signal.confidence * (objectFocusedInsult ? 0.7 : 1)).toFixed(2)),
          contextWeight: weight
        };
      });
  });

  const uniqueSignals = [];
  const seen = new Set();

  signals.forEach(signal => {
    const key = `${signal.category}:${signal.matchedText.toLowerCase()}:${signal.span.start}`;
    if (!seen.has(key)) {
      seen.add(key);
      uniqueSignals.push(signal);
    }
  });

  return uniqueSignals
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 8);
}

function detectProtectiveSignals(text) {
  return PROTECTIVE_RULES.flatMap(rule => (
    extractRuleMatches(text, {
      ...rule,
      severity: rule.impact,
      confidence: 0.75,
      dimension: 'protective',
      explanation: `${rule.category} language lowers communication risk.`,
      suggestion: null
    }).map(signal => ({
      type: rule.category,
      text: signal.matchedText,
      impact: rule.impact,
      span: signal.span
    }))
  ));
}

function getRiskLevel(riskScore) {
  if (riskScore >= 75) return 'critical';
  if (riskScore >= 55) return 'high';
  if (riskScore >= 35) return 'medium';
  return 'low';
}

function getRecommendedStrategy(dimensions, conflictSignals) {
  const topSignal = conflictSignals[0]?.category;

  if (dimensions.blame >= 0.6 || topSignal === 'blame' || topSignal === 'accusatory') {
    return 'reduce_blame_add_specific_request';
  }
  if (dimensions.respect <= 0.45 || topSignal === 'insulting' || topSignal === 'aggressive_tone') {
    return 'restore_respect_focus_on_behavior';
  }
  if (dimensions.warmth <= 0.4 || topSignal === 'dismissive') {
    return 'add_warmth_and_state_real_need';
  }
  if (dimensions.directness >= 0.75 || topSignal === 'demanding') {
    return 'soften_command_into_request';
  }
  if (dimensions.clarity <= 0.45) {
    return 'clarify_main_point_and_next_step';
  }
  return 'preserve_tone_improve_clarity';
}

function analyzeLocalTone(text, context, recipient) {
  const sentiment = analyzeSentiment(text);
  const conflictSignals = detectConflictPhrases(text, context, recipient);
  const protectiveSignals = detectProtectiveSignals(text);
  const wordCount = countWords(text);
  const exclamationCount = countExclamations(text);
  const excessiveCaps = hasExcessiveCaps(text);
  const consecutivePeriods = countConsecutivePeriods(text);

  const maxSeverity = (categories) => {
    const severities = conflictSignals
      .filter(signal => categories.includes(signal.category))
      .map(signal => signal.severity);
    return severities.length ? Math.max(...severities) : 0;
  };

  const protectiveImpact = clamp(
    protectiveSignals.reduce((sum, signal) => sum + signal.impact, 0),
    0,
    0.35
  );

  const blame = clamp(maxSeverity(['accusatory', 'blame']) + Math.max(0, -sentiment.polarity) * 0.15);
  const respectRisk = clamp(maxSeverity(['insulting', 'aggressive_tone']) + (excessiveCaps ? 0.18 : 0));
  const dismissiveRisk = maxSeverity(['dismissive']);
  const demandingRisk = maxSeverity(['demanding']);
  const intensity = clamp(sentiment.intensity + Math.min(exclamationCount, 6) * 0.04 + (excessiveCaps ? 0.18 : 0));
  const directness = clamp(0.35 + demandingRisk * 0.45 + blame * 0.2);
  const warmth = clamp(0.58 + protectiveImpact - dismissiveRisk * 0.45 - Math.max(0, -sentiment.polarity) * 0.18);
  const respect = clamp(0.72 + protectiveImpact * 0.5 - respectRisk * 0.55 - blame * 0.16);
  const clarity = clamp(0.72 - (wordCount < 6 ? 0.18 : 0) - (wordCount > 70 ? 0.16 : 0) - (consecutivePeriods > 0 ? 0.08 : 0));

  let riskScore = 18;
  riskScore += conflictSignals.reduce((sum, signal) => sum + signal.severity * 28, 0);
  riskScore += Math.max(0, -sentiment.polarity) * 18;
  riskScore += intensity * 10;
  riskScore += excessiveCaps ? 8 : 0;
  riskScore += exclamationCount > 3 ? 6 : 0;
  riskScore -= protectiveImpact * 45;
  riskScore = Math.round(clamp(riskScore, 0, 100));

  const dimensions = {
    blame: Number(blame.toFixed(2)),
    warmth: Number(warmth.toFixed(2)),
    respect: Number(respect.toFixed(2)),
    clarity: Number(clarity.toFixed(2)),
    directness: Number(directness.toFixed(2)),
    intensity: Number(intensity.toFixed(2))
  };

  return {
    version: '2.0',
    riskScore,
    riskLevel: getRiskLevel(riskScore),
    dimensions,
    dimensionBaselines: DIMENSION_BASELINES,
    signals: conflictSignals,
    protectiveSignals,
    topRisks: [...new Set(conflictSignals.slice(0, 3).map(signal => signal.category))],
    recommendedStrategy: getRecommendedStrategy(dimensions, conflictSignals),
    sentiment
  };
}

/**
 * Generate rewriting suggestions
 * @param {string} text - Input text
 * @returns {array} List of rewriting suggestions
 */
function generateSuggestions(text, localTone = null) {
  const suggestions = [];
  const signals = localTone?.signals || detectConflictPhrases(text);
  const seen = new Set();

  signals.forEach(signal => {
    const key = signal.category;
    if (seen.has(key)) return;
    seen.add(key);

    suggestions.push({
      original: signal.matchedText || signal.text,
      improved: signal.suggestion,
      explanation: signal.explanation,
      category: signal.category,
      severity: signal.severity
    });
  });

  if (localTone?.dimensions?.clarity <= 0.45) {
    suggestions.push({
      original: 'Overall message structure',
      improved: 'State the main point and the next step more explicitly.',
      explanation: 'Clearer structure lowers the chance of confusion.',
      category: 'clarity',
      severity: 0.5
    });
  }

  return suggestions
    .filter(suggestion => suggestion.improved)
    .sort((a, b) => (b.severity || 0) - (a.severity || 0))
    .slice(0, 3);
}

/**
 * Predict how recipient might react to the message
 * @param {string} text - User input text
 * @param {object} sentimentData - Sentiment analysis result
 * @param {array} conflictPhrases - Detected conflict phrases
 * @returns {object} Reaction prediction with explanation
 */
function predictReaction(text, sentimentData, conflictPhrases, localTone = null) {
  let reactionScore = 50; // Start at neutral (0-100 scale)
  let reasons = [];

  // Factor 1: Sentiment score impact
  if (sentimentData.sentiment === 'Positive') {
    reactionScore += 15;
    reasons.push('Positive tone encourages receptiveness');
  } else if (sentimentData.sentiment === 'Negative') {
    reactionScore -= 20;
    reasons.push('Negative tone may trigger defensiveness');
  }

  // Factor 2: Conflict phrases impact
  const conflictCount = conflictPhrases.length;
  if (conflictCount >= 3) {
    reactionScore -= 25;
    reasons.push(`Multiple conflict signals (${conflictCount} phrases detected)`);
  } else if (conflictCount === 2) {
    reactionScore -= 15;
    reasons.push('Several problematic phrases detected');
  } else if (conflictCount === 1) {
    reactionScore -= 8;
    reasons.push('One concerning phrase found');
  } else if (conflictCount === 0) {
    reactionScore += 10;
    reasons.push('No obvious conflict signals');
  }

  // Factor 3: Punctuation patterns
  const exclamationCount = countExclamations(text);
  const hasExcessiveCapsFlag = hasExcessiveCaps(text);
  const consecutivePeriods = countConsecutivePeriods(text);

  if (hasExcessiveCapsFlag) {
    reactionScore -= 10;
    reasons.push('Excessive capitals may appear like shouting');
  }

  if (exclamationCount > 5) {
    reactionScore -= 8;
    reasons.push('Too many exclamation marks suggests agitation');
  }

  if (consecutivePeriods > 0) {
    reactionScore -= 5;
    reasons.push('Ellipsis suggests coldness or passive-aggressiveness');
  }

  if (localTone) {
    reactionScore -= Math.round(localTone.riskScore * 0.2);

    if (localTone.protectiveSignals.length > 0) {
      reactionScore += Math.min(10, localTone.protectiveSignals.length * 3);
      reasons.push('Polite or ownership language helps reduce risk');
    }

    if (localTone.topRisks.length > 0) {
      reasons.push(`Top local risk: ${localTone.topRisks.join(', ')}`);
    }
  }

  // Factor 4: Message length (very short messages often feel dismissive)
  const wordCount = text.split(/\s+/).length;
  if (wordCount < 10) {
    reactionScore -= 5;
    reasons.push('Very short message may feel dismissive');
  } else if (wordCount > 50) {
    reactionScore -= 3;
    reasons.push('Long message might overwhelm the recipient');
  } else {
    reactionScore += 5;
    reasons.push('Appropriate message length');
  }

  // Determine reaction type based on score
  let reaction = 'Neutral';
  let color = 'neutral';
  let emoji = '😐';

  if (reactionScore >= 70) {
    reaction = 'Very Receptive';
    color = 'positive';
    emoji = '😊';
  } else if (reactionScore >= 50) {
    reaction = 'Receptive';
    color = 'positive';
    emoji = '🙂';
  } else if (reactionScore >= 30) {
    reaction = 'Guarded';
    color = 'warning';
    emoji = '😕';
  } else if (reactionScore >= 10) {
    reaction = 'Defensive';
    color = 'negative';
    emoji = '😠';
  } else {
    reaction = 'Very Defensive';
    color = 'negative';
    emoji = '😡';
  }

  return {
    reaction,
    score: reactionScore,
    color,
    emoji,
    reasons
  };
}


/**
 * Main analysis function
 * @param {string} text - User input text
 * @returns {object} Complete analysis result
 */
function analyzeMessage(text, context, recipient) {
  const localTone = analyzeLocalTone(text, context, recipient);
  const sentimentData = localTone.sentiment;
  const conflictPhrases = localTone.signals;
  const suggestions = generateSuggestions(text, localTone);
  const reactionPrediction = predictReaction(text, sentimentData, conflictPhrases, localTone);

  return {
    sentimentScore: sentimentData.sentiment,
    sentimentDetails: sentimentData,
    conflictPhrases,
    suggestions,
    localTone,
    riskScore: localTone.riskScore,
    riskLevel: localTone.riskLevel,
    toneDimensions: localTone.dimensions,
    toneDimensionBaselines: localTone.dimensionBaselines,
    recommendedStrategy: localTone.recommendedStrategy,
    reactionPrediction,
    messageLength: text.length,
    wordCount: countWords(text),
    context,
    recipient
  };
}


// LLM (Ollama) 分析：呼叫本地 Ollama API，正確處理 NDJSON 串流
async function analyzeWithOllama(text, context, recipient, localTone = null) {
  try {
    const localGuidance = localTone
      ? `Local tone analysis:
- Risk level: ${promptSafe(localTone.riskLevel)} (${Number(localTone.riskScore) || 0}/100)
- Main risks: ${localTone.topRisks.length > 0 ? localTone.topRisks.map(promptSafe).join(', ') : 'none'}
- Tone dimensions: blame ${Number(localTone.dimensions.blame) || 0}, warmth ${Number(localTone.dimensions.warmth) || 0}, respect ${Number(localTone.dimensions.respect) || 0}, clarity ${Number(localTone.dimensions.clarity) || 0}, directness ${Number(localTone.dimensions.directness) || 0}, intensity ${Number(localTone.dimensions.intensity) || 0}
- Recommended strategy: ${promptSafe(localTone.recommendedStrategy)}

Use this local analysis as guidance, but only suggest edits for exact phrases that appear in the message.`
      : 'Local tone analysis unavailable.';

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt: `You are an email improvement assistant. Analyze this message and provide suggestions tailored to the context and recipient.

CRITICAL INSTRUCTION - FOLLOW EXACTLY:
1. Look at the message below
2. Find specific phrases or sentences IN THE MESSAGE that can be improved
3. Copy the exact phrase from the message for the "original" field
4. DO NOT create, paraphrase, or modify the original phrase
5. Only suggest on phrases that exist EXACTLY in the message
6. For each suggestion, identify if it's specifically relevant to ${context || 'general'} context

If you cannot find good phrases to improve in the message, return fewer suggestions (0-2).

Return ONLY this JSON structure:
{
  "sentiment": "Positive/Negative/Neutral",
  "conflictPhrases": ["phrase1", "phrase2"],
  "suggestions": [
    {
      "original": "EXACT phrase copied from message",
      "improved": "improved version",
      "explanation": "why better",
      "contextType": "${context || 'general'}"
    }
  ],
  "explanation": "brief summary"
}

Context: ${context || 'general'}
Recipient: ${recipient || 'general'}

${localGuidance}

MESSAGE TO ANALYZE:
"""${text}"""

REMEMBER: "original" field MUST be copied exactly from the message above. All suggestions must be contextually appropriate for ${recipient || 'recipient'} in a ${context || 'general'} setting.
Only return JSON. No other text.`
      })
    });
    if (!response.ok) {
      throw new Error(`Ollama HTTP error: ${response.status}`);
    }
    // 正確處理 NDJSON 串流
    let result = '';
    const decoder = new TextDecoder();
    const reader = response.body.getReader();
    let { value, done } = await reader.read();
    let buffer = '';
    while (!done) {
      buffer += decoder.decode(value, { stream: true });
      let lines = buffer.split('\n');
      buffer = lines.pop(); // incomplete line
      for (const line of lines) {
        if (line.trim()) {
          try {
            const json = JSON.parse(line);
            if (json.response) result += json.response;
          } catch (e) {
            // ignore
          }
        }
      }
      ({ value, done } = await reader.read());
    }
    // 處理最後殘留的 buffer
    if (buffer.trim()) {
      try {
        const json = JSON.parse(buffer);
        if (json.response) result += json.response;
      } catch (e) {
        // ignore
      }
    }
    // 嘗試將 LLM 回應解析為 JSON
    let llmResult = {};
    const trimmedResult = result.trim();
    
    console.log('LLM raw response (first 500 chars):', trimmedResult.substring(0, 500));
    
    try {
      // Strategy 1: 直接解析
      try {
        llmResult = JSON.parse(trimmedResult);
        console.log('✓ JSON parsed successfully (direct)');
      } catch (e1) {
        console.log('Direct parse failed, trying extraction...');
        
        // Strategy 2: 查找並提取 JSON 對象
        const startIdx = trimmedResult.indexOf('{');
        const endIdx = trimmedResult.lastIndexOf('}');
        
        if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
          const jsonStr = trimmedResult.substring(startIdx, endIdx + 1);
          console.log('Extracted JSON (first 300 chars):', jsonStr.substring(0, 300));
          
          try {
            llmResult = JSON.parse(jsonStr);
            console.log('✓ JSON parsed successfully (extracted)');
          } catch (e2) {
            console.log('Extracted JSON parse failed:', e2.message);
            throw e2;
          }
        } else {
          console.log(`Could not find JSON: startIdx=${startIdx}, endIdx=${endIdx}`);
          throw new Error('No JSON found in response');
        }
      }
      
      // === 關鍵步驟：驗證和過濾建議 ===
      // 只保留那些 original 文本實際存在於消息中的建議
      if (llmResult.suggestions && Array.isArray(llmResult.suggestions)) {
        const normalizedText = text.replace(/\s+/g, ' ').toLowerCase();
        const validSuggestions = [];
        
        for (const suggestion of llmResult.suggestions) {
          if (!suggestion.original || !suggestion.improved) {
            console.log('⚠️ Suggestion missing original or improved:', suggestion);
            continue;
          }
          
          const normalizedOriginal = suggestion.original.replace(/\s+/g, ' ').toLowerCase();
          
          // STRICT matching: original must exist exactly in the current message
          if (normalizedText.includes(normalizedOriginal)) {
            validSuggestions.push(suggestion);
            console.log('✓ Valid suggestion found:', suggestion.original.substring(0, 50) + '...');
          } else {
            console.log('❌ Invalid suggestion (original not in current text):', suggestion.original.substring(0, 80) + '...');
          }
        }
        
        llmResult.suggestions = validSuggestions;
        console.log(`👉 Filtered suggestions: ${validSuggestions.length} valid from LLM response`);
      }

      return llmResult;

    } catch (err) {
      console.error('Error parsing LLM response:', err);
      return { 
        explanation: 'Analysis completed with some issues. Please try again.',
        suggestions: [],
        sentiment: 'Neutral',
        conflictPhrases: []
      };
    }
  } catch (err) {
    return { explanation: 'Ollama LLM 呼叫失敗', error: err.message };
  }
}

module.exports = {
  analyzeMessage,
  analyzeWithOllama
};
