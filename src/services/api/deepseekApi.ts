import { DecisionResponse, FeedbackResponse } from '../../models/interview';
import { ENV } from '../../utils/env';

export async function classifyTechnicalRole(jdText: string): Promise<boolean> {
  try {
    const response = await fetch(ENV.CHAT_API_URL(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ENV.HUGGINGFACE_MODEL() || 'tgi',
        messages: [
          { role: 'system', content: 'You are a classifier. Answer with only "yes" or "no".' },
          { role: 'user', content: `Is this job description for a technical role that requires coding or software engineering skills?\n\n${jdText.slice(0, 600)}\n\nAnswer yes or no.` },
        ],
        stream: false,
        temperature: 0.1,
        max_tokens: 200,
      }),
    });
    if (!response.ok) return false;
    const text = await response.text();
    const lines = text.split('\n');
    const jsonLine = lines.find(l => { const t = l.trim(); return t.startsWith('{') && !t.includes('statusCode'); }) || text;
    const data = JSON.parse(jsonLine.trim());
    const content = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();
    // If model returns empty content, assume technical (safe default — shows OCR choice which user can skip)
    if (!content) return true;
    return content.includes('yes');
  } catch {
    // On any error, assume technical so we don't silently skip the OCR choice
    return true;
  }
}

const CHAT_API_URL = ENV.CHAT_API_URL();

async function* streamResponse(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";
  let metadataSkipped = false;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        const trimmedLine = line.trim();
        if (!trimmedLine) continue;

        if (!metadataSkipped && trimmedLine.startsWith("{")) {
          try {
            const parsed = JSON.parse(trimmedLine);
            if (parsed.statusCode !== undefined) {
              metadataSkipped = true;
              continue;
            }
          } catch {
          }
        }

        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6).trim();
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              metadataSkipped = true;
              yield content;
            }
          } catch {
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export async function makeDecision(
  systemMessage: string,
  humanMessage: string
): Promise<DecisionResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ENV.HUGGINGFACE_MODEL() || 'tgi',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: humanMessage,
        },
      ],
      stream: false,
      temperature: 0.1,
      max_tokens: 10,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const responseText = await response.text();
  let data;
  try {
    const lines = responseText.split('\n');
    const jsonLine = lines.find(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('{') && !trimmed.includes('statusCode');
    }) || responseText;
    data = JSON.parse(jsonLine.trim());
  } catch (e) {
    try {
      data = JSON.parse(responseText);
    } catch (e2) {
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  }

  const content = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();

  // Parse plain text decision - just extract the decision word
  const validDecisions = ['followup', 'movenext', 'end', 'stop'];
  const decision = validDecisions.find(d => content.includes(d)) || 'movenext';

  return { decision: decision as 'followup' | 'movenext' | 'end' };
}

export async function* createQuestion(
  systemMessage: string,
  humanMessage: string
): AsyncGenerator<string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ENV.HUGGINGFACE_MODEL() || 'tgi',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: humanMessage,
        },
      ],
      stream: true,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  yield* streamResponse(response);
}

export async function createFeedback(
  systemMessage: string,
  humanMessage: string
): Promise<FeedbackResponse> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ENV.HUGGINGFACE_MODEL() || 'tgi',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: humanMessage,
        },
      ],
      response_format: { type: 'json_object' },
      stream: false,
      temperature: 0.3,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const responseText = await response.text();
  let data;
  try {
    const lines = responseText.split('\n');
    const jsonLine = lines.find(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('{') && !trimmed.includes('statusCode');
    }) || responseText;
    data = JSON.parse(jsonLine.trim());
  } catch (e) {
    try {
      data = JSON.parse(responseText);
    } catch (e2) {
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  }

  const content = data.choices?.[0]?.message?.content || '{}';

  // Safe JSON parse with error handling
  try {
    const result = JSON.parse(content);
    return {
      feedback: result.feedback || '',
      summary: result.summary || '',
      nextPhase: result.nextPhase,
      currentProjectComplete: result.currentProjectComplete,
      projectsMentioned: result.projectsMentioned,
    };
  } catch {
    return { feedback: '', summary: '' };
  }
}

