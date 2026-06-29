/**
 * useVoiceRecorder — generic device-mic recording (expo-audio).
 *
 * start() requests permission + begins recording; stop() ends it and returns
 * the clip URI; reset() returns to idle (call after the upload finishes). The
 * status drives FAB visuals: idle → recording → processing → idle.
 *
 * Shared by the grocery + note voice flows — each uploads the URI to its own
 * Assistant endpoint. Native capability: needs the mic permission + a build
 * (web works via MediaRecorder, but iOS/Android is the target).
 */

import { useCallback, useState } from "react";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

export type VoiceStatus = "idle" | "recording" | "processing";

export function useVoiceRecorder() {
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const [status, setStatus] = useState<VoiceStatus>("idle");

  /** Request mic permission + begin recording. Returns false if denied. */
  const start = useCallback(async (): Promise<boolean> => {
    const perm = await requestRecordingPermissionsAsync();
    if (!perm.granted) return false;
    await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
    await recorder.prepareToRecordAsync();
    recorder.record();
    setStatus("recording");
    return true;
  }, [recorder]);

  /** Stop recording (status → processing) and return the clip URI, or null. */
  const stop = useCallback(async (): Promise<string | null> => {
    setStatus("processing");
    await recorder.stop();
    return recorder.uri ?? null;
  }, [recorder]);

  /** Back to idle — call after the upload finishes (success or failure). */
  const reset = useCallback(() => setStatus("idle"), []);

  return { status, start, stop, reset };
}
