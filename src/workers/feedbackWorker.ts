import { createFeedback } from '../services/api/deepseekApi';
import { buildCreateFeedbackPrompt } from '../services/interview/promptBuilder';
import type { QAHistoryItem, InterviewPhase } from '../models/interview';

self.onmessage = async (event: MessageEvent) => {
  const { jobTitle, knowledgePoints, qaHistory, summary, currentPhase } = event.data as {
    jobTitle: string;
    knowledgePoints: string[];
    qaHistory: QAHistoryItem[];
    summary?: string;
    currentPhase: InterviewPhase;
  };

  try {
    const { systemMessage, humanMessage } = buildCreateFeedbackPrompt({
      jobTitle,
      knowledgePoints,
      qaHistory,
      summary,
      currentPhase,
    });

    const feedbackResult = await createFeedback(systemMessage, humanMessage);

    self.postMessage({
      success: true,
      feedback: feedbackResult.feedback,
      summary: feedbackResult.summary,
      nextPhase: feedbackResult.nextPhase,
    });
  } catch (error) {
    self.postMessage({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
