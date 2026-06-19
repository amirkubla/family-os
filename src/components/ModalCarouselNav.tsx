import React from "react";
import { View, StyleSheet } from "react-native";
import { IconButton } from "react-native-paper";
import { RTL_ROW } from "@src/ui/rtl";
import { C, S } from "@src/ui/tokens";

/**
 * A small top nav bar shown inside the kid "add" modals when they're opened as
 * a carousel (via the kid-view FAB). Left/right arrows cycle between the add
 * types (event / note / project / payment); dots show the current position.
 */
export interface CarouselNav {
  index: number;
  count: number;
  onPrev: () => void;
  onNext: () => void;
}

export default function ModalCarouselNav({ index, count, onPrev, onNext }: CarouselNav) {
  return (
    <View style={styles.bar}>
      {/* In RTL, the right-pointing chevron reads as "back". */}
      <IconButton
        icon="chevron-right"
        size={26}
        iconColor={C.purple}
        onPress={onPrev}
        accessibilityLabel="הקודם"
        testID="carousel-prev"
      />
      <View style={styles.dots}>
        {Array.from({ length: count }, (_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>
      <IconButton
        icon="chevron-left"
        size={26}
        iconColor={C.purple}
        onPress={onNext}
        accessibilityLabel="הבא"
        testID="carousel-next"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.xs,
  },
  dots: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    gap: 6,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: C.border,
  },
  dotActive: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: C.purple,
  },
});
