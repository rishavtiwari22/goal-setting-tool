export type InterviewPhase = 'introduction' | 'project' | 'technical';
export type InterviewMode = 'practice' | 'mentor';
export type MentorProfile = 'communication' | 'socratic';

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
  userFeedback?: {
    questionRelevance: number;
    referralLikelihood: number;
    submittedAt: string;
  };

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
  mode?: InterviewMode;                      // Session mode: 'practice' or 'mentor'
  mentorProfile?: MentorProfile;             // Mentor persona: communication or socratic

  // Mentor-mode only: topics the mentor parked silently during the session.
  // Sourced from [PARKED: ...] markers in raw assistant responses (stripped
  // from display + TTS). Used by the post-session evaluator to compile a
  // "topics to study" list, framed positively to the candidate.
  parkedTopics?: string[];
}

export interface InterviewResult {
  summary: string;
  score: number;
  conclusion: string;
  totalQuestions: number;
  correctAnswers: number;
  elapsedTime: number;
  topStrengths?: Array<{ name: string; description: string }>;
  improvementAreas?: Array<{ name: string; description: string }>;
  // Mentor-mode only: derived from parked topics + answer-quality patterns,
  // framed as "things to study to ace your next interview" — never as a
  // failure list.
  topicsToStudy?: Array<{ name: string; description: string }>;
}

// export interface AnalyzeAnswerResponse {
//   decision: 'FOLLOW_UP_NEEDED' | 'MOVE_TO_NEXT' | 'END_INTERVIEW';
//   reason: string;
//   feedback: string;
//   score: number;
//   isCorrect: boolean;
//   userGivingUp: boolean;
// }

export interface DecisionResponse {
  decision: 'followup' | 'movenext' | 'end' | 'retry' | 'stop';
  feedback?: string;  // Optional feedback message (e.g., thank you when user ends call)
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
