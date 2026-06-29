/**
 * useEventVoice — record a Hebrew clip → a parsed calendar event via
 * /voice/event.
 *
 * Thin wrapper over useVoiceRecorder: stopAndTranscribe(context) stops
 * recording, uploads the clip (+ today's date + member/kid names so the
 * Assistant can resolve dates + match an assignee), and returns the parsed
 * event + a `missing` check for the caller to review before adding.
 */

import { useCallback } from "react";

import { voiceApi, type VoiceEventResult } from "@src/lib/api/endpoints";
import { useVoiceRecorder } from "./useVoiceRecorder";

export function useEventVoice() {
  const { status, start, stop, reset } = useVoiceRecorder();

  const stopAndTranscribe = useCallback(
    async (context?: {
      today: string;
      members: string[];
      kids: string[];
    }): Promise<VoiceEventResult | null> => {
      try {
        const uri = await stop();
        if (!uri) return null;
        return await voiceApi.event(uri, context);
      } finally {
        reset();
      }
    },
    [stop, reset],
  );

  return { status, start, stopAndTranscribe };
}
