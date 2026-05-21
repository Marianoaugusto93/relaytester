import { useLanguage } from "./LanguageContext.jsx";

/**
 * Resolve a dot-separated key path in a nested object.
 * Returns the key string itself if not found (fallback).
 * @param {Object} obj - Translation locale object
 * @param {string} key - Dot-separated key (e.g. "buttons.apply")
 * @returns {string}
 */
function resolve(obj, key) {
  const parts = key.split(".");
  let cur = obj;
  for (const part of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = cur[part];
  }
  return (cur != null && typeof cur !== "object") ? String(cur) : key;
}

/**
 * Hook that returns a translation function t(key).
 * Usage: const { t } = useTranslation();
 *        t("buttons.apply") → "Aplicar" (pt) / "Apply" (en)
 */
export function useTranslation() {
  const { locale } = useLanguage();
  const t = (key) => resolve(locale, key);
  return { t };
}
