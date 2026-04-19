/**
 * Speech-to-Text service
 * 
 * Primary: On-device Android speech recognition via @react-native-voice/voice
 * Fallback: Send audio to OpenClaw gateway for server-side transcription
 * 
 * On-device STT is preferred because:
 * - Zero latency for transcription (real-time)
 * - Works offline
 * - No server dependency
 * - Uses Google's built-in speech recognition on Android
 */

import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
} from '@react-native-voice/voice';

type TranscriptCallback = (text: string, isFinal: boolean) => void;

let onTranscript: TranscriptCallback | null = null;
let isListening = false;
let finalResult = '';

/**
 * Initialize the voice recognition engine
 */
export function initVoice(callback: TranscriptCallback) {
  onTranscript = callback;

  Voice.onSpeechResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] || '';
    finalResult = text;
    onTranscript?.(text, true);
  };

  Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
    const text = e.value?.[0] || '';
    onTranscript?.(text, false);
  };

  Voice.onSpeechError = (e: SpeechErrorEvent) => {
    console.warn('Speech recognition error:', e.error);
    isListening = false;
  };

  Voice.onSpeechEnd = () => {
    isListening = false;
  };
}

/**
 * Start listening for speech
 */
export async function startListening(): Promise<void> {
  try {
    finalResult = '';
    isListening = true;
    await Voice.start('en-US');
  } catch (error) {
    console.error('Failed to start voice recognition:', error);
    isListening = false;
    throw new Error('Voice recognition unavailable');
  }
}

/**
 * Stop listening and return the final transcript
 */
export async function stopListening(): Promise<string> {
  try {
    await Voice.stop();
    isListening = false;
    return finalResult;
  } catch (error) {
    console.error('Failed to stop voice recognition:', error);
    isListening = false;
    return finalResult;
  }
}

/**
 * Check if currently listening
 */
export function getIsListening(): boolean {
  return isListening;
}

/**
 * Clean up voice recognition resources
 */
export async function destroyVoice(): Promise<void> {
  try {
    await Voice.destroy();
    onTranscript = null;
    isListening = false;
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Check if on-device speech recognition is available
 */
export async function isVoiceAvailable(): Promise<boolean> {
  try {
    const services = await Voice.getSpeechRecognitionServices();
    return (services?.length ?? 0) > 0;
  } catch {
    return false;
  }
}
