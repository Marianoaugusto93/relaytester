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
 * Hook that returns a translation function t(key, params).
 * Usage: const { t } = useTranslation();
 *        t("buttons.apply") → "Aplicar" (pt) / "Apply" (en)
 *        t("error.required", { field: "Pickup" }) → "Campo Pickup é obrigatório"
 * @param {string} key - Dot-separated key (e.g. "buttons.apply")
 * @param {Object} [params] - Optional object for interpolation
 * @returns {string} Translated and interpolated string
 */
export function useTranslation() {
  const { locale } = useLanguage();
  const t = (key, params) => {
    const str = resolve(locale, key);

    // Warn on miss in DEV mode
    if (str === key && import.meta.env.DEV) {
      console.warn('[i18n] Missing key:', key);
    }

    // Interpolate if params provided
    if (params) {
      return str.replace(/\{(\w+)\}/g, (_, k) => params[k] ?? `{${k}}`);
    }

    return str;
  };

  return { t };
}
