import { ENV } from "@/utils/env";

export interface Goal {
  id: string;
  createdAt: string;
  title: string;
  description: string;
  smartCriteria: {
    specific: string;
    measurable: string;
    achievable: string;
    relevant: string;
    timeBound: string;
  };
  status: "active" | "completed" | "partially_completed" | "abandoned";
}

export interface Reflection {
  id: string;
  goalId: string;
  createdAt: string;
  summary: string;
  understanding: "sufficient" | "insufficient";
  topStrengths: Array<{ title: string; description: string }>;
  improvementAreas: Array<{ title: string; description: string }>;
  topicsToStudy?: Array<{ title: string; description: string }>;
}

export interface DailySession {
  date: string;
  goals: Goal[];
  reflections: Reflection[];
}

const getStorageKey = (dateStr: string) => `daily_session_${dateStr}`;

/**
 * Retrieves the daily session from localStorage.
 * Simulated as an async API call for future backend migration.
 */
export const getDailySession = async (dateStr: string): Promise<DailySession> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        const data = localStorage.getItem(getStorageKey(dateStr));
        if (data) {
          resolve(JSON.parse(data));
        } else {
          // Return an empty shell if none exists
          resolve({ date: dateStr, goals: [], reflections: [] });
        }
      } catch (error) {
        console.error("Failed to parse daily session:", error);
        resolve({ date: dateStr, goals: [], reflections: [] });
      }
    }, 100); // Small artificial delay to simulate network
  });
};

/**
 * Saves or appends new goals to a specific date's session.
 * Simulated as an async API call for future backend migration.
 */
export const saveGoals = async (dateStr: string, newGoals: Goal[]): Promise<DailySession> => {
  return new Promise(async (resolve) => {
    const session = await getDailySession(dateStr);
    
    // Append the new goals
    session.goals = [...session.goals, ...newGoals];
    
    localStorage.setItem(getStorageKey(dateStr), JSON.stringify(session));
    resolve(session);
  });
};

/**
 * Saves or appends new reflections to a specific date's session.
 * Simulated as an async API call for future backend migration.
 */
export const saveReflections = async (dateStr: string, newReflections: Reflection[]): Promise<DailySession> => {
  return new Promise(async (resolve) => {
    const session = await getDailySession(dateStr);
    
    // Append the new reflections
    session.reflections = [...session.reflections, ...newReflections];
    
    localStorage.setItem(getStorageKey(dateStr), JSON.stringify(session));
    resolve(session);
  });
};

/**
 * Helper to fetch all sessions (e.g., for the Calendar View).
 * Simulated as an async API call for future backend migration.
 */
export const getAllSessions = async (): Promise<DailySession[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const sessions: DailySession[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith("daily_session_")) {
          try {
            const data = localStorage.getItem(key);
            if (data) {
              sessions.push(JSON.parse(data));
            }
          } catch (error) {
            console.error(`Failed to parse session for key ${key}:`, error);
          }
        }
      }
      
      // Sort by date ascending
      sessions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      resolve(sessions);
    }, 100);
  });
};

// ── Dummy API for Backend Integration (Strictly Additive) ──────────────

/**
 * GET for fetching a DailyRecord from the backend DB.
 */
export const getDailyRecord = async (date: string): Promise<any> => {
  try {
    const email = ENV.DUMMY_EMAIL();
    const url = `${ENV.DAILY_RECORDS_API_URL()}?date=${date}&email=${encodeURIComponent(email)}&_t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch daily record: ${response.status}`);
    }
    const json = await response.json();
    if (Array.isArray(json)) return json[0] ?? null;
    if (json?.data && Array.isArray(json.data)) return json.data[0] ?? null;
    if (json?.data) return json.data;
    if (json?.record) return json.record;
    return json;
  } catch (error) {
    console.error('Error fetching daily record:', error);
    throw error;
  }
};

/**
 * POST for saving/upserting a DailyRecord to the backend DB.
 */
export const saveDailyRecord = async (payload: {
  email: string;
  date: string;
  goals?: { goalId: string; description: string }[];
  reflections?: {
    goalId: string;
    assessment: 'sufficient' | 'insufficient';
    reflectionText: string;
  }[];
  revisions?: {
    topic: string;
    sourceGoalId: string;
    reason: string;
  }[];
}): Promise<any> => {
  const response = await fetch(ENV.DAILY_RECORDS_API_URL(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });
  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[DailyRecord API] POST failed with status ${response.status}:`, errorText);
    throw new Error(`Failed to save daily record: ${response.status} - ${errorText}`);
  }
  
  // Invalidate cache since new data was added
  clearRecordsCache(payload.email);
  
  return await response.json();
};

// Simple in-memory cache for calendar records
let recordsCache: { [email: string]: { timestamp: number, data: any[] } } = {};
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes cache

export const clearRecordsCache = (email?: string) => {
  if (email) {
    delete recordsCache[email];
  } else {
    recordsCache = {};
  }
};

/**
 * GET for fetching all DailyRecords for a given month from the backend DB.
 * @param studentId The ID of the student
 * @param yearMonth Format: "YYYY-MM"
 */
export const getMonthlyRecords = async (yearMonth: string, forceRefresh = false): Promise<any[]> => {
  try {
    const email = ENV.DUMMY_EMAIL();
    
    // Return cached data if valid and not forcing a refresh
    if (!forceRefresh && recordsCache[email] && (Date.now() - recordsCache[email].timestamp < CACHE_TTL_MS)) {
      return recordsCache[email].data;
    }

    console.log(`[Calendar Debug] Fetching records for email: ${email}`);
    const url = `${ENV.DAILY_RECORDS_API_URL()}?email=${encodeURIComponent(email)}&_t=${Date.now()}`;
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store'
    });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch monthly records: ${response.status}`);
    }
    const json = await response.json();
    console.log(`[Calendar Debug] Raw backend response for ${email} stringified:`, JSON.stringify(json, null, 2));
    
    let resultRecords: any[] = [];
    if (json && !Array.isArray(json)) {
      if (Array.isArray(json.data)) resultRecords = json.data;
      else if (Array.isArray(json.records)) resultRecords = json.records;
      else if (json.email || json.date || json.goals || json.reflections) resultRecords = [json];
    } else if (Array.isArray(json)) {
      resultRecords = json;
    }
    
    // Update cache
    recordsCache[email] = { timestamp: Date.now(), data: resultRecords };
    
    console.log("[Calendar Debug] Processed records array:", resultRecords);
    return resultRecords;
  } catch (error) {
    console.error('Error fetching monthly records:', error);
    return [];
  }
};
