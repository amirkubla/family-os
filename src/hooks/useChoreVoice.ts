/**
 * useChoreVoice — record a Hebrew clip → to-do tasks via /voice/chore.
 *
 * Thin wrapper over useVoiceRecorder: stopAndTranscribe() stops recording,
 * uploads the clip to the Assistant, and returns { transcript, items } for the
 * caller to review before adding. Nothing is written here.
 */

import { useCallback } from "react";

import { voiceApi, type VoiceChoreResult } from "@src/lib/api/endpoints";
import { useVoiceRecorder } from "./useVoiceRecorder";

export function useChoreVoice() {
  const { status, start, stop, reset } = useVoiceRecorder();

  const stopAndTranscribe = useCallback(async (): Promise<VoiceChoreResult | null> => {
    try {
      const uri = await stop();
      if (!uri) return null;
      return await voiceApi.chore(uri);
    } finally {
      reset();
    }
  }, [stop, reset]);

  return { status, start, stopAndTranscribe };
}
