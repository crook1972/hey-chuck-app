import { Audio } from 'expo-av';
import { Platform } from 'react-native';

let recording: Audio.Recording | null = null;

export async function requestPermissions(): Promise<boolean> {
  try {
    const { granted } = await Audio.requestPermissionsAsync();
    if (granted) {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
    }
    return granted;
  } catch {
    return false;
  }
}

export async function startRecording(): Promise<void> {
  try {
    if (recording) {
      await stopRecording();
    }
    const { recording: newRecording } = await Audio.Recording.createAsync(
      Audio.RecordingOptionsPresets.HIGH_QUALITY
    );
    recording = newRecording;
  } catch (error) {
    console.error('Failed to start recording:', error);
    throw new Error('Could not start recording');
  }
}

export async function stopRecording(): Promise<string | null> {
  try {
    if (!recording) return null;
    await recording.stopAndUnloadAsync();
    await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
    const uri = recording.getURI();
    recording = null;
    return uri;
  } catch (error) {
    console.error('Failed to stop recording:', error);
    recording = null;
    return null;
  }
}

export function isRecording(): boolean {
  return recording !== null;
}
