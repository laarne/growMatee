import { ReactNode } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { colors, radius } from "../theme/colors";

type ButtonProps = {
  children: ReactNode;
  onPress?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof MaterialCommunityIcons.glyphMap;
  iconRight?: keyof typeof MaterialCommunityIcons.glyphMap;
  fullWidth?: boolean;
};

export function Button({
  children,
  onPress,
  variant = "primary",
  size = "md",
  disabled = false,
  loading = false,
  icon,
  iconRight,
  fullWidth = true,
}: ButtonProps) {
  const isDisabled = disabled || loading;
  const iconColor =
    variant === "primary" || variant === "danger"
      ? colors.white
      : variant === "ghost"
      ? colors.green
      : colors.greenMid;
  const iconSize = size === "sm" ? 15 : size === "lg" ? 20 : 17;

  return (
    <Pressable
      disabled={isDisabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        styles[variant],
        styles[`size_${size}`],
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={iconColor} size={iconSize} />
      ) : (
        <View style={styles.inner}>
          {icon && (
            <MaterialCommunityIcons color={iconColor} name={icon} size={iconSize} />
          )}
          <Text style={[styles.text, styles[`text_${variant}`], styles[`textSize_${size}`]]}>
            {children}
          </Text>
          {iconRight && (
            <MaterialCommunityIcons color={iconColor} name={iconRight} size={iconSize} />
          )}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.full,
    overflow: "hidden",
  },
  fullWidth: { alignSelf: "stretch" },
  inner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },

  // ── Variants ──────────────────────────────────────────
  primary: {
    backgroundColor: colors.green,
  },
  secondary: {
    backgroundColor: colors.surface1,
    borderWidth: 1.5,
    borderColor: colors.line,
  },
  ghost: {
    backgroundColor: "transparent",
  },
  danger: {
    backgroundColor: "#dc2626",
  },

  // ── Sizes ─────────────────────────────────────────────
  size_sm: { minHeight: 36, paddingHorizontal: 14 },
  size_md: { minHeight: 46, paddingHorizontal: 20 },
  size_lg: { minHeight: 54, paddingHorizontal: 24 },

  // ── Text ──────────────────────────────────────────────
  text: {
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  text_primary: { color: colors.white },
  text_secondary: { color: colors.greenMid },
  text_ghost: { color: colors.green },
  text_danger: { color: colors.white },

  textSize_sm: { fontSize: 13 },
  textSize_md: { fontSize: 15 },
  textSize_lg: { fontSize: 16 },

  // ── States ────────────────────────────────────────────
  pressed: { opacity: 0.82, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
});
