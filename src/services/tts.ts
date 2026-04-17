import * as Speech from 'expo-speech';

let enabled = true;
let isSpeaking = false;

export function setTTSEnabled(value: boolean) {
  enabled = value;
  if (!value) stop();
}

export async function speak(text: string): Promise<void> {
  if (!enabled || !text) return;
  
  // Stop any current speech
  stop();

  return new Promise<void>((resolve) => {
    isSpeaking = true;
    Speech.speak(text, {
      language: 'en-US',
      pitch: 1.0,
      rate: 0.95,
      onDone: () => {
        isSpeaking = false;
        resolve();
      },
      onError: () => {
        isSpeaking = false;
        resolve();
      },
      onStopped: () => {
        isSpeaking = false;
        resolve();
      },
    });
  });
}

export function stop() {
  if (isSpeaking) {
    Speech.stop();
    isSpeaking = false;
  }
}

export function getIsSpeaking(): boolean {
  return isSpeaking;
}
