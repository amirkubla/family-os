/**
 * useProjectVoice — record a free-form Hebrew clip → a project draft via
 * /voice/project.
 *
 * Thin wrapper over useVoiceRecorder: stopAndTranscribe() stops recording,
 * uploads the clip to the Assistant, and returns { transcript, title,
 * description } (description = verbatim transcript, title = LLM-generated name)
 * for the caller to review in the project editor before saving.
 */

import { useCallback } from "react";

import { voiceApi, type VoiceProjectResult } from "@src/lib/api/endpoints";
import { useVoiceRecorder } from "./useVoiceRecorder";

export function useProjectVoice() {
  const { status, start, stop, reset } = useVoiceRecorder();

  const stopAndTranscribe = useCallback(async (): Promise<VoiceProjectResult | null> => {
    try {
      const uri = await stop();
      if (!uri) return null;
      return await voiceApi.project(uri);
    } finally {
      reset();
    }
  }, [stop, reset]);

  return { status, start, stopAndTranscribe };
}
