import { Job } from '../../models/job';
import { ENV } from '../../utils/env';

const ADMIN_API_BASE_URL = ENV.ADMIN_API_BASE_URL?.() || 'http://localhost:8000';
const API_TOKEN = ENV.API_TOKEN();

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = localStorage.getItem('studentToken');
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token || API_TOKEN}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export interface Invitation {
  invitation_id: string;
  email: string;
  job_id: string;
  invited_by: string;
  deadline: string;
  interview_time: number;
  status: string;
  created_at: string;
  token?: string;
}

export interface InvitationListResponse {
  status: string;
  message: string;
  invitations: Invitation[];
  total: number;
  page: number;
  limit: number;
}

export interface InvitationRequest {
  email: string;
  job_id: string;
  deadline: string;
  interview_time: number;
}

export async function getInvitations(
  invited_by?: string,
  status?: string,
  page: number = 1,
  limit: number = 20
): Promise<InvitationListResponse> {
  const params = new URLSearchParams();
  if (invited_by) params.append('invited_by', invited_by);
  if (status) params.append('status', status);
  params.append('page', page.toString());
  params.append('limit', limit.toString());
  
  const url = `${ADMIN_API_BASE_URL}/admin/recruitment/invitations?${params.toString()}`;
  return fetchWithAuth(url);
}

export async function createInvitation(invitation: InvitationRequest): Promise<Invitation> {
  const url = `${ADMIN_API_BASE_URL}/admin/recruitment/invite`;
  return fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(invitation),
  });
}

export async function createBulkInvitations(
  file: File,
  job_id: string,
  deadline: string,
  interview_time: number
): Promise<Invitation[]> {
  const formData = new FormData();
  formData.append('file', file);
  
  const params = new URLSearchParams();
  params.append('job_id', job_id);
  params.append('deadline', deadline);
  params.append('interview_time', interview_time.toString());
  
  const token = localStorage.getItem('studentToken') || API_TOKEN;
  
  const response = await fetch(
    `${ADMIN_API_BASE_URL}/admin/recruitment/invite-bulk?${params.toString()}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function updateInvitationStatus(
  invitation_id: string,
  status: string
): Promise<void> {
  const url = `${ADMIN_API_BASE_URL}/admin/recruitment/invitations/${invitation_id}`;
  return fetchWithAuth(url, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  });
}

export async function getJobs(isAdmin: boolean = false): Promise<Job[]> {
  const url = isAdmin 
    ? `${ADMIN_API_BASE_URL}/admin/jobs`
    : `${ADMIN_API_BASE_URL}/jobs`;
  return fetchWithAuth(url);
}

export async function getJob(job_id: string): Promise<Job> {
  const url = `${ADMIN_API_BASE_URL}/jobs/${job_id}`;
  return fetchWithAuth(url);
}

export async function createJob(job: {
  job_title: string;
  job_description: string;
  technical_skills: string[];
  soft_skills: string[];
}): Promise<Job> {
  const url = `${ADMIN_API_BASE_URL}/admin/jobs`;
  return fetchWithAuth(url, {
    method: 'POST',
    body: JSON.stringify(job),
  });
}

export async function updateJob(
  job_id: string,
  job: {
    job_title?: string;
    job_description?: string;
    technical_skills?: string[];
    soft_skills?: string[];
    is_active?: boolean;
  }
): Promise<Job> {
  const url = `${ADMIN_API_BASE_URL}/admin/jobs/${job_id}`;
  return fetchWithAuth(url, {
    method: 'PUT',
    body: JSON.stringify(job),
  });
}

export async function deleteJob(job_id: string): Promise<void> {
  const url = `${ADMIN_API_BASE_URL}/admin/jobs/${job_id}`;
  return fetchWithAuth(url, {
    method: 'DELETE',
  });
}

