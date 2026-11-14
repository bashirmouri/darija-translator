import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

import { checkCredentials, health, Settings } from "./api";
import { urlProblem } from "./settings";
import { shared } from "./theme";

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => Promise<void>;
}

export default function SettingsScreen({ settings, onSave }: Props) {
  const [apiUrl, setApiUrl] = useState(settings.apiUrl);
  const [username, setUsername] = useState(settings.username);
  const [password, setPassword] = useState(settings.password);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<{ text: string; kind: "ok" | "error" | "info" } | null>(null);

  const current = (): Settings => ({ apiUrl: apiUrl.trim(), username: username.trim(), password });

  function validate(values: Settings): string {
    return urlProblem(values.apiUrl) || (!values.username || !values.password ? "Enter the username and password." : "");
  }

  async function save() {
    const values = current();
    const problem = validate(values);
    if (problem) {
      setMessage({ text: problem, kind: "error" });
      return;
    }
    await onSave(values);
    setMessage({ text: "Settings saved.", kind: "ok" });
  }

  // Tests the values on screen (saved or not).
  async function test() {
    const values = current();
    const problem = validate(values);
    if (problem) {
      setMessage({ text: problem, kind: "error" });
      return;
    }
    setTesting(true);
    setMessage({ text: "Testing…", kind: "info" });
    try {
      const status = await health(values);
      await checkCredentials(values);
      setMessage({ text: `✔ Server reachable (LLM: ${status.provider}) and credentials accepted.`, kind: "ok" });
    } catch (e) {
      setMessage({ text: (e as Error).message, kind: "error" });
    } finally {
      setTesting(false);
    }
  }

  return (
    <View>
      <Text style={shared.label}>Server URL</Text>
      <TextInput
        style={shared.input}
        value={apiUrl}
        onChangeText={setApiUrl}
        placeholder="http://192.168.1.20:9080"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />
      <Text style={shared.info}>Your PC's Wi-Fi IP address and port 9080 — not localhost.</Text>

      <Text style={shared.label}>Username</Text>
      <TextInput
        style={shared.input}
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <Text style={shared.label}>Password</Text>
      <TextInput style={shared.input} value={password} onChangeText={setPassword} secureTextEntry />

      <View style={shared.row}>
        <Pressable style={[shared.button, shared.primaryButton]} onPress={save} accessibilityRole="button">
          <Text style={[shared.buttonText, shared.primaryButtonText]}>Save</Text>
        </Pressable>
        <Pressable
          style={[shared.button, testing && shared.disabled]}
          onPress={test}
          disabled={testing}
          accessibilityRole="button"
        >
          <Text style={shared.buttonText}>Test connection</Text>
        </Pressable>
      </View>

      {message && <Text style={message.kind === "error" ? shared.error : shared[message.kind]}>{message.text}</Text>}
    </View>
  );
}
