/**
 * FamilyEventModal — Add / edit a family event (recurring or one-time).
 */

import React, { useEffect, useState } from "react";
import { View } from "react-native";
import { Text, TextInput, Button, SegmentedButtons } from "react-native-paper";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import type { FamilyEvent, AssigneeType } from "@src/models/familyEvent";
import { useFamilyStore } from "@src/store/useFamilyStore";
import { hhmmToMinutes, minutesToHHMM } from "@src/utils/time";
import { dayOfWeekFromYMD, toYMD } from "@src/utils/date";
import { t, dayNameShort, assigneeTypeLabel } from "@src/i18n";
import { MS } from "@src/ui/modalStyles";
import ModalWrapper from "./ModalWrapper";
import WheelTimePicker from "./WheelTimePicker";
import DatePicker, { formatDateHe } from "./DatePicker";

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
    title: z.string().min(1, t("eventModal.titleRequired")),
    assigneeType: z.enum(["family", "member", "kid"]),
    assigneeId: z.string().optional(),
    isRecurring: z.boolean(),
    dayOfWeek: z.number().int().min(0).max(6),
    date: z.string().optional(),
    startTime: z
      .string()
      .regex(timeRegex, t("eventModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("eventModal.invalidTime")),
    endTime: z
      .string()
      .regex(timeRegex, t("eventModal.useHHMM"))
      .refine((v) => !isNaN(hhmmToMinutes(v)), t("eventModal.invalidTime")),
    location: z.string().optional(),
  })
  .refine(
    (d) => {
      const s = hhmmToMinutes(d.startTime);
      const e = hhmmToMinutes(d.endTime);
      return !isNaN(s) && !isNaN(e) && e > s;
    },
    { message: t("eventModal.endAfterStart"), path: ["endTime"] },
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
    { message: t("eventModal.invalidDate"), path: ["date"] },
  );

type FormData = z.infer<typeof schema>;

interface Props {
  visible: boolean;
  onDismiss: () => void;
  editEvent?: FamilyEvent | null;
  defaultDayOfWeek?: number;
  defaultDate?: string;
  onSubmit: (data: {
    title: string;
    assigneeType: AssigneeType;
    assigneeId?: string;
    dayOfWeek: number;
    startMinutes: number;
    endMinutes: number;
    location?: string;
    isRecurring: boolean;
    date?: string;
    reminders?: number[];
  }) => void;
}

