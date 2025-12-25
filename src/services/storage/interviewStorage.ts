import { InterviewSession, InterviewResult } from '../../models/interview';
import { syncManager } from './syncManager';
import { getSessionFromFirebase, getOngoingSessionsFromFirebase } from './firebaseStorage';
import { getSyncStatus, markSynced } from './syncStatus';

const STORAGE_PREFIX = 'interview_';
const SESSION_KEY_PREFIX = `${STORAGE_PREFIX}session_`;
const HISTORY_KEY = `${STORAGE_PREFIX}history`;
const MAX_LOCALSTORAGE_SESSIONS = 10;
const CLEANUP_AGE_DAYS = 30;

export function saveInterviewSessionBySessionId(session: InterviewSession, isInitialCreate: boolean = false): void {
  const sessionKey = `${SESSION_KEY_PREFIX}${session.sessionId}`;
  
  try {
    localStorage.setItem(sessionKey, JSON.stringify(session));
    addToHistory(session);

    if (session.userId) {
      syncManager.syncSession(session.userId, session, isInitialCreate).catch((error) => {
        console.error('Background Firebase sync failed:', error);
      });
    }
  } catch (error: any) {
    if (error.name === 'QuotaExceededError') {
      cleanupSyncedSessions();
      try {
        localStorage.setItem(sessionKey, JSON.stringify(session));
        addToHistory(session);
        if (session.userId) {
          syncManager.syncSession(session.userId, session, isInitialCreate).catch((err) => {
            console.error('Background Firebase sync failed:', err);
          });
        }
      } catch (retryError) {
        console.error('Failed to save interview session after cleanup:', retryError);
      }
    } else {
      console.error('Failed to save interview session:', error);
    }
  }
}

export function loadInterviewSessionBySessionId(sessionId: string): InterviewSession | null {
  try {
    const sessionKey = `${SESSION_KEY_PREFIX}${sessionId}`;
    const data = localStorage.getItem(sessionKey);
    if (!data) return null;
    return JSON.parse(data) as InterviewSession;
  } catch (error) {
    console.error('Failed to load interview session:', error);
    return null;
  }
}

export async function recoverSessionFromFirebase(
  email: string,
  sessionId: string
): Promise<InterviewSession | null> {
  try {
    const session = await getSessionFromFirebase(email, sessionId);
    if (session && session.status === 'ongoing') {
      const sessionKey = `${SESSION_KEY_PREFIX}${sessionId}`;
      localStorage.setItem(sessionKey, JSON.stringify(session));
      addToHistory(session);
      return session;
    }
    return null;
  } catch (error) {
    console.error('Failed to recover session from Firebase:', error);
    return null;
  }
}

export async function recoverOngoingSessionFromFirebase(email: string): Promise<InterviewSession | null> {
  try {
    const sessions = await getOngoingSessionsFromFirebase(email);
    if (sessions.length > 0) {
      const session = sessions[0];
      const sessionKey = `${SESSION_KEY_PREFIX}${session.sessionId}`;
      localStorage.setItem(sessionKey, JSON.stringify(session));
      addToHistory(session);
      return session;
    }
    return null;
  } catch (error) {
    console.error('Failed to recover ongoing session from Firebase:', error);
    return null;
  }
}

export function saveInterviewSession(session: InterviewSession): void {
  saveInterviewSessionBySessionId(session);
}

export function loadInterviewSession(): InterviewSession | null {
  try {
    const history = getInterviewHistory();
    const ongoingSession = history.find(s => s.status === 'ongoing');
    if (ongoingSession) {
      return loadInterviewSessionBySessionId(ongoingSession.sessionId);
    }
    return null;
  } catch (error) {
    console.error('Failed to load interview session:', error);
    return null;
  }
}

export function clearInterviewSession(): void {
  try {
    const history = getInterviewHistory();
    history.forEach(session => {
      const sessionKey = `${SESSION_KEY_PREFIX}${session.sessionId}`;
      localStorage.removeItem(sessionKey);
    });
  } catch (error) {
    console.error('Failed to clear interview session:', error);
  }
}

export function saveInterviewResult(sessionId: string, result: InterviewResult): void {
  try {
    const session = loadInterviewSessionBySessionId(sessionId);
    if (session) {
      session.result = result;
      session.endTime = new Date().toISOString();
      session.status = 'completed';
      saveInterviewSessionBySessionId(session);

      if (session.userId) {
        syncManager.syncSession(session.userId, session, false).then(() => {
          cleanupSyncedSessions();
        }).catch((error) => {
          console.error('Background Firebase sync failed:', error);
        });
      }
    }

    const history = getInterviewHistory();
    const historyItem = history.find(item => item.sessionId === sessionId);
    if (historyItem) {
      historyItem.result = result;
      historyItem.endTime = new Date().toISOString();
      historyItem.status = 'completed';
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
  } catch (error) {
    console.error('Failed to save interview result:', error);
  }
}

export function cleanupSyncedSessions(): void {
  try {
    const history = getInterviewHistory();
    const now = Date.now();
    const cleanupAge = CLEANUP_AGE_DAYS * 24 * 60 * 60 * 1000;

    const completedSessions = history.filter((session) => {
      if (session.status !== 'completed') return true;

      const syncStatus = getSyncStatus(session.sessionId);
      if (!syncStatus || !syncStatus.lastSyncedAt) return true;

      const syncedAt = new Date(syncStatus.lastSyncedAt).getTime();
      const sessionAge = now - syncedAt;

      return sessionAge < cleanupAge;
    });

    completedSessions.sort((a, b) => {
      const aTime = a.endTime ? new Date(a.endTime).getTime() : 0;
      const bTime = b.endTime ? new Date(b.endTime).getTime() : 0;
      return bTime - aTime;
    });

    const sessionsToKeep = completedSessions.slice(0, MAX_LOCALSTORAGE_SESSIONS);
    const sessionsToRemove = completedSessions.slice(MAX_LOCALSTORAGE_SESSIONS);

    for (const session of sessionsToRemove) {
      const sessionKey = `${SESSION_KEY_PREFIX}${session.sessionId}`;
      localStorage.removeItem(sessionKey);
    }

    const updatedHistory = [
      ...history.filter((s) => s.status === 'ongoing'),
      ...sessionsToKeep,
    ];

    if (updatedHistory.length !== history.length) {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(updatedHistory));
    }
  } catch (error) {
    console.error('Failed to cleanup synced sessions:', error);
  }
}

export function getInterviewHistory(): InterviewSession[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    if (!data) return [];
    return JSON.parse(data) as InterviewSession[];
  } catch (error) {
    console.error('Failed to load interview history:', error);
    return [];
  }
}

export function addToHistory(session: InterviewSession): void {
  try {
    const history = getInterviewHistory();
    const existingIndex = history.findIndex(item => item.sessionId === session.sessionId);
    
    if (existingIndex >= 0) {
      history[existingIndex] = session;
    } else {
      history.unshift(session);
    }

    if (history.length > 50) {
      history.splice(50);
    }

    localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
  } catch (error) {
    console.error('Failed to add interview to history:', error);
  }
}

export function getInterviewById(sessionId: string): InterviewSession | null {
  return loadInterviewSessionBySessionId(sessionId);
}

export function clearInterviewHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
  } catch (error) {
    console.error('Failed to clear interview history:', error);
  }
}
