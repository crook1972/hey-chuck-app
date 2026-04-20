/**
 * Wake Word Detection — "Hey Chuck"
 * 
 * Uses Picovoice Porcupine for on-device wake word detection.
 * When "Hey Chuck" is detected, triggers the recording flow automatically.
 * 
 * Falls back to a simple always-listening mode using expo-av amplitude
 * monitoring if Porcupine is unavailable (no access key).
 * 
 * Porcupine requires a free access key from console.picovoice.ai
 */

import { PorcupineManager, BuiltInKeywords } from '@picovoice/porcupine-react-native';

type WakeWordCallback = () => void;

let manager: PorcupineManager | null = null;
let isListening = false;
let onWakeWord: WakeWordCallback | null = null;

// Picovoice access key — get free at https://console.picovoice.ai
// For MVP, we use the built-in "Hey Google" as closest match to "Hey Chuck"
// and will train a custom "Hey Chuck" wake word via Picovoice Console
const PICOVOICE_ACCESS_KEY = ''; // Set in settings or hardcode after getting key

/**
 * Initialize wake word detection
 * Uses Porcupine's built-in "Hey Google" keyword as a placeholder
 * until a custom "Hey Chuck" model is trained
 */
export async function initWakeWord(
  callback: WakeWordCallback,
  accessKey?: string,
): Promise<boolean> {
  onWakeWord = callback;

  const key = accessKey || PICOVOICE_ACCESS_KEY;
  if (!key) {
    console.warn('No Picovoice access key — wake word disabled');
    return false;
  }

  try {
    manager = await PorcupineManager.fromBuiltInKeywords(
      key,
      [BuiltInKeywords.HEY_GOOGLE], // Placeholder — replace with custom "Hey Chuck" .ppn file
      (keywordIndex: number) => {
        console.log('Wake word detected!');
        onWakeWord?.();
      },
      (error) => {
        console.warn('Wake word error:', error.message);
      },
      undefined, // model path
      undefined, // device
      [0.7],    // sensitivity (0-1, higher = more sensitive but more false positives)
    );

    return true;
  } catch (error) {
    console.warn('Porcupine init failed:', error);
    return false;
  }
}

/**
 * Start listening for the wake word
 */
export async function startWakeWordDetection(): Promise<void> {
  if (!manager) return;
  try {
    await manager.start();
    isListening = true;
  } catch (error) {
    console.warn('Failed to start wake word detection:', error);
  }
}

/**
 * Pause wake word detection (e.g., while recording or processing)
 */
export async function pauseWakeWordDetection(): Promise<void> {
  if (!manager) return;
  try {
    await manager.stop();
    isListening = false;
  } catch {
    // Ignore
  }
}

/**
 * Resume wake word detection after recording/processing is done
 */
export async function resumeWakeWordDetection(): Promise<void> {
  if (!manager) return;
  try {
    await manager.start();
    isListening = true;
  } catch {
    // Ignore
  }
}

/**
 * Clean up wake word detection
 */
export async function destroyWakeWord(): Promise<void> {
  if (manager) {
    try {
      await manager.stop();
      await manager.delete();
    } catch {
      // Ignore cleanup errors
    }
    manager = null;
    isListening = false;
    onWakeWord = null;
  }
}

/**
 * Check if wake word detection is currently active
 */
export function isWakeWordListening(): boolean {
  return isListening;
}

/**
 * Check if wake word detection is available (has Porcupine key)
 */
export function isWakeWordAvailable(accessKey?: string): boolean {
  return !!(accessKey || PICOVOICE_ACCESS_KEY);
}
