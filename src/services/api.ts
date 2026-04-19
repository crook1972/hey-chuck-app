import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

/**
 * OpenClaw Gateway API Client
 * 
 * Connects directly to the OpenClaw gateway at port 18789.
 * Uses the gateway auth token for authentication.
 * 
 * The gateway exposes a REST API and WebSocket interface.
 * For MVP, we use the REST /api/sessions endpoint to send messages
 * and receive responses from Chuck.
 */

let gatewayUrl = 'http://localhost:18789';
let authToken = '';

export function configureApi(url: string, token: string) {
  gatewayUrl = url.replace(/\/+$/, '');
  authToken = token;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

/**
 * Send a message to Chuck via the OpenClaw gateway.
 * Uses the gateway's session messaging API.
 */
export async function sendMessage(message: string, sessionLabel: string = 'hey-chuck'): Promise<ApiResponse> {
  try {
    // Try the gateway's chat/send endpoint
    const response = await axios.post(
      `${gatewayUrl}/api/chat`,
      {
        message,
        agent: 'main',
        session: sessionLabel,
      },
      {
        headers: getHeaders(),
        timeout: 60000, // Chuck might take a while on complex tasks
      }
    );

    const data = response.data;
    
    // Normalize response format
    return {
      reply: data.reply || data.message || data.text || data.content || JSON.stringify(data),
      status: data.approvalId ? 'approval_needed' : 
              data.status === 'working' ? 'working' : 'done',
      approvalId: data.approvalId,
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    
    // If the /api/chat endpoint doesn't exist, try /api/sessions/send
    if (axiosError.response?.status === 404) {
      return sendViaSessionsApi(message, sessionLabel);
    }

    if (axiosError.response) {
      const status = axiosError.response.status;
      if (status === 401 || status === 403) {
        throw new Error('Auth failed — check your gateway token in Settings');
      }
      throw new Error(`Gateway error (${status})`);
    } else if (axiosError.code === 'ECONNABORTED') {
      throw new Error('Request timed out — Chuck might be working on something big');
    } else if (axiosError.code === 'ERR_NETWORK') {
      throw new Error('Cannot reach gateway — check your connection and URL');
    }
    throw new Error('Failed to reach Chuck');
  }
}

/**
 * Fallback: send via the gateway sessions API
 */
async function sendViaSessionsApi(message: string, sessionLabel: string): Promise<ApiResponse> {
  try {
    const response = await axios.post(
      `${gatewayUrl}/api/sessions/send`,
      {
        message,
        label: sessionLabel,
      },
      {
        headers: getHeaders(),
        timeout: 60000,
      }
    );

    const data = response.data;
    return {
      reply: data.reply || data.message || data.text || data.content || 'Message sent to Chuck',
      status: 'done',
    };
  } catch (error) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      throw new Error(`Gateway error (${axiosError.response.status})`);
    }
    throw new Error('Failed to reach Chuck via sessions API');
  }
}

/**
 * Send an approval decision to the gateway
 */
export async function sendApproval(approvalId: string, approved: boolean): Promise<ApiResponse> {
  try {
    const response = await axios.post(
      `${gatewayUrl}/api/approve`,
      { approvalId, approved },
      {
        headers: getHeaders(),
        timeout: 15000,
      }
    );

    return {
      reply: response.data.reply || (approved ? 'Approved' : 'Denied'),
      status: 'done',
    };
  } catch {
    throw new Error('Failed to send approval');
  }
}

/**
 * Check gateway connectivity
 */
export async function checkConnection(): Promise<boolean> {
  try {
    const response = await axios.get(`${gatewayUrl}/api/health`, {
      headers: getHeaders(),
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    // Try root endpoint as fallback
    try {
      const response = await axios.get(gatewayUrl, {
        headers: getHeaders(),
        timeout: 5000,
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

/**
 * Send audio for transcription via the gateway.
 * If the gateway doesn't have a transcribe endpoint,
 * falls back to sending the text "[voice message]" placeholder.
 */
export async function transcribeViaGateway(audioUri: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await axios.post(
      `${gatewayUrl}/api/transcribe`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        timeout: 15000,
      }
    );

    return response.data.text || '';
  } catch {
    // Gateway may not have transcription endpoint
    // Return null to signal caller to use on-device STT
    throw new Error('TRANSCRIBE_UNAVAILABLE');
  }
}
