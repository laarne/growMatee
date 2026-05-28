import { useEffect, useState } from "react";
import { Image, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { authRedirectUrl, createSessionFromRedirectUrl } from "../services/authRedirect";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { colors } from "../theme/colors";
import { sanitizeUserInput } from "../utils/sanitize";

type AuthMode = "sign-in" | "sign-up";

const USERNAME_MAX_LENGTH = 32;
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 72;
const googleLogo = require("../../assets/google-g-logo.png");

function normalizeUsernameInput(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_.]/g, "").slice(0, USERNAME_MAX_LENGTH);
}

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);

  const isSignUp = mode === "sign-up";
  const googleButtonLabel = isSubmitting ? "Opening Google..." : isSignUp ? "Create account with Google" : "Continue with Google";
  const normalizedUsername = sanitizeUserInput(username, { maxLength: USERNAME_MAX_LENGTH }).toLowerCase();
  const normalizedEmail = sanitizeUserInput(email, { maxLength: EMAIL_MAX_LENGTH }).toLowerCase();
  const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail);
  const passwordRules = [
    { label: "8-72 characters", passed: password.length >= 8 && password.length <= PASSWORD_MAX_LENGTH },
    { label: "One uppercase and one lowercase letter", passed: /[A-Z]/.test(password) && /[a-z]/.test(password) },
    { label: "At least one number", passed: /\d/.test(password) },
    { label: "No spaces", passed: password.length > 0 && !/\s/.test(password) },
  ];
  const hasValidPassword = passwordRules.every((rule) => rule.passed);
  const usernamePattern = /^[a-z0-9_.]{3,32}$/;
  const hasValidUsername = usernamePattern.test(normalizedUsername);
  const passwordsMatch = password === confirmPassword;
  const canSubmit = isSignUp
    ? hasValidUsername && hasValidEmail && hasValidPassword && passwordsMatch
    : Boolean(normalizedUsername && password);

  const signUpChecks = [
    { label: "Username: 3-32 chars; lowercase letters, numbers, underscores, or dots", passed: hasValidUsername },
    { label: "Email: valid address, max 254 chars", passed: hasValidEmail },
    ...passwordRules.map((rule) => ({ label: `Password: ${rule.label}`, passed: rule.passed })),
    { label: "Confirm password matches", passed: confirmPassword.length > 0 && passwordsMatch },
  ];

  function getFriendlyAuthError(authError: unknown, fallback: string) {
    const errorCode = typeof authError === "object" && authError !== null && "code" in authError ? String((authError as { code?: unknown }).code) : "";
    const message = authError instanceof Error ? authError.message : "";
    const lower = `${errorCode} ${message}`.toLowerCase();

    if (lower.includes("network") || lower.includes("fetch") || lower.includes("failed to fetch")) {
      return "Network error. Please try again.";
    }
    if (lower.includes("email_not_confirmed") || lower.includes("email not confirmed")) {
      return "Email not confirmed. Turn off email confirmations in Supabase while testing, or confirm this account first.";
    }
    if (lower.includes("invalid login") || lower.includes("invalid credentials")) {
      return "Invalid username/email or password.";
    }
    if (message) return message;
    return fallback;
  }

  async function handlePasswordSubmit() {
    if (!supabase || !canSubmit || isSubmitting) return;

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    try {
      if (isSignUp) {
        if (!hasValidUsername) {
          setError("Username must be 3-32 characters using letters, numbers, underscores, or dots.");
          return;
        }
        if (!hasValidEmail) {
          setError("Enter a valid email address.");
          return;
        }
        if (!hasValidPassword) {
          setError("Password must be 8-72 characters and include uppercase, lowercase, a number, and no spaces.");
          return;
        }
        if (!passwordsMatch) {
          setError("Passwords do not match.");
          return;
        }

        const { data: existingProfile, error: usernameCheckError } = await supabase
          .from("profiles")
          .select("id")
          .eq("username", normalizedUsername)
          .maybeSingle();

        if (usernameCheckError) {
          setError(getFriendlyAuthError(usernameCheckError, "Unable to check username availability."));
          return;
        }

        if (existingProfile) {
          setError("That username is already taken.");
          return;
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              full_name: normalizedUsername,
              username: normalizedUsername,
            },
            emailRedirectTo: authRedirectUrl,
          },
        });

        if (signUpError) {
          setError(getFriendlyAuthError(signUpError, "Unable to create account."));
          return;
        }

        if (data.session && data.user) {
          const { error: profileUpdateError } = await supabase
            .from("profiles")
            .update({
              display_name: normalizedUsername,
              username: normalizedUsername,
            })
            .eq("id", data.user.id);

          if (profileUpdateError) {
            setError(getFriendlyAuthError(profileUpdateError, "Account created, but username could not be saved."));
            return;
          }

          setMessage("Account created. Welcome to GrowMate.");
          return;
        }

        setMessage("Account created. Turn off email confirmations in Supabase while testing so users can sign in immediately.");
        return;
      }

      if (!normalizedUsername.includes("@")) {
        setError("Username-only sign-in needs a backend lookup. For now, enter your email in the username field.");
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: normalizedUsername,
        password,
      });

      if (signInError) {
        setError(getFriendlyAuthError(signInError, "Unable to sign in."));
        return;
      }

      setMessage("Signed in.");
    } catch (submitError) {
      setError(getFriendlyAuthError(submitError, isSignUp ? "Unable to create account." : "Unable to sign in."));
    } finally {
      setIsSubmitting(false);
    }
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
      const nextMessage = linkError instanceof Error ? linkError.message : "Unable to confirm email link.";
      setError(nextMessage);
    }
  }

  useEffect(() => {
    Linking.getInitialURL()
      .then(handleIncomingLink)
      .catch((err) => {
        setError(err instanceof Error ? err.message : "Failed to load initial deep link");
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
          <Text style={styles.subtitle}>Browse verified plants, message sellers, track orders, and build your garden.</Text>

          <View style={styles.heroChips}>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="sprout" size={15} color="#d9f6cd" />
              <Text style={styles.heroChipText}>Verified plants</Text>
            </View>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="shield-check-outline" size={15} color="#d9f6cd" />
              <Text style={styles.heroChipText}>Safe orders</Text>
            </View>
            <View style={styles.heroChip}>
              <MaterialCommunityIcons name="truck-delivery-outline" size={15} color="#d9f6cd" />
              <Text style={styles.heroChipText}>Easy delivery</Text>
            </View>
          </View>
        </View>

        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{isSignUp ? "Create your GrowMate account" : "Sign in to GrowMate"}</Text>
          <Text style={styles.sheetSubtitle}>
            {isSignUp
              ? "Start with Google to browse plants, message sellers, and build your garden."
              : "Browse plants, message sellers, and track your orders. Seller tools unlock after verification."}
          </Text>

          <View style={styles.modeRow}>
            <View style={styles.modeItem}>
              <Pressable
                onPress={() => {
                  setMode("sign-in");
                  setEmail("");
                  setConfirmPassword("");
                  setMessage(null);
                  setError(null);
                }}
                style={[styles.modeButton, mode === "sign-in" && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === "sign-in" && styles.modeButtonTextActive]}>Sign in</Text>
              </Pressable>
            </View>
            <View style={styles.modeItem}>
              <Pressable
                onPress={() => {
                  setMode("sign-up");
                  setPassword("");
                  setConfirmPassword("");
                  setMessage(null);
                  setError(null);
                }}
                style={[styles.modeButton, mode === "sign-up" && styles.modeButtonActive]}
              >
                <Text style={[styles.modeButtonText, mode === "sign-up" && styles.modeButtonTextActive]}>Create account</Text>
              </Pressable>
            </View>
          </View>

          <TextInput
            autoCapitalize="none"
            autoComplete={isSignUp ? "username" : "email"}
            keyboardType={isSignUp ? "default" : "email-address"}
            maxLength={USERNAME_MAX_LENGTH}
            onChangeText={(value) => setUsername(isSignUp ? normalizeUsernameInput(value) : value.slice(0, EMAIL_MAX_LENGTH))}
            placeholder={isSignUp ? "Username" : "Email"}
            placeholderTextColor="#8a9583"
            style={[styles.input, error && styles.inputError]}
            value={username}
          />
          {!isSignUp && (
            <Text style={styles.authHelperText}>Use your account email to sign in.</Text>
          )}
          {isSignUp && (
            <TextInput
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              maxLength={EMAIL_MAX_LENGTH}
              onChangeText={(value) => setEmail(value.trim().slice(0, EMAIL_MAX_LENGTH))}
              placeholder="Email"
              placeholderTextColor="#8a9583"
              style={[styles.input, error && styles.inputError]}
              value={email}
            />
          )}
          <View style={[styles.passwordWrap, error && styles.inputError]}>
            <TextInput
              autoCapitalize="none"
              autoComplete={isSignUp ? "new-password" : "password"}
              maxLength={PASSWORD_MAX_LENGTH}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor="#8a9583"
              secureTextEntry={!isPasswordVisible}
              style={styles.passwordInput}
              value={password}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
              hitSlop={8}
              onPress={() => setIsPasswordVisible((current) => !current)}
              style={styles.eyeButton}
            >
              <MaterialCommunityIcons
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.greenMuted}
              />
            </Pressable>
          </View>
          {isSignUp && (
            <View style={[styles.passwordWrap, error && styles.inputError]}>
              <TextInput
                autoCapitalize="none"
                autoComplete="new-password"
                maxLength={PASSWORD_MAX_LENGTH}
                onChangeText={setConfirmPassword}
                placeholder="Confirm password"
                placeholderTextColor="#8a9583"
                secureTextEntry={!isPasswordVisible}
                style={styles.passwordInput}
                value={confirmPassword}
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={isPasswordVisible ? "Hide password" : "Show password"}
                hitSlop={8}
                onPress={() => setIsPasswordVisible((current) => !current)}
                style={styles.eyeButton}
              >
                <MaterialCommunityIcons
                  name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                  size={20}
                  color={colors.greenMuted}
                />
              </Pressable>
            </View>
          )}

          {isSignUp && (
            <View style={styles.guidelinesBox}>
              <Text style={styles.guidelinesTitle}>Account limits</Text>
              {signUpChecks.map((check) => (
                <View key={check.label} style={styles.guidelineRow}>
                  <MaterialCommunityIcons
                    name={check.passed ? "check-circle" : "circle-outline"}
                    size={15}
                    color={check.passed ? colors.green : colors.greenMuted}
                  />
                  <Text style={[styles.guidelineText, check.passed && styles.guidelineTextPassed]}>
                    {check.label}
                  </Text>
                </View>
              ))}
            </View>
          )}

          <Pressable
            disabled={!isSupabaseConfigured || isSubmitting || !canSubmit}
            onPress={handlePasswordSubmit}
            style={({ pressed }) => [
              styles.submitButton,
              !isSupabaseConfigured || isSubmitting || !canSubmit ? styles.submitButtonDisabled : styles.submitButtonActive,
              pressed && isSupabaseConfigured && !isSubmitting && canSubmit && styles.submitButtonPressed,
            ]}
          >
            <Text style={[styles.submitButtonText, (!isSupabaseConfigured || isSubmitting || !canSubmit) && styles.submitButtonTextDisabled]}>
              {isSubmitting ? "Please wait..." : isSignUp ? "Create" : "Sign in"}
            </Text>
          </Pressable>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

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
    backgroundColor: colors.cream,
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
    flexWrap: "wrap",
    gap: 8,
    marginTop: 22,
  },
  heroChip: {
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderColor: "rgba(255,255,255,0.16)",
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: "row",
    gap: 5,
    minHeight: 36,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  heroChipText: {
    color: "#f4fff1",
    fontSize: 13,
    fontWeight: "800",
  },
  sheet: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -18,
    minHeight: 444,
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
  dividerRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
    marginVertical: 14,
  },
  dividerLine: {
    backgroundColor: colors.line,
    flex: 1,
    height: 1,
  },
  dividerText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "800",
  },
  modeRow: {
    backgroundColor: colors.surface1,
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    marginBottom: 12,
    padding: 4,
  },
  modeItem: {
    flex: 1,
  },
  modeButton: {
    alignItems: "center",
    borderRadius: 999,
    justifyContent: "center",
    minHeight: 40,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: colors.green,
  },
  modeButtonText: {
    color: colors.greenMuted,
    fontSize: 13,
    fontWeight: "900",
  },
  modeButtonTextActive: {
    color: colors.white,
  },
  input: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    color: colors.green,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  inputError: {
    borderColor: "#ef4444",
  },
  passwordWrap: {
    alignItems: "center",
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    marginBottom: 12,
  },
  passwordInput: {
    color: colors.green,
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: 13,
  },
  eyeButton: {
    alignItems: "center",
    height: 46,
    justifyContent: "center",
    paddingRight: 14,
    width: 44,
  },
  guidelinesBox: {
    backgroundColor: colors.surface1,
    borderColor: colors.line,
    borderRadius: 16,
    borderWidth: 1,
    gap: 7,
    marginBottom: 12,
    padding: 12,
  },
  guidelinesTitle: {
    color: colors.green,
    fontSize: 12,
    fontWeight: "900",
    marginBottom: 1,
    textTransform: "uppercase",
  },
  guidelineRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 7,
  },
  guidelineText: {
    color: colors.greenMuted,
    flex: 1,
    fontSize: 11,
    fontWeight: "800",
    lineHeight: 15,
  },
  guidelineTextPassed: {
    color: colors.green,
  },
  submitButton: {
    alignItems: "center",
    borderRadius: 999,
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  submitButtonActive: {
    backgroundColor: colors.green,
  },
  submitButtonDisabled: {
    backgroundColor: "#eef4e9",
    borderColor: "#e2ecd9",
    borderWidth: 1,
  },
  submitButtonPressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  submitButtonText: {
    color: colors.white,
    fontSize: 15,
    fontWeight: "900",
  },
  submitButtonTextDisabled: {
    color: "#8c9b89",
  },
  termsText: {
    color: colors.greenMuted,
    fontSize: 11,
    fontWeight: "700",
    lineHeight: 16,
    marginTop: 10,
    textAlign: "center",
  },
  authHelperText: {
    color: colors.greenMuted,
    fontSize: 12,
    fontWeight: "700",
    marginTop: -4,
    marginBottom: 10,
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
    fontSize: 13,
    fontWeight: "800",
    lineHeight: 20,
    marginTop: 12,
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
