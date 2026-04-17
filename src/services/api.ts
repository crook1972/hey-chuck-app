import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

let baseUrl = 'http://localhost:3000';
let authToken = '';

export function configureApi(url: string, token: string) {
  baseUrl = url.replace(/\/+$/, '');
  authToken = token;
}

export async function sendMessage(message: string, session: string = 'hey-chuck'): Promise<ApiResponse> {
  try {
    const response = await axios.post<ApiResponse>(
      `${baseUrl}/api/v1/chat`,
      { message, session },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        timeout: 30000,
      }
    );
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      throw new Error(`Server error: ${axiosError.response.status}`);
    } else if (axiosError.code === 'ECONNABORTED') {
      throw new Error('Request timed out — Chuck might be busy');
    } else if (axiosError.code === 'ERR_NETWORK') {
      throw new Error('Network error — check your connection');
    }
    throw new Error('Failed to reach Chuck');
  }
}

export async function sendApproval(approvalId: string, approved: boolean): Promise<ApiResponse> {
  try {
    const response = await axios.post<ApiResponse>(
      `${baseUrl}/api/v1/approve`,
      { approvalId, approved },
      {
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        timeout: 15000,
      }
    );
    return response.data;
  } catch {
    throw new Error('Failed to send approval');
  }
}

export async function checkConnection(): Promise<boolean> {
  try {
    await axios.get(`${baseUrl}/health`, { timeout: 5000 });
    return true;
  } catch {
    return false;
  }
}
