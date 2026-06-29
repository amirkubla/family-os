/**
 * useGroceryVoice — record a Hebrew voice clip and turn it into grocery items.
 *
 * POC flow: start() records via the device mic (expo-audio); stopAndTranscribe()
 * stops, uploads the clip to the Assistant's /voice/grocery endpoint (Whisper +
 * grocery parsing), and returns { transcript, items } for the caller to review
 * before adding. Nothing is written here.
 *
 * Recording is a native capability — needs the mic permission + a dev/EAS build
 * (not Expo Go web). iOS first.
 */

import { useCallback, useState } from "react";
import {
  useAudioRecorder,
  RecordingPresets,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
} from "expo-audio";

import { voiceApi, type VoiceGroceryResult } from "@src/lib/api/endpoints";

export type VoiceStatus = "idle" | "recording" | "processing";

export function useGroceryVoice() {
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

  /** Stop recording, upload the clip (+ optional taxonomy), return the result. */
  const stopAndTranscribe = useCallback(
    async (taxonomy?: Record<string, string[]>): Promise<VoiceGroceryResult | null> => {
      setStatus("processing");
      try {
        await recorder.stop();
        const uri = recorder.uri;
        if (!uri) return null;
        return await voiceApi.grocery(uri, taxonomy);
      } finally {
        setStatus("idle");
      }
    },
    [recorder],
  );

  return { status, start, stopAndTranscribe };
}
