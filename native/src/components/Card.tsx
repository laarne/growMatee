import { ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import { colors, radius, shadow } from "../theme/colors";

type CardProps = {
  children: ReactNode;
  tint?: "white" | "sage" | "warning" | "success" | "error" | "flat";
  /** Remove default bottom margin */
  noMargin?: boolean;
  /** Remove padding */
  noPadding?: boolean;
};

export function Card({ children, tint = "white", noMargin = false, noPadding = false }: CardProps) {
  return (
    <View
      style={[
        styles.card,
        styles[tint],
        noMargin && styles.noMargin,
        noPadding && styles.noPadding,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.line,
    marginBottom: 12,
    padding: 16,
    ...shadow.sm,
  },
  noMargin: { marginBottom: 0 },
  noPadding: { padding: 0 },

  white: { backgroundColor: colors.surface0 },
  sage: {
    backgroundColor: colors.surface1,
    borderColor: colors.lineMid,
  },
  warning: {
    backgroundColor: colors.warning,
    borderColor: "#f6d860",
  },
  success: {
    backgroundColor: colors.success,
    borderColor: "#86efac",
  },
  error: {
    backgroundColor: colors.error,
    borderColor: "#fca5a5",
  },
  flat: {
    backgroundColor: colors.surface0,
    borderWidth: 0,
    shadowOpacity: 0,
    elevation: 0,
  },
});
