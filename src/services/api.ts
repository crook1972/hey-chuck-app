import axios, { AxiosError } from 'axios';
import { ApiResponse } from '../types';

/**
 * OpenAI API Client
 * 
 * Hey Chuck uses OpenAI's API directly for chat and audio.
 * Each user can enter their own API key, or the app ships with
 * a default Chuck Intelligence key for out-of-box experience.
 * 
 * Endpoints used:
 * - POST /v1/chat/completions (GPT chat)
 * - POST /v1/audio/transcriptions (Whisper STT)
 */

const OPENAI_BASE = 'https://api.openai.com/v1';

// Default key for out-of-box experience (Chuck Intelligence account)
// Users can override with their own key in Settings
const DEFAULT_API_KEY = '';

let apiKey = DEFAULT_API_KEY;
let model = 'gpt-4o-mini';

const SYSTEM_PROMPT = `You are Chuck, a fast, reliable voice assistant. You help users get things done quickly.

Key behaviors:
- Be concise. Voice responses should be short and clear.
- Be direct. Skip filler words and pleasantries.
- If a task is ambiguous, ask one clarifying question.
- For complex requests, break them into steps.
- Always confirm when you've completed something.
- If you can't do something, say so immediately.

You're optimized for voice interaction — keep responses under 2-3 sentences when possible.`;

export function configureApi(key: string, modelOverride?: string) {
  apiKey = key || DEFAULT_API_KEY;
  if (modelOverride) model = modelOverride;
}

export function getApiKey(): string {
  return apiKey;
}

function getHeaders() {
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };
}

/**
 * Send a chat message to OpenAI GPT
 */
export async function sendMessage(
  message: string,
  conversationHistory: { role: string; content: string }[] = [],
): Promise<ApiResponse> {
  if (!apiKey) {
    throw new Error('No API key set — add your OpenAI key in Settings');
  }

  try {
    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...conversationHistory.slice(-20), // Keep last 20 messages for context
      { role: 'user', content: message },
    ];

    const response = await axios.post(
      `${OPENAI_BASE}/chat/completions`,
      {
        model,
        messages,
        max_tokens: 1024,
        temperature: 0.7,
      },
      {
        headers: getHeaders(),
        timeout: 30000,
      }
    );

    const reply = response.data.choices?.[0]?.message?.content || 'No response';

    return {
      reply,
      status: 'done',
    };
  } catch (error) {
    const axiosError = error as AxiosError<any>;

    if (axiosError.response) {
      const status = axiosError.response.status;
      const errMsg = axiosError.response.data?.error?.message || '';

      if (status === 401) {
        throw new Error('Invalid API key — check your key in Settings');
      }
      if (status === 429) {
        throw new Error('Rate limited — wait a moment and try again');
      }
      if (status === 402 || errMsg.includes('billing')) {
        throw new Error('API billing issue — check your OpenAI account');
      }
      throw new Error(`API error (${status}): ${errMsg || 'Unknown error'}`);
    } else if (axiosError.code === 'ECONNABORTED') {
      throw new Error('Request timed out — try again');
    } else if (axiosError.code === 'ERR_NETWORK') {
      throw new Error('No internet connection');
    }
    throw new Error('Failed to reach OpenAI');
  }
}

/**
 * Check if the API key is valid
 */
export async function checkConnection(): Promise<boolean> {
  if (!apiKey) return false;

  try {
    const response = await axios.get(`${OPENAI_BASE}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      timeout: 5000,
    });
    return response.status === 200;
  } catch {
    return false;
  }
}
