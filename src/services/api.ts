import axios, { AxiosError } from 'axios';
import { ApiResponse, AppSettings } from '../types';
import { isPrivateBuild, getPrivateConfig } from '../config/build';

// ============================================
// OpenClaw Gateway Client (Private Build)
// ============================================

let gatewayUrl = '';
let gatewayToken = '';

export function configureGateway(url: string, token: string) {
  gatewayUrl = url.replace(/\/+$/, '');
  gatewayToken = token;
}

async function sendToGateway(message: string): Promise<ApiResponse> {
  if (!gatewayUrl) throw new Error('Gateway URL not configured — check Settings');
  if (!gatewayToken) throw new Error('Gateway token not set — check Settings');

  try {
    // Try /api/chat first
    const response = await axios.post(
      `${gatewayUrl}/api/chat`,
      { message, agent: 'main', session: 'hey-chuck' },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${gatewayToken}`,
        },
        timeout: 60000,
      }
    );

    const data = response.data;
    return {
      reply: data.reply || data.message || data.text || data.content || JSON.stringify(data),
      status: 'done',
    };
  } catch (error) {
    const axiosError = error as AxiosError;

    if (axiosError.response?.status === 404) {
      // Fallback to sessions API
      return sendViaSessionsApi(message);
    }
    if (axiosError.response?.status === 401 || axiosError.response?.status === 403) {
      throw new Error('Auth failed — check your gateway token');
    }
    if (axiosError.code === 'ECONNABORTED') {
      throw new Error('Timed out — Chuck might be busy');
    }
    if (axiosError.code === 'ERR_NETWORK') {
      throw new Error('Cannot reach gateway — check connection');
    }
    throw new Error('Failed to reach Chuck');
  }
}

async function sendViaSessionsApi(message: string): Promise<ApiResponse> {
  const response = await axios.post(
    `${gatewayUrl}/api/sessions/send`,
    { message, label: 'hey-chuck' },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${gatewayToken}`,
      },
      timeout: 60000,
    }
  );
  const data = response.data;
  return {
    reply: data.reply || data.message || data.text || 'Message sent to Chuck',
    status: 'done',
  };
}

async function checkGatewayConnection(): Promise<boolean> {
  if (!gatewayUrl || !gatewayToken) return false;
  try {
    const resp = await axios.get(`${gatewayUrl}/api/health`, {
      headers: { Authorization: `Bearer ${gatewayToken}` },
      timeout: 5000,
    });
    return resp.status === 200;
  } catch {
    try {
      const resp = await axios.get(gatewayUrl, {
        headers: { Authorization: `Bearer ${gatewayToken}` },
        timeout: 5000,
      });
      return resp.status === 200;
    } catch {
      return false;
    }
  }
}

/**
 * Auto-detect best gateway URL (local vs Tailscale)
 */
export async function autoDetectGateway(): Promise<{ url: string; network: string } | null> {
  const config = getPrivateConfig();

  // Try local first (faster when on same network)
  try {
    await axios.get(config.gatewayLocalUrl, { timeout: 2000 });
    return { url: config.gatewayLocalUrl, network: 'local' };
  } catch {}

  // Try Tailscale
  try {
    await axios.get(config.gatewayTailscaleUrl, { timeout: 3000 });
    return { url: config.gatewayTailscaleUrl, network: 'tailscale' };
  } catch {}

  return null;
}

// ============================================
// OpenAI Client (Public Build)
// ============================================

const OPENAI_BASE = 'https://api.openai.com/v1';

let openaiKey = '';
let openaiModel = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are Chuck, a fast, reliable voice assistant. Be concise — voice responses should be short and clear. Skip filler words. If a task is ambiguous, ask one clarifying question. Keep responses under 2-3 sentences when possible.`;

export function configureOpenAI(key: string, model?: string) {
  openaiKey = key;
  if (model) openaiModel = model;
}

async function sendToOpenAI(
  message: string,
  history: { role: string; content: string }[] = [],
): Promise<ApiResponse> {
  if (!openaiKey) throw new Error('No API key — add your OpenAI key in Settings');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-20),
    { role: 'user', content: message },
  ];

  const response = await axios.post(
    `${OPENAI_BASE}/chat/completions`,
    { model: openaiModel, messages, max_tokens: 1024, temperature: 0.7 },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${openaiKey}`,
      },
      timeout: 30000,
    }
  );

  return {
    reply: response.data.choices?.[0]?.message?.content || 'No response',
    status: 'done',
  };
}

async function checkOpenAIConnection(): Promise<boolean> {
  if (!openaiKey) return false;
  try {
    const resp = await axios.get(`${OPENAI_BASE}/models`, {
      headers: { Authorization: `Bearer ${openaiKey}` },
      timeout: 5000,
    });
    return resp.status === 200;
  } catch {
    return false;
  }
}

// ============================================
// Unified API (routes based on build variant)
// ============================================

export async function sendMessage(
  message: string,
  conversationHistory: { role: string; content: string }[] = [],
): Promise<ApiResponse> {
  if (isPrivateBuild()) {
    return sendToGateway(message);
  }
  return sendToOpenAI(message, conversationHistory);
}

export async function checkConnection(): Promise<boolean> {
  if (isPrivateBuild()) {
    return checkGatewayConnection();
  }
  return checkOpenAIConnection();
}
