import * as QueryParams from "expo-auth-session/build/QueryParams";
import * as Linking from "expo-linking";
import { supabase } from "./supabase";

export const authRedirectUrl = Linking.createURL("auth/callback", {
  scheme: "growmate",
});

export async function createSessionFromRedirectUrl(url: string) {
  if (!supabase) return null;

  const parsedUrl = Linking.parse(url);
  const expectedUrl = Linking.parse(authRedirectUrl);
  const isExpectedCallback =
    parsedUrl.scheme === expectedUrl.scheme &&
    parsedUrl.hostname === expectedUrl.hostname &&
    parsedUrl.path === expectedUrl.path;

  if (!isExpectedCallback) {
    return null;
  }

  const { params, errorCode } = QueryParams.getQueryParams(url);

  if (errorCode) {
    throw new Error(errorCode);
  }

  if (params.access_token || params.refresh_token) {
    throw new Error("This sign-in link is not supported. Please start Google sign-in again.");
  }

  const code = params.code;
  if (typeof code !== "string" || !code) {
    return null;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw error;
  }

  return data.session;
}
