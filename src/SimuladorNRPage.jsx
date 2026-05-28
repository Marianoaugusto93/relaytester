import { useState, useEffect } from "react";

export default function SimuladorNRPage() {
  const [language, setLanguage] = useState(() => {
    return localStorage.getItem("nr-language") || "en";
  });

  useEffect(() => {
    localStorage.setItem("nr-language", language);
  }, [language]);

  const iframeUrl = language === "pt"
    ? "/newton-rapson/powerflow-pt.html"
    : "/newton-rapson/powerflow.html";

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--bg)',
      overflow: 'hidden'
    }}>
      {/* Language Toggle */}
      <div style={{
        padding: '12px 20px',
        background: 'var(--card)',
        borderBottom: '1px solid var(--bdr)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        flexShrink: 0
      }}>
        <span style={{ fontSize: '12px', color: 'var(--tx2)', fontWeight: 500 }}>
          Language / Idioma:
        </span>
        <button
          onClick={() => setLanguage('en')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: language === 'en' ? '1px solid var(--cyan)' : '1px solid var(--bdr)',
            background: language === 'en' ? 'rgba(14,165,233,.1)' : 'transparent',
            color: language === 'en' ? 'var(--cyan)' : 'var(--tx2)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: language === 'en' ? 600 : 400,
            transition: 'all 0.2s'
          }}
        >
          🇺🇸 English
        </button>
        <button
          onClick={() => setLanguage('pt')}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: language === 'pt' ? '1px solid var(--cyan)' : '1px solid var(--bdr)',
            background: language === 'pt' ? 'rgba(14,165,233,.1)' : 'transparent',
            color: language === 'pt' ? 'var(--cyan)' : 'var(--tx2)',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: language === 'pt' ? 600 : 400,
            transition: 'all 0.2s'
          }}
        >
          🇧🇷 Português
        </button>
      </div>

      {/* Simulator Iframe */}
      <iframe
        key={language}
        src={iframeUrl}
        style={{
          flex: 1,
          width: '100%',
          height: '100%',
          border: 'none',
          background: 'var(--bg)'
        }}
        title="Newton-Raphson Power Flow Simulator"
      />
    </div>
  );
}
