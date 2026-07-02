/**
 * NowIndicator — the "current time" line for the Week / Day time-grids.
 *
 * A thin horizontal line at the current minute, with a dot at its START (the
 * right edge in RTL) that emits expanding, fading ripple rings (~every ¾s) for
 * a live "pulse" effect. Purely decorative + non-interactive (pointerEvents
 * none), so it never blocks slot / event taps underneath.
 *
 * The parent computes `top` (px within the grid) from its own geometry and only
 * renders this on today's column; `useNowMinutes` keeps the clock ticking.
 */

import React, { useEffect, useRef, useState } from "react";
import { Animated, Easing, Platform, StyleSheet, View } from "react-native";

const LINE_H = 2;
const DOT = 13;
const RING = 44; // max ripple diameter
const PERIOD = 1500; // one ripple ≈ 1.5s; two rings stagger → a wave ~every 0.75s

// Pin to the writing-direction START (physical RIGHT in RTL). Native mirrors
// absolute left/right under RTL, so `left` lands on the right; web doesn't, so
// use `right`. Same trick as fabAnchor. The ring is centred on the dot, so its
// inset is offset inward by half the size difference.
const isWeb = Platform.OS === "web";
const DOT_POS = isWeb ? { right: 0 } : { left: 0 };
const RING_POS = isWeb ? { right: (DOT - RING) / 2 } : { left: (DOT - RING) / 2 };

/** Current time as minutes-from-midnight, re-read every 60s. */
export function useNowMinutes(): number {
  const [min, setMin] = useState(() => {
    const d = new Date();
    return d.getHours() * 60 + d.getMinutes();
  });
  useEffect(() => {
    const id = setInterval(() => {
      const d = new Date();
      setMin(d.getHours() * 60 + d.getMinutes());
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return min;
}

export default function NowIndicator({ top, color }: { top: number; color: string }) {
  const a = useRef(new Animated.Value(0)).current;
  const b = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const useNative = Platform.OS !== "web";
    const ripple = (v: Animated.Value) =>
      Animated.loop(
        Animated.timing(v, {
          toValue: 1,
          duration: PERIOD,
          easing: Easing.out(Easing.quad),
          useNativeDriver: useNative,
        }),
      );
    const l1 = ripple(a);
    const l2 = ripple(b);
    l1.start();
    // Phase-shift the second ring by half a period → a continuous wave.
    const stagger = setTimeout(() => l2.start(), PERIOD / 2);
    return () => {
      clearTimeout(stagger);
      l1.stop();
      l2.stop();
      a.setValue(0);
      b.setValue(0);
    };
  }, [a, b]);

  const ringStyle = (v: Animated.Value) => ({
    opacity: v.interpolate({ inputRange: [0, 1], outputRange: [0.5, 0] }),
    transform: [
      { scale: v.interpolate({ inputRange: [0, 1], outputRange: [DOT / RING, 1] }) },
    ],
  });

  return (
    <View pointerEvents="none" style={[styles.wrap, { top }]}>
      <View style={[styles.line, { backgroundColor: color }]} />
      <Animated.View style={[styles.ring, RING_POS, { borderColor: color }, ringStyle(a)]} />
      <Animated.View style={[styles.ring, RING_POS, { borderColor: color }, ringStyle(b)]} />
      <View style={[styles.dot, DOT_POS, { backgroundColor: color }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: 0, right: 0, height: 0, zIndex: 5 },
  line: {
    position: "absolute",
    left: 0,
    right: 0,
    top: -LINE_H / 2,
    height: LINE_H,
    borderRadius: LINE_H / 2,
  },
  // Dot sits flush against the line's start edge; ring is concentric with it.
  dot: {
    position: "absolute",
    top: -DOT / 2,
    width: DOT,
    height: DOT,
    borderRadius: DOT / 2,
  },
  ring: {
    position: "absolute",
    top: -RING / 2,
    width: RING,
    height: RING,
    borderRadius: RING / 2,
    borderWidth: 2,
  },
});
