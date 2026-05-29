import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as Linking from "expo-linking";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { authRedirectUrl, createSessionFromRedirectUrl } from "../services/authRedirect";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { colors } from "../theme/colors";

const googleLogo = require("../../assets/google-g-logo.png");

export function AuthScreen() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const googleButtonLabel = isSubmitting ? "Opening Google..." : "Continue with Google";

  function getFriendlyAuthError(authError: unknown, fallback: string) {
    const errorCode = typeof authError === "object" && authError !== null && "code" in authError ? String((authError as { code?: unknown }).code) : "";
    const message = authError instanceof Error ? authError.message : "";
    const lower = `${errorCode} ${message}`.toLowerCase();

    if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
      return "Network error. Please try again.";
    }
    if (lower.includes("auth session missing") || lower.includes("session missing") || lower.includes("expired")) {
      return "Your session expired. Please sign in again.";
    }
    if (lower.includes("access_denied") || lower.includes("cancelled") || lower.includes("canceled")) {
      return "Sign-in was cancelled. You can try again when you're ready.";
    }
    if (message) return message;
    return fallback;
  }

  async function handleGoogleSignIn() {
    if (!supabase || isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      const { data, error: googleError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: authRedirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (googleError) {
        setError(getFriendlyAuthError(googleError, "Google sign-in failed."));
        return;
      }

      if (!data.url) {
        setError("Google sign-in did not return a sign-in URL.");
        return;
      }

      await Linking.openURL(data.url);
      setMessage("Continue in Google to finish signing in.");
    } catch (googleError) {
      setError(getFriendlyAuthError(googleError, "Google sign-in failed."));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleIncomingLink(url: string | null) {
    if (!url) return;

    try {
      const session = await createSessionFromRedirectUrl(url);
      if (session) {
        setMessage("Signed in. Welcome to GrowMate.");
      }
    } catch (linkError) {
      setError(getFriendlyAuthError(linkError, "Unable to finish sign-in. Please try again."));
    }
  }

  useEffect(() => {
    Linking.getInitialURL()
      .then(handleIncomingLink)
      .catch((err) => {
        setError(getFriendlyAuthError(err, "Unable to restore your sign-in session."));
      });
    const subscription = Linking.addEventListener("url", (event) => handleIncomingLink(event.url));
    return () => subscription.remove();
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.hero}>
          <View style={styles.heroWarmth} />
          <View style={[styles.leafShape, styles.leafOne]} />
          <View style={[styles.leafShape, styles.leafTwo]} />
          <View style={[styles.leafShape, styles.leafThree]} />

          <View style={styles.heroBrandRow}>
            <BrandMark compact size={44} />
            <View>
              <Text style={styles.heroWordmark}>GrowMate</Text>
              <Text style={styles.heroTagline}>Buy, grow, and sell safely</Text>
            </View>
          </View>

          <Text style={styles.title}>Find your next healthy plant.</Text>
          <Text style={styles.subtitle}>Browse verified local collections and buy safely.</Text>

          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <View style={styles.heroChipIcon}>
                <MaterialCommunityIcons name="sprout" size={17} color="#fff4c2" />
              </View>
              <Text style={styles.heroChipText}>Verified plants</Text>
            </View>
            <View style={styles.heroChip}>
              <View style={styles.heroChipIcon}>
                <MaterialCommunityIcons name="shield-check-outline" size={17} color="#fff4c2" />
              </View>
              <Text style={styles.heroChipText}>Safe orders</Text>
            </View>
            <View style={styles.heroChip}>
              <View style={styles.heroChipIcon}>
                <MaterialCommunityIcons name="truck-delivery-outline" size={17} color="#fff4c2" />
              </View>
              <Text style={styles.heroChipText}>Easy delivery</Text>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Sign in to GrowMate</Text>
          <Text style={styles.sheetSubtitle}>
            Sign in to join our community of gardeners.
          </Text>

          <Pressable
            disabled={!isSupabaseConfigured || isSubmitting}
            onPress={handleGoogleSignIn}
            style={({ pressed }) => [
              styles.googleButton,
              (!isSupabaseConfigured || isSubmitting) && styles.googleButtonDisabled,
              pressed && !isSubmitting && isSupabaseConfigured && styles.googleButtonPressed,
            ]}
          >
            <Image source={googleLogo} style={styles.googleLogo} resizeMode="contain" />
            <Text style={styles.googleButtonText}>{googleButtonLabel}</Text>
          </Pressable>

          <Text style={styles.termsText}>
            By continuing, you agree to GrowMate's{" "}
            <Text style={styles.termsLink} onPress={() => setShowTerms(true)}>
              Marketplace Safety Terms
            </Text>
            .
          </Text>

          {message && <Text style={styles.success}>{message}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}

          {!isSupabaseConfigured && (
            <View style={styles.warningBox}>
              <Text style={styles.warningTitle}>Supabase keys missing</Text>
              <Text style={styles.warningText}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in native/.env.local.</Text>
            </View>
          )}
        </View>
      </ScrollView>

      <Modal animationType="fade" transparent visible={showTerms} onRequestClose={() => setShowTerms(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.termsSheet}>
            <View style={styles.termsHeader}>
              <Text style={styles.termsTitle}>Marketplace Safety Terms</Text>
              <Pressable onPress={() => setShowTerms(false)} hitSlop={8}>
                <MaterialCommunityIcons name="close" size={22} color={colors.green} />
              </Pressable>
            </View>
            <Text style={styles.termsBody}>
              Use GrowMate chat and order requests for marketplace purchases. Verified listings, seller messages, and order status updates help keep plant buying traceable.
            </Text>
            <Text style={styles.termsBody}>
              Avoid off-platform payment requests. Reports and order records may be reviewed to help resolve buyer and seller issues.
            </Text>
            <Button onPress={() => setShowTerms(false)}>Got it</Button>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.greenDark,
  },
  page: {
    flexGrow: 1,
    backgroundColor: colors.greenDark,
  },
  hero: {
    backgroundColor: colors.greenDark,
    minHeight: 326,
    overflow: "hidden",
    paddingBottom: 58,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 58 : 38,
    position: "relative",
  },
  heroWarmth: {
    position: "absolute",
    bottom: -90,
    right: -40,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(184,239,157,0.12)",
  },
  leafShape: {
    position: "absolute",
    backgroundColor: "rgba(217,246,205,0.16)",
    borderBottomLeftRadius: 90,
    borderTopRightRadius: 90,
    transform: [{ rotate: "-24deg" }],
  },
  leafOne: {
    height: 150,
    right: -38,
    top: 28,
    width: 84,
  },
  leafTwo: {
    bottom: 50,
    height: 126,
    left: -42,
    width: 72,
  },
  leafThree: {
    bottom: 10,
    height: 76,
    right: 50,
    width: 46,
    backgroundColor: "rgba(255,255,255,0.09)",
  },
  heroBrandRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  heroWordmark: {
    color: colors.white,
    fontSize: 23,
    fontWeight: "900",
  },
  heroTagline: {
    color: "rgba(255,255,255,0.72)",
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  eyebrow: {
    color: "#b8ef9d",
    fontSize: 12,
    fontWeight: "900",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.white,
    fontSize: 35,
    fontWeight: "900",
    lineHeight: 39,
    marginTop: 10,
    maxWidth: 300,
  },
  subtitle: {
    color: "rgba(255,255,255,0.77)",
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginTop: 12,
    maxWidth: 320,
  },
  heroChips: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
    marginTop: 24,
  },
  heroChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderColor: "rgba(255,244,194,0.18)",
    borderRadius: 18,
    borderWidth: 1,
    flex: 1,
    gap: 7,
    justifyContent: "center",
    minHeight: 72,
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  heroChipIcon: {
    alignItems: "center",
    backgroundColor: "rgba(255,211,96,0.16)",
    borderColor: "rgba(255,244,194,0.2)",
    borderRadius: 999,
    borderWidth: 1,
    height: 30,
    justifyContent: "center",
    width: 30,
  },
  heroChipText: {
    color: "#f4fff1",
    fontSize: 12,
    fontWeight: "900",
    lineHeight: 15,
    textAlign: "center",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    flexGrow: 1,
    marginTop: -18,
    paddingBottom: 30,
    paddingHorizontal: 22,
    paddingTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.1,
    shadowRadius: 18,
    elevation: 10,
  },
  sheetHandle: {
    alignSelf: "center",
    backgroundColor: colors.line,
    borderRadius: 999,
    height: 4,
    marginBottom: 14,
    width: 42,
  },
  sheetTitle: {
    color: colors.green,
    fontSize: 23,
    fontWeight: "900",
  },
  sheetSubtitle: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 19,
    marginBottom: 4,
    marginTop: 4,
  },
  googleButton: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderColor: colors.lineMid,
    borderRadius: 999,
    borderWidth: 1.5,
    flexDirection: "row",
    gap: 9,
    justifyContent: "center",
    marginTop: 14,
    minHeight: 48,
  },
  googleButtonDisabled: {
    opacity: 0.48,
  },
  googleButtonPressed: {
    backgroundColor: colors.surface1,
  },
  googleLogo: {
    height: 19,
    width: 19,
  },
  googleButtonText: {
    color: colors.green,
    fontSize: 14,
    fontWeight: "900",
  },
  authNote: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 18,
    marginTop: 12,
    textAlign: "center",
  },
  termsText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 10,
    textAlign: "center",
  },
  termsLink: {
    color: colors.green,
    fontWeight: "900",
    textDecorationLine: "underline",
  },
  success: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 12,
  },
  error: {
    color: "#9f2d20",
    backgroundColor: "#fff4f0",
    borderColor: "#f4c7bd",
    borderRadius: 14,
    borderWidth: 1,
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  warningTitle: {
    color: "#9f4b00",
    fontSize: 16,
    fontWeight: "900",
  },
  warningText: {
    color: "#765228",
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginTop: 8,
  },
  warningBox: {
    backgroundColor: colors.warning,
    borderColor: "#f6d860",
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 12,
    padding: 14,
  },
  forgotLink: {
    alignSelf: "center",
    marginTop: 8,
    paddingVertical: 4,
  },
  forgotText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "700",
  },
  confirmationActions: {
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  resendLink: {
    alignSelf: "center",
    borderColor: colors.lineMid,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  resendLinkPressed: {
    backgroundColor: colors.surface1,
  },
  resendText: {
    color: colors.green,
    fontSize: 13,
    fontWeight: "900",
  },
  signInInsteadLink: {
    paddingVertical: 2,
  },
  signInInsteadText: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "800",
    textDecorationLine: "underline",
  },
  modalOverlay: {
    alignItems: "center",
    backgroundColor: "rgba(15,34,20,0.42)",
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  termsSheet: {
    backgroundColor: colors.white,
    borderColor: colors.line,
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    width: "100%",
  },
  termsHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  termsTitle: {
    color: colors.green,
    fontSize: 18,
    fontWeight: "900",
  },
  termsBody: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "700",
    lineHeight: 20,
    marginBottom: 12,
  },
});
