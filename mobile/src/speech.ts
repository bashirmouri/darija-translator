// Read aloud with expo-speech: a Moroccan Arabic voice if the phone has one, otherwise any Arabic voice.
import * as Speech from "expo-speech";

/** Returns the identifier of the best Arabic voice, or null if the phone has none. */
async function findArabicVoice(): Promise<{ identifier: string; language: string } | null> {
  const voices = await Speech.getAvailableVoicesAsync();
  const lang = (language: string) => language.toLowerCase().replace("_", "-");
  return (
    voices.find((voice) => lang(voice.language) === "ar-ma") ??
    voices.find((voice) => lang(voice.language).startsWith("ar")) ??
    null
  );
}

/**
 * Speaks the text. Returns false when no Arabic voice is installed.
 * onFinish runs when speaking ends, is stopped or fails.
 */
export async function speakArabic(text: string, onFinish: () => void): Promise<boolean> {
  const voice = await findArabicVoice();
  if (!voice) {
    return false;
  }
  await Speech.stop();
  Speech.speak(text, {
    voice: voice.identifier,
    language: voice.language,
    rate: 0.95,
    onDone: onFinish,
    onStopped: onFinish,
    onError: onFinish,
  });
  return true;
}

export function stopSpeaking(): Promise<void> {
  return Speech.stop();
}
