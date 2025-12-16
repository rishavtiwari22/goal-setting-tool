import { UserCheckResponse, User } from '../../models/user';
import { Job } from '../../models/job';
import { ENV } from '../../utils/env';

const API_BASE_URL = ENV.API_BASE_URL();
const API_TOKEN = ENV.API_TOKEN();

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
  }

  const data = await response.json();
  
  if (data.code !== "0") {
    throw new Error(data.message || 'API request failed');
  }

  return data.data;
}

export async function checkUser(email: string): Promise<UserCheckResponse> {
  const url = `${API_BASE_URL}/user/check?email=${encodeURIComponent(email)}`;
  return fetchWithAuth(url);
}

export async function getUser(userId: string): Promise<User> {
  const url = `${API_BASE_URL}/user/${userId}`;
  return fetchWithAuth(url);
}

export async function getJobs(): Promise<Job[]> {
  const url = `${API_BASE_URL}/job`;
  return fetchWithAuth(url);
}

export async function getJob(jobId: string): Promise<Job> {
  const url = `${API_BASE_URL}/job/${jobId}`;
  return fetchWithAuth(url);
}
