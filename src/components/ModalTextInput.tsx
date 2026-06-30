/**
 * ModalTextInput — the shared text field for every modal.
 *
 * A Paper TextInput pre-wired for the modal style: outlined, RTL `MS.input` /
 * `MS.inputContent` styling, and a focus/active border in the family **theme**
 * colour (instead of Paper's default blue). Pass `style` / `contentStyle` to
 * extend (e.g. a numeric content style or a taller min-height) — they merge on
 * top of the shared defaults. Every other Paper TextInput prop is forwarded.
 *
 * Centralising this is what keeps the focus colour consistent across modals —
 * add a field anywhere with <ModalTextInput/> and it matches by construction.
 */

import React, { type ComponentProps } from "react";
import { TextInput } from "react-native-paper";

import { MS } from "@src/ui/modalStyles";
import { useThemeColor } from "@src/ui/useThemeColor";

type Props = ComponentProps<typeof TextInput>;

export default function ModalTextInput({ style, contentStyle, ...rest }: Props) {
  const theme = useThemeColor();
  return (
    <TextInput
      mode="outlined"
      {...rest}
      activeOutlineColor={theme}
      style={[MS.input, style]}
      contentStyle={[MS.inputContent, contentStyle]}
    />
  );
}
