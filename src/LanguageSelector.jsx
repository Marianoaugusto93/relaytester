import { useState, useEffect, useRef, useCallback } from "react";
import { useLanguage } from "./i18n/LanguageContext.jsx";
import { useTranslation } from "./i18n/useTranslation.js";

const FLAG = { pt: "🇧🇷", en: "🇺🇸", es: "🇪🇸" };
const LANGS = ["pt", "en", "es"];

export default function LanguageSelector() {
  const { language, setLanguage } = useLanguage();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [focusIdx, setFocusIdx] = useState(0);
  const ref = useRef(null);
  const itemRefs = useRef([]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Focus the active item when dropdown opens
  useEffect(() => {
    if (open) {
      const idx = LANGS.indexOf(language);
      setFocusIdx(idx >= 0 ? idx : 0);
      setTimeout(() => itemRefs.current[idx >= 0 ? idx : 0]?.focus(), 0);
    }
  }, [open, language]);

  const select = (lang) => { setLanguage(lang); setOpen(false); };

  const handleTriggerKeyDown = useCallback((e) => {
    if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
    }
  }, []);

  const handleListKeyDown = useCallback((e) => {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
      ref.current?.querySelector("button")?.focus();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (focusIdx + 1) % LANGS.length;
      setFocusIdx(next);
      itemRefs.current[next]?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (focusIdx - 1 + LANGS.length) % LANGS.length;
      setFocusIdx(prev);
      itemRefs.current[prev]?.focus();
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }, [focusIdx]);

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-flex", alignItems: "center" }}>
      <button
        onClick={() => setOpen(o => !o)}
        onKeyDown={handleTriggerKeyDown}
        aria-label="Select language"
        aria-haspopup="listbox"
        aria-expanded={open}
        style={{
          display: "flex", alignItems: "center", gap: 5,
          padding: "4px 8px", border: "1px solid var(--bdr)",
          borderRadius: 6, background: "var(--card2)",
          color: "var(--tx2)", fontSize: 11, fontWeight: 700,
          fontFamily: "var(--fh)", cursor: "pointer",
          letterSpacing: ".5px", transition: "all .2s", whiteSpace: "nowrap",
        }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = "rgba(249,115,22,.4)"; e.currentTarget.style.color = "var(--orange)"; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = "var(--bdr)"; e.currentTarget.style.color = "var(--tx2)"; }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{FLAG[language]}</span>
        <span>{language.toUpperCase()}</span>
        <span style={{ fontSize: 8, opacity: .6 }}>{open ? "▲" : "▼"}</span>
      </button>
      {open && (
        <div
          role="listbox"
          aria-label="Select language"
          onKeyDown={handleListKeyDown}
          style={{
            position: "absolute", top: "calc(100% + 4px)", right: 0,
            zIndex: 5000, background: "var(--card)", border: "1px solid rgba(249,115,22,.2)",
            borderRadius: 8, overflow: "hidden",
            boxShadow: "0 8px 24px rgba(0,0,0,.5)", minWidth: 130,
          }}
        >
          {LANGS.map((lang, i) => (
            <button
              key={lang}
              ref={el => itemRefs.current[i] = el}
              role="option"
              aria-selected={language === lang}
              onClick={() => select(lang)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "8px 12px", fontSize: 11, fontWeight: 700,
                fontFamily: "var(--fh)", cursor: "pointer",
                color: language === lang ? "var(--orange)" : "var(--tx2)",
                background: "transparent", border: "none",
                width: "100%", textAlign: "left", transition: "background .15s",
              }}
              onMouseEnter={e => e.currentTarget.style.background = "var(--card2)"}
              onMouseLeave={e => e.currentTarget.style.background = "transparent"}
            >
              <span style={{ fontSize: 14, lineHeight: 1 }}>{FLAG[lang]}</span>
              <span>{t(`lang.${lang}`)}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
