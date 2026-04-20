/**
 * Speech-to-Text service
 * 
 * Private build: sends audio to OpenClaw gateway for transcription
 * Public build: sends audio to OpenAI Whisper API
 */

import axios from 'axios';
import * as FileSystem from 'expo-file-system';
import { isPrivateBuild } from '../config/build';

let gatewayUrl = '';
let gatewayToken = '';
let openaiKey = '';

export function configureSTTGateway(url: string, token: string) {
  gatewayUrl = url.replace(/\/+$/, '');
  gatewayToken = token;
}

export function configureSTTOpenAI(key: string) {
  openaiKey = key;
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  const fileInfo = await FileSystem.getInfoAsync(audioUri);
  if (!fileInfo.exists) throw new Error('Audio file not found');

  if (isPrivateBuild()) {
    return transcribeViaGateway(audioUri);
  }
  return transcribeViaWhisper(audioUri);
}

async function transcribeViaGateway(audioUri: string): Promise<string> {
  if (!gatewayUrl) throw new Error('Gateway not configured');

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
          ...(gatewayToken ? { Authorization: `Bearer ${gatewayToken}` } : {}),
        },
        timeout: 15000,
      }
    );
    return response.data.text || '';
  } catch {
    // If gateway transcription fails, the user needs to type
    throw new Error('Voice transcription unavailable — try typing');
  }
}

async function transcribeViaWhisper(audioUri: string): Promise<string> {
  if (!openaiKey) throw new Error('No API key for transcription');

  const formData = new FormData();
  formData.append('file', {
    uri: audioUri,
    type: 'audio/m4a',
    name: 'recording.m4a',
  } as any);
  formData.append('model', 'whisper-1');
  formData.append('language', 'en');

  const response = await axios.post<{ text: string }>(
    'https://api.openai.com/v1/audio/transcriptions',
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
        Authorization: `Bearer ${openaiKey}`,
      },
      timeout: 15000,
    }
  );
  return response.data.text || '';
}
