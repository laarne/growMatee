import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

const WEB_AUTH_STORAGE_KEY = "__growmate_supabase_auth_storage__";

function getWebStorageItem(key: string) {
  if (typeof window === "undefined") return null;

  try {
    if (window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {}

  try {
    const raw = window.name || "";
    const cache = raw ? JSON.parse(raw) : {};
    return typeof cache?.[WEB_AUTH_STORAGE_KEY]?.[key] === "string"
      ? cache[WEB_AUTH_STORAGE_KEY][key]
      : null;
  } catch {
    return null;
  }
}

function setWebStorageItem(key: string, value: string) {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage) {
      window.localStorage.setItem(key, value);
      return true;
    }
  } catch {}

  try {
    const raw = window.name || "";
    const cache = raw ? JSON.parse(raw) : {};
    const authCache = typeof cache[WEB_AUTH_STORAGE_KEY] === "object" && cache[WEB_AUTH_STORAGE_KEY] !== null
      ? cache[WEB_AUTH_STORAGE_KEY]
      : {};
    cache[WEB_AUTH_STORAGE_KEY] = { ...authCache, [key]: value };
    window.name = JSON.stringify(cache);
    return true;
  } catch {
    return false;
  }
}

function removeWebStorageItem(key: string) {
  if (typeof window === "undefined") return false;

  try {
    if (window.localStorage) {
      window.localStorage.removeItem(key);
      return true;
    }
  } catch {}

  try {
    const raw = window.name || "";
    const cache = raw ? JSON.parse(raw) : {};
    if (cache?.[WEB_AUTH_STORAGE_KEY]) {
      delete cache[WEB_AUTH_STORAGE_KEY][key];
      window.name = JSON.stringify(cache);
    }
    return true;
  } catch {
    return false;
  }
}

const customStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return getWebStorageItem(key) ?? AsyncStorage.getItem(key);
    }
    try {
      return await SecureStore.getItemAsync(key);
    } catch (e) {
      console.error("SecureStore getItem failed, falling back to AsyncStorage", e);
      return AsyncStorage.getItem(key);
    }
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (setWebStorageItem(key, value)) return;
      return AsyncStorage.setItem(key, value);
    }
    try {
      await SecureStore.setItemAsync(key, value);
    } catch (e) {
      console.error("SecureStore setItem failed, falling back to AsyncStorage", e);
      await AsyncStorage.setItem(key, value);
    }
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      if (removeWebStorageItem(key)) return;
      return AsyncStorage.removeItem(key);
    }
    try {
      await SecureStore.deleteItemAsync(key);
    } catch (e) {
      console.error("SecureStore deleteItem failed, falling back to AsyncStorage", e);
      await AsyncStorage.removeItem(key);
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
      },
    })
  : null;

