import { InterviewSession, InterviewResult } from '../../models/interview';

const STORAGE_PREFIX = 'interview_';
const SESSION_KEY_PREFIX = `${STORAGE_PREFIX}session_`;
const HISTORY_KEY = `${STORAGE_PREFIX}history`;

export function saveInterviewSessionBySessionId(session: InterviewSession): void {
  try {
    const sessionKey = `${SESSION_KEY_PREFIX}${session.sessionId}`;
    localStorage.setItem(sessionKey, JSON.stringify(session));
    addToHistory(session);
  } catch (error) {
    console.error('Failed to save interview session:', error);
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