export default function FamilyEventModal({
  visible,
  onDismiss,
  editEvent,
  defaultDayOfWeek = 1,
  defaultDate,
  onSubmit,
}: Props) {
  const familyMembers = useFamilyStore((s) => s.familyMembers);
  const kids = useFamilyStore((s) => s.kids);
  const activeMembers = familyMembers.filter((m) => m.isActive);
  const activeKids = kids.filter((k) => k.isActive);

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
      assigneeType: "family",
      assigneeId: undefined,
      isRecurring: true,
      dayOfWeek: defaultDayOfWeek,
      date: defaultDate ?? toYMD(new Date()),
      startTime: "09:00",
      endTime: "10:00",
      location: "",
    },
  });

  useEffect(() => {
    if (visible && editEvent) {
      reset({
        title: editEvent.title,
        assigneeType: editEvent.assigneeType,
        assigneeId: editEvent.assigneeId,
        isRecurring: editEvent.isRecurring,
        dayOfWeek: editEvent.dayOfWeek,
        date: editEvent.date ?? toYMD(new Date()),
        startTime: minutesToHHMM(editEvent.startMinutes),
        endTime: minutesToHHMM(editEvent.endMinutes),
        location: editEvent.location ?? "",
      });
      setSelectedReminders(editEvent.reminders ?? []);
    } else if (visible) {
      reset({
        title: "",
        assigneeType: "family",
        assigneeId: undefined,
        isRecurring: true,
        dayOfWeek: defaultDayOfWeek,
        date: defaultDate ?? toYMD(new Date()),
        startTime: "09:00",
        endTime: "10:00",
        location: "",
      });
      setSelectedReminders([]);
    }
  }, [visible, editEvent, defaultDayOfWeek, defaultDate, reset]);

  const assigneeType = watch("assigneeType");
  const selectedDay = watch("dayOfWeek");
  const isRecurring = watch("isRecurring");
  const assigneeId = watch("assigneeId");

  const doSubmit = (data: FormData) => {
    const dayOfWeek = data.isRecurring
      ? data.dayOfWeek
      : dayOfWeekFromYMD(data.date!);

    onSubmit({
      title: data.title.trim(),
      assigneeType: data.assigneeType as AssigneeType,
      assigneeId: data.assigneeType === "family" ? undefined : data.assigneeId,
      dayOfWeek,
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
    <ModalWrapper visible={visible} onDismiss={onDismiss}>
      <Text style={MS.heading}>
        {editEvent ? t("eventModal.editTitle") : t("eventModal.addTitle")}
      </Text>
      {!editEvent && defaultDate && (
        <Text style={MS.subtitle}>{formatDateHe(defaultDate)}</Text>
      )}

      <Controller
        control={control}
        name="title"
        render={({ field: { onChange, value } }) => (
          <TextInput
            placeholder={t("eventModal.titleLabel")}
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

      <Text style={MS.label}>{t("eventModal.assignee")}</Text>
      <SegmentedButtons
        value={assigneeType}
        onValueChange={(v) => {
          setValue("assigneeType", v as "family" | "member" | "kid");
          setValue("assigneeId", undefined);
        }}
        buttons={[
          { value: "family", label: assigneeTypeLabel("family") },
          { value: "member", label: assigneeTypeLabel("member") },
          { value: "kid", label: assigneeTypeLabel("kid") },
        ]}
        style={MS.segmented}
      />

      {assigneeType === "member" && activeMembers.length > 0 && (
        <View style={MS.chipRow}>
          {activeMembers.map((member) => (
            <Button
              key={member.id}
              mode={assigneeId === member.id ? "contained" : "outlined"}
              compact
              onPress={() => setValue("assigneeId", member.id)}
              style={MS.chip}
              labelStyle={MS.chipLabel}
            >
              {member.avatarEmoji ?? ""} {member.name}
            </Button>
          ))}
        </View>
      )}

      {assigneeType === "kid" && activeKids.length > 0 && (
        <View style={MS.chipRow}>
          {activeKids.map((kid) => (
            <Button
              key={kid.id}
              mode={assigneeId === kid.id ? "contained" : "outlined"}
              compact
              onPress={() => setValue("assigneeId", kid.id)}
              style={MS.chip}
              labelStyle={MS.chipLabel}
            >
              {kid.emoji}{"  "}{kid.name}
            </Button>
          ))}
        </View>
      )}

      <SegmentedButtons
        value={isRecurring ? "recurring" : "oneTime"}
        onValueChange={(v) => setValue("isRecurring", v === "recurring")}
        buttons={[
          { value: "recurring", label: t("eventModal.recurring") },
          { value: "oneTime", label: t("eventModal.oneTime") },
        ]}
        style={MS.segmented}
      />

      {isRecurring && (
        <>
          <Text style={MS.label}>{t("eventModal.day")}</Text>
          <View style={MS.chipRow}>
            {Array.from({ length: 7 }, (_, idx) => (
              <Button
                key={idx}
                mode={selectedDay === idx ? "contained" : "outlined"}
                compact
                onPress={() => setValue("dayOfWeek", idx)}
                style={MS.chip}
                labelStyle={MS.chipLabel}
              >
                {dayNameShort(idx)}
              </Button>
            ))}
          </View>
        </>
      )}

      {!isRecurring && (
        <>
          <Text style={MS.label}>{t("eventModal.date")}</Text>
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

      <View style={MS.timeRow}>
        <View style={MS.timeCol}>
          <Text style={MS.label}>{t("eventModal.startTime")}</Text>
          <Controller
            control={control}
            name="startTime"
            render={({ field: { onChange, value } }) => (
              <WheelTimePicker value={value} onChange={onChange} />
            )}
          />
        </View>
        <View style={MS.timeCol}>
          <Text style={MS.label}>{t("eventModal.endTime")}</Text>
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

      <Controller
        control={control}
        name="location"
        render={({ field: { onChange, value } }) => (
          <TextInput
            placeholder={t("eventModal.location")}
            value={value}
            onChangeText={onChange}
            mode="outlined"
            style={MS.input}
            contentStyle={MS.inputContent}
          />
        )}
      />

      <Text style={MS.label}>{t("eventModal.reminders")}</Text>
      <View style={MS.chipRow}>
        {REMINDER_PRESETS.map(({ minutes, label }) => {
          const selected = selectedReminders.includes(minutes);
          return (
            <Button
              key={minutes}
              mode={selected ? "contained" : "outlined"}
              compact
              onPress={() => {
                if (selected) {
                  setSelectedReminders((prev) => prev.filter((m) => m !== minutes));
                } else if (selectedReminders.length < 3) {
                  setSelectedReminders((prev) => [...prev, minutes]);
                }
              }}
              style={MS.chip}
              labelStyle={MS.chipLabel}
            >
              {label}
            </Button>
          );
        })}
      </View>

      <View style={MS.actions}>
        <Button onPress={onDismiss}>{t("cancel")}</Button>
        <Button mode="contained" onPress={handleSubmit(doSubmit)}>
          {editEvent ? t("save") : t("add")}
        </Button>
      </View>
    </ModalWrapper>
  );
}
