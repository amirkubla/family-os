import { useCallback, useState } from "react";
import { useFocusEffect } from "@react-navigation/native";

/**
 * useBlurRemountKey — returns a key that changes each time the screen loses
 * focus. Feed it to a wrapping child (`<Inner key={useBlurRemountKey()} />`)
 * so that navigating away and back **remounts** the screen fresh: every piece
 * of local state — open modals (and their internal fields), sub-navigation
 * (current folder, selected category), transient selections, scroll position —
 * resets to its default. Screens should keep durable data in the store; only
 * ephemeral UI state lives in the remounted subtree.
 */
export function useBlurRemountKey(): number {
  const [key, setKey] = useState(0);
  useFocusEffect(
    useCallback(() => {
      // Bump on blur (the cleanup) — the outgoing screen remounts while it's
      // off-screen, so the next focus shows a clean default with no flicker.
      return () => setKey((k) => k + 1);
    }, []),
  );
  return key;
}
