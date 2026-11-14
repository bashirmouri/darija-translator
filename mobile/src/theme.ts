import { StyleSheet } from "react-native";

export const colors = {
  accent: "#c1272d", // Moroccan red
  text: "#1d1d22",
  muted: "#62626b",
  border: "#d9d9de",
  surface: "#f6f6f7",
  background: "#ffffff",
  errorBackground: "#fdecec",
  errorText: "#8a1c1c",
  ok: "#006233", // Moroccan green
};

export const shared = StyleSheet.create({
  label: { marginTop: 16, marginBottom: 6, fontWeight: "600", color: colors.text },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.background,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, flexWrap: "wrap" },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  buttonText: { fontSize: 15, color: colors.text },
  primaryButton: { backgroundColor: colors.accent, borderColor: colors.accent },
  primaryButtonText: { color: "#ffffff", fontWeight: "700" },
  disabled: { opacity: 0.5 },
  error: {
    marginTop: 16,
    padding: 12,
    borderRadius: 8,
    backgroundColor: colors.errorBackground,
    color: colors.errorText,
  },
  info: { marginTop: 12, color: colors.muted },
  ok: { marginTop: 12, color: colors.ok, fontWeight: "600" },
});
