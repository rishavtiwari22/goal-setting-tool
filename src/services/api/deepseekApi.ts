import { DecisionResponse, FeedbackResponse } from '../../models/interview';
import { ENV } from '../../utils/env';

const DEEPSEEK_API_URL = ENV.DEEPSEEK_API_URL();
const DEEPSEEK_API_KEY = ENV.DEEPSEEK_API_KEY();

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
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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
      response_format: { type: 'json_object' },  // ✅ Use JSON mode
      stream: false,
      temperature: 0.1,
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

  // Direct JSON parse - no manual parsing needed
  const result = JSON.parse(content);

  return {
    decision: result.decision || 'movenext',
  };
}

export async function* createQuestion(
  systemMessage: string,
  humanMessage: string
): AsyncGenerator<string> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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
      response_format: { type: 'json_object' },  // ✅ Use JSON mode
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

  // Direct JSON parse
  const result = JSON.parse(content);

  return {
    feedback: result.feedback || '',
    summary: result.summary || '',
    nextPhase: result.nextPhase,
  };
}

export async function summarizeInterview(
  systemMessage: string,
  humanMessage: string
): Promise<{ summary: string; score: number; conclusion: string }> {
  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
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
      response_format: { type: 'json_object' },  // ✅ Use JSON mode
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

  // Direct JSON parse
  const result = JSON.parse(content);

  return {
    summary: result.summary || '',
    score: result.score || 0,
    conclusion: result.conclusion || '',
  };
}

