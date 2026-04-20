/**
 * Speech-to-Text via OpenAI Whisper API
 * 
 * Records audio locally, then sends to OpenAI's /v1/audio/transcriptions
 * endpoint for high-quality transcription.
 */

import axios from 'axios';
import * as FileSystem from 'expo-file-system';

const OPENAI_BASE = 'https://api.openai.com/v1';

let apiKey = '';

export function configureSTT(key: string) {
  apiKey = key;
}

/**
 * Transcribe an audio file using OpenAI Whisper
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  if (!apiKey) {
    throw new Error('No API key — add your OpenAI key in Settings to enable voice');
  }

  try {
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio file not found');
    }

    const formData = new FormData();
    formData.append('file', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'json');

    const response = await axios.post<{ text: string }>(
      `${OPENAI_BASE}/audio/transcriptions`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
          'Authorization': `Bearer ${apiKey}`,
        },
        timeout: 15000,
      }
    );

    return response.data.text || '';
  } catch (error: any) {
    if (error.response?.status === 401) {
      throw new Error('Invalid API key for transcription');
    }
    if (error.response?.status === 429) {
      throw new Error('Rate limited — wait a moment');
    }
    console.warn('Whisper transcription failed:', error.message);
    throw new Error('Voice transcription failed — try typing instead');
  }
}
