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
import { useRouter } from "expo-router";
import { useFamilyStore } from "@src/store/useFamilyStore";
import {
  addExpenseRemote,
  updateExpenseRemote,
  deleteExpenseRemote,
  markKidPaymentPaidRemote,
  markKidPaymentUnpaidRemote,
} from "@src/lib/sync/remoteCrud";
import { t, LOCALE } from "@src/i18n";
import { C, S, R, SHADOW } from "@src/ui/tokens";
import { RTL_ROW, TEXT_RIGHT } from "@src/ui/rtl";
import { FAB_LEFT } from "@src/ui/fabAnchor";
import { formatILS, outstandingPeriods, isPeriodLate } from "@src/models/budget";
import { toYMD } from "@src/utils/date";

const DAYS_OF_WEEK_HE = ["ראשון", "שני", "שלישי", "רביעי", "חמישי", "שישי", "שבת"];

function recurrenceLabel(exp: Expense): string {
  if (!exp.isRecurring) return "";
  const type = exp.recurrenceType ?? "monthly";
  if (type === "weekly") return `כל שבוע, ביום ${DAYS_OF_WEEK_HE[exp.recurrenceDay ?? 0]}`;
  return `כל חודש, יום ${exp.recurrenceDay ?? 1}`;
}
import type { Expense } from "@src/models/budget";
import ExpenseModal from "@src/components/ExpenseModal";
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
  const kids = useFamilyStore((s) => s.kids);
  const router = useRouter();

  const currentYM = toYearMonth(new Date());
  const [selectedYM, setSelectedYM] = useState(currentYM);
  const [expenseModalVisible, setExpenseModalVisible] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);

  const { confirmVisible, requestDelete, confirmDelete, dismissConfirm } = useConfirmDelete();

  // All recurring expense templates (not filtered by month). Kid payments
  // (kidId set) are managed on the kid screen, so they're excluded here.
  const recurringExpenses = useMemo(
    () => allExpenses.filter((e) => e.isRecurring && !e.kidId).sort((a, b) => (a.recurrenceDay ?? 1) - (b.recurrenceDay ?? 1)),
    [allExpenses],
  );

  // Outstanding kid payments (תשלומים still "to pay") across ALL kids, so the
  // budget screen is the single place to see everything owed. Overdue first,
  // then by due date. Settled ones drop off (they become normal expenses).
  // One entry per outstanding period: a recurring template expands into a row
  // for each missed (late) period + the upcoming one; a one-time payment is a
  // single entry. Oldest period first so the most-overdue surfaces at the top.
  const outstandingKidPayments = useMemo(() => {
    const todayYMD = toYMD(new Date());
    return allExpenses
      .filter((e) => e.kidId && e.paid === false)
      .flatMap((p) =>
        outstandingPeriods(p, allExpenses, todayYMD).map((periodDate) => ({
          payment: p,
          periodDate,
          late: isPeriodLate(periodDate, todayYMD),
        })),
      )
      .sort((a, b) => a.periodDate.localeCompare(b.periodDate));
  }, [allExpenses]);

  // Non-kid one-time payments still pending (paid===false). Marked paid from
  // the row's ✓; excluded from spending totals until then (monthExpenses
  // filters paid !== false).
  const outstandingPayments = useMemo(
    () =>
      allExpenses
        .filter((e) => !e.isRecurring && !e.kidId && e.paid === false)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [allExpenses],
  );

  // One-time, settled expenses for the selected month only.
  // Unpaid items (kid payments still "to pay", paid===false) are excluded —
  // they aren't spent yet, so they don't count toward totals or the list.
  const monthExpenses = useMemo(() => {
    return allExpenses
      .filter((e) => !e.isRecurring && e.paid !== false && e.date.startsWith(selectedYM))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allExpenses, selectedYM]);

  const totalSpent = useMemo(
    () => monthExpenses.reduce((sum, e) => sum + e.amount, 0),
    [monthExpenses],
  );

  const categoryTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) {
      map[e.categoryName] = (map[e.categoryName] ?? 0) + e.amount;
    }
    return map;
  }, [monthExpenses]);

  // Per-member spend for the selected month (only members with >0 spend).
  const memberTotals = useMemo(() => {
    const map: Record<string, number> = {};
    for (const e of monthExpenses) {
      const key = e.payerMemberId ?? "__none__";
      map[key] = (map[key] ?? 0) + e.amount;
    }
    return map;
  }, [monthExpenses]);

  const isCurrentMonth = selectedYM === currentYM;

  // Recurring entries already logged for the selected month (identified by 🔄 note prefix).
  const recurringLoggedThisMonth = useMemo(
    () => new Set(
      allExpenses
        .filter((e) => !e.isRecurring && e.date.startsWith(selectedYM) && e.note?.startsWith("🔄"))
        .map((e) => e.categoryName + "|" + e.amount),
    ),
    [allExpenses, selectedYM],
  );

  // Nudge: recurring templates that are due but not yet logged.
  const today = new Date();
  const todayDay = today.getDate();
  const todayDOW = today.getDay(); // 0=Sunday … 6=Saturday (matches DAYS_OF_WEEK_HE order)

  // Start of the current week (Sunday) as "YYYY-MM-DD".
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - todayDOW);
  const startOfWeekStr = toYMD(startOfWeek);
  const todayStr = toYMD(today);

  // Weekly recurring expenses logged anywhere in the current week.
  const recurringLoggedThisWeek = useMemo(
    () => new Set(
      allExpenses
        .filter((e) => !e.isRecurring && e.date >= startOfWeekStr && e.date <= todayStr && e.note?.startsWith("🔄"))
        .map((e) => e.categoryName + "|" + e.amount),
    ),
    [allExpenses, startOfWeekStr, todayStr],
  );

  const pendingRecurring = useMemo(
    () => isCurrentMonth
      ? recurringExpenses.filter((r) => {
          const key = r.categoryName + "|" + r.amount;
          if ((r.recurrenceType ?? "monthly") === "weekly") {
            return (r.recurrenceDay ?? 0) <= todayDOW && !recurringLoggedThisWeek.has(key);
          }
          // monthly
          return (r.recurrenceDay ?? 1) <= todayDay && !recurringLoggedThisMonth.has(key);
        })
      : [],
    [isCurrentMonth, recurringExpenses, todayDay, todayDOW, recurringLoggedThisMonth, recurringLoggedThisWeek],
  );

  const handleSaveExpense = (data: Parameters<typeof addExpenseRemote>[0]) => {
    if (editExpense) {
      deleteExpenseRemote(editExpense.id);
    }
    addExpenseRemote(data);
    setEditExpense(null);
  };

  // Log a recurring template as a one-time expense for this month.
  const logRecurringNow = (template: Expense) => {
    addExpenseRemote({
      amount: template.amount,
      categoryName: template.categoryName,
      payerMemberId: template.payerMemberId,
      kidId: template.kidId,
      date: toYMD(today),
      note: `🔄 ${template.note ?? template.categoryName}`,
      isRecurring: false,
    });
  };

  // Has this recurring template already been logged for the current period?
  const isRecurringLogged = (template: Expense): boolean => {
    const key = template.categoryName + "|" + template.amount;
    return (template.recurrenceType ?? "monthly") === "weekly"
      ? recurringLoggedThisWeek.has(key)
      : recurringLoggedThisMonth.has(key);
  };

  // Undo a logged recurring entry for the current period (delete the 🔄 row).
  const unlogRecurringNow = (template: Expense) => {
    const weekly = (template.recurrenceType ?? "monthly") === "weekly";
    const logged = useFamilyStore.getState().expenses.find(
      (e) =>
        !e.isRecurring &&
        e.note?.startsWith("🔄") &&
        e.categoryName === template.categoryName &&
        e.amount === template.amount &&
        (weekly ? e.date >= startOfWeekStr && e.date <= todayStr : e.date.startsWith(selectedYM)),
    );
    if (logged) deleteExpenseRemote(logged.id);
  };

  const handleDeleteExpense = (expense: Expense) => {
    requestDelete(() => deleteExpenseRemote(expense.id));
  };

  // Open the expense modal pre-filled to edit an existing item.
  const openEditExpense = (expense: Expense) => {
    setEditExpense(expense);
    setExpenseModalVisible(true);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* Month navigation — RTL_ROW: first child appears on RIGHT, last on LEFT.
            In Hebrew RTL calendars, LEFT = forward in time, RIGHT = backward.
            chevron-left  (←) on LEFT  = next month (disabled on current month).
            chevron-right (→) on RIGHT = prev month (always enabled). */}
        <View style={styles.monthHeader}>
          <IconButton
            icon="chevron-right"
            size={22}
            onPress={() => setSelectedYM(prevMonth(selectedYM))}
          />
          <Text style={styles.monthLabel}>{monthLabel(selectedYM)}</Text>
          <IconButton
            icon="chevron-left"
            size={22}
            onPress={() => setSelectedYM(nextMonth(selectedYM))}
            disabled={isCurrentMonth}
          />
        </View>

        {/* Summary card — total spent only. Budget progress is shown per
            category below, not as an overall bar on the main number. */}
        <View style={styles.summaryCard}>
          <Text style={styles.summarySubtitle}>{t("budget.totalSpent", { month: "" }).trim()}</Text>
          <Text style={styles.summaryAmount}>{formatILS(totalSpent)}</Text>
        </View>

        {/* Per-member breakdown — only when 2+ payers have expenses this month */}
        {Object.keys(memberTotals).length >= 2 && (
          <>
            <SectionHeader label={t("budget.byPayer")} />
            {familyMembers
              .filter((m) => m.isActive && (memberTotals[m.id] ?? 0) > 0)
              .sort((a, b) => (memberTotals[b.id] ?? 0) - (memberTotals[a.id] ?? 0))
              .map((m) => {
                const spent = memberTotals[m.id] ?? 0;
                const pct = totalSpent > 0 ? spent / totalSpent : 0;
                return (
                  <View key={m.id} style={styles.memberRow}>
                    <View style={[styles.memberAvatar, { backgroundColor: (m.color ?? C.purple) + "22" }]}>
                      <Text style={styles.memberEmoji}>{m.avatarEmoji ?? "👤"}</Text>
                    </View>
                    <View style={styles.memberInfo}>
                      <View style={[{ flexDirection: RTL_ROW }, styles.memberNameRow]}>
                        <Text style={styles.memberName}>{m.name}</Text>
                        <Text style={styles.memberAmount}>{formatILS(spent)}</Text>
                      </View>
                      <View style={styles.memberBarTrack}>
                        <View style={[styles.memberBarFill, { width: `${pct * 100}%` as any, backgroundColor: m.color ?? C.purple }]} />
                      </View>
                    </View>
                  </View>
                );
              })}
            {(memberTotals["__none__"] ?? 0) > 0 && (
              <View style={styles.memberRow}>
                <View style={[styles.memberAvatar, { backgroundColor: C.textSecondary + "22" }]}>
                  <Text style={styles.memberEmoji}>❓</Text>
                </View>
                <View style={styles.memberInfo}>
                  <View style={[{ flexDirection: RTL_ROW }, styles.memberNameRow]}>
                    <Text style={styles.memberName}>{t("budget.unassigned")}</Text>
                    <Text style={styles.memberAmount}>{formatILS(memberTotals["__none__"])}</Text>
                  </View>
                  <View style={styles.memberBarTrack}>
                    <View style={[styles.memberBarFill, { width: `${(totalSpent > 0 ? memberTotals["__none__"] / totalSpent : 0) * 100}%` as any, backgroundColor: C.textSecondary }]} />
                  </View>
                </View>
              </View>
            )}
          </>
        )}

        {/* Pending (unpaid) one-time payments — non-kid */}
        {outstandingPayments.length > 0 && (
          <>
            <SectionHeader label={t("budget.pendingPayments")} />
            {outstandingPayments.map((exp) => {
              const cat = budgetCategories.find((c) => c.name === exp.categoryName);
              const overdue = exp.date < todayStr;
              const dateLabel = `${exp.date.slice(8, 10)}/${exp.date.slice(5, 7)}`;
              const metaText = [overdue ? t("payment.overdue") : "", dateLabel]
                .filter(Boolean)
                .join(" • ");
              return (
                <Pressable
                  key={exp.id}
                  style={styles.kidPayRow}
                  onPress={() => openEditExpense(exp)}
                >
                  <View style={[styles.kidPayAvatar, { backgroundColor: (cat?.color ?? C.purple) + "22" }]}>
                    <Text style={styles.kidPayEmoji}>{cat?.icon ?? "📦"}</Text>
                  </View>
                  <View style={styles.kidPayInfo}>
                    <Text style={[styles.kidPayTitle, { textAlign: TEXT_RIGHT }]} numberOfLines={1}>
                      {exp.note || exp.categoryName}
                    </Text>
                    <Text style={[styles.kidPayMeta, { textAlign: TEXT_RIGHT }, overdue && styles.kidPayMetaOverdue]}>
                      {metaText}
                    </Text>
                  </View>
                  <Text style={styles.kidPayAmount}>{formatILS(exp.amount)}</Text>
                  <IconButton
                    icon="check-circle-outline"
                    size={20}
                    iconColor={C.teal}
                    accessibilityLabel={t("payment.markPaid")}
                    onPress={() => updateExpenseRemote(exp.id, { paid: true })}
                  />
                  <IconButton
                    icon="trash-can-outline"
                    size={16}
                    iconColor={C.textSecondary}
                    onPress={() => handleDeleteExpense(exp)}
                  />
                </Pressable>
              );
            })}
          </>
        )}

        {/* Outstanding kid payments (תשלומים) across all kids */}
        {outstandingKidPayments.length > 0 && (
          <>
            <SectionHeader label={t("budget.kidPayments")} />
            {outstandingKidPayments.map(({ payment, periodDate, late }) => {
              const kid = kids.find((k) => k.id === payment.kidId);
              const dateLabel = `${periodDate.slice(8, 10)}/${periodDate.slice(5, 7)}`;
              const recur = payment.isRecurring
                ? payment.recurrenceType === "weekly" ? t("payment.everyWeek") : t("payment.everyMonth")
                : "";
              const metaText = [late ? t("payment.overdue") : "", recur, dateLabel].filter(Boolean).join(" • ");
              return (
                <Pressable
                  key={payment.id + periodDate}
                  style={styles.kidPayRow}
                  onPress={() => kid && router.push(`/kid/${kid.id}`)}
                >
                  <View style={[styles.kidPayAvatar, { backgroundColor: (kid?.color ?? C.purple) + "22" }]}>
                    <Text style={styles.kidPayEmoji}>{kid?.emoji ?? "🧒"}</Text>
                  </View>
                  <View style={styles.kidPayInfo}>
                    <Text style={[styles.kidPayTitle, { textAlign: TEXT_RIGHT }]} numberOfLines={1}>
                      {payment.note || t("payment.add")}
                      {kid ? `  •  ${kid.name}` : ""}
                    </Text>
                    <Text style={[styles.kidPayMeta, { textAlign: TEXT_RIGHT }, late && styles.kidPayMetaOverdue]}>
                      {metaText}
                    </Text>
                  </View>
                  <Text style={styles.kidPayAmount}>{formatILS(payment.amount)}</Text>
                  <IconButton
                    icon="check-circle-outline"
                    size={20}
                    iconColor={C.teal}
                    accessibilityLabel={t("payment.markPaid")}
                    onPress={() => markKidPaymentPaidRemote(payment, periodDate)}
                  />
                </Pressable>
              );
            })}
          </>
        )}

        {/* Categories — read-only spend breakdown. Management lives in the
            customization screen (Settings → התאמה אישית). */}
        <SectionHeader label={t("budget.categories")} />

        {budgetCategories.map((cat) => {
          const spent = categoryTotals[cat.name] ?? 0;
          const pct = cat.monthlyCap ? Math.min(spent / cat.monthlyCap, 1) : null;
          const catBarColor =
            pct != null && pct > 0.9 ? C.red
            : pct != null && pct > 0.7 ? C.amber
            : cat.color;
          return (
            <View key={cat.id} style={styles.catRow}>
              <View style={styles.catIcon}>
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
            </View>
          );
        })}

        {/* Recurring expenses section */}
        <SectionHeader label={t("budget.recurringSection")} />

        {/* Nudge banner — pending recurring items */}
        {pendingRecurring.length > 0 && (
          <View style={styles.nudgeBanner}>
            <Text style={styles.nudgeText}>
              ⏰ {pendingRecurring.length === 1
                ? t("budget.recurringNudgeOne")
                : t("budget.recurringNudge", { count: pendingRecurring.length })}
            </Text>
            <View style={styles.nudgeList}>
              {pendingRecurring.map((r) => {
                const cat = budgetCategories.find((c) => c.name === r.categoryName);
                return (
                  <View key={r.id} style={styles.nudgeRow}>
                    <Text style={styles.nudgeItem}>
                      {cat?.icon ?? "📦"} {r.categoryName} — {formatILS(r.amount)}
                      {`  (${recurrenceLabel(r)})`}
                    </Text>
                    <Pressable style={styles.nudgeBtn} onPress={() => logRecurringNow(r)}>
                      <Text style={styles.nudgeBtnText}>
                        {(r.recurrenceType ?? "monthly") === "weekly"
                          ? t("budget.logThisWeek")
                          : t("budget.logThisMonth")}
                      </Text>
                    </Pressable>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {recurringExpenses.length === 0 ? (
          <Text style={styles.empty}>{t("budget.noRecurring")}</Text>
        ) : (
          recurringExpenses.map((exp) => {
            const cat = budgetCategories.find((c) => c.name === exp.categoryName);
            return (
              <View key={exp.id} style={styles.expRow}>
                <Pressable
                  style={[styles.expTap, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
                  onPress={() => openEditExpense(exp)}
                  accessibilityRole="button"
                  accessibilityLabel={t("budget.editExpense")}
                >
                  <View style={[styles.expAvatar, { backgroundColor: (cat?.color ?? "#9B59B6") + "22" }]}>
                    <Text style={styles.expAvatarEmoji}>{cat?.icon ?? "🔄"}</Text>
                  </View>
                  <View style={styles.expInfo}>
                    <Text style={[styles.expTitle, { textAlign: TEXT_RIGHT }]}>
                      {exp.categoryName}
                      {exp.note ? `  •  ${exp.note}` : ""}
                    </Text>
                    <Text style={[styles.expMeta, { textAlign: TEXT_RIGHT }]}>
                      {recurrenceLabel(exp)}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.expRight}>
                  <Text style={styles.expAmount}>{formatILS(exp.amount)}</Text>
                  <View style={styles.expActions}>
                    {/* Set / unset this period's payment — like kid payments. */}
                    {isCurrentMonth && (
                      isRecurringLogged(exp) ? (
                        <IconButton
                          icon="undo-variant"
                          size={16}
                          iconColor={C.teal}
                          accessibilityLabel={t("payment.markUnpaid")}
                          onPress={() => unlogRecurringNow(exp)}
                        />
                      ) : (
                        <IconButton
                          icon="check-circle-outline"
                          size={16}
                          iconColor={C.teal}
                          accessibilityLabel={t("payment.markPaid")}
                          onPress={() => logRecurringNow(exp)}
                        />
                      )
                    )}
                    <IconButton
                      icon="trash-can-outline"
                      size={16}
                      onPress={() => handleDeleteExpense(exp)}
                      iconColor={C.textSecondary}
                    />
                  </View>
                </View>
              </View>
            );
          })
        )}

        {/* Recent expenses */}
        <SectionHeader label={t("budget.recentExpenses")} />

        {monthExpenses.length === 0 ? (
          <Text style={styles.empty}>{t("budget.noExpenses")}</Text>
        ) : (
          monthExpenses.map((exp) => {
            const member = familyMembers.find((m) => m.id === exp.payerMemberId);
            const kid = exp.kidId ? kids.find((k) => k.id === exp.kidId) : undefined;
            const cat = budgetCategories.find((c) => c.name === exp.categoryName);
            return (
              <View key={exp.id} style={styles.expRow}>
                <Pressable
                  style={[styles.expTap, Platform.OS === "web" && ({ cursor: "pointer" } as any)]}
                  onPress={() => openEditExpense(exp)}
                  accessibilityRole="button"
                  accessibilityLabel={t("budget.editExpense")}
                >
                  <View
                    style={[
                      styles.expAvatar,
                      { backgroundColor: ((kid?.color ?? member?.color) ?? "#9B59B6") + "33" },
                    ]}
                  >
                    <Text style={styles.expAvatarEmoji}>
                      {kid?.emoji ?? member?.avatarEmoji ?? "🧑"}
                    </Text>
                  </View>
                  <View style={styles.expInfo}>
                    <Text style={[styles.expTitle, { textAlign: TEXT_RIGHT }]}>
                      {cat?.icon ?? "📦"} {exp.categoryName}
                      {exp.note ? `  •  ${exp.note}` : ""}
                    </Text>
                    <Text style={[styles.expMeta, { textAlign: TEXT_RIGHT }]}>
                      {exp.date}
                      {kid ? `  •  ${kid.name}` : member ? `  •  ${member.name}` : ""}
                    </Text>
                  </View>
                </Pressable>
                <View style={styles.expRight}>
                  <Text style={styles.expAmount}>{formatILS(exp.amount)}</Text>
                  <View style={styles.expActions}>
                    {/* Undo a settled kid payment — for recurring ones this also
                        removes the auto-queued next occurrence. */}
                    {exp.kidId ? (
                      <IconButton
                        icon="undo-variant"
                        size={16}
                        iconColor={C.teal}
                        accessibilityLabel={t("payment.markUnpaid")}
                        onPress={() => markKidPaymentUnpaidRemote(exp)}
                      />
                    ) : null}
                    <IconButton
                      icon="trash-can-outline"
                      size={16}
                      onPress={() => handleDeleteExpense(exp)}
                      iconColor={C.textSecondary}
                    />
                  </View>
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
  barTrackSmall: {
    height: 5,
    backgroundColor: C.surfaceSubtle,
    borderRadius: 3,
    overflow: "hidden",
    marginTop: 3,
  },
  barFillSmall: { height: "100%", borderRadius: 3 },

  memberRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.sm,
    marginBottom: S.xs,
    gap: S.sm,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  memberEmoji: { fontSize: 20 },
  memberInfo: { flex: 1 },
  memberNameRow: { alignItems: "center", marginBottom: 4 },
  memberName: { flex: 1, fontSize: 14, fontWeight: "600", color: C.textPrimary, textAlign: TEXT_RIGHT, writingDirection: "rtl" },
  memberAmount: { fontSize: 14, fontWeight: "700", color: C.textPrimary },
  memberBarTrack: { height: 5, borderRadius: 3, backgroundColor: C.surfaceSubtle, overflow: "hidden" },
  memberBarFill: { height: 5, borderRadius: 3 },

  kidPayRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    paddingVertical: S.sm,
    paddingHorizontal: S.md,
    marginBottom: S.xs,
    gap: S.md,
    ...SHADOW.sm,
  },
  kidPayAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  kidPayEmoji: { fontSize: 18 },
  kidPayInfo: { flex: 1 },
  kidPayTitle: { fontSize: 14, fontWeight: "600", color: C.textPrimary, writingDirection: "rtl" },
  kidPayMeta: { fontSize: 11, color: C.textSecondary, marginTop: 2, writingDirection: "rtl" },
  kidPayMetaOverdue: { color: C.red, fontWeight: "700" },
  kidPayAmount: { fontSize: 15, fontWeight: "700", color: C.textPrimary },

  catRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    backgroundColor: C.surface,
    borderRadius: R.md,
    padding: S.md,
    marginBottom: S.sm,
    gap: S.md,
    ...SHADOW.sm,
  },
  catIcon: {
    width: 40,
    height: 40,
    borderRadius: R.sm,
    alignItems: "center",
    justifyContent: "center",
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
  expTap: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    flex: 1,
    gap: S.md,
  },
  expAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
  expActions: { flexDirection: RTL_ROW, alignItems: "center" },
  expAmount: { fontSize: 15, fontWeight: "700", color: C.red },

  fab: {
    position: "absolute",
    bottom: S.lg,  // overridden inline with insets.bottom + S.lg
    ...FAB_LEFT,
    backgroundColor: ACCENT,
  },

  nudgeBanner: {
    backgroundColor: "#FFF8E1",
    borderRadius: R.md,
    borderWidth: 1,
    borderColor: "#F59E0B",
    padding: S.md,
    marginBottom: S.md,
  },
  nudgeText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#92400E",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
    marginBottom: S.sm,
  },
  nudgeList: { gap: S.xs },
  nudgeRow: {
    flexDirection: RTL_ROW,
    alignItems: "center",
    justifyContent: "space-between",
    gap: S.sm,
  },
  nudgeItem: {
    flex: 1,
    fontSize: 13,
    color: "#78350F",
    textAlign: TEXT_RIGHT,
    writingDirection: "rtl",
  },
  nudgeBtn: {
    backgroundColor: "#F59E0B",
    borderRadius: R.sm,
    paddingHorizontal: S.sm,
    paddingVertical: S.xs,
  },
  nudgeBtnText: { fontSize: 12, fontWeight: "700", color: "#fff" },
});
