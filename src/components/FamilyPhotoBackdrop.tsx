/**
 * FamilyPhotoBackdrop — renders the family photo as a cover-fit background with
 * a dark scrim for text legibility, and lays its children on top. Shared by the
 * nav drawer wordmark, the home header, and the family page hero.
 */

import React from "react";
import { ImageBackground, View, StyleSheet, type StyleProp, type ViewStyle } from "react-native";

interface Props {
  uri: string;
  style?: StyleProp<ViewStyle>;
  /** Uniform corner radius for the image + scrim. */
  radius?: number;
  /** Dark overlay opacity (0–1) so overlaid text stays readable. */
  scrim?: number;
  children: React.ReactNode;
}

export default function FamilyPhotoBackdrop({ uri, style, radius = 0, scrim = 0.42, children }: Props) {
  return (
    <ImageBackground
      source={{ uri }}
      style={style}
      imageStyle={{ borderRadius: radius }}
      resizeMode="cover"
    >
      <View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: `rgba(0,0,0,${scrim})`, borderRadius: radius }]}
      />
      {children}
    </ImageBackground>
  );
}
