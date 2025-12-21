import { DecisionResponse, FeedbackResponse } from '../../models/interview';
import { ENV } from '../../utils/env';

const HUGGINGFACE_API_URL = ENV.HUGGINGFACE_API_URL();
const HUGGINGFACE_API_KEY = ENV.HUGGINGFACE_API_KEY();

async function* streamResponse(response: Response): AsyncGenerator<string> {
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Response body is not readable");

  const decoder = new TextDecoder();
  let buffer = "";

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

        if (trimmedLine.startsWith("data: ")) {
          const data = trimmedLine.slice(6).trim();
          if (data === "[DONE]") {
            return;
          }
          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            if (content) {
              yield content;
            }
          } catch (e) {
            console.error("Failed to parse SSE data:", e, "Data:", data);
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
  
  if (HUGGINGFACE_API_KEY) {
    headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
  }

  const response = await fetch(HUGGINGFACE_API_URL, {
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

  const data = await response.json();
  const content = (data.choices?.[0]?.message?.content || '').trim().toLowerCase();

  // Parse plain text decision - just extract the decision word
  const validDecisions = ['followup', 'movenext', 'end'];
  const decision = validDecisions.find(d => content.includes(d)) || 'movenext';

  return { decision: decision as 'followup' | 'movenext' | 'end' };
}

export async function* createQuestion(
  systemMessage: string,
  humanMessage: string
): AsyncGenerator<string> {
  console.log('Creating question...');
  console.log('System message:', systemMessage);
  console.log('Human message:', humanMessage);
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (HUGGINGFACE_API_KEY) {
    headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
  }

  const response = await fetch(HUGGINGFACE_API_URL, {
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
  
  if (HUGGINGFACE_API_KEY) {
    headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
  }

  const response = await fetch(HUGGINGFACE_API_URL, {
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

  const data = await response.json();
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
  } catch (parseError) {
    console.error('Failed to parse feedback response:', parseError, 'Content:', content);
    // Return empty feedback on parse failure
    return { feedback: '', summary: '' };
  }
}

export async function summarizeInterview(
  systemMessage: string,
  humanMessage: string
): Promise<{ summary: string; score: number; conclusion: string }> {
  console.log('Summarizing interview...');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  
  if (HUGGINGFACE_API_KEY) {
    headers['Authorization'] = `Bearer ${HUGGINGFACE_API_KEY}`;
  }

  const response = await fetch(HUGGINGFACE_API_URL, {
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

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '{}';

  // Safe JSON parse with error handling
  try {
    const result = JSON.parse(content);
    return {
      summary: result.summary || '',
      score: result.score || 0,
      conclusion: result.conclusion || '',
    };
  } catch (parseError) {
    console.error('Failed to parse summarize response:', parseError, 'Content:', content);
    // Return default values on parse failure
    return {
      summary: 'Unable to generate summary due to an error.',
      score: 0,
      conclusion: 'Interview completed but summary generation failed.',
    };
  }
}

