/**
 * useNoteVoice — record a free-form Hebrew clip → a note draft via /voice/note.
 *
 * Thin wrapper over useVoiceRecorder: stopAndTranscribe() stops recording,
 * uploads the clip to the Assistant, and returns { transcript, title, body }
 * (body = verbatim transcript, title = LLM-generated) for the caller to review
 * in the note editor before saving. Nothing is written here.
 */

import { useCallback } from "react";

import { voiceApi, type VoiceNoteResult } from "@src/lib/api/endpoints";
import { useVoiceRecorder } from "./useVoiceRecorder";

export function useNoteVoice() {
  const { status, start, stop, reset } = useVoiceRecorder();

  const stopAndTranscribe = useCallback(async (): Promise<VoiceNoteResult | null> => {
    try {
      const uri = await stop();
      if (!uri) return null;
      return await voiceApi.note(uri);
    } finally {
      reset();
    }
  }, [stop, reset]);

  return { status, start, stopAndTranscribe };
}
