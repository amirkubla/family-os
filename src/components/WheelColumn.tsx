/**
 * WheelColumn — one scroll-wheel column with a curved-drum effect.
 *
 * Items fade + shrink the further they sit from the centre row (driven by the
 * live scroll offset), so the column reads like a rotating drum — the selected
 * value is full size/opacity and neighbours roll off toward the edges. Snaps to
 * each row; reports the settled index. Shared by the time + date pickers.
 *
 * Web never fires onMomentumScrollEnd, so the settle is debounced off onScroll
 * there; native uses momentum/drag end.
 */

import React, { useRef, useEffect, useCallback } from "react";
import { Animated, Text, StyleSheet, Platform } from "react-native";

export const ITEM_HEIGHT = 40;
export const VISIBLE_ITEMS = 5;
const PAD = Math.floor(VISIBLE_ITEMS / 2); // padding rows above/below centre

interface Props {
  data: number[];
  /** Controlled selected index — the column scrolls here when it changes. */
  selectedIndex: number;
  /** Fires when scrolling settles on a new index. */
  onSettle: (index: number) => void;
  format: (value: number) => string;
  style?: any;
}

export default function WheelColumn({ data, selectedIndex, onSettle, format, style }: Props) {
  const ref = useRef<any>(null);
  const scrollY = useRef(new Animated.Value(selectedIndex * ITEM_HEIGHT)).current;
  const current = useRef(selectedIndex);
  const debounce = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // Keep the wheel parked on the controlled index (mount + external changes).
  useEffect(() => {
    current.current = selectedIndex;
    const tmr = setTimeout(
      () => ref.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false }),
      50,
    );
    return () => clearTimeout(tmr);
  }, [selectedIndex]);

  const settle = useCallback(
    (y: number) => {
      const idx = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), data.length - 1));
      if (idx !== current.current) {
        current.current = idx;
        onSettle(idx);
      }
    },
    [data.length, onSettle],
  );

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    {
      useNativeDriver: true,
      listener: (e: any) => {
        if (Platform.OS === "web") {
          clearTimeout(debounce.current);
          const y = e.nativeEvent.contentOffset.y;
          debounce.current = setTimeout(() => settle(y), 110);
        }
      },
    },
  );

  const onEnd = (e: { nativeEvent: { contentOffset: { y: number } } }) =>
    settle(e.nativeEvent.contentOffset.y);

  return (
    <Animated.ScrollView
      ref={ref}
      style={[styles.col, style]}
      showsVerticalScrollIndicator={false}
      snapToInterval={ITEM_HEIGHT}
      decelerationRate="fast"
      bounces={false}
      nestedScrollEnabled
      onScroll={handleScroll}
      scrollEventThrottle={16}
      onMomentumScrollEnd={onEnd}
      onScrollEndDrag={onEnd}
      contentContainerStyle={{ paddingTop: PAD * ITEM_HEIGHT, paddingBottom: PAD * ITEM_HEIGHT }}
      contentOffset={{ x: 0, y: selectedIndex * ITEM_HEIGHT }}
    >
      {data.map((item, i) => {
        const inputRange = [i - 2, i - 1, i, i + 1, i + 2].map((n) => n * ITEM_HEIGHT);
        const opacity = scrollY.interpolate({
          inputRange,
          outputRange: [0.18, 0.5, 1, 0.5, 0.18],
          extrapolate: "clamp",
        });
        const scale = scrollY.interpolate({
          inputRange,
          outputRange: [0.66, 0.84, 1, 0.84, 0.66],
          extrapolate: "clamp",
        });
        return (
          <Animated.View key={item} style={[styles.item, { opacity, transform: [{ scale }] }]}>
            <Text style={styles.itemText}>{format(item)}</Text>
          </Animated.View>
        );
      })}
    </Animated.ScrollView>
  );
}

const styles = StyleSheet.create({
  col: { height: ITEM_HEIGHT * VISIBLE_ITEMS },
  item: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
  itemText: { fontSize: 20, color: "#1A1A2E" },
});
