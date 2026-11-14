// Settings: defaults from mobile/.env (EXPO_PUBLIC_*), overridden by what the user saves in the app.
import * as SecureStore from "expo-secure-store";

import type { Settings } from "./api";

const STORAGE_KEY = "darija-settings";

export const defaultSettings: Settings = {
  apiUrl: process.env.EXPO_PUBLIC_API_URL ?? "",
  username: process.env.EXPO_PUBLIC_USERNAME ?? "",
  password: process.env.EXPO_PUBLIC_PASSWORD ?? "",
};

export async function loadSettings(): Promise<Settings> {
  try {
    const saved = await SecureStore.getItemAsync(STORAGE_KEY);
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  } catch {
    return defaultSettings; // unreadable storage: fall back to the .env values
  }
}

export async function saveSettings(settings: Settings): Promise<void> {
  // SecureStore keeps the password encrypted (Android Keystore / iOS Keychain).
  await SecureStore.setItemAsync(STORAGE_KEY, JSON.stringify(settings));
}

/** Returns a problem to show the user, or "" if the URL looks usable from a phone. */
export function urlProblem(apiUrl: string): string {
  if (!apiUrl.trim()) {
    return "Set the server URL, e.g. http://192.168.1.20:9080 (your PC's IP address).";
  }
  if (!/^https?:\/\//.test(apiUrl.trim())) {
    return "The server URL must start with http://";
  }
  if (/\/\/(localhost|127\.0\.0\.1)\b/.test(apiUrl)) {
    return "On a phone, localhost is the phone itself. Use your PC's IP address instead.";
  }
  return "";
}
