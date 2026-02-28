import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import en from "../locales/en.json";
import he from "../locales/he.json";
import ar from "../locales/ar.json";
import fa from "../locales/fa.json";

export const RTL_LANGUAGES = ["he", "ar", "fa"];

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      he: { translation: he },
      ar: { translation: ar },
      fa: { translation: fa },
    },
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
    },
  });

export function isRTL(lang?: string): boolean {
  const code = (lang || i18n.language).split("-")[0].split("_")[0];
  return RTL_LANGUAGES.includes(code);
}

export const LANGUAGE_OPTIONS = [
  { code: "en", label: "English", nativeLabel: "English", flag: "\uD83C\uDDFA\uD83C\uDDF8" },
  { code: "he", label: "Hebrew", nativeLabel: "\u05E2\u05D1\u05E8\u05D9\u05EA", flag: "\uD83C\uDDEE\uD83C\uDDF1" },
  { code: "ar", label: "Arabic", nativeLabel: "\u0627\u0644\u0639\u0631\u0628\u064A\u0629", flag: "\uD83C\uDDF8\uD83C\uDDE6" },
  { code: "fa", label: "Persian", nativeLabel: "\u0641\u0627\u0631\u0633\u06CC", flag: "\uD83C\uDDEE\uD83C\uDDF7" },
];

export default i18n;
