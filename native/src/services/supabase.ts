import "react-native-url-polyfill/auto";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

function getWebStorageItem(key: string) {
  if (typeof window === "undefined") return null;

  try {
    if (window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}

  return null;
}

function setWebStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {}

  return false;
}

function removeWebStorageItem(key: string) {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch {}

  return false;
}

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return getWebStorageItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error("SecureStore getItem failed. Auth session will not be restored from insecure storage.", e);
      return null;
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (setWebStorageItem(key, value)) return;
      return;
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error("SecureStore setItem failed. Refusing to persist auth session in plaintext storage.", e);
      throw new Error("Secure session storage is unavailable.");
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (removeWebStorageItem(key)) return;
      return;
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error("SecureStore deleteItem failed.", e);
    }
  },
};

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        storage: customStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: "pkce",
      },
    })
  : null;

