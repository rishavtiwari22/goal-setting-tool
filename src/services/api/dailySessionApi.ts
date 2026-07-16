import { ENV } from "@/utils/env";
import { getCurrentUserEmail } from "@/config/auth";

export interface Goal {
  goalId?: string;
  id?: string;
  description?: string;
  title?: string;
}

export interface Reflection {
  goalId: string;
  assessment: 'sufficient' | 'insufficient';
  reflectionText: string;
}

export interface Revision {
  topic: string;
  sourceGoalId: string;
  reason: string;
}

export interface DailyRecord {
  _id?: string;
  email: string;
  date: string;
  goals: Goal[];
  reflections: Reflection[];
  revisions: Revision[];
}

// Simple in-memory cache for calendar records
let recordsCache: { [email: string]: { timestamp: number, data: any[] } } = {};
const CACHE_TTL_MS = 5 * 60 * 1000;

export const clearRecordsCache = (email?: string) => {
  if (email) {
    delete recordsCache[email];
  } else {
    recordsCache = {};
  }
};

/**
 * Normalizes a Date object or string to YYYY-MM-DD format
 */
export const normalizeDateStr = (date: string | Date): string => {
  if (date instanceof Date) {
    return date.toISOString().split('T')[0];
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
  return new Date(date).toISOString().split('T')[0];
};

/**
 * GET for fetching a DailyRecord from the backend DB.
 */
export const getDailyRecord = async (dateStr: string): Promise<DailyRecord | null> => {
  try {
    const email = getCurrentUserEmail();
    const date = normalizeDateStr(dateStr);
    const url = `${ENV.DAILY_RECORDS_API_URL()}?date=${date}&email=${encodeURIComponent(email)}&_t=${Date.now()}`;
    const response = await fetch(url, { cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 404) return null;
      throw new Error(`Failed to fetch daily record: ${response.status}`);
    }
    const json = await response.json();
    if (Array.isArray(json)) return json[0] ?? null;
    return json;
  } catch (error) {
    console.error('Error fetching daily record:', error);
    throw error;
  }
};

/**
 * VERIFIED create of a new daily record.
 */
export const createDailyRecord = async (payload: {
  date: string;
  goals?: any[];
  reflections?: any[];
  revisions?: any[];
}): Promise<DailyRecord> => {
  const email = getCurrentUserEmail();
  const date = normalizeDateStr(payload.date);
  
  const response = await fetch(ENV.DAILY_RECORDS_API_URL(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, ...payload, date })
  });
  
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to create daily record: ${response.status} - ${errorText}`);
  }
  
  // VERIFICATION STEP
  const verifiedRecord = await getDailyRecord(date);
  if (!verifiedRecord) {
    throw new Error(`Verification failed: Record for ${date} was not found after creation.`);
  }
  
  clearRecordsCache(email);
  return verifiedRecord;
};

/**
 * VERIFIED update of goals.
 */
export const patchGoals = async (id: string, dateStr: string, mode: 'append' | 'override', goals: any[]): Promise<DailyRecord> => {
  const email = getCurrentUserEmail();
  const date = normalizeDateStr(dateStr);

  const url = `${ENV.DAILY_RECORDS_API_URL()}/${id}/goals`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode, goals })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to patch goals: ${response.status} - ${errorText}`);
  }

  // VERIFICATION STEP
  const verifiedRecord = await getDailyRecord(date);
  if (!verifiedRecord) {
    throw new Error(`Verification failed: Record not found after patching goals.`);
  }

  // Check if at least one of the newly added goals exists in the verified record
  if (goals.length > 0) {
    const firstNewGoalId = goals[0].goalId || goals[0].id;
    const firstNewGoalDesc = goals[0].description || goals[0].title;
    
    const goalExists = verifiedRecord.goals.some((g: any) => 
      (firstNewGoalId && (g.goalId === firstNewGoalId || g.id === firstNewGoalId)) ||
      (firstNewGoalDesc && (g.description === firstNewGoalDesc || g.title === firstNewGoalDesc))
    );
    
    if (!goalExists) {
      throw new Error(`Verification failed: Newly added goal was not found in the verified record.`);
    }
  }

  clearRecordsCache(email);
  return verifiedRecord;
};

/**
 * VERIFIED update of reflections.
 */
export const patchReflections = async (id: string, dateStr: string, reflection: { goalId: string, assessment: 'sufficient' | 'insufficient', reflectionText: string }): Promise<DailyRecord> => {
  const email = getCurrentUserEmail();
  const date = normalizeDateStr(dateStr);

  const url = `${ENV.DAILY_RECORDS_API_URL()}/${id}/reflections`;
  const response = await fetch(url, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(reflection)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to patch reflection: ${response.status} - ${errorText}`);
  }

  // VERIFICATION STEP
  const verifiedRecord = await getDailyRecord(date);
  if (!verifiedRecord) {
    throw new Error(`Verification failed: Record not found after patching reflection.`);
  }

  const reflectionExists = verifiedRecord.reflections.some((r: any) => r.goalId === reflection.goalId);
  if (!reflectionExists) {
    throw new Error(`Verification failed: Reflection for goal ${reflection.goalId} was not found in the verified record.`);
  }

  clearRecordsCache(email);
  return verifiedRecord;
};

/**
 * GET for fetching all DailyRecords for a given month from the backend DB.
 */
export const getMonthlyRecords = async (yearMonth: string, forceRefresh = false): Promise<any[]> => {
  try {
    const email = getCurrentUserEmail();
    
    if (!forceRefresh && recordsCache[email] && (Date.now() - recordsCache[email].timestamp < CACHE_TTL_MS)) {
      return recordsCache[email].data;
    }

    const url = `${ENV.DAILY_RECORDS_API_URL()}?email=${encodeURIComponent(email)}&_t=${Date.now()}`;
    const response = await fetch(url, { method: 'GET', cache: 'no-store' });
    if (!response.ok) {
      if (response.status === 404) return [];
      throw new Error(`Failed to fetch monthly records: ${response.status}`);
    }
    const json = await response.json();
    
    let resultRecords: any[] = [];
    if (json && !Array.isArray(json)) {
      if (Array.isArray(json.data)) resultRecords = json.data;
      else if (Array.isArray(json.records)) resultRecords = json.records;
      else if (json.email || json.date || json.goals || json.reflections) resultRecords = [json];
    } else if (Array.isArray(json)) {
      resultRecords = json;
    }
    
    recordsCache[email] = { timestamp: Date.now(), data: resultRecords };
    return resultRecords;
  } catch (error) {
    console.error('Error fetching monthly records:', error);
    return [];
  }
};
