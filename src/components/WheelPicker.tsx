import React, { useRef, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Platform } from "react-native";
import { Text } from "react-native-paper";
import { C, R } from "@src/ui/tokens";

/**
 * A scroll-snap wheel column (iOS-style picker). Shared by ExpenseModal and
 * KidPaymentModal for recurrence day-of-week / day-of-month selection.
 */

export const WHEEL_ITEM_H = 40;
const WHEEL_VISIBLE = 3;
export const WHEEL_H = WHEEL_ITEM_H * WHEEL_VISIBLE;
const WHEEL_PAD = Math.floor(WHEEL_VISIBLE / 2);

export default function WheelPicker({
  data,
  selectedIndex,
  onChange,
  width,
}: {
  data: (string | number)[];
  selectedIndex: number;
  onChange: (index: number) => void;
  width: number;
}) {
  const scrollRef = useRef<ScrollView>(null);
  const selected = useRef(selectedIndex);
  const debounce = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    selected.current = selectedIndex;
    const timer = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * WHEEL_ITEM_H, animated: false });
    }, 50);
    return () => clearTimeout(timer);
  }, [selectedIndex]);

  const settle = useCallback(
    (y: number) => {
      const idx = Math.round(y / WHEEL_ITEM_H);
      const clamped = Math.max(0, Math.min(idx, data.length - 1));
      if (selected.current !== clamped) {
        selected.current = clamped;
        onChange(clamped);
      }
    },
    [onChange, data.length],
  );

  const onScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => settle(e.nativeEvent.contentOffset.y),
    [settle],
  );

  const onScrollDebounced = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      clearTimeout(debounce.current);
      debounce.current = setTimeout(() => settle(e.nativeEvent.contentOffset.y), 80);
    },
    [settle],
  );

  return (
    <View style={[wheelStyles.container, { width }]}>
      <View style={wheelStyles.highlight} pointerEvents="none" />
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        snapToInterval={WHEEL_ITEM_H}
        decelerationRate="fast"
        bounces={false}
        nestedScrollEnabled
        onMomentumScrollEnd={onScrollEnd}
        onScrollEndDrag={onScrollEnd}
        {...(Platform.OS === "web" ? { onScroll: onScrollDebounced, scrollEventThrottle: 16 } : {})}
        style={{ height: WHEEL_H, width }}
        contentContainerStyle={{
          paddingTop: WHEEL_PAD * WHEEL_ITEM_H,
          paddingBottom: WHEEL_PAD * WHEEL_ITEM_H,
        }}
        contentOffset={{ x: 0, y: selectedIndex * WHEEL_ITEM_H }}
      >
        {data.map((item, i) => (
          <View key={i} style={wheelStyles.item}>
            <Text style={wheelStyles.itemText}>{item}</Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const wheelStyles = StyleSheet.create({
  container: {
    height: WHEEL_H,
    overflow: "hidden",
    borderRadius: R.md,
    backgroundColor: "#F5F3FF",
  },
  highlight: {
    position: "absolute",
    top: WHEEL_PAD * WHEEL_ITEM_H,
    left: 4,
    right: 4,
    height: WHEEL_ITEM_H,
    backgroundColor: "#E8E6FF",
    borderRadius: R.sm,
    zIndex: 0,
  },
  item: {
    height: WHEEL_ITEM_H,
    alignItems: "center",
    justifyContent: "center",
  },
  itemText: {
    fontSize: 16,
    fontWeight: "600",
    color: C.textPrimary,
    writingDirection: "rtl",
  },
});
