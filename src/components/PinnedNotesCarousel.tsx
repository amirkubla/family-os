/**
 * PinnedNotesCarousel — Horizontal swipeable carousel of pinned notes.
 *
 * Uses a native horizontal ScrollView with snap-to-interval for cross-platform
 * compatibility (web + iOS). RTL-aware via I18nManager.
 */

import React, { useRef, useState, useCallback } from "react";
import {
  View,
  StyleSheet,
  I18nManager,
  useWindowDimensions,
  Pressable,
  ScrollView,
  Platform,
} from "react-native";
import { Text } from "react-native-paper";
import type { Note } from "@src/models/note";
import { t } from "@src/i18n";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  notes: Note[];
  onNotePress: (note: Note) => void;
  onAddPress: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CARD_WIDTH_RATIO = 0.65;
const GAP = 12;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function PinnedNotesCarousel({
  notes,
  onNotePress,
  onAddPress,
}: Props) {
  const { width: screenWidth } = useWindowDimensions();
  const CARD_W = screenWidth * CARD_WIDTH_RATIO;
  const SNAP_INTERVAL = CARD_W + GAP;
  const sideInset = (screenWidth - CARD_W) / 2;
  const scrollRef = useRef<ScrollView>(null);

  // Web-only arrow navigation
  const [currentIndex, setCurrentIndex] = useState(0);
  const total = notes.length + 1; // +1 for the Add card

  // On web with direction:rtl, Chrome's scroll()/scrollTo() API normalises RTL
  // and rejects negative `left` values (clamped to 0).  Direct `scrollLeft`
  // assignment, however, accepts negative values and works correctly.
  // We obtain the underlying DOM node via getScrollableNode() and set scrollLeft
  // directly, bypassing RN Web's scrollResponderScrollTo entirely.
  const scrollToIndex = useCallback(
    (index: number) => {
      if (Platform.OS === "web") {
        // On web, Chrome's scroll()/scrollTo() API clamps RTL-negative `left`
        // values to 0. Direct `scrollLeft` assignment works correctly for both
        // LTR (+) and RTL (-). We check the element's computed direction because
        // I18nManager.isRTL is always false in react-native-web (it's a stub).
        const node = (scrollRef.current as any)?.getScrollableNode?.();
        if (node) {
          const isRTLEl = getComputedStyle(node).direction === "rtl";
          node.scrollLeft = isRTLEl
            ? -(index * SNAP_INTERVAL)
            : index * SNAP_INTERVAL;
        }
      } else {
        scrollRef.current?.scrollTo({ x: index * SNAP_INTERVAL, animated: true });
      }
    },
    [SNAP_INTERVAL],
  );

  const goNext = useCallback(() => {
    const next = Math.min(currentIndex + 1, total - 1);
    setCurrentIndex(next);
    // Defer scroll until after React re-render so the ScrollView doesn't
    // reset scrollLeft when it reconciles (RTL web only).
    setTimeout(() => scrollToIndex(next), 0);
  }, [currentIndex, total, scrollToIndex]);

  const goPrev = useCallback(() => {
    const prev = Math.max(currentIndex - 1, 0);
    setCurrentIndex(prev);
    setTimeout(() => scrollToIndex(prev), 0);
  }, [currentIndex, scrollToIndex]);

  const handleScrollEnd = useCallback((e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    // offset is negative in RTL/web — use absolute value
    setCurrentIndex(Math.round(Math.abs(offset) / SNAP_INTERVAL));
  }, [SNAP_INTERVAL]);

  return (
    <View style={styles.wrapper}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={SNAP_INTERVAL}
        decelerationRate="fast"
        contentContainerStyle={{
          paddingHorizontal: sideInset - GAP / 2,
        }}
        onMomentumScrollEnd={handleScrollEnd}
        // Flip scroll direction for RTL on web
        style={I18nManager.isRTL && Platform.OS === "web" ? { direction: "rtl" } : undefined}
      >
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            cardWidth={CARD_W}
            onPress={() => onNotePress(note)}
          />
        ))}
        {/* Add card */}
        <AddCard cardWidth={CARD_W} onPress={onAddPress} />
      </ScrollView>

      {/* Web-only prev/next arrows — individually positioned, no overlay */}
      {Platform.OS === "web" && currentIndex > 0 && (
        <Pressable style={[styles.arrowBtn, styles.arrowRight]} onPress={goPrev}>
          <Text style={styles.arrowText}>›</Text>
        </Pressable>
      )}
      {Platform.OS === "web" && currentIndex < total - 1 && (
        <Pressable style={[styles.arrowBtn, styles.arrowLeft]} onPress={goNext}>
          <Text style={styles.arrowText}>‹</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Note Card
// ---------------------------------------------------------------------------

function NoteCard({
  note,
  cardWidth,
  onPress,
}: {
  note: Note;
  cardWidth: number;
  onPress: () => void;
}) {
  return (
    <View style={{ width: cardWidth, marginHorizontal: GAP / 2 }}>
      <Pressable onPress={onPress} style={styles.noteCard}>
        <Text style={styles.pinIcon}>📌</Text>
        <Text
          variant="titleSmall"
          style={styles.noteTitle}
          numberOfLines={1}
        >
          {note.title || note.body.slice(0, 40)}
        </Text>
        <Text
          variant="bodySmall"
          style={styles.noteBody}
          numberOfLines={2}
        >
          {note.body}
        </Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Add Card
// ---------------------------------------------------------------------------

function AddCard({
  cardWidth,
  onPress,
}: {
  cardWidth: number;
  onPress: () => void;
}) {
  return (
    <View style={{ width: cardWidth, marginHorizontal: GAP / 2 }}>
      <Pressable onPress={onPress} style={styles.addCard}>
        <Text style={styles.addIcon}>+</Text>
        <Text style={styles.addLabel}>{t("today.addNote")}</Text>
      </Pressable>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 24,
    overflow: "visible",
  },

  // Web-only arrow buttons
  arrowBtn: {
    position: "absolute",
    top: 37, // (minHeight 110 - button 36) / 2
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.92)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  arrowLeft: { left: 4 },
  arrowRight: { right: 4 },
  arrowText: {
    fontSize: 22,
    color: "#6C63FF",
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 28,
  },

  // Note card
  noteCard: {
    backgroundColor: "#FFF3E0",
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  pinIcon: {
    position: "absolute",
    top: 10,
    left: I18nManager.isRTL ? 12 : undefined,
    right: I18nManager.isRTL ? undefined : 12,
    fontSize: 14,
  },
  noteTitle: {
    fontWeight: "700",
    color: "#1A1A2E",
    textAlign: "right",
    marginBottom: 6,
    marginTop: 4,
  },
  noteBody: {
    color: "#6B6B8D",
    textAlign: "right",
    lineHeight: 18,
  },

  // Add card
  addCard: {
    borderWidth: 2,
    borderColor: "#FFA72644",
    borderStyle: "dashed",
    borderRadius: 16,
    padding: 16,
    minHeight: 110,
    alignItems: "center",
    justifyContent: "center",
  },
  addIcon: {
    fontSize: 32,
    color: "#FFA726",
    fontWeight: "300",
    marginBottom: 4,
  },
  addLabel: {
    fontSize: 13,
    color: "#FFA726",
    fontWeight: "600",
  },
});
