/**
 * Speech-to-Text service
 * 
 * MVP approach: Record audio with expo-av, then either:
 * 1. Send to OpenClaw gateway for server-side transcription (Whisper etc.)
 * 2. Use typed text as fallback
 * 
 * The audio recording is handled by the audio service.
 * This service manages the transcription pipeline.
 * 
 * Future: Add on-device STT via expo-speech-recognition when stable.
 */

import axios from 'axios';

let apiUrl = 'http://localhost:18789';
let authToken = '';

export function configureSTT(url: string, token: string) {
  apiUrl = url.replace(/\/+$/, '');
  authToken = token;
}

/**
 * Transcribe an audio file via the OpenClaw gateway
 * Sends the audio as multipart form data to the transcribe endpoint
 */
export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    const formData = new FormData();
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await axios.post<{ text: string; confidence?: number }>(
      `${apiUrl}/api/transcribe`,
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
  } catch (error) {
    console.warn('Server transcription failed, audio recorded for manual review');
    throw new Error('Voice transcription unavailable — try typing instead');
  }
}
