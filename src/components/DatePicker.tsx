/**
 * DatePicker — Simple date selector with prev/next arrows.
 *
 * Displays the date as "יום שלישי, 4 במרץ 2026" with < > buttons
 * to navigate one day at a time.
 */

import React from "react";
import { View, StyleSheet, Pressable } from "react-native";
import { Text } from "react-native-paper";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { dayName } from "@src/i18n";
import { RTL_ROW } from "@src/ui/rtl";

// Hebrew month names
const MONTHS_HE = [
  "בינואר",
  "בפברואר",
  "במרץ",
  "באפריל",
  "במאי",
  "ביוני",
  "ביולי",
  "באוגוסט",
  "בספטמבר",
  "באוקטובר",
  "בנובמבר",
  "בדצמבר",
];

function parseYMD(ymd: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function toYMD(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function formatDateHe(ymd: string): string {
  const date = parseYMD(ymd);
  const dow = dayName(date.getDay());
  const day = date.getDate();
  const month = MONTHS_HE[date.getMonth()];
  const year = date.getFullYear();
  return `${dow}, ${day} ${month} ${year}`;
}

interface Props {
  /** Date in "YYYY-MM-DD" format */
  value: string;
  /** Called with new "YYYY-MM-DD" when user navigates */
  onChange: (ymd: string) => void;
}

export default function DatePicker({ value, onChange }: Props) {
  const goBy = (days: number) => {
    const date = parseYMD(value);
    date.setDate(date.getDate() + days);
    onChange(toYMD(date));
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={() => goBy(1)} style={styles.arrow} hitSlop={12}>
        <MaterialCommunityIcons name="chevron-right" size={28} color="#6C63FF" />
      </Pressable>

      <Text style={styles.dateText}>{formatDateHe(value)}</Text>

      <Pressable onPress={() => goBy(-1)} style={styles.arrow} hitSlop={12}>
        <MaterialCommunityIcons name="chevron-left" size={28} color="#6C63FF" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F5F3FF",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
    marginBottom: 8,
  },
  arrow: {
    padding: 4,
  },
  dateText: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A2E",
  },
});
