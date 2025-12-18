export type InterviewPhase = 'introduction' | 'project' | 'technical';

export interface QAHistoryItem {
  question: string;
  answer: string;
  score: number;
  isCorrect: boolean;
  timestamp: string;
  questionId?: string;
}

export type InterviewStatus = 'ongoing' | 'completed';

// Track discussed projects for dynamic phase transitions
export interface ProjectInfo {
  name: string;
  role?: string;
  technologies: string[];
  discussedInPhases: InterviewPhase[];
  technicalQuestionsAsked: string[];
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
  status: InterviewStatus;
  upcomingQuestions?: string[];
  feedbackHistory?: string[];
  summary?: string;

  // Phase 2: Irrelevant answer tracking
  consecutiveIrrelevantCount: number;       // Track consecutive irrelevant answers
  currentTopicFollowupCount: number;        // Track follow-ups for current topic

  // Phase 3: Dynamic phase transitions
  discussedProjects: ProjectInfo[];         // Track projects discussed
  currentProjectIndex: number;              // Which project we're currently discussing

  // Phase question tracking - for minimum questions per phase
  introductionQuestionCount: number;        // Questions asked in introduction phase
  projectQuestionCount: number;             // Questions asked in project phase
  technicalQuestionCount: number;           // Questions asked in technical phase
  currentProjectQuestionCount: number;      // Technical questions on current project (reset on new project)
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

export interface DecisionResponse {
  decision: 'followup' | 'movenext' | 'end';
}

export interface QuestionResponse {
  question: string;
  phase: InterviewPhase;
}

export interface FeedbackResponse {
  feedback: string;
  summary: string;
  nextPhase?: 'introduction' | 'project' | 'technical';
  currentProjectComplete?: boolean;     // Phase 3: Is current project discussion complete
  projectsMentioned?: string[];         // Phase 3: Projects mentioned in this Q&A
}
