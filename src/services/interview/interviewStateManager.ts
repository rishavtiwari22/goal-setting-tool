import { InterviewConfig } from './interviewEngine';
import { InterviewSession, DecisionResponse, InterviewPhase, ProjectInfo } from '../../models/interview';
import { loadInterviewSessionBySessionId, saveInterviewSessionBySessionId } from '../storage/interviewStorage';
import { makeDecision, createQuestion as apiCreateQuestion, createFeedback as apiCreateFeedback, summarizeInterview } from '../api/deepseekApi';
import { buildDecisionPrompt, buildCreateQuestionPrompt, buildCreateFeedbackPrompt, buildSummarizePrompt } from './promptBuilder';
import { syncManager } from '../storage/syncManager';

// Configuration constants for Phase 2: Irrelevant answer handling
const MAX_CONSECUTIVE_IRRELEVANT = 2;  // Max retries before ending (so 3 bad answers total = 2 retries + 1 final)
const MAX_TOPIC_FOLLOWUPS = 3;         // Max follow-ups on a single topic before moving on

export class InterviewStateManager {
  private session!: InterviewSession;
  private startTime!: Date;
  private isInitialCreate: boolean = false;

  constructor(config: InterviewConfig, sessionId?: string) {
    if (sessionId) {
      const existingSession = loadInterviewSessionBySessionId(sessionId);
      if (existingSession && existingSession.status === 'ongoing') {
        this.session = existingSession;
        this.startTime = new Date(existingSession.startTime);
        // Ensure new fields have default values for existing sessions
        this.migrateSessionFields();
        this.checkAndRecoverFeedback();
      } else {
        this.initializeNewSession(config);
      }
    } else {
      this.initializeNewSession(config);
    }
  }

  // Migrate existing sessions to have new fields
  private migrateSessionFields(): void {
    if (this.session.consecutiveIrrelevantCount === undefined) {
      this.session.consecutiveIrrelevantCount = 0;
    }
    if (this.session.currentTopicFollowupCount === undefined) {
      this.session.currentTopicFollowupCount = 0;
    }
    if (this.session.discussedProjects === undefined) {
      this.session.discussedProjects = [];
    }
    if (this.session.currentProjectIndex === undefined) {
      this.session.currentProjectIndex = 0;
    }
    // Phase question counts
    if (this.session.introductionQuestionCount === undefined) {
      this.session.introductionQuestionCount = 0;
    }
    if (this.session.projectQuestionCount === undefined) {
      this.session.projectQuestionCount = 0;
    }
    if (this.session.technicalQuestionCount === undefined) {
      this.session.technicalQuestionCount = 0;
    }
    if (this.session.currentProjectQuestionCount === undefined) {
      this.session.currentProjectQuestionCount = 0;
    }
  }

  private initializeNewSession(config: InterviewConfig): void {
    this.startTime = new Date();
    this.isInitialCreate = true;
    this.session = {
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
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
      // Phase 2: Irrelevant answer tracking
      consecutiveIrrelevantCount: 0,
      currentTopicFollowupCount: 0,
      // Phase 3: Dynamic phase transitions
      discussedProjects: [],
      currentProjectIndex: 0,
      // Phase question counts
      introductionQuestionCount: 0,
      projectQuestionCount: 0,
      technicalQuestionCount: 0,
      currentProjectQuestionCount: 0,
    };
    this.saveSession();
    this.isInitialCreate = false;
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
    saveInterviewSessionBySessionId(this.session, this.isInitialCreate);
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
      discussedProjects: this.session.discussedProjects,
      introductionQuestionCount: this.session.introductionQuestionCount,
      currentProjectQuestionCount: this.session.currentProjectQuestionCount,
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
      return {
        decision: 'end',
        feedback: 'Thank you for the interview! Your time is up. We are now generating your results.'
      };
    }

    // Check if user explicitly wants to end the call - bypass all retry logic
    const lowerAnswer = answer.toLowerCase().trim();
    const endCallPhrases = ['end the call', 'end call', 'end interview', 'stop interview', 'quit interview', 'exit interview', 'i want to end', 'please end'];
    const isExplicitEndRequest = endCallPhrases.some(phrase => lowerAnswer.includes(phrase));

    if (isExplicitEndRequest) {
      console.log('User explicitly requested to end the call. Ending interview immediately.');
      return { decision: 'end', feedback: 'Thank you for participating in this interview! It was great speaking with you. We will now generate your interview summary.' };
    }

    // Phase 2: Include recent history and counters in decision prompt
    const recentHistory = this.session.qaHistory.slice(-3);

