export type InterviewPhase = 'introduction' | 'project' | 'technical';

export interface QAHistoryItem {
  question: string;
  answer: string;
  score: number;
  isCorrect: boolean;
  timestamp: string;
  questionId?: string;
}

export interface InterviewSession {
  sessionId: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  startTime: string;
  endTime?: string;
  qaHistory: QAHistoryItem[];
  currentPhase: InterviewPhase;
  remainingTime: number;
  interviewTime: number;
  language: string;
  difficulty: string;
  examinationPoints: string[];
  result?: InterviewResult;
}

export interface InterviewResult {
  summary: string;
  score: number;
  conclusion: string;
  totalQuestions: number;
  correctAnswers: number;
  elapsedTime: number;
}

export interface AnalyzeAnswerResponse {
  decision: 'FOLLOW_UP_NEEDED' | 'MOVE_TO_NEXT' | 'END_INTERVIEW';
  reason: string;
  feedback: string;
  score: number;
  isCorrect: boolean;
  userGivingUp: boolean;
}
