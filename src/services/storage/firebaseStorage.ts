import {
  doc,
  setDoc,
  getDoc,
  collection,
  query,
  where,
  orderBy,
  limit,
  getDocs,
  writeBatch,
  Timestamp,
} from 'firebase/firestore';
import { getFirestoreDb, normalizeEmailForId } from '../firebase/schema';
import {
  getUserCollectionPath,
  getSessionsCollectionPath,
  getSessionDocumentPath,
  getQAItemsCollectionPath,
  getQAItemDocumentPath,
  getFeedbackCollectionPath,
  getFeedbackDocumentPath,
  getUserFeedbackCollectionPath,
  getUserFeedbackDocumentPath,
} from '../firebase/schema';
import type {
  FirestoreUser,
  FirestoreSession,
  FirestoreQAItem,
  FirestoreFeedbackItem,
  FirestoreUserFeedback,
} from '../firebase/types';
import type { InterviewSession, QAHistoryItem, InterviewPhase } from '../../models/interview';
import { writeQueue } from './writeQueue';
import type { WriteQueueItem } from '../firebase/types';

const MAX_RETRY_ATTEMPTS = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function removeUndefinedFields<T extends Record<string, any>>(obj: T): T {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return obj;
  }
  
  const cleaned: any = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        cleaned[key] = removeUndefinedFields(value);
      } else if (Array.isArray(value)) {
        cleaned[key] = value.map(item => 
          typeof item === 'object' && item !== null ? removeUndefinedFields(item) : item
        );
      } else {
        cleaned[key] = value;
      }
    }
  }
  return cleaned as T;
}

async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  attempts: number = MAX_RETRY_ATTEMPTS
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < attempts - 1) {
        await sleep(RETRY_DELAYS[i]);
      }
    }
  }

  throw lastError || new Error('Retry failed');
}

function sessionToFirestoreSession(session: InterviewSession): FirestoreSession {
  const {
    qaHistory,
    ...sessionWithoutQA
  } = session;

  return removeUndefinedFields(sessionWithoutQA) as FirestoreSession;
}

export async function createUserDocument(email: string, name?: string): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const emailId = await normalizeEmailForId(email);
  const userRef = doc(db, getUserCollectionPath(emailId));

  const userData: FirestoreUser = {
    email,
    createdAt: new Date().toISOString(),
    lastActiveAt: new Date().toISOString(),
    totalInterviews: 0,
  };

  if (name) {
    userData.name = name;
  }

  try {
    await retryWithBackoff(async () => {
      await setDoc(userRef, removeUndefinedFields(userData), { merge: true });
    });
  } catch (error) {
    console.error('Failed to create user document after retries:', error);
    writeQueue.enqueue({
      sessionId: emailId,
      operation: 'user',
      data: userData,
      timestamp: Date.now(),
      priority: 'critical',
      retryCount: MAX_RETRY_ATTEMPTS,
    });
    throw error;
  }
}

export async function createSessionDocument(
  email: string,
  session: InterviewSession
): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const emailId = await normalizeEmailForId(email);
  const sessionRef = doc(db, getSessionDocumentPath(emailId, session.sessionId));

  const firestoreSession = sessionToFirestoreSession(session);
  const cleanedSession = removeUndefinedFields(firestoreSession);

  console.log('Creating session document:', {
    emailId,
    sessionId: session.sessionId,
    path: getSessionDocumentPath(emailId, session.sessionId),
    sessionKeys: Object.keys(cleanedSession),
  });

  try {
    await retryWithBackoff(async () => {
      await setDoc(sessionRef, cleanedSession);
    });
    console.log('Session document created successfully:', session.sessionId);
  } catch (error: any) {
    console.error('Failed to create session document after retries:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      emailId,
      sessionId: session.sessionId,
    });
    writeQueue.enqueue({
      sessionId: session.sessionId,
      operation: 'session',
      data: cleanedSession,
      timestamp: Date.now(),
      priority: 'critical',
      retryCount: MAX_RETRY_ATTEMPTS,
    });
    throw error;
  }
}

export async function updateSessionDocument(
  email: string,
  session: InterviewSession
): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const emailId = await normalizeEmailForId(email);
  const sessionRef = doc(db, getSessionDocumentPath(emailId, session.sessionId));

  const firestoreSession = sessionToFirestoreSession(session);
  const cleanedSession = removeUndefinedFields(firestoreSession);

  try {
    await setDoc(sessionRef, cleanedSession, { merge: true });
  } catch (error) {
    console.error('Failed to update session document:', error);
    writeQueue.enqueue({
      sessionId: session.sessionId,
      operation: 'session',
      data: cleanedSession,
      timestamp: Date.now(),
      priority: session.status === 'completed' ? 'critical' : 'normal',
    });
    throw error;
  }
}

