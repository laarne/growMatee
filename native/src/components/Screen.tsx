import { ReactNode } from "react";
import { Platform, SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { AppHeader } from "./AppHeader";
import { colors } from "../theme/colors";

type ScreenProps = {
  children: ReactNode;
  /** Short all-caps label shown above the title, e.g. "MARKETPLACE" */
  sectionLabel?: string;
  /** Large bold title shown in the header, e.g. "Market" */
  title?: string;
  showHeader?: boolean;
  scroll?: boolean;
  noPadding?: boolean;
};

export function Screen({
  children,
  sectionLabel,
  title,
  scroll = true,
  showHeader = true,
  noPadding = false,
}: ScreenProps) {
  const content = (
    <View
      style={[
        styles.inner,
        noPadding && styles.noPadding,
        !scroll && styles.fill,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={styles.safe}>
      {showHeader && <AppHeader sectionLabel={sectionLabel} title={title} />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    // Extra padding so content is never hidden behind anything at the bottom
    paddingBottom: Platform.OS === "ios" ? 16 : 16,
  },
  fill: {
    flex: 1,
  },
  inner: {
    paddingHorizontal: 20,
    paddingTop: 14,
  },
  noPadding: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
});
