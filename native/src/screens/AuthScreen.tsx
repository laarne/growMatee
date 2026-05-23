import { useEffect, useState } from "react";
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import * as Linking from "expo-linking";
import { BrandMark } from "../components/BrandMark";
import { Button } from "../components/Button";
import { Card } from "../components/Card";
import { authRedirectUrl, createSessionFromRedirectUrl } from "../services/authRedirect";
import { isSupabaseConfigured, supabase } from "../services/supabase";
import { colors } from "../theme/colors";

type AuthMode = "sign-in" | "sign-up";

export function AuthScreen() {
  const [mode, setMode] = useState<AuthMode>("sign-in");
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSignUp = mode === "sign-up";
  const canSubmit = Boolean(email.trim() && password.length >= 6 && (!isSignUp || displayName.trim()));

  async function handleSubmit() {
    if (!supabase || !canSubmit) return;

    setIsSubmitting(true);
    setMessage(null);
    setError(null);

    const normalizedEmail = email.trim().toLowerCase();
    const result = isSignUp
      ? await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: { full_name: displayName.trim() },
            emailRedirectTo: authRedirectUrl,
          },
        })
      : await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message);
      return;
    }

    if (isSignUp && !result.data.session) {
      setMessage("Check your email to confirm your GrowMate account.");
      return;
    }

    setMessage(isSignUp ? "Account created. Welcome to GrowMate." : "Signed in.");
  }

  async function handleForgotPassword() {
    if (!supabase) return;
    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail) {
      setError("Enter your email address first, then tap Forgot password.");
      return;
    }
    setIsSubmitting(true);
    setError(null);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: authRedirectUrl,
    });
    setIsSubmitting(false);
    if (resetError) {
      setError(resetError.message);
    } else {
      setMessage("Password reset link sent. Check your email.");
    }
  }

  async function handleIncomingLink(url: string | null) {
    if (!url) return;

    try {
      await createSessionFromRedirectUrl(url);
      setMessage("Email confirmed. Welcome to GrowMate.");
    } catch (linkError) {
      const nextMessage = linkError instanceof Error ? linkError.message : "Unable to confirm email link.";
      setError(nextMessage);
    }
  }

  useEffect(() => {
    Linking.getInitialURL().then(handleIncomingLink);
    const subscription = Linking.addEventListener("url", (event) => handleIncomingLink(event.url));
    return () => subscription.remove();
  }, []);

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.root}>
      <View style={styles.container}>
        <View style={styles.brandWrap}>
          <BrandMark />
        </View>
        <Text style={styles.eyebrow}>Buyer-first plant marketplace</Text>
        <Text style={styles.title}>Sign in to GrowMate</Text>
        <Text style={styles.subtitle}>Sign in to browse, buy, message, post, and build your garden. Seller tools unlock after verification.</Text>

        <Card>
          <View style={styles.modeRow}>
            <Button variant={mode === "sign-in" ? "primary" : "secondary"} onPress={() => setMode("sign-in")}>
              Sign in
            </Button>
            <Button variant={mode === "sign-up" ? "primary" : "secondary"} onPress={() => setMode("sign-up")}>
              Create
            </Button>
          </View>

          {isSignUp && (
            <TextInput
              autoCapitalize="words"
              onChangeText={setDisplayName}
              placeholder="Full name"
              placeholderTextColor="#8a9583"
              style={styles.input}
              value={displayName}
            />
          )}
          <TextInput
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#8a9583"
            style={styles.input}
            value={email}
          />
          <TextInput
            autoCapitalize="none"
            autoComplete="password"
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#8a9583"
            secureTextEntry
            style={styles.input}
            value={password}
          />

          <Button disabled={!canSubmit || isSubmitting || !isSupabaseConfigured} onPress={handleSubmit}>
            {isSubmitting ? "Please wait..." : isSignUp ? "Create buyer account" : "Sign in"}
          </Button>

          {!isSignUp && (
            <Pressable onPress={handleForgotPassword} style={styles.forgotLink}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </Pressable>
          )}

          {isSubmitting && <ActivityIndicator color={colors.green} style={styles.loader} />}
          {message && <Text style={styles.success}>{message}</Text>}
          {error && <Text style={styles.error}>{error}</Text>}
        </Card>

        {!isSupabaseConfigured && (
          <Card tint="warning">
            <Text style={styles.warningTitle}>Supabase keys missing</Text>
            <Text style={styles.warningText}>Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in native/.env.local.</Text>
          </Card>
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.cream,
  },
  container: {
    flex: 1,
    justifyContent: "center",
    padding: 22,
  },
  brandWrap: {
    marginBottom: 24,
  },
  eyebrow: {
    color: colors.leaf,
    fontSize: 14,
    fontWeight: "900",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  title: {
    color: colors.green,
    fontSize: 34,
    fontWeight: "900",
    lineHeight: 38,
    marginTop: 8,
  },
  subtitle: {
    color: colors.greenMuted,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 23,
    marginBottom: 22,
    marginTop: 10,
  },
  modeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
  },
  input: {
    backgroundColor: colors.cream,
    borderColor: colors.line,
    borderRadius: 18,
    borderWidth: 1,
    color: colors.green,
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  loader: {
    marginTop: 12,
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
});
