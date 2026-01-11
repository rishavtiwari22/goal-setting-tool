import { ENV } from '../../utils/env';

const ADMIN_API_BASE_URL = ENV.ADMIN_API_BASE_URL?.() || 'http://localhost:8000';

export interface InvitationTokenValidationResponse {
  invitation_id: string;
  email: string;
  job_id: string;
  job_title: string;
  job_description: string;
  technical_skills: string[];
  soft_skills: string[];
  interview_time: number;
  deadline: string;
  user_token: string;
  status: string;
}

export async function validateInvitationToken(
  token: string
): Promise<InvitationTokenValidationResponse> {
  const url = `${ADMIN_API_BASE_URL}/recruitment/validate-token?token=${encodeURIComponent(token)}`;
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

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
  const token = localStorage.getItem('studentToken');
  if (!token) {
    throw new Error('No authentication token found');
  }

  const url = `${ADMIN_API_BASE_URL}/admin/recruitment/invitations/${invitation_id}`;
  
  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(errorData.detail || errorData.message || `HTTP ${response.status}`);
  }
}

