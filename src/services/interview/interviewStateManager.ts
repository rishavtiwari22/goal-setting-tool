import { InterviewConfig } from './interviewEngine';
import { InterviewSession, DecisionResponse, InterviewPhase } from '../../models/interview';
import { loadInterviewSessionBySessionId, saveInterviewSessionBySessionId } from '../storage/interviewStorage';
import { makeDecision, createQuestion as apiCreateQuestion, createFeedback as apiCreateFeedback, summarizeInterview } from '../api/deepseekApi';
import { buildDecisionPrompt, buildCreateQuestionPrompt, buildCreateFeedbackPrompt, buildSummarizePrompt } from './promptBuilder';

export class InterviewStateManager {
  private session: InterviewSession;
  private startTime: Date;
  private feedbackWorker: Worker | null = null;

  constructor(config: InterviewConfig, sessionId?: string) {
    if (sessionId) {
      const existingSession = loadInterviewSessionBySessionId(sessionId);
      if (existingSession && existingSession.status === 'ongoing') {
        this.session = existingSession;
        this.startTime = new Date(existingSession.startTime);
        this.checkAndRecoverFeedback();
      } else {
        this.initializeNewSession(config);
      }
    } else {
      this.initializeNewSession(config);
    }
  }

  private initializeNewSession(config: InterviewConfig): void {
    this.startTime = new Date();
    this.session = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: config.userId,
      jobId: config.jobId,
      jobTitle: config.jobTitle,
      jobDescription: config.jobDescription,
      startTime: this.startTime.toISOString(),
      qaHistory: [],
      feedbackHistory: [],
      currentPhase: 'introduction',
      remainingTime: config.interviewTime,
      interviewTime: config.interviewTime,
      language: config.language,
      difficulty: config.difficulty,
      examinationPoints: config.examinationPoints,
      status: 'ongoing',
      upcomingQuestions: [],
    };
    this.saveSession();
  }

  private checkAndRecoverFeedback(): void {
    if (this.session.qaHistory.length > 0 && (!this.session.summary || !this.session.currentPhase)) {
      this.createFeedback().catch(err => {
        console.error('Error recovering feedback:', err);
      });
    }
  }

  getSession(): InterviewSession {
    return { ...this.session };
  }

  getRemainingTime(): number {
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60);
    return Math.max(0, this.session.interviewTime - elapsed);
  }

  private saveSession(): void {
    this.session.remainingTime = this.getRemainingTime();
    saveInterviewSessionBySessionId(this.session);
  }

  async kickoff(onChunk: (content: string) => void): Promise<{ question: string; sessionId: string }> {
    this.updateRemainingTime();

    if (this.session.remainingTime <= 0) {
      const endMessage = '【Interview ended, thank you for your participation】\n\n*Interview time limit has been reached.*';
      return { question: endMessage, sessionId: this.session.sessionId };
    }

    const { systemMessage, humanMessage } = buildCreateQuestionPrompt({
      jobTitle: this.session.jobTitle,
      jobDescription: this.session.jobDescription,
      knowledgePoints: this.session.examinationPoints,
      difficulty: this.session.difficulty,
      language: this.session.language,
      remainingTime: this.session.remainingTime,
      currentPhase: this.session.currentPhase,
      decision: 'movenext',
      qaHistory: this.session.qaHistory,
      summary: this.session.summary,
    });

    let fullQuestion = '';

    try {
      for await (const chunk of apiCreateQuestion(systemMessage, humanMessage)) {
        fullQuestion += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      console.error('Error in kickoff:', error);
      throw new Error('Failed to start interview');
    }

    if (fullQuestion.includes('【Interview ended')) {
      return { question: fullQuestion, sessionId: this.session.sessionId };
    }

    const question = fullQuestion.trim();
    this.saveSession();

    return { question, sessionId: this.session.sessionId };
  }

  async decision(question: string, answer: string): Promise<DecisionResponse> {
    this.updateRemainingTime();

    if (this.session.remainingTime <= 0) {
      return { decision: 'end', reason: 'Interview time has ended' };
    }

    const { systemMessage, humanMessage } = buildDecisionPrompt({ question, answer });

    try {
      const decisionResult = await makeDecision(systemMessage, humanMessage);
      return decisionResult;
    } catch (error) {
      console.error('Error making decision, retrying once:', error);
      try {
        const decisionResult = await makeDecision(systemMessage, humanMessage);
        return decisionResult;
      } catch (retryError) {
        console.error('Error making decision after retry:', retryError);
        return { decision: 'movenext', reason: 'Error occurred, defaulting to move next' };
      }
    }
  }

  async createQuestion(
    decision: 'followup' | 'movenext',
    currentQuestion: string,
    currentAnswer: string,
    onChunk: (content: string) => void
  ): Promise<{ question: string }> {
    this.updateRemainingTime();

    if (this.session.remainingTime <= 0) {
      const endMessage = '【Interview ended, thank you for your participation】\n\n*Interview time limit has been reached.*';
      return { question: endMessage };
    }

    const { systemMessage, humanMessage } = buildCreateQuestionPrompt({
      jobTitle: this.session.jobTitle,
      jobDescription: this.session.jobDescription,
      knowledgePoints: this.session.examinationPoints,
      difficulty: this.session.difficulty,
      language: this.session.language,
      remainingTime: this.session.remainingTime,
      currentPhase: this.session.currentPhase,
      decision,
      question: currentQuestion,
      answer: currentAnswer,
      qaHistory: this.session.qaHistory,
      summary: this.session.summary,
    });

    let fullQuestion = '';

    try {
      for await (const chunk of apiCreateQuestion(systemMessage, humanMessage)) {
        fullQuestion += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      console.error('Error creating question:', error);
      throw new Error('Failed to create question');
    }

    if (fullQuestion.includes('【Interview ended')) {
      return { question: fullQuestion };
    }

    const question = fullQuestion.trim();
    this.saveSession();

    return { question };
  }

  async createFeedback(): Promise<void> {
    if (this.session.qaHistory.length === 0) {
      return;
    }

    try {
      const { systemMessage, humanMessage } = buildCreateFeedbackPrompt({
        jobTitle: this.session.jobTitle,
        knowledgePoints: this.session.examinationPoints,
        qaHistory: this.session.qaHistory,
        summary: this.session.summary,
        currentPhase: this.session.currentPhase,
      });

      const feedbackResult = await apiCreateFeedback(systemMessage, humanMessage);

      if (!this.session.feedbackHistory) {
        this.session.feedbackHistory = [];
      }
      this.session.feedbackHistory.push(feedbackResult.feedback);

      this.session.summary = feedbackResult.summary;
      this.session.currentPhase = feedbackResult.nextPhase || this.session.currentPhase;
      this.saveSession();
    } catch (error) {
      console.error('Error creating feedback:', error);
    }
  }

  async endAndGenerateSummary(): Promise<{ summary: string; score: number; conclusion: string }> {
    this.updateRemainingTime();

    this.session.status = 'completed';
    this.session.endTime = new Date().toISOString();

    const { systemMessage, humanMessage } = buildSummarizePrompt({
      jobTitle: this.session.jobTitle,
      jobDescription: this.session.jobDescription,
      knowledgePoints: this.session.examinationPoints,
      qaHistory: this.session.qaHistory,
      interviewTime: this.session.interviewTime,
      language: this.session.language,
    });

    try {
      const result = await summarizeInterview(systemMessage, humanMessage);

      this.session.result = {
        summary: result.summary,
        score: result.score,
        conclusion: result.conclusion,
        totalQuestions: this.session.qaHistory.length,
        correctAnswers: this.session.qaHistory.filter(qa => qa.isCorrect).length,
        elapsedTime: Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60),
      };

      this.saveSession();

      return result;
    } catch (error) {
      console.error('Error generating summary:', error);
      throw new Error('Failed to generate summary');
    }
  }

  async manageInterviewState(
    action: 'kickoff' | 'processAnswer' | 'end',
    params?: {
      answer?: string;
      question?: string;
      onChunk?: (content: string) => void;
    }
  ): Promise<any> {
    switch (action) {
      case 'kickoff':
        if (!params?.onChunk) {
          throw new Error('onChunk callback required for kickoff');
        }
        return await this.kickoff(params.onChunk);

      case 'processAnswer':
        if (!params?.answer || !params?.question) {
          throw new Error('answer and question required for processAnswer');
        }

        const qaItem = {
          question: params.question,
          answer: params.answer,
          score: 0,
          isCorrect: false,
          timestamp: new Date().toISOString(),
          questionId: `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        };
        this.session.qaHistory.push(qaItem);
        this.saveSession();

        const decision = await this.decision(params.question, params.answer);

        if (decision.decision === 'end') {
          return { decision };
        }

        const createQuestionPromise = this.createQuestion(
          decision.decision,
          params.question,
          params.answer,
          params.onChunk || (() => {})
        );

        this.createFeedback().catch(err => {
          console.error('Background feedback generation failed:', err);
        });

        const questionResult = await createQuestionPromise;

        return {
          decision,
          nextQuestion: questionResult.question,
        };

      case 'end':
        return await this.endAndGenerateSummary();

      default:
        throw new Error(`Unknown action: ${action}`);
    }
  }

  private updateRemainingTime(): void {
    this.session.remainingTime = this.getRemainingTime();
  }

  isCompleted(): boolean {
    return this.session.status === 'completed' || this.session.remainingTime <= 0;
  }

  cleanup(): void {
    if (this.feedbackWorker) {
      this.feedbackWorker.terminate();
      this.feedbackWorker = null;
    }
  }
}