export async function createQAItemDocument(
  email: string,
  sessionId: string,
  qaItem: QAHistoryItem,
  phase: InterviewPhase
): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const emailId = await normalizeEmailForId(email);
  const qaId = qaItem.questionId || `qa_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const qaRef = doc(db, getQAItemDocumentPath(emailId, sessionId, qaId));

  const firestoreQAItem: FirestoreQAItem = {
    question: qaItem.question,
    answer: qaItem.answer,
    score: qaItem.score,
    isCorrect: qaItem.isCorrect,
    timestamp: qaItem.timestamp,
    phase,
  };

  if (qaItem.questionId) {
    firestoreQAItem.questionId = qaItem.questionId;
  }

  const cleanedQAItem = removeUndefinedFields(firestoreQAItem);

  console.log('Creating QA item document:', {
    emailId,
    sessionId,
    qaId,
    path: getQAItemDocumentPath(emailId, sessionId, qaId),
  });

  try {
    await setDoc(qaRef, cleanedQAItem);
    console.log('QA item document created successfully:', qaId);
  } catch (error: any) {
    console.error('Failed to create QA item document:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      sessionId,
      qaId,
      email,
      emailId,
    });
    writeQueue.enqueue({
      sessionId,
      operation: 'qaItem',
      data: { ...cleanedQAItem, qaId, userId: email },
      timestamp: Date.now(),
      priority: 'normal',
    });
    throw error;
  }
}

export async function createFeedbackItemDocument(
  email: string,
  sessionId: string,
  feedback: string,
  summary: string,
  phase: InterviewPhase,
  nextPhase?: InterviewPhase
): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const emailId = await normalizeEmailForId(email);
  const feedbackId = `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  const feedbackRef = doc(db, getFeedbackDocumentPath(emailId, sessionId, feedbackId));

  const firestoreFeedbackItem: FirestoreFeedbackItem = {
    feedback,
    summary,
    phase,
    timestamp: new Date().toISOString(),
  };

  if (nextPhase) {
    firestoreFeedbackItem.nextPhase = nextPhase;
  }

  const cleanedFeedback = removeUndefinedFields(firestoreFeedbackItem);

  try {
    await setDoc(feedbackRef, cleanedFeedback);
  } catch (error: any) {
    console.error('Failed to create feedback item document:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      sessionId,
      feedbackId,
      email,
    });
    writeQueue.enqueue({
      sessionId,
      operation: 'feedback',
      data: { ...cleanedFeedback, feedbackId, userId: email },
      timestamp: Date.now(),
      priority: 'normal',
    });
    throw error;
  }
}

export async function createUserFeedbackDocument(
  email: string,
  sessionId: string,
  questionRelevance: number,
  referralLikelihood: number
): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const emailId = await normalizeEmailForId(email);
  const feedbackRef = doc(db, getUserFeedbackDocumentPath(emailId, sessionId));

  const userFeedback: FirestoreUserFeedback = {
    sessionId,
    questionRelevance,
    referralLikelihood,
    submittedAt: new Date().toISOString(),
  };

  const cleanedFeedback = removeUndefinedFields(userFeedback);

  try {
    await retryWithBackoff(async () => {
      await setDoc(feedbackRef, cleanedFeedback);
    });
    console.log('User feedback document created successfully:', sessionId);
  } catch (error: any) {
    console.error('Failed to create user feedback document after retries:', error);
    console.error('Error details:', {
      message: error?.message,
      code: error?.code,
      sessionId,
      email,
    });
    writeQueue.enqueue({
      sessionId,
      operation: 'feedback',
      data: { ...cleanedFeedback, userId: email, feedbackType: 'userFeedback' },
      timestamp: Date.now(),
      priority: 'normal',
      retryCount: MAX_RETRY_ATTEMPTS,
    });
    throw error;
  }
}

