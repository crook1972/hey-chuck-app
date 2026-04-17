/**
 * Speech-to-Text service
 * 
 * For MVP, we use a simple approach:
 * 1. Record audio using expo-av
 * 2. Send the audio file to an STT API endpoint
 * 
 * The app supports two modes:
 * - Server-side STT: Send audio to OpenClaw which handles transcription
 * - On-device STT: Use Android's built-in speech recognition (future)
 * 
 * For the initial build, we route audio through the OpenClaw API
 * which can use Whisper or any configured STT provider.
 */

import axios from 'axios';
import * as FileSystem from 'expo-file-system';

let apiUrl = 'http://localhost:3000';
let authToken = '';

export function configureSTT(url: string, token: string) {
  apiUrl = url.replace(/\/+$/, '');
  authToken = token;
}

export async function transcribeAudio(audioUri: string): Promise<string> {
  try {
    // Read audio file and send to server for transcription
    const formData = new FormData();
    
    // Get file info
    const fileInfo = await FileSystem.getInfoAsync(audioUri);
    if (!fileInfo.exists) {
      throw new Error('Audio file not found');
    }

    // Create form data with audio file
    formData.append('audio', {
      uri: audioUri,
      type: 'audio/m4a',
      name: 'recording.m4a',
    } as any);

    const response = await axios.post<{ text: string; confidence: number }>(
      `${apiUrl}/api/v1/transcribe`,
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
    console.error('Transcription failed:', error);
    throw new Error('Failed to transcribe audio — try typing instead');
  }
}

/**
 * Simulated transcription for development/demo mode
 * Returns a placeholder when no API is configured
 */
export async function transcribeLocal(_audioUri: string): Promise<string> {
  // In demo mode, return a placeholder
  // This allows testing the full flow without an API
  return '[Voice transcription will appear here when API is connected]';
}
