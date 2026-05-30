import { useEffect, useRef } from "react";
import type { ReactNode } from "react";
import { Animated, StyleProp, StyleSheet, View, ViewStyle } from "react-native";
import { colors, radius } from "../theme/colors";

type SkeletonBlockProps = {
  height: number;
  width?: number | `${number}%`;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
};

export function SkeletonBlock({ height, width = "100%", borderRadius = radius.sm, style }: SkeletonBlockProps) {
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.timing(shimmer, {
        duration: 1200,
        toValue: 1,
        useNativeDriver: true,
      }),
    );
    loop.start();
    return () => loop.stop();
  }, [shimmer]);

  const translateX = shimmer.interpolate({
    inputRange: [0, 1],
    outputRange: [-180, 360],
  });

  return (
    <View style={[styles.block, { borderRadius, height, width }, style]}>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

export function SkeletonLine({ width = "70%", height = 12, style }: Omit<SkeletonBlockProps, "borderRadius">) {
  return <SkeletonBlock width={width} height={height} borderRadius={radius.full} style={style} />;
}

export function SkeletonCard({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: "#ebeae4",
    overflow: "hidden",
  },
  shimmer: {
    backgroundColor: "rgba(255,255,255,0.55)",
    bottom: 0,
    position: "absolute",
    top: 0,
    width: 80,
  },
  card: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
});
