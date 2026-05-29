import { ReactNode } from "react";
import { Platform, RefreshControl, RefreshControlProps, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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
  onCartPress?: () => void;
  /** Pass a RefreshControl for pull-to-refresh support */
  refreshControl?: React.ReactElement<RefreshControlProps>;
};


export function Screen({
  children,
  sectionLabel,
  title,
  scroll = true,
  showHeader = true,
  noPadding = false,
  onCartPress,
  refreshControl,
}: ScreenProps) {
  const insets = useSafeAreaInsets();

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
    <View style={[styles.safe, showHeader && { paddingTop: insets.top }]}>
      {showHeader && <AppHeader sectionLabel={sectionLabel} title={title} onCartPress={onCartPress} />}
      {scroll ? (
        <ScrollView
          contentContainerStyle={styles.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          refreshControl={refreshControl}
        >
          {content}
        </ScrollView>
      ) : (
        <View style={styles.fill}>{content}</View>
      )}
    </View>
  );
}


const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  scroll: {
    // Extra padding so content is never hidden behind anything at the bottom
    paddingBottom: Platform.OS === "ios" ? 44 : 48,
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
