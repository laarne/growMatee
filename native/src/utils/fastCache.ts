import AsyncStorage from "@react-native-async-storage/async-storage";

type CacheEnvelope<T> = {
  savedAt: number;
  value: T;
};

export async function readFastCache<T>(key: string, maxAgeMs?: number): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed.savedAt !== "number" || !("value" in parsed)) return null;

    if (maxAgeMs && Date.now() - parsed.savedAt > maxAgeMs) {
      return null;
    }

    return parsed.value;
  } catch (error) {
    console.warn("Fast cache read failed:", error);
    return null;
  }
}

export async function writeFastCache<T>(key: string, value: T): Promise<void> {
  try {
    const payload: CacheEnvelope<T> = {
      savedAt: Date.now(),
      value,
    };
    await AsyncStorage.setItem(key, JSON.stringify(payload));
  } catch (error) {
    console.warn("Fast cache write failed:", error);
  }
}