    const { systemMessage, humanMessage } = buildDecisionPrompt({
      question,
      answer,
      recentQAHistory: recentHistory,
      consecutiveIrrelevantCount: this.session.consecutiveIrrelevantCount,
      currentTopicFollowupCount: this.session.currentTopicFollowupCount,
      remainingTime: this.session.remainingTime,
    });

    try {
      let decisionResult = await makeDecision(systemMessage, humanMessage);

      // Phase 2: Apply counter logic for irrelevant answer handling
      decisionResult = this.applyCounterLogic(decisionResult);

      return decisionResult;
    } catch (error) {
      console.error('Error making decision, retrying once:', error);
      try {
        let decisionResult = await makeDecision(systemMessage, humanMessage);
        decisionResult = this.applyCounterLogic(decisionResult);
        return decisionResult;
      } catch (retryError) {
        console.error('Error making decision after retry:', retryError);
        return { decision: 'movenext' };
      }
    }
  }

  // Phase 2: Apply counter logic and determine if we should force transition or end
  private applyCounterLogic(decisionResult: DecisionResponse): DecisionResponse {
    // If AI decided to end, check if we can retry instead
    if (decisionResult.decision === 'end') {
      // Allow up to 2 retries (so 3 bad answers total) before actually ending
      this.session.consecutiveIrrelevantCount++;

      console.log(`Bad answer detected. Count: ${this.session.consecutiveIrrelevantCount}/${MAX_CONSECUTIVE_IRRELEVANT}`);

      if (this.session.consecutiveIrrelevantCount <= MAX_CONSECUTIVE_IRRELEVANT) {
        console.log('Switching decision to RETRY.');
        return { decision: 'retry' };
      }

      console.log('Max bad answers reached. Ending interview.');
      // Provide a polite goodbye message explaining why the interview is ending
      return {
        decision: 'end',
        feedback: 'I appreciate you taking the time to interview with us today. Unfortunately, based on the responses provided, I\'m not able to continue with this interview at this time. We encourage you to review the relevant topics and consider reapplying in the future. Thank you for your interest, and we wish you the best in your career journey. Goodbye!'
      };
    }

    if (decisionResult.decision === 'followup') {
      // Increment follow-up counter for this topic
      this.session.currentTopicFollowupCount++;

      console.log(`Topic follow-ups: ${this.session.currentTopicFollowupCount}`);

      // Check if we've reached max follow-ups for this topic
      if (this.session.currentTopicFollowupCount >= MAX_TOPIC_FOLLOWUPS) {
        console.log(`Max topic follow-ups (${MAX_TOPIC_FOLLOWUPS}) reached. Moving to next topic.`);
        this.session.currentTopicFollowupCount = 0;
        return { decision: 'movenext' };
      }
    } else if (decisionResult.decision === 'movenext') {
      // Reset counters on relevant answer
      console.log("took decision to move to next topic")
      this.session.consecutiveIrrelevantCount = 0;
      this.session.currentTopicFollowupCount = 0;
    } else if (decisionResult.decision === 'retry') {
      // If the LLM itself returned 'retry' (future proofing), treat it like a bad answer
      console.log("took decision to retry")
      this.session.consecutiveIrrelevantCount++;
    }

    this.saveSession();
    return decisionResult;
  }

  // Phase 2: Force transition to next phase when max irrelevant reached
  private forcePhaseTransition(): void {
    const phaseOrder: InterviewPhase[] = ['introduction', 'project', 'technical'];
    const currentIndex = phaseOrder.indexOf(this.session.currentPhase);

    if (currentIndex < phaseOrder.length - 1) {
      this.session.currentPhase = phaseOrder[currentIndex + 1];
      console.log(`Forced phase transition to: ${this.session.currentPhase}`);
    }
    // If already in technical phase, stay there but continue
  }

  async createQuestion(
    decision: 'followup' | 'movenext' | 'retry',
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
      discussedProjects: this.session.discussedProjects,
      introductionQuestionCount: this.session.introductionQuestionCount,
      currentProjectQuestionCount: this.session.currentProjectQuestionCount,
      consecutiveIrrelevantCount: this.session.consecutiveIrrelevantCount,
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

    // Increment question count for current phase BEFORE generating feedback
    this.incrementPhaseQuestionCount();

    try {
      const { systemMessage, humanMessage } = buildCreateFeedbackPrompt({
        jobTitle: this.session.jobTitle,
        knowledgePoints: this.session.examinationPoints,
        qaHistory: this.session.qaHistory,
        summary: this.session.summary,
        currentPhase: this.session.currentPhase,
        discussedProjects: this.session.discussedProjects,
        introductionQuestionCount: this.session.introductionQuestionCount,
        currentProjectQuestionCount: this.session.currentProjectQuestionCount,
      });

      const feedbackResult = await apiCreateFeedback(systemMessage, humanMessage);

      if (!this.session.feedbackHistory) {
        this.session.feedbackHistory = [];
      }
      this.session.feedbackHistory.push(feedbackResult.feedback);

      this.session.summary = feedbackResult.summary;

      if (this.session.userId) {
        syncManager.syncFeedbackItem(
          this.session.userId,
          this.session.sessionId,
          feedbackResult.feedback,
          feedbackResult.summary,
          this.session.currentPhase,
          feedbackResult.nextPhase
        ).catch((error) => {
          console.error('Background feedback sync failed:', error);
        });
      }

      // Track phase transition
      const previousPhase = this.session.currentPhase;
      this.session.currentPhase = feedbackResult.nextPhase || this.session.currentPhase;

      // Log phase transitions for debugging
      if (previousPhase !== this.session.currentPhase) {
        console.log(`Phase transition: ${previousPhase} → ${this.session.currentPhase}`);
      }

      // Phase 3: Handle project tracking from feedback
      if (feedbackResult.currentProjectComplete) {
        this.session.currentProjectIndex++;
        this.session.currentProjectQuestionCount = 0; // Reset for new project
        console.log(`Current project complete. Moving to project index: ${this.session.currentProjectIndex}`);
      }

      // Phase 3: Track mentioned projects
      if (feedbackResult.projectsMentioned && feedbackResult.projectsMentioned.length > 0) {
        this.updateDiscussedProjects(feedbackResult.projectsMentioned);
      }

      this.saveSession();
    } catch (error) {
      console.error('Error creating feedback:', error);
    }
  }

  // Increment question count for current phase
  private incrementPhaseQuestionCount(): void {
    switch (this.session.currentPhase) {
      case 'introduction':
        this.session.introductionQuestionCount++;
        break;
      case 'project':
        this.session.projectQuestionCount++;
        break;
      case 'technical':
        this.session.technicalQuestionCount++;
        this.session.currentProjectQuestionCount++;
        break;
    }
  }

  // Phase 3: Update discussed projects list
  private updateDiscussedProjects(projectNames: string[]): void {
    for (const projectName of projectNames) {
      const normalizedName = projectName.trim().toLowerCase();
      const existingProject = this.session.discussedProjects.find(
        p => p.name.toLowerCase() === normalizedName
      );

      if (existingProject) {
        // Add current phase if not already tracked
        if (!existingProject.discussedInPhases.includes(this.session.currentPhase)) {
          existingProject.discussedInPhases.push(this.session.currentPhase);
        }
      } else {
        // Add new project
        const newProject: ProjectInfo = {
          name: projectName.trim(),
          technologies: [],
          discussedInPhases: [this.session.currentPhase],
          technicalQuestionsAsked: [],
        };
        this.session.discussedProjects.push(newProject);
        console.log(`New project tracked: ${projectName}`);
      }
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

    const { resultGenerationStatus } = await import('../resultGenerationStatus');
    resultGenerationStatus.setGenerating(this.session.sessionId);

    try {
      const result = await summarizeInterview(systemMessage, humanMessage);

      this.session.result = {
        summary: result.summary,
        score: result.score,
        conclusion: result.conclusion,
        totalQuestions: this.session.qaHistory.length,
        correctAnswers: this.session.qaHistory.filter(qa => qa.isCorrect).length,
        elapsedTime: Math.floor((Date.now() - this.startTime.getTime()) / 1000 / 60),
        topStrengths: result.topStrengths,
        improvementAreas: result.improvementAreas,
      };

      this.saveSession();
      resultGenerationStatus.setComplete(this.session.sessionId);

      return result;
    } catch (error) {
      console.error('Error generating summary:', error);
      resultGenerationStatus.setComplete(this.session.sessionId);
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
          questionId: `q_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        };
        this.session.qaHistory.push(qaItem);
        this.saveSession();

        if (this.session.userId) {
          syncManager.syncQAItem(
            this.session.userId,
            this.session.sessionId,
            qaItem,
            this.session.currentPhase
          ).catch((error) => {
            console.error('Background QA item sync failed:', error);
          });
        }

        const decision = await this.decision(params.question, params.answer);

        if (decision.decision === 'end') {
          return { decision };
        }

        // Generate the next question first (streams to user immediately)
        const questionResult = await this.createQuestion(
          decision.decision,
          params.question,
          params.answer,
          params.onChunk || (() => { })
        );

        // AFTER question is fully streamed, create feedback in background
        // This updates phase info for the NEXT question generation
        this.createFeedback().catch(err => {
          console.error('Background feedback generation failed:', err);
        });

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
    // Clean up any resources if needed
    // Note: Removed unused feedbackWorker
  }
}
