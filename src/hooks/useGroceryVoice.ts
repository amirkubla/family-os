/**
 * useGroceryVoice — record a Hebrew clip → grocery items via /voice/grocery.
 *
 * Thin wrapper over useVoiceRecorder: stopAndTranscribe() stops recording,
 * uploads the clip (+ optional sub-category taxonomy) to the Assistant, and
 * returns { transcript, items } for the caller to review before adding.
 * Nothing is written here.
 */

import { useCallback } from "react";

import { voiceApi, type VoiceGroceryResult } from "@src/lib/api/endpoints";
import { useVoiceRecorder } from "./useVoiceRecorder";

export type { VoiceStatus } from "./useVoiceRecorder";

export function useGroceryVoice() {
  const { status, start, stop, reset } = useVoiceRecorder();

  const stopAndTranscribe = useCallback(
    async (taxonomy?: Record<string, string[]>): Promise<VoiceGroceryResult | null> => {
      try {
        const uri = await stop();
        if (!uri) return null;
        return await voiceApi.grocery(uri, taxonomy);
      } finally {
        reset();
      }
    },
    [stop, reset],
  );

  return { status, start, stopAndTranscribe };
}
