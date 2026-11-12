// Read aloud with the browser's speech synthesis: a Moroccan Arabic voice if there is one,
// otherwise any Arabic voice.

/** Chrome loads voices asynchronously; the list is empty until "voiceschanged" fires. */
function loadVoices() {
  const voices = speechSynthesis.getVoices();
  if (voices.length > 0) {
    return Promise.resolve(voices);
  }
  return new Promise((resolve) => {
    const done = () => resolve(speechSynthesis.getVoices());
    speechSynthesis.addEventListener("voiceschanged", done, { once: true });
    setTimeout(done, 1500); // some systems have no voices at all and never fire the event
  });
}

/** Returns the best available voice, or null if no Arabic voice is installed. */
export async function findArabicVoice() {
  const voices = await loadVoices();
  const lang = (voice) => voice.lang.toLowerCase().replace("_", "-");
  return (
    voices.find((voice) => lang(voice) === "ar-ma") ??
    voices.find((voice) => lang(voice).startsWith("ar")) ??
    null
  );
}

/**
 * Speaks the text. Resolves to the voice used, or null when no Arabic voice exists.
 * onEnd is called when speaking finishes or is stopped.
 */
export async function speak(text, onEnd) {
  const voice = await findArabicVoice();
  if (!voice) {
    return null;
  }
  speechSynthesis.cancel(); // stop anything still playing
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = voice;
  utterance.lang = voice.lang;
  utterance.rate = 0.95;
  utterance.onend = onEnd;
  utterance.onerror = onEnd;
  speechSynthesis.speak(utterance);
  return voice;
}

export function stopSpeaking() {
  speechSynthesis.cancel();
}

export function isSpeaking() {
  return speechSynthesis.speaking;
}
