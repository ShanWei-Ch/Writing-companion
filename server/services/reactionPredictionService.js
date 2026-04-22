/**
 * Recipient Reaction Prediction Service
 * Analyzes message for recipient reaction prediction and communication effectiveness
 */

/**
 * Analyze message for reaction prediction and effectiveness score
 * @param {string} message - The full message text
 * @param {string} context - Communication context (work, relationship, personal, other)
 * @param {string} recipient - Recipient type (boss, partner, friend, customer, family, other)
 * @returns {Promise<object>} - Prediction results with effectiveness scores
 */
async function predictReaction(message, context, recipient) {
  try {
    if (!message || typeof message !== 'string') {
      return getDefaultPrediction();
    }

    const prompt = `You are an expert in communication analysis and psychology. Analyze the following message and provide a detailed reaction prediction.

Message context:
- Situation: ${context || 'general'}
- Recipient type: ${recipient || 'general'}

Message:
"""${message}"""

Provide analysis in this exact JSON format (respond with ONLY valid JSON, no explanation):
{
  "likelyReaction": "positive|neutral|defensive|negative",
  "reactionExplanation": "1-2 sentences explaining why they might react this way",
  "effectivenessScores": {
    "clarity": number between 0-100,
    "empathy": number between 0-100,
    "actionability": number between 0-100
  },
  "clarityDetails": "specific feedback on how clear the message is",
  "empathyDetails": "specific feedback on empathy shown in the message",
  "actionabilityDetails": "specific feedback on whether the message prompts action",
  "recipientSpecificTips": "1-2 specific tips for this recipient type (${recipient})",
  "riskLevel": "low|medium|high",
  "riskFactors": ["array of specific risk factors identified, if any"]
}`;

    const response = await fetch('http://localhost:11434/api/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama2',
        prompt,
        stream: false
      })
    });

    if (!response.ok) {
      console.error('Ollama error:', response.status);
      return getDefaultPrediction();
    }

    const data = await response.json();
    const responseText = data.response?.trim() || '';

    if (!responseText) {
      return getDefaultPrediction();
    }

    // Try to parse the JSON response
    try {
      const result = JSON.parse(responseText);
      return {
        success: true,
        ...result,
        // Ensure scores are valid numbers
        effectivenessScores: {
          clarity: Math.max(0, Math.min(100, parseInt(result.effectivenessScores?.clarity) || 50)),
          empathy: Math.max(0, Math.min(100, parseInt(result.effectivenessScores?.empathy) || 50)),
          actionability: Math.max(0, Math.min(100, parseInt(result.effectivenessScores?.actionability) || 50))
        }
      };
    } catch (parseError) {
      console.error('Failed to parse LLM response:', parseError);
      return getDefaultPrediction();
    }
  } catch (error) {
    console.error('Error predicting reaction:', error);
    return getDefaultPrediction();
  }
}

function clampScore(value) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function predictReactionFromLocalTone(localTone, context, recipient) {
  if (!localTone) {
    return getDefaultPrediction();
  }

  const dimensions = localTone.dimensions || {};
  const riskScore = Number(localTone.riskScore) || 0;
  const topRisks = Array.isArray(localTone.topRisks) ? localTone.topRisks : [];
  const riskFactors = topRisks.map(risk => risk.replace(/_/g, ' '));

  let likelyReaction = 'positive';
  if (riskScore >= 70) {
    likelyReaction = 'negative';
  } else if (riskScore >= 45) {
    likelyReaction = 'defensive';
  } else if (riskScore >= 25) {
    likelyReaction = 'neutral';
  }

  const clarity = clampScore((dimensions.clarity ?? 0.72) * 100);
  const empathy = clampScore((((dimensions.warmth ?? 0.58) + (dimensions.respect ?? 0.72)) / 2) * 100);
  const actionability = clampScore((1 - Math.abs((dimensions.directness ?? 0.35) - 0.5)) * 100);

  const riskLevel = riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
  const recipientLabel = recipient || 'recipient';
  const contextLabel = context ? context.replace(/_/g, ' ') : 'general';

  return {
    success: true,
    source: 'local_tone',
    likelyReaction,
    reactionExplanation: riskScore >= 45
      ? `The message may feel harder to receive because ${riskFactors[0] || 'the tone has some friction'} stands out for this ${contextLabel} context.`
      : `The message is likely to be received steadily because the main tone risk is ${localTone.riskLevel || 'low'}.`,
    effectivenessScores: {
      clarity,
      empathy,
      actionability
    },
    clarityDetails: clarity >= 70 ? 'The main point is reasonably clear.' : 'Clarify the main point and the next step.',
    empathyDetails: empathy >= 70 ? 'The tone shows enough warmth and respect.' : 'Add more acknowledgment or soften the wording.',
    actionabilityDetails: actionability >= 70 ? 'The recipient can infer the requested direction.' : 'Make the requested next step more explicit.',
    recipientSpecificTips: `For this ${recipientLabel}, keep the wording specific, respectful, and easy to answer.`,
    riskLevel,
    riskFactors
  };
}

/**
 * Get default prediction when analysis fails
 */
function getDefaultPrediction() {
  return {
    success: true,
    likelyReaction: 'neutral',
    reactionExplanation: 'Unable to fully analyze. Please review the message manually.',
    effectivenessScores: {
      clarity: 50,
      empathy: 50,
      actionability: 50
    },
    clarityDetails: 'Consider making your main point clearer',
    empathyDetails: 'Consider acknowledging the recipient\'s perspective',
    actionabilityDetails: 'Ensure the recipient knows what action you\'re requesting',
    recipientSpecificTips: 'Tailor the message tone to your recipient type',
    riskLevel: 'medium',
    riskFactors: []
  };
}

module.exports = {
  predictReaction,
  predictReactionFromLocalTone
};
