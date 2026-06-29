/**
 * usePaymentVoice — record a Hebrew clip → a parsed payment via /voice/payment.
 *
 * Thin wrapper over useVoiceRecorder: stopAndTranscribe(context) stops
 * recording, uploads the clip (+ the family's category/member context so the
 * Assistant can derive the category + payer), and returns the parsed payment +
 * a `missing` check for the caller to review before adding.
 */

import { useCallback } from "react";

import { voiceApi, type VoicePaymentResult } from "@src/lib/api/endpoints";
import { useVoiceRecorder } from "./useVoiceRecorder";

export function usePaymentVoice() {
  const { status, start, stop, reset } = useVoiceRecorder();

  const stopAndTranscribe = useCallback(
    async (context?: {
      categories: string[];
      members: string[];
    }): Promise<VoicePaymentResult | null> => {
      try {
        const uri = await stop();
        if (!uri) return null;
        return await voiceApi.payment(uri, context);
      } finally {
        reset();
      }
    },
    [stop, reset],
  );

  return { status, start, stopAndTranscribe };
}