export async function summarizeInterview(
  systemMessage: string,
  humanMessage: string
): Promise<{
  summary: string;
  score: number;
  conclusion: string;
  topStrengths?: Array<{ name: string; description: string }>;
  improvementAreas?: Array<{ name: string; description: string }>;
}> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const response = await fetch(CHAT_API_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model: ENV.HUGGINGFACE_MODEL() || 'tgi',
      messages: [
        {
          role: 'system',
          content: systemMessage,
        },
        {
          role: 'user',
          content: humanMessage,
        },
      ],
      response_format: { type: 'json_object' },
      stream: false,
      temperature: 0.5,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage = `HTTP ${response.status}`;
    try {
      const error = JSON.parse(errorText);
      errorMessage = error.error?.message || error.message || errorMessage;
    } catch {
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }

  const responseText = await response.text();

  let data;
  try {
    const lines = responseText.split('\n');
    const jsonLine = lines.find(line => {
      const trimmed = line.trim();
      return trimmed.startsWith('{') && !trimmed.includes('statusCode');
    }) || responseText;
    data = JSON.parse(jsonLine.trim());
  } catch (e) {
    try {
      data = JSON.parse(responseText);
    } catch (e2) {
      throw new Error(`Failed to parse response: ${responseText.substring(0, 200)}`);
    }
  }

  let content = data.choices?.[0]?.message?.content || '{}';

  if (!content || typeof content !== 'string') {
    content = String(content || '{}');
  }

  content = content.trim();

  // Handle case where content might already be a JSON string (OpenAI format)
  // Try parsing directly first if it looks like JSON
  if (content && (content.startsWith('{') || content.startsWith('[')) && !content.startsWith('```')) {
    console.log('[summarizeInterview] Attempting direct JSON parse (OpenAI format)');
    try {
      const directParse = JSON.parse(content) as {
        summary?: string;
        conclusion?: string;
        score?: number;
        topStrengths?: Array<{ name: string; description: string }>;
        improvementAreas?: Array<{ name: string; description: string }>;
      };
      console.log('[summarizeInterview] Direct parse successful:', {
        hasSummary: directParse.summary !== undefined,
        hasConclusion: directParse.conclusion !== undefined,
        hasTopStrengths: Array.isArray(directParse.topStrengths),
        hasImprovementAreas: Array.isArray(directParse.improvementAreas),
        summaryLength: directParse.summary?.length || 0,
        conclusionLength: directParse.conclusion?.length || 0
      });

      // Check if it has the expected structure (summary or conclusion, or topStrengths/improvementAreas)
      if (directParse && (
        directParse.summary !== undefined ||
        directParse.conclusion !== undefined ||
        Array.isArray(directParse.topStrengths) ||
        Array.isArray(directParse.improvementAreas)
      )) {
        console.log('[summarizeInterview] Direct parse validation passed, returning result');
        return {
          summary: directParse.summary || '',
          score: typeof directParse.score === 'number' ? directParse.score : 0,
          conclusion: directParse.conclusion || '',
          topStrengths: Array.isArray(directParse.topStrengths) ? directParse.topStrengths : [],
          improvementAreas: Array.isArray(directParse.improvementAreas) ? directParse.improvementAreas : [],
        };
      } else {
        console.log('[summarizeInterview] Direct parse validation failed, trying markdown removal');
      }
    } catch (parseError) {
      // Not valid JSON, continue with markdown removal
      console.log('[summarizeInterview] Direct parse failed, trying markdown removal:', parseError);
    }
  } else {
    console.log('[summarizeInterview] Content does not look like direct JSON, trying markdown removal');
  }

  // Remove markdown code blocks (handles ```json or ``` with optional newlines)
  // Pattern: matches ```json or ``` at start, optional whitespace/newline, then content, then closing ```
  console.log('[summarizeInterview] Attempting markdown removal');
  const codeBlockPattern = /^```(?:json)?\s*\n?([\s\S]*?)\n?\s*```\s*$/i;
  const match = content.match(codeBlockPattern);
  if (match) {
    console.log('[summarizeInterview] Found markdown code block match');
    content = match[1].trim();
  } else {
    // Fallback: try simpler patterns
    if (content.startsWith('```json')) {
      console.log('[summarizeInterview] Using simple json block removal');
      content = content.replace(/^```json\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
    } else if (content.startsWith('```')) {
      console.log('[summarizeInterview] Using simple code block removal');
      content = content.replace(/^```\s*\n?/i, '').replace(/\n?\s*```\s*$/i, '');
    } else {
      console.log('[summarizeInterview] No markdown blocks found, using content as-is');
    }
  }

  content = content.trim();
  console.log('[summarizeInterview] After markdown removal, content length:', content.length);
  console.log('[summarizeInterview] Content preview (first 200 chars):', content.substring(0, 200));

  // Safe JSON parse with error handling
  try {
    console.log('[summarizeInterview] Attempting final JSON parse');
    const result = JSON.parse(content);
    console.log('[summarizeInterview] Final parse successful:', {
      hasSummary: result.summary !== undefined,
      hasConclusion: result.conclusion !== undefined,
      hasTopStrengths: Array.isArray(result.topStrengths),
      hasImprovementAreas: Array.isArray(result.improvementAreas)
    });

    // Validate that we have a valid result object
    if (!result || typeof result !== 'object') {
      console.error('[summarizeInterview] Invalid result object:', result);
      throw new Error('Invalid result object');
    }

    // More lenient validation - accept if we have any of the expected fields
    const hasValidData = result.summary !== undefined ||
      result.conclusion !== undefined ||
      Array.isArray(result.topStrengths) ||
      Array.isArray(result.improvementAreas);

    console.log('[summarizeInterview] Validation check:', {
      hasValidData,
      summary: result.summary !== undefined,
      conclusion: result.conclusion !== undefined,
      topStrengths: Array.isArray(result.topStrengths),
      improvementAreas: Array.isArray(result.improvementAreas)
    });

    if (!hasValidData) {
      console.error('[summarizeInterview] Missing required fields in response');
      throw new Error('Missing required fields in response');
    }

    const finalResult = {
      summary: result.summary || '',
      score: typeof result.score === 'number' ? result.score : 0,
      conclusion: result.conclusion || '',
      topStrengths: Array.isArray(result.topStrengths) ? result.topStrengths : [],
      improvementAreas: Array.isArray(result.improvementAreas) ? result.improvementAreas : [],
    };

    console.log('[summarizeInterview] Returning final result:', {
      summaryLength: finalResult.summary.length,
      conclusionLength: finalResult.conclusion.length,
      topStrengthsCount: finalResult.topStrengths.length,
      improvementAreasCount: finalResult.improvementAreas.length
    });

    return finalResult;
  } catch (parseError) {
    console.error('Failed to parse summarize response:', parseError);
    console.error('Raw content:', content);
    console.error('Content length:', content.length);
    console.error('Content preview:', content.substring(0, 200));
    console.error('Full response data:', JSON.stringify(data, null, 2));

    // Try to extract JSON from text if it's embedded
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const extractedJson = JSON.parse(jsonMatch[0]);
        if (extractedJson && typeof extractedJson === 'object') {
          return {
            summary: extractedJson.summary || '',
            score: typeof extractedJson.score === 'number' ? extractedJson.score : 0,
            conclusion: extractedJson.conclusion || '',
            topStrengths: Array.isArray(extractedJson.topStrengths) ? extractedJson.topStrengths : [],
            improvementAreas: Array.isArray(extractedJson.improvementAreas) ? extractedJson.improvementAreas : [],
          };
        }
      }
    } catch (extractError) {
      console.error('Failed to extract JSON from content:', extractError);
    }

    // Return default values on parse failure
    return {
      summary: 'Unable to generate summary due to an error.',
      score: 0,
      conclusion: 'Interview completed but summary generation failed.',
      topStrengths: [],
      improvementAreas: [],
    };
  }
}

