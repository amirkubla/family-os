import React, { useState, useMemo } from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { Text, FAB, IconButton } from "react-native-paper";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  addExpenseRemote,
  deleteExpenseRemote,
  addBudgetCategoryRemote,
  updateBudgetCategoryRemote,
  deleteBudgetCategoryRemote,
} from "@src/lib/sync/remoteCrud";
import { t, LOCALE } from "@src/i18n";
import { C, S, R, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { formatILS } from "@src/models/budget";
import type { Expense, BudgetCategory } from "@src/models/budget";
import ExpenseModal from "@src/components/ExpenseModal";
import BudgetCategoryModal from "@src/components/BudgetCategoryModal";
import ConfirmDeleteModal from "@src/components/ConfirmDeleteModal";
import { useConfirmDelete } from "@src/hooks/useConfirmDelete";
import SectionHeader from "@src/components/SectionHeader";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
}

function monthLabel(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  return new Date(y, m - 1).toLocaleString(LOCALE, { month: "long", year: "numeric" });
}

function prevMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 2);
  return toYearMonth(d);
}

function nextMonth(ym: string): string {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m);
  return toYearMonth(d);
}

// ---------------------------------------------------------------------------
// Screen
// ---------------------------------------------------------------------------

export default function BudgetScreen() {
  const insets = useSafeAreaInsets();
  const budgetCategories = useFamilyStore((s) => s.budgetCategories);
  const allExpenses = useFamilyStore((s) => s.expenses);
  const familyMembers = useFamilyStore((s) => s.familyMembers);

  const currentYM = toYearMonth(new Date());
  const [selectedYM, setSelectedYM] = useState(currentYM);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [catModalVisible, setCatModalVisible] = useState(false);
  const [editCategory, setEditCategory] = useState<BudgetCategory | null>(null);
  const [managingCats, setManagingCats] = useState(false);

  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  const monthExpenses = useMemo(() => {
    return allExpenses
      .filter((e) => e.date.startsWith(selectedYM))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allExpenses, selectedYM]);

  const totalSpent = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses],
  );

  const totalCap = useMemo(
    () => budgetCategories.reduce((sum, c) => sum + (c.monthlyCap ?? 0), 0),
    [budgetCategories],
  );

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) {
      map[e.categoryName] = (map[e.categoryName] ?? 0) + e.amount;
    }
    return map;
  }, [monthExpenses]);

  const isCurrentMonth = selectedYM === currentYM;

  const handleSaveExpense = (data: Parameters<typeof addExpenseRemote>[0]) => {
    if (editExpense) {
      deleteExpenseRemote(editExpense.id);
    }
    addExpenseRemote(data);
    setEditExpense(null);
  };

  const handleDeleteExpense = (expense: Expense) => {
    requestDelete(() => deleteExpenseRemote(expense.id));
  };

  const handleSaveCategory = (data: Parameters<typeof addBudgetCategoryRemote>[0]) => {
    if (editCategory) {
      updateBudgetCategoryRemote(editCategory.id, data);
    } else {
      addBudgetCategoryRemote({ ...data, sortOrder: budgetCategories.length });
    }
    setEditCategory(null);
  };

  const handleDeleteCategory = (cat: BudgetCategory) => {
    requestDelete(() => deleteBudgetCategoryRemote(cat.id));
  };

  const spendPct = totalCap > 0 ? Math.min(totalSpent / totalCap, 1) : 0;
  const barColor = spendPct > 0.9 ? C.red : spendPct > 0.7 ? C.amber : C.teal;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigation — RTL_ROW: first child appears on RIGHT, last on LEFT.
            chevron-right (→) on RIGHT = go forward in time (next month).
            chevron-left  (←) on LEFT  = go back in time (prev month). */}
        <View style={styles.monthHeader}>
          <IconButton
            icon="chevron-right"
            size={22}
            onPress={() => setSelectedYM(nextMonth(selectedYM))}
            disabled={isCurrentMonth}
          />
          <Text style={styles.monthLabel}>{monthLabel(selectedYM)}</Text>
          <IconButton
            icon="chevron-left"
            size={22}
            onPress={() => setSelectedYM(prevMonth(selectedYM))}
          />
        </View>

        {/* Summary card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summarySubtitle}>{t("budget.totalSpent", { month: "" }).trim()}</Text>
          <Text style={styles.summaryAmount}>{formatILS(totalSpent)}</Text>
          {totalCap > 0 && (
            <>
              <Text style={styles.summaryOf}>{t("budget.ofBudget", { cap: formatILS(totalCap) })}</Text>
              <View style={styles.barTrack}>
                <View
                  style={[
                    styles.barFill,
                    { width: `${spendPct * 100}%` as any, backgroundColor: barColor },
                  ]}
                />
              </View>
              {totalSpent < totalCap && (
                <Text style={styles.summaryRemaining}>
                  {t("budget.remaining", { amount: formatILS(totalCap - totalSpent) })}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Categories section header + manage toggle */}
        <View style={styles.sectionRow}>
          <Pressable onPress={() => setManagingCats((v) => !v)}>
            <Text style={[styles.sectionAction, { color: ACCENT }]}>
              {managingCats ? "סיום" : "ניהול"}
            </Text>
          </Pressable>
          <Text style={styles.sectionTitle}>{t("budget.categories")}</Text>
        </View>

        {budgetCategories.map((cat) => {
          const spent = categoryTotals[cat.name] ?? 0;
          const pct = cat.monthlyCap ? Math.min(spent / cat.monthlyCap, 1) : null;
          const catBarColor =
            pct != null && pct > 0.9 ? C.red
            : pct != null && pct > 0.7 ? C.amber
            : cat.color;
          return (
            <View key={cat.id} style={styles.catRow}>
              <View style={[styles.catIcon, { backgroundColor: cat.color + "22" }]}>
                <Text style={styles.catEmoji}>{cat.icon}</Text>
              </View>
              <View style={styles.catInfo}>
                <View style={[{ flexDirection: RTL_ROW }, styles.catNameRow]}>
                  <Text style={styles.catName}>{cat.name}</Text>
                  <Text style={styles.catAmount}>{formatILS(spent)}</Text>
                </View>
                {cat.monthlyCap ? (
                  <>
                    <View style={styles.barTrackSmall}>
                      <View
                        style={[
                          styles.barFillSmall,
                          {
                            width: `${(pct ?? 0) * 100}%` as any,
                            backgroundColor: catBarColor,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.catCap}>{formatILS(cat.monthlyCap)} תקציב</Text>
                  </>
                ) : null}
              </View>
              {managingCats && (
                <View style={{ flexDirection: RTL_ROW }}>
                  <IconButton
                    icon="pencil-outline"
                    size={18}
                    onPress={() => {
                      setEditCategory(cat);
                      setCatModalVisible(true);
                    }}
                  />
                  <IconButton
                    icon="trash-can-outline"
                    size={18}
                    onPress={() => handleDeleteCategory(cat)}
                  />
                </View>
              )}
            </View>
          );
        })}

        {managingCats && (
          <Pressable
            style={styles.addCatBtn}
            onPress={() => {
              setEditCategory(null);
              setCatModalVisible(true);
            }}
          >
            <Text style={styles.addCatText}>+ {t("budget.addCategory")}</Text>
          </Pressable>
        )}

        {/* Recent expenses */}
        <SectionHeader label={t("budget.recentExpenses")} />

        {monthExpenses.length === 0 ? (
          <Text style={styles.empty}>{t("budget.noExpenses")}</Text>
        ) : (
          monthExpenses.map((exp) => {
            const member = familyMembers.find((m) => m.id === exp.payerMemberId);
            const cat = budgetCategories.find((c) => c.name === exp.categoryName);
            return (
              <View key={exp.id} style={styles.expRow}>
                <View
                  style={[
                    styles.expAvatar,
                    { backgroundColor: (member?.color ?? "#9B59B6") + "33" },
                  ]}
                >
                  <Text style={styles.expAvatarEmoji}>{member?.avatarEmoji ?? "🧑"}</Text>
                </View>
                <View style={styles.expInfo}>
                  <Text style={[styles.expTitle, { textAlign: TEXT_RIGHT }]}>
                    {cat?.icon ?? "📦"} {exp.categoryName}
                    {exp.note ? `  •  ${exp.note}` : ""}
                  </Text>
                  <Text style={[styles.expMeta, { textAlign: TEXT_RIGHT }]}>
                    {exp.date}
                    {member ? `  •  ${member.name}` : ""}
                  </Text>
                </View>
                <View style={styles.expRight}>
                  <Text style={styles.expAmount}>{formatILS(exp.amount)}</Text>
                  <IconButton
                    icon="trash-can-outline"
                    size={16}
                    onPress={() => handleDeleteExpense(exp)}
                    iconColor={C.textSecondary}
                  />
                </View>
              </View>
            );
          })
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      <FAB
        icon="plus"
        style={[
          styles.fab,
          { bottom: insets.bottom + S.lg },
          Platform.OS === "web" && ({ position: "fixed" } as any),
        ]}
        onPress={() => {
          setEditExpense(null);
          setExpenseModalVisible(true);
        }}
        color="#fff"
      />

      <ExpenseModal
        visible={expenseModalVisible}
        onDismiss={() => {
          setExpenseModalVisible(false);
          setEditExpense(null);
        }}
        editExpense={editExpense}
        onSave={handleSaveExpense}
      />

      <BudgetCategoryModal
        visible={catModalVisible}
        onDismiss={() => {
          setCatModalVisible(false);
          setEditCategory(null);
        }}
        editCategory={editCategory}
        onSave={handleSaveCategory}
      />

      <ConfirmDeleteModal
        visible={confirmVisible}
        onConfirm={confirmDelete}
        onDismiss={dismissConfirm}
      />
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const ACCENT = "#9B59B6";

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  scroll: { flex: 1 },
  content: { padding: S.lg },

  monthHeader: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: S.md,
  },
  monthLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: "center",
    writingDirection: "rtl",
  },

  summaryCard: {
    backgroundColor: C.surface,
    borderRadius: R.lg,
    padding: S.lg,
    marginBottom: S.lg,
    ...SHADOW.md,
    borderRightWidth: 4,
    borderRightColor: ACCENT,
  },
  summarySubtitle: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginBottom: 4,
    writingDirection: "rtl",
  },
  summaryAmount: {
    fontSize: 36,
    fontWeight: "800",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  summaryOf: {
    fontSize: 13,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginTop: 2,
    writingDirection: "rtl",
  },
  summaryRemaining: {
    fontSize: 12,
    color: C.teal,
    textAlign: TEXT_RIGHT,
    marginTop: 4,
    fontWeight: "600",
    writingDirection: "rtl",
  },

  barTrack: {
    height: 8,
    backgroundColor: C.surfaceSubtle,
    borderRadius: 4,
    overflow: "hidden",
    marginTop: S.xs,
  },
  barFill: { height: "100%", borderRadius: 4 },
  barTrackSmall: {
    height: 5,
    backgroundColor: C.surfaceSubtle,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 3,
  },
  barFillSmall: { height: "100%", borderRadius: 3 },

  sectionRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: S.xl,
    marginBottom: S.md,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
    flex: 1,
  },
  sectionAction: {
    fontSize: 13,
    fontWeight: "600",
    marginStart: S.sm,
  },

  catRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
    ...SHADOW.sm,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    alignItems: "center",
    justifyContent: "center",
    marginStart: S.sm,
  },
  catEmoji: { fontSize: 20 },
  catInfo: { flex: 1 },
  catNameRow: { justifyContent: "space-between", alignItems: "center" },
  catName: {
    fontSize: 14,
    fontWeight: "700",
    color: C.textPrimary,
    textAlign: TEXT_RIGHT,
  },
  catAmount: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  catCap: {
    fontSize: 11,
    color: C.textSecondary,
    textAlign: TEXT_RIGHT,
    marginTop: 2,
    writingDirection: "rtl",
  },

  addCatBtn: {
    alignItems: "center",
    paddingVertical: S.sm,
    marginBottom: S.sm,
    borderRadius: R.md,
    borderWidth: 1.5,
    borderColor: ACCENT,
    borderStyle: "dashed",
  },
  addCatText: { fontSize: 14, color: ACCENT, fontWeight: "600" },

  empty: {
    textAlign: TEXT_RIGHT,
    color: C.textSecondary,
    fontSize: 14,
    marginVertical: S.md,
    writingDirection: "rtl",
  },
  expRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
    ...SHADOW.sm,
  },
  expAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginStart: S.sm,
  },
  expAvatarEmoji: { fontSize: 18 },
  expInfo: { flex: 1 },
  expTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: C.textPrimary,
    writingDirection: "rtl",
  },
  expMeta: {
    fontSize: 11,
    color: C.textSecondary,
    marginTop: 2,
    writingDirection: "rtl",
  },
  expRight: { alignItems: "center" },
  expAmount: { fontSize: 15, fontWeight: "700", color: C.red },

  fab: {
    position: "absolute",
    bottom: S.lg,  // overridden inline with insets.bottom + S.lg
    left: S.lg,
    backgroundColor: ACCENT,
  },
});
