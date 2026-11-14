import * as Clipboard from "expo-clipboard";
import { useRef, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { ApiError, Script, Settings, translate } from "./api";
import { speakArabic, stopSpeaking } from "./speech";
import { colors, shared } from "./theme";

const MAX_LENGTH = 5000;

export default function TranslateScreen({ settings }: { settings: Settings }) {
  const [text, setText] = useState("");
  const [script, setScript] = useState<Script>("arabic");
  const [translation, setTranslation] = useState("");
  const [translationScript, setTranslationScript] = useState<Script>("arabic");
  const [busy, setBusy] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const latestRequest = useRef(0); // only the newest request may update the screen

  async function runTranslation(chosenScript: Script = script) {
    const trimmed = text.trim();
    setError("");
    setInfo("");
    if (!trimmed) {
      setInfo("Type some text first.");
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      setError(`The text is too long (${trimmed.length} characters, maximum ${MAX_LENGTH}).`);
      return;
    }

    const requestId = ++latestRequest.current;
    setBusy(true);
    setTranslation("");
    stopSpeaking();
    try {
      const result = await translate(settings, trimmed, chosenScript);
      if (requestId === latestRequest.current) {
        setTranslation(result);
        setTranslationScript(chosenScript);
      }
    } catch (e) {
      if (requestId === latestRequest.current) {
        setError(e instanceof ApiError ? e.message : "Something went wrong. Try again.");
      }
    } finally {
      if (requestId === latestRequest.current) {
        setBusy(false);
      }
    }
  }

  function chooseScript(value: Script) {
    if (value === script) {
      return;
    }
    setScript(value);
    if (translation && text.trim()) {
      runTranslation(value); // re-translate so the toggle has a visible effect
    }
  }

  async function copy() {
    await Clipboard.setStringAsync(translation);
    setInfo("Copied to the clipboard.");
  }

  async function readAloud() {
    if (speaking) {
      await stopSpeaking();
      setSpeaking(false);
      return;
    }
    if (translationScript === "latin") {
      setInfo("Read aloud needs Arabic script: switch to العربية.");
      return;
    }
    const started = await speakArabic(translation, () => setSpeaking(false));
    if (started) {
      setSpeaking(true);
    } else {
      setError("No Arabic voice on this phone. Install one in the phone's text-to-speech settings.");
    }
  }

  const isArabic = translationScript === "arabic";

  return (
    <View>
      <Text style={shared.label}>Text to translate</Text>
      <TextInput
        style={[shared.input, styles.textArea]}
        value={text}
        onChangeText={setText}
        placeholder="Where is the train station?"
        multiline
        maxLength={MAX_LENGTH}
        textAlignVertical="top"
      />

      <View style={shared.row}>
        <View style={styles.segmented}>
          <Segment label="العربية" selected={script === "arabic"} onPress={() => chooseScript("arabic")} />
          <Segment label="Arabizi" selected={script === "latin"} onPress={() => chooseScript("latin")} />
        </View>
        <View style={{ flex: 1 }} />
        <Pressable
          style={[shared.button, shared.primaryButton, busy && shared.disabled]}
          onPress={() => runTranslation()}
          disabled={busy}
          accessibilityRole="button"
        >
          <Text style={[shared.buttonText, shared.primaryButtonText]}>{busy ? "Translating…" : "Translate"}</Text>
        </Pressable>
      </View>

      {busy && <ActivityIndicator style={{ marginTop: 16 }} color={colors.accent} />}

      {translation !== "" && (
        <>
          <Text
            selectable
            style={[styles.result, isArabic ? styles.rtl : styles.ltr]}
            accessibilityLanguage={isArabic ? "ar" : undefined}
          >
            {translation}
          </Text>
          <View style={shared.row}>
            <Pressable style={shared.button} onPress={copy} accessibilityRole="button">
              <Text style={shared.buttonText}>Copy</Text>
            </Pressable>
            <Pressable style={shared.button} onPress={readAloud} accessibilityRole="button">
              <Text style={shared.buttonText}>{speaking ? "Stop" : "Read aloud"}</Text>
            </Pressable>
          </View>
        </>
      )}

      {error !== "" && <Text style={shared.error}>{error}</Text>}
      {info !== "" && <Text style={shared.info}>{info}</Text>}
    </View>
  );
}

function Segment({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.segment, selected && styles.segmentSelected]}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <Text style={[shared.buttonText, selected && styles.segmentSelectedText]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  textArea: { minHeight: 120 },
  segmented: { flexDirection: "row", borderWidth: 1, borderColor: colors.border, borderRadius: 8, overflow: "hidden" },
  segment: { paddingHorizontal: 14, paddingVertical: 10 },
  segmentSelected: { backgroundColor: colors.accent },
  segmentSelectedText: { color: "#ffffff", fontWeight: "700" },
  result: {
    marginTop: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    backgroundColor: colors.surface,
    fontSize: 22,
    lineHeight: 36,
    color: colors.text,
  },
  rtl: { writingDirection: "rtl", textAlign: "right" },
  ltr: { writingDirection: "ltr", textAlign: "left" },
});