export async function getSessionFromFirebase(
  email: string,
  sessionId: string
): Promise<InterviewSession | null> {
  const db = await getFirestoreDb();
  if (!db) {
    return null;
  }

  try {
    const emailId = await normalizeEmailForId(email);
    const sessionRef = doc(db, getSessionDocumentPath(emailId, sessionId));
    const sessionSnap = await getDoc(sessionRef);

    if (!sessionSnap.exists()) {
      return null;
    }

    const firestoreSession = sessionSnap.data() as FirestoreSession;

    const qaItemsQuery = query(
      collection(db, getQAItemsCollectionPath(emailId, sessionId)),
      orderBy('timestamp', 'asc')
    );
    const qaItemsSnap = await getDocs(qaItemsQuery);
    const qaHistory: QAHistoryItem[] = qaItemsSnap.docs.map((doc) => {
      const data = doc.data() as FirestoreQAItem;
      return {
        question: data.question,
        answer: data.answer,
        score: data.score,
        isCorrect: data.isCorrect,
        timestamp: data.timestamp,
        questionId: data.questionId,
      };
    });

    return {
      ...firestoreSession,
      qaHistory,
    } as InterviewSession;
  } catch (error) {
    console.error('Failed to get session from Firebase:', error);
    return null;
  }
}

export async function getOngoingSessionsFromFirebase(
  email: string
): Promise<InterviewSession[]> {
  const db = await getFirestoreDb();
  if (!db) {
    return [];
  }

  try {
    const emailId = await normalizeEmailForId(email);
    const sessionsQuery = query(
      collection(db, getSessionsCollectionPath(emailId)),
      where('status', '==', 'ongoing'),
      orderBy('startTime', 'desc'),
      limit(10)
    );

    const sessionsSnap = await getDocs(sessionsQuery);
    const sessions: InterviewSession[] = [];

    for (const sessionDoc of sessionsSnap.docs) {
      const firestoreSession = sessionDoc.data() as FirestoreSession;

      const qaItemsQuery = query(
        collection(db, getQAItemsCollectionPath(emailId, firestoreSession.sessionId)),
        orderBy('timestamp', 'asc')
      );
      const qaItemsSnap = await getDocs(qaItemsQuery);
      const qaHistory: QAHistoryItem[] = qaItemsSnap.docs.map((doc) => {
        const data = doc.data() as FirestoreQAItem;
        return {
          question: data.question,
          answer: data.answer,
          score: data.score,
          isCorrect: data.isCorrect,
          timestamp: data.timestamp,
          questionId: data.questionId,
        };
      });

      sessions.push({
        ...firestoreSession,
        qaHistory,
      } as InterviewSession);
    }

    return sessions;
  } catch (error) {
    console.error('Failed to get ongoing sessions from Firebase:', error);
    return [];
  }
}

export async function batchWriteQueueItems(items: WriteQueueItem[]): Promise<void> {
  const db = await getFirestoreDb();
  if (!db) {
    throw new Error('Firebase not available');
  }

  const batch = writeBatch(db);
  const emailMap = new Map<string, string>();

  for (const item of items) {
    try {
      if (item.operation === 'user') {
        const emailId = item.sessionId;
        const userRef = doc(db, getUserCollectionPath(emailId));
        batch.set(userRef, removeUndefinedFields(item.data), { merge: true });
      } else if (item.operation === 'session') {
        const sessionData = item.data as FirestoreSession;
        const email = sessionData.userId || '';
        if (!email) continue;
        const emailId = emailMap.get(email) || await normalizeEmailForId(email);
        emailMap.set(email, emailId);
        const sessionRef = doc(db, getSessionDocumentPath(emailId, item.sessionId));
        batch.set(sessionRef, removeUndefinedFields(sessionData), { merge: true });
      } else if (item.operation === 'qaItem') {
        const qaData = item.data as any;
        const email = qaData.userId || '';
        if (!email) continue;
        const emailId = emailMap.get(email) || await normalizeEmailForId(email);
        emailMap.set(email, emailId);
        const qaId = qaData.questionId || qaData.qaId || `qa_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const qaRef = doc(db, getQAItemDocumentPath(emailId, item.sessionId, qaId));
        const { userId, qaId: _, ...cleanQaData } = qaData;
        batch.set(qaRef, removeUndefinedFields(cleanQaData) as FirestoreQAItem);
      } else if (item.operation === 'feedback') {
        const feedbackData = item.data as any;
        const email = feedbackData.userId || '';
        if (!email) continue;
        const emailId = emailMap.get(email) || await normalizeEmailForId(email);
        emailMap.set(email, emailId);
        const feedbackId = feedbackData.feedbackId || `feedback_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
        const feedbackRef = doc(db, getFeedbackDocumentPath(emailId, item.sessionId, feedbackId));
        const { userId, feedbackId: __, ...cleanFeedbackData } = feedbackData;
        batch.set(feedbackRef, removeUndefinedFields(cleanFeedbackData) as FirestoreFeedbackItem);
      }
    } catch (error) {
      console.error(`Failed to prepare batch write for ${item.operation}:`, error);
    }
  }

  try {
    await batch.commit();
  } catch (error) {
    console.error('Failed to commit batch write:', error);
    throw error;
  }
}

