/**
 * ScreenScrollView — a ScrollView that snaps back to the top whenever its
 * screen gains focus.
 *
 * In the tab navigator every screen stays mounted, so navigating back to a
 * page you previously scrolled would otherwise reopen it at the old position.
 * This resets to the top on each focus, so pages always open at the top.
 *
 * Drop-in replacement for a screen's top-level <ScrollView> — forwards all
 * props (and an optional ref).
 */

import React, { useRef, useImperativeHandle, useCallback } from "react";
import { ScrollView, type ScrollViewProps } from "react-native";
import { useFocusEffect } from "@react-navigation/native";

const ScreenScrollView = React.forwardRef<ScrollView, ScrollViewProps>((props, forwardedRef) => {
  const ref = useRef<ScrollView>(null);
  useImperativeHandle(forwardedRef, () => ref.current as ScrollView, []);

  useFocusEffect(
    useCallback(() => {
      // Reset to the top on focus. Try immediately (works on native) and again
      // after a tick: on web, inactive screens are display:none and the focus
      // event can fire before the screen is shown, so an immediate scroll on a
      // hidden element is a no-op — the delayed pass lands once it's visible.
      const reset = () => ref.current?.scrollTo({ y: 0, animated: false });
      reset();
      const id = setTimeout(reset, 60);
      return () => clearTimeout(id);
    }, []),
  );

  return <ScrollView ref={ref} {...props} />;
});

ScreenScrollView.displayName = "ScreenScrollView";

export default ScreenScrollView;
