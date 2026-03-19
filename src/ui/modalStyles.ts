/**
 * Shared modal styles — used across all modal components.
 * Import these instead of defining per-modal style objects.
 */

import { StyleSheet } from "react-native";
import { C, S, R } from "./tokens";
import { RTL_ROW } from "./rtl";

export const MS = StyleSheet.create({
  heading: {
    fontWeight: "700",
    marginBottom: S.lg,
    textAlign: "right",
    color: C.textPrimary,
    fontSize: 18,
  },
  subtitle: {
    fontSize: 13,
    color: C.purple,
    textAlign: "right",
    marginTop: -S.sm,
    marginBottom: S.md,
  },
  label: {
    textAlign: "right",
    marginTop: S.sm,
    marginBottom: S.xs + 2,
    color: C.textSecondary,
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    marginBottom: S.md,
    textAlign: "right",
    writingDirection: "rtl",
    backgroundColor: C.surface,
  },
  inputContent: {
    textAlign: "right",
  },
  error: {
    color: C.red,
    fontSize: 12,
    marginBottom: S.xs,
    marginTop: -(S.xs),
    textAlign: "right",
  },
  chipRow: {
    flexDirection: RTL_ROW,
    flexWrap: "wrap",
    gap: S.sm - 2,
    marginBottom: S.md - 2,
  },
  chip: {
    borderRadius: R.xl,
  },
  chipLabel: {
    fontSize: 12,
  },
  segmented: {
    marginBottom: S.sm + 2,
    marginTop: S.xs,
  },
  timeRow: {
    flexDirection: RTL_ROW,
    gap: S.md,
    marginBottom: S.xl,
  },
  timeCol: {
    flex: 1,
  },
  actions: {
    flexDirection: RTL_ROW,
    justifyContent: "flex-end",
    gap: S.sm,
    marginTop: S.md,
    paddingTop: S.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: C.border,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginVertical: S.md,
  },
});
