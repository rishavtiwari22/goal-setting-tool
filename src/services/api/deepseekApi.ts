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
  const content = data.choices?.[0]?.message?.content || "";

  return parseDecisionResponse(content);
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
      stream: false,
      temperature: 0.7,
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
  const content = data.choices?.[0]?.message?.content || "";

  return parseFeedbackResponse(content);
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
  const content = data.choices?.[0]?.message?.content || "";

  return parseSummaryResponse(content);
}

function parseDecisionResponse(content: string): DecisionResponse {
  const decisionMatch = content.match(/DECISION:\s*(\w+)/i);
  const reasonMatch = content.match(/REASON:\s*([^\n]+)/i);

  const decisionStr = (decisionMatch?.[1] || 'movenext').toLowerCase();
  const decision = (decisionStr === 'followup' || decisionStr === 'end') 
    ? decisionStr as 'followup' | 'end'
    : 'movenext' as 'movenext';

  return {
    decision,
    reason: reasonMatch?.[1]?.trim() || '',
  };
}

function parseFeedbackResponse(content: string): FeedbackResponse {
  const feedbackMatch = content.match(/FEEDBACK:\s*([\s\S]*?)(?=SUMMARY:|NEXT_PHASE:|$)/i);
  const summaryMatch = content.match(/SUMMARY:\s*([\s\S]*?)(?=NEXT_PHASE:|$)/i);
  const nextPhaseMatch = content.match(/NEXT_PHASE:\s*(\w+)/i);

  const nextPhase = nextPhaseMatch?.[1]?.toLowerCase();
  const validPhase = (nextPhase === 'introduction' || nextPhase === 'project' || nextPhase === 'technical') 
    ? nextPhase as 'introduction' | 'project' | 'technical'
    : undefined;

  return {
    feedback: feedbackMatch?.[1]?.trim() || '',
    summary: summaryMatch?.[1]?.trim() || '',
    nextPhase: validPhase,
  };
}

function parseSummaryResponse(content: string): { summary: string; score: number; conclusion: string } {
  const scoreMatch = content.match(/(?:score|评分)[:\s]*(\d+(?:\.\d+)?)/i);
  const score = scoreMatch ? parseFloat(scoreMatch[1]) : 0;

  const summaryMatch = content.match(/(?:summary|总结)[:\s]*([\s\S]*?)(?=(?:conclusion|结论|score|评分)|$)/i);
  const conclusionMatch = content.match(/(?:conclusion|结论)[:\s]*([\s\S]*?)$/i);

  return {
    summary: summaryMatch?.[1]?.trim() || content,
    score: Math.round(score * 10) / 10,
    conclusion: conclusionMatch?.[1]?.trim() || summaryMatch?.[1]?.trim() || content,
  };
}
