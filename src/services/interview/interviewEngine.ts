import { InterviewSession, InterviewPhase, QAHistoryItem, AnalyzeAnswerResponse } from '../../models/interview';
import { buildKickoffPrompt, buildAnalyzePrompt, buildSummarizePrompt } from './promptBuilder';
import { generateQuestion, analyzeAnswer, summarizeInterview } from '../api/deepseekApi';
import { saveInterviewSession, addToHistory } from '../storage/interviewStorage';

export interface InterviewConfig {
  userId: string;
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  interviewTime: number;
  language: string;
  difficulty: string;
  examinationPoints: string[];
}

export class InterviewEngine {
  private session: InterviewSession;
  private startTime: Date;
  private currentQuestionId: string = '';

  constructor(config: InterviewConfig) {
    this.startTime = new Date();
    this.session = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: config.userId,
      jobId: config.jobId,
      jobTitle: config.jobTitle,
      jobDescription: config.jobDescription,
      startTime: this.startTime.toISOString(),
      qaHistory: [],
      currentPhase: 'introduction',
      remainingTime: config.interviewTime,
      interviewTime: config.interviewTime,
      language: config.language,
      difficulty: config.difficulty,
      examinationPoints: config.examinationPoints,
    };
    this.saveSession();
  }

  getSession(): InterviewSession {
    return { ...this.session };
  }

  getRemainingTime(): number {
    const elapsed = Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60);
    return Math.max(0, this.session.interviewTime - elapsed);
  }

  updateRemainingTime(): void {
    this.session.remainingTime = this.getRemainingTime();
    this.saveSession();
  }

  private saveSession(): void {
    this.session.remainingTime = this.getRemainingTime();
    saveInterviewSession(this.session);
    addToHistory(this.session);
  }

  private determinePhase(): InterviewPhase {
    const history = this.session.qaHistory;
    
    if (history.length === 0) {
      return 'introduction';
    }

    const hasIntroduction = history.some(qa => 
      qa.question.toLowerCase().includes('introduce') || 
      qa.question.toLowerCase().includes('name') ||
      qa.question.toLowerCase().includes('background')
    );

    const hasProject = history.some(qa =>
      qa.question.toLowerCase().includes('project') ||
      qa.question.toLowerCase().includes('worked on')
    );

    if (!hasIntroduction) {
      return 'introduction';
    } else if (!hasProject || history.filter(qa => 
      qa.question.toLowerCase().includes('project') || 
      qa.question.toLowerCase().includes('worked on')
    ).length < 2) {
      return 'project';
    } else {
      return 'technical';
    }
  }

  async generateNextQuestion(
    onChunk: (content: string) => void
  ): Promise<string> {
    this.updateRemainingTime();

    if (this.session.remainingTime <= 0) {
      return '【Interview ended, thank you for your participation】\n\n*Interview time limit has been reached.*';
    }

    this.session.currentPhase = this.determinePhase();

    const prompt = buildKickoffPrompt({
      jobTitle: this.session.jobTitle,
      jobDescription: this.session.jobDescription,
      knowledgePoints: this.session.examinationPoints,
      difficulty: this.session.difficulty,
      language: this.session.language,
      interviewTime: this.session.interviewTime,
      remainingTime: this.session.remainingTime,
      qaHistory: this.session.qaHistory,
    });

    let fullQuestion = '';
    this.currentQuestionId = `q_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    try {
      for await (const chunk of generateQuestion(prompt)) {
        fullQuestion += chunk;
        onChunk(chunk);
      }
    } catch (error) {
      console.error('Error generating question:', error);
      throw new Error('Failed to generate question');
    }

    if (fullQuestion.includes('【Interview ended')) {
      return fullQuestion;
    }

    return fullQuestion.trim();
  }

  async processAnswer(
    answer: string,
    question: string
  ): Promise<{ feedback: string; decision: AnalyzeAnswerResponse['decision']; score: number; isCorrect: boolean }> {
    this.updateRemainingTime();

    if (this.session.remainingTime <= 0) {
      return {
        feedback: 'Interview time has ended.',
        decision: 'END_INTERVIEW',
        score: 0,
        isCorrect: false,
      };
    }

    const prompt = buildAnalyzePrompt({
      question,
      answer,
      language: this.session.language,
    });

    try {
      const analysis = await analyzeAnswer(prompt);

      const qaItem: QAHistoryItem = {
        question,
        answer,
        score: analysis.score,
        isCorrect: analysis.isCorrect,
        timestamp: new Date().toISOString(),
        questionId: this.currentQuestionId,
      };

      this.session.qaHistory.push(qaItem);
      this.saveSession();

      return {
        feedback: analysis.feedback,
        decision: analysis.decision,
        score: analysis.score,
        isCorrect: analysis.isCorrect,
      };
    } catch (error) {
      console.error('Error analyzing answer:', error);
      throw new Error('Failed to analyze answer');
    }
  }

  async finalizeInterview(): Promise<{ summary: string; score: number; conclusion: string }> {
    this.updateRemainingTime();

    const prompt = buildSummarizePrompt({
      jobTitle: this.session.jobTitle,
      jobDescription: this.session.jobDescription,
      knowledgePoints: this.session.examinationPoints,
      qaHistory: this.session.qaHistory,
      interviewTime: this.session.interviewTime,
      language: this.session.language,
    });

    try {
      const result = await summarizeInterview(prompt);

      this.session.result = {
        summary: result.summary,
        score: result.score,
        conclusion: result.conclusion,
        totalQuestions: this.session.qaHistory.length,
        correctAnswers: this.session.qaHistory.filter(qa => qa.isCorrect).length,
        elapsedTime: Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60),
      };

      this.session.endTime = new Date().toISOString();
      this.saveSession();

      return result;
    } catch (error) {
      console.error('Error summarizing interview:', error);
      throw new Error('Failed to summarize interview');
    }
  }

  isInterviewEnded(question: string): boolean {
    return question.includes('【Interview ended');
  }

  shouldEndInterview(decision: AnalyzeAnswerResponse['decision']): boolean {
    return decision === 'END_INTERVIEW';
  }
}
