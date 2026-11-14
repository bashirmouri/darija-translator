import { StatusBar } from "expo-status-bar";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar as NativeStatusBar,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import type { Settings } from "./src/api";
import SettingsScreen from "./src/SettingsScreen";
import { loadSettings, saveSettings, urlProblem } from "./src/settings";
import { colors } from "./src/theme";
import TranslateScreen from "./src/TranslateScreen";

type Tab = "translate" | "settings";

export default function App() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [tab, setTab] = useState<Tab>("translate");

  useEffect(() => {
    loadSettings().then((loaded) => {
      setSettings(loaded);
      // First launch without a usable configuration: start on the settings screen.
      if (urlProblem(loaded.apiUrl) || !loaded.username || !loaded.password) {
        setTab("settings");
      }
    });
  }, []);

  async function handleSave(updated: Settings) {
    await saveSettings(updated);
    setSettings(updated);
  }

  return (
    <View style={styles.screen}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <Text style={styles.title}>Darija Translator</Text>
        <View style={styles.tabs}>
          <TabButton label="Translate" active={tab === "translate"} onPress={() => setTab("translate")} />
          <TabButton label="Settings" active={tab === "settings"} onPress={() => setTab("settings")} />
        </View>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          {settings === null ? (
            <ActivityIndicator color={colors.accent} />
          ) : tab === "translate" ? (
            <TranslateScreen settings={settings} />
          ) : (
            // key: re-create the form after a save so it shows the stored values
            <SettingsScreen key={JSON.stringify(settings)} settings={settings} onSave={handleSave} />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function TabButton({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.tab, active && styles.tabActive]}
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  header: {
    paddingTop: (Platform.OS === "android" ? NativeStatusBar.currentHeight ?? 24 : 54) + 8,
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: { fontSize: 22, fontWeight: "700", color: colors.text },
  tabs: { flexDirection: "row", gap: 8, marginTop: 10 },
  tab: { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 16, backgroundColor: colors.surface },
  tabActive: { backgroundColor: colors.accent },
  tabText: { color: colors.text, fontWeight: "600" },
  tabTextActive: { color: "#ffffff" },
  content: { padding: 16, paddingBottom: 48 },
});
