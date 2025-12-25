import { syncWorker } from './syncWorker';
import { writeQueue } from './writeQueue';
import {
  createSessionDocument,
  updateSessionDocument,
  createQAItemDocument,
  createFeedbackItemDocument,
  createUserDocument,
} from './firebaseStorage';
import { WriteClassifier } from './writeClassifier';
import {
  incrementPendingWrites,
  markFieldSynced,
  markFieldUnsynced,
} from './syncStatus';
import type { InterviewSession, QAHistoryItem, InterviewPhase } from '../../models/interview';
import { isFirebaseAvailable } from '../firebase/config';
import type { WriteQueueItem } from '../firebase/types';

export class SyncManager {
  private previousSessionStatus: Map<string, 'ongoing' | 'completed'> = new Map();

  async syncSession(
    email: string,
    session: InterviewSession,
    isInitialCreate: boolean = false
  ): Promise<void> {
    if (!isFirebaseAvailable()) {
      return;
    }

    const previousStatus = this.previousSessionStatus.get(session.sessionId);
    const priority = WriteClassifier.classifySessionWrite(
      session,
      previousStatus,
      isInitialCreate
    );

    this.previousSessionStatus.set(session.sessionId, session.status);

    if (priority === 'critical') {
      try {
        if (isInitialCreate) {
          await createUserDocument(email);
          await createSessionDocument(email, session);
        } else {
          await updateSessionDocument(email, session);
        }
        markFieldSynced(session.sessionId, 'session');
      } catch (error: any) {
        console.error('Critical session write failed:', error);
        console.error('Error details:', {
          message: error?.message,
          code: error?.code,
          sessionId: session.sessionId,
          email,
        });
        markFieldUnsynced(session.sessionId, 'session');
        writeQueue.enqueue({
          sessionId: session.sessionId,
          operation: 'session',
          data: session,
          timestamp: Date.now(),
          priority: 'critical',
        });
        incrementPendingWrites(session.sessionId);
        syncWorker.triggerSync();
      }
    } else {
      writeQueue.enqueue({
        sessionId: session.sessionId,
        operation: 'session',
        data: session,
        timestamp: Date.now(),
        priority: 'normal',
      });
      incrementPendingWrites(session.sessionId);
      syncWorker.triggerSync();
    }
  }

  async syncQAItem(
    email: string,
    sessionId: string,
    qaItem: QAHistoryItem,
    phase: InterviewPhase
  ): Promise<void> {
    if (!isFirebaseAvailable()) {
      return;
    }

    try {
      await createQAItemDocument(email, sessionId, qaItem, phase);
      markFieldSynced(sessionId, `qaItem_${qaItem.questionId || qaItem.timestamp}`);
    } catch (error) {
      console.error('QA item write failed:', error);
      markFieldUnsynced(sessionId, `qaItem_${qaItem.questionId || qaItem.timestamp}`);
      writeQueue.enqueue({
        sessionId,
        operation: 'qaItem',
        data: {
          question: qaItem.question,
          answer: qaItem.answer,
          score: qaItem.score,
          isCorrect: qaItem.isCorrect,
          timestamp: qaItem.timestamp,
          questionId: qaItem.questionId,
          phase,
          userId: email,
        },
        timestamp: Date.now(),
        priority: 'normal',
      });
      incrementPendingWrites(sessionId);
      syncWorker.triggerSync();
    }
  }

  async syncFeedbackItem(
    email: string,
    sessionId: string,
    feedback: string,
    summary: string,
    phase: InterviewPhase,
    nextPhase?: InterviewPhase
  ): Promise<void> {
    if (!isFirebaseAvailable()) {
      return;
    }

    try {
      await createFeedbackItemDocument(email, sessionId, feedback, summary, phase, nextPhase);
      markFieldSynced(sessionId, `feedback_${Date.now()}`);
    } catch (error) {
      console.error('Feedback item write failed:', error);
      markFieldUnsynced(sessionId, `feedback_${Date.now()}`);
        const feedbackData: any = { feedback, summary, phase, userId: email };
        if (nextPhase) {
          feedbackData.nextPhase = nextPhase;
        }
        writeQueue.enqueue({
          sessionId,
          operation: 'feedback',
          data: feedbackData,
          timestamp: Date.now(),
          priority: 'normal',
        });
      incrementPendingWrites(sessionId);
      syncWorker.triggerSync();
    }
  }

  async syncUser(email: string, name?: string, isInitialCreate: boolean = false): Promise<void> {
    if (!isFirebaseAvailable()) {
      return;
    }

    const priority = WriteClassifier.classifyUserWrite(isInitialCreate);

    if (priority === 'critical') {
      try {
        await createUserDocument(email, name);
      } catch (error) {
        console.error('Critical user write failed:', error);
        writeQueue.enqueue({
          sessionId: email,
          operation: 'user',
          data: { email, name },
          timestamp: Date.now(),
          priority: 'critical',
        });
        syncWorker.triggerSync();
      }
    } else {
      writeQueue.enqueue({
        sessionId: email,
        operation: 'user',
        data: { email, name },
        timestamp: Date.now(),
        priority: 'normal',
      });
      syncWorker.triggerSync();
    }
  }
}

export const syncManager = new SyncManager();

