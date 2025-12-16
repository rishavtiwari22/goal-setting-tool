import { InterviewSession, InterviewResult } from '../../models/interview';

const STORAGE_PREFIX = 'interview_';
const SESSION_KEY = `${STORAGE_PREFIX}current_session`;
const HISTORY_KEY = `${STORAGE_PREFIX}history`;

export function saveInterviewSession(session: InterviewSession): void {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    console.log('Interview session saved to local storage');
  } catch (error) {
    console.error('Failed to save interview session:', error);
  }
}

export function loadInterviewSession(): InterviewSession | null {
  try {
    const data = localStorage.getItem(SESSION_KEY);
    if (!data) return null;
    return JSON.parse(data) as InterviewSession;
  } catch (error) {
    console.error('Failed to load interview session:', error);
    return null;
  }
}

export function clearInterviewSession(): void {
  try {
    localStorage.removeItem(SESSION_KEY);
    console.log('Interview session cleared from local storage');
  } catch (error) {
    console.error('Failed to clear interview session:', error);
  }
}

export function saveInterviewResult(sessionId: string, result: InterviewResult): void {
  try {
    const session = loadInterviewSession();
    if (session && session.sessionId === sessionId) {
      session.result = result;
      session.endTime = new Date().toISOString();
      saveInterviewSession(session);
    }

    const history = getInterviewHistory();
    const historyItem = history.find(item => item.sessionId === sessionId);
    if (historyItem) {
      historyItem.result = result;
      historyItem.endTime = new Date().toISOString();
      localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
    }
    console.log('Interview result saved to local storage');
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
    console.log('Interview added to history');
  } catch (error) {
    console.error('Failed to add interview to history:', error);
  }
}

export function getInterviewById(sessionId: string): InterviewSession | null {
  try {
    const history = getInterviewHistory();
    return history.find(item => item.sessionId === sessionId) || null;
  } catch (error) {
    console.error('Failed to get interview by ID:', error);
    return null;
  }
}

export function clearInterviewHistory(): void {
  try {
    localStorage.removeItem(HISTORY_KEY);
    console.log('Interview history cleared');
  } catch (error) {
    console.error('Failed to clear interview history:', error);
  }
}
