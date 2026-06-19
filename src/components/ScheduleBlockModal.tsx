/**
 * ScheduleBlockModal — Add / edit a schedule block (recurring or one-time).
 * Premium styled modal with sectioned layout.
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button } from "react-native-paper";
import SegmentedPills from "@src/components/SegmentedPills";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { ScheduleBlock, BlockType } from "@src/models/schedule";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { C, S } from "@src/ui/tokens";
import { RTL_ROW } from "@src/ui/rtl";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import ModalWrapper, { ModalCarousel } from "./ModalWrapper";
import WheelTimePicker from "./WheelTimePicker";
import DatePicker from "./DatePicker";

// ---------------------------------------------------------------------------
// Zod schema
// ---------------------------------------------------------------------------

const timeRegex = /^\d{1,2}:\d{2}$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const REMINDER_PRESETS = [
  { minutes: 5, label: "5 דק׳" },
  { minutes: 15, label: "15 דק׳" },
  { minutes: 30, label: "30 דק׳" },
  { minutes: 60, label: "שעה" },
  { minutes: 1440, label: "יום" },
];

const schema = z
  .object({
    title: z.string().min(1, t("blockModal.titleRequired")),
    type: z.enum(["school", "hobby", "other"]),
    isRecurring: z.boolean(),
    daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1),
    date: z.string().optional(),
    startTime: z
      .string()
      .regex(timeRegex, t("blockModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("blockModal.invalidTime")),
    endTime: z
      .string()
      .regex(timeRegex, t("blockModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("blockModal.invalidTime")),
    location: z.string().optional(),
  })
  .refine(
    (d) => {
      const s = hhmmToMinutes(d.startTime);
      const e = hhmmToMinutes(d.endTime);
      return !isNaN(s) && !isNaN(e) && e > s;
    },
    { message: t("blockModal.endAfterStart"), path: ["endTime"] },
  )
  .refine(
    (d) => {
      if (d.isRecurring) return true;
      if (!d.date || !dateRegex.test(d.date)) return false;
      const [y, m, day] = d.date.split("-").map(Number);
      const dateObj = new Date(y, m - 1, day);
      return (
        dateObj.getFullYear() === y &&
        dateObj.getMonth() === m - 1 &&
        dateObj.getDate() === day
      );
    },
    { message: t("blockModal.invalidDate"), path: ["date"] },
  );

type FormData = z.infer<typeof schema>;

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editBlock?: ScheduleBlock | null;
  defaultDaysOfWeek?: number[];
  defaultDate?: string;
  defaultStartTime?: string; // HH:MM — pre-fill from a time-slot tap
  defaultEndTime?: string;   // HH:MM — pre-fill from a time-slot tap
  onSubmit: (data: {
    title: string;
    type: BlockType;
    daysOfWeek: number[];
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
  }) => void;
  onDelete?: () => void;
  /** When set, shows carousel arrows to swap between the kid "add" modals. */
  carousel?: ModalCarousel;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ScheduleBlockModal({
  visible,
  onDismiss,
  editBlock,
  defaultDaysOfWeek = [1],
  defaultDate,
  defaultStartTime,
  defaultEndTime,
  onSubmit,
  onDelete,
  carousel,
}: Props) {
  const kids = useFamilyStore((s) => s.kids);
  const editKid = editBlock ? kids.find((k) => k.id === editBlock.kidId) : undefined;
  const [selectedReminders, setSelectedReminders] = useState<number[]>([]);

  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: "",
      type: "other",
      // A time-slot tap implies a one-time block at that date+time.
      isRecurring: !defaultStartTime,
      daysOfWeek: defaultDaysOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      startTime: defaultStartTime ?? "09:00",
      endTime: defaultEndTime ?? "10:00",
      location: "",
    },
  });

  useEffect(() => {
    if (visible && editBlock) {
      reset({
        title: editBlock.title,
        type: editBlock.type,
        isRecurring: editBlock.isRecurring,
        daysOfWeek: editBlock.daysOfWeek,
        date: editBlock.date ?? toYMD(new Date()),
        startTime: minutesToHHMM(editBlock.startMinutes),
        endTime: minutesToHHMM(editBlock.endMinutes),
        location: editBlock.location ?? "",
      });
      setSelectedReminders(editBlock.reminders ?? []);
    } else if (visible) {
      const hasSlotTime = !!defaultStartTime;
      reset({
        title: "",
        type: "other",
        isRecurring: !hasSlotTime,
        daysOfWeek: defaultDaysOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        startTime: defaultStartTime ?? "09:00",
        endTime: defaultEndTime ?? "10:00",
        location: "",
      });
      setSelectedReminders([]);
    }
  }, [visible, editBlock, defaultDaysOfWeek, defaultDate, defaultStartTime, defaultEndTime, reset]);

  const selectedDays = watch("daysOfWeek");
  const isRecurring = watch("isRecurring");

  const doSubmit = (data: FormData) => {
    const daysOfWeek = data.isRecurring
      ? data.daysOfWeek
      : [dayOfWeekFromYMD(data.date!)];

    onSubmit({
      title: data.title.trim(),
      type: data.type,
      daysOfWeek,
      startMinutes: hhmmToMinutes(data.startTime),
      endMinutes: hhmmToMinutes(data.endTime),
      location: data.location?.trim() || undefined,
      isRecurring: data.isRecurring,
      date: data.isRecurring ? undefined : data.date,
      reminders: selectedReminders.length > 0 ? selectedReminders : undefined,
    });
    onDismiss();
  };

  return (
    <ModalWrapper visible={visible} onDismiss={onDismiss} carousel={carousel}>
      {/* ── Header ── */}
      <View style={MS.headerBar}>
        <View style={MS.headerIconWrap}>
          <Text style={MS.headerIcon}>📅</Text>
        </View>
        <Text style={MS.heading}>
          {editBlock ? t("blockModal.editTitle") : t("blockModal.addTitle")}
        </Text>
      </View>

      {editKid && (
        <View style={MS.kidBadge}>
          <Text style={{ fontSize: 18 }}>{editKid.emoji}</Text>
          <Text style={{ fontSize: 14, fontWeight: "700", color: editKid.color }}>{editKid.name}</Text>
        </View>
      )}

      {/* ── Title & Type section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>✏️</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.titleLabel")}</Text>
        </View>
        <Controller
          control={control}
          name="title"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder={t("blockModal.titleLabel")}
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={MS.input}
              contentStyle={MS.inputContent}
              error={!!errors.title}
            />
          )}
        />
        {errors.title && <Text style={MS.error}>{errors.title.message}</Text>}
      </View>

      {/* ── Schedule section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>{isRecurring ? "🔄" : "1️⃣"}</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.schedule")}</Text>
        </View>
        <View style={MS.segmented}>
          <SegmentedPills
            value={isRecurring ? "recurring" : "oneTime"}
            onChange={(v) => setValue("isRecurring", v === "recurring")}
            options={[
              { value: "recurring", label: t("blockModal.recurring") },
              { value: "oneTime", label: t("blockModal.oneTime") },
            ]}
          />
        </View>

        {isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionIcon}>📆</Text>
              <Text style={MS.sectionLabel}>{t("blockModal.day")}</Text>
            </View>
            <View style={MS.chipRow}>
              {Array.from({ length: 7 }, (_, idx) => {
                const sel = selectedDays.includes(idx);
                return (
                  <Button
                    key={idx}
                    mode={sel ? "contained" : "outlined"}
                    compact
                    onPress={() => {
                      // Allow free deselect; schema catches "no days" at save
                      // time. See QA Pass 2 BUG-N14.
                      const cur = selectedDays;
                      if (cur.includes(idx)) {
                        setValue("daysOfWeek", cur.filter((d) => d !== idx), { shouldValidate: true });
                      } else {
                        setValue("daysOfWeek", [...cur, idx], { shouldValidate: true });
                      }
                    }}
                    style={MS.chip}
                    labelStyle={MS.chipLabel}
                    buttonColor={sel ? C.selectBg : undefined}
                    textColor={sel ? C.selectText : C.textSecondary}
                  >
                    {dayNameShort(idx)}
                  </Button>
                );
              })}
            </View>
            {errors.daysOfWeek && (
              <Text style={[MS.error, { marginTop: 4 }]}>
                {t("eventModal.daysOfWeekRequired")}
              </Text>
            )}
          </>
        )}

        {!isRecurring && (
          <>
            <View style={[MS.sectionHeader, { marginTop: S.sm }]}>
              <Text style={MS.sectionIcon}>📆</Text>
              <Text style={MS.sectionLabel}>{t("blockModal.date")}</Text>
            </View>
            <Controller
              control={control}
              name="date"
              render={({ field: { onChange, value } }) => (
                <DatePicker value={value ?? toYMD(new Date())} onChange={onChange} />
              )}
            />
            {errors.date && <Text style={MS.error}>{errors.date.message}</Text>}
          </>
        )}
      </View>

      {/* ── Time section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>⏰</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.startTime")}</Text>
        </View>
        <View style={MS.timeRow}>
          <View style={MS.timeCol}>
            <Text style={MS.timeLabel}>{t("blockModal.startTime")}</Text>
            <Controller
              control={control}
              name="startTime"
              render={({ field: { onChange, value } }) => (
                <WheelTimePicker value={value} onChange={onChange} />
              )}
            />
          </View>
          <View style={MS.timeCol}>
            <Text style={MS.timeLabel}>{t("blockModal.endTime")}</Text>
            <Controller
              control={control}
              name="endTime"
              render={({ field: { onChange, value } }) => (
                <WheelTimePicker value={value} onChange={onChange} />
              )}
            />
          </View>
        </View>
        {errors.endTime && <Text style={MS.error}>{errors.endTime.message}</Text>}
      </View>

      {/* ── Location section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>📍</Text>
          <Text style={MS.sectionLabel}>{t("blockModal.location")}</Text>
        </View>
        <Controller
          control={control}
          name="location"
          render={({ field: { onChange, value } }) => (
            <TextInput
              placeholder={t("blockModal.location")}
              value={value}
              onChangeText={onChange}
              mode="outlined"
              style={[MS.input, { marginBottom: 0 }]}
              contentStyle={MS.inputContent}
            />
          )}
        />
      </View>

      {/* ── Reminders section ── */}
      <View style={MS.section}>
        <View style={MS.sectionHeader}>
          <Text style={MS.sectionIcon}>🔔</Text>
          <Text style={MS.sectionLabel}>{t("eventModal.reminders")}</Text>
        </View>
        <View style={MS.chipRow}>
          {REMINDER_PRESETS.map(({ minutes, label }) => {
            const selected = selectedReminders.includes(minutes);
            // Disable unselected presets once cap is hit (BUG-N13).
            const capReached = !selected && selectedReminders.length >= 3;
            return (
              <Button
                key={minutes}
                mode={selected ? "contained" : "outlined"}
                compact
                disabled={capReached}
                onPress={() => {
                  if (selected) {
                    setSelectedReminders((prev) =>
                      prev.filter((m) => m !== minutes),
                    );
                  } else if (selectedReminders.length < 3) {
                    setSelectedReminders((prev) => [...prev, minutes]);
                  }
                }}
                style={MS.chip}
                labelStyle={MS.chipLabel}
                buttonColor={selected ? C.selectBg : undefined}
                textColor={selected ? C.selectText : C.textSecondary}
              >
                {label}
              </Button>
            );
          })}
        </View>
        {selectedReminders.length >= 3 && (
          <Text
            style={{
              color: C.textMuted,
              fontSize: 11,
              marginTop: 4,
              textAlign: "right",
            }}
          >
            {t("eventModal.reminderMax3")}
          </Text>
        )}
      </View>

      {/* ── Delete ── */}
      {editBlock && onDelete && (
        <Button
          mode="outlined"
          onPress={() => {
            onDelete();
            onDismiss();
          }}
          textColor={C.red}
          icon="delete-outline"
          style={{ borderColor: C.red + "44", borderRadius: 12, marginTop: S.md }}
          contentStyle={{ flexDirection: RTL_ROW }}
        >
          {t("eventModal.delete")}
        </Button>
      )}

      {/* ── Actions ── */}
      <View style={MS.actions}>
        <Button
          mode="outlined"
          onPress={onDismiss}
          style={MS.cancelBtn}
          labelStyle={MS.cancelLabel}
        >
          {t("cancel")}
        </Button>
        <Button
          mode="contained"
          onPress={handleSubmit(doSubmit)}
          style={MS.saveBtn}
          labelStyle={MS.saveBtnLabel}
        >
          {editBlock ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
