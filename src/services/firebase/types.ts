import { InterviewSession, InterviewResult, QAHistoryItem, InterviewPhase } from '../../models/interview';

export interface FirestoreUser {
  email: string;
  name?: string;
  createdAt: string;
  lastActiveAt: string;
  totalInterviews?: number;
  metadata?: Record<string, any>;
}

export interface FirestoreSession {
  sessionId: string;
  userId: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  startTime: string;
  endTime?: string;
  currentPhase: InterviewPhase;
  remainingTime: number;
  interviewTime: number;
  language: string;
  difficulty: string;
  examinationPoints: string[];
  result?: InterviewResult;
  status: 'ongoing' | 'completed';
  upcomingQuestions?: string[];
  feedbackHistory?: string[];
  summary?: string;
  consecutiveIrrelevantCount: number;
  currentTopicFollowupCount: number;
  discussedProjects: Array<{
    name: string;
    role?: string;
    technologies: string[];
    discussedInPhases: InterviewPhase[];
    technicalQuestionsAsked: string[];
  }>;
  currentProjectIndex: number;
  introductionQuestionCount: number;
  projectQuestionCount: number;
  technicalQuestionCount: number;
  currentProjectQuestionCount: number;
}

export interface FirestoreQAItem {
  question: string;
  answer: string;
  score: number;
  isCorrect: boolean;
  timestamp: string;
  questionId?: string;
  phase: InterviewPhase;
}

export interface FirestoreFeedbackItem {
  feedback: string;
  summary: string;
  phase: InterviewPhase;
  timestamp: string;
  nextPhase?: InterviewPhase;
}

export interface SyncStatus {
  sessionId: string;
  lastSyncedAt: string;
  pendingWrites: number;
  failedWrites: number;
  syncInProgress: boolean;
  fieldSyncStatus: Record<string, boolean>;
}

export interface WriteQueueItem {
  sessionId: string;
  operation: 'session' | 'qaItem' | 'feedback' | 'user';
  data: any;
  timestamp: number;
  priority: 'critical' | 'normal';
  retryCount?: number;
}

export type WriteOperation = WriteQueueItem;

