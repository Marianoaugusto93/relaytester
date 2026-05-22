import { useState } from "react";
import { BORNE_DESCRIPTIONS, BORNE_GROUPS } from "./BorneDescriptions.js";
import { useTranslation } from "./i18n/useTranslation.js";

export default function BorneGuideModal({ open, onClose }) {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState("overview");

  if (!open) return null;

  const tabStyle = (isActive) => ({
    padding: "10px 16px",
    background: isActive ? "var(--orange)" : "var(--card2)",
    border: "1px solid var(--bdr)",
    borderBottomColor: isActive ? "transparent" : "var(--bdr)",
    color: isActive ? "#111" : "var(--tx2)",
    cursor: "pointer",
    fontWeight: isActive ? 700 : 600,
    fontSize: 11,
    borderRadius: "6px 6px 0 0",
    transition: "all .2s"
  });

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,.75)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: 2000
    }} onClick={onClose}>
      <div style={{
        background: "var(--card)",
        border: "1px solid var(--bdr)",
        borderRadius: 12,
        width: "90vw",
        maxWidth: 900,
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden"
      }} onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          borderBottom: "1px solid var(--bdr)",
          background: "linear-gradient(90deg, var(--card2) 0%, var(--card) 100%)"
        }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: "var(--tx)", fontFamily: "var(--fh)", letterSpacing: 1, textTransform: "uppercase" }}>
            📖 {t("guide.title")}
          </div>
          <button onClick={onClose} style={{
            background: "transparent",
            border: "1px solid var(--bdr)",
            color: "var(--tx3)",
            width: 30,
            height: 30,
            borderRadius: 6,
            cursor: "pointer",
            fontSize: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}>✕</button>
        </div>

        {/* Tabs */}
        <div style={{
          display: "flex",
          gap: 4,
          padding: "8px 12px",
          borderBottom: "1px solid var(--bdr)",
          background: "var(--card2)",
          overflowX: "auto"
        }}>
          <button style={tabStyle(activeTab === "overview")} onClick={() => setActiveTab("overview")}>
            🏠 {t("guide.tabs.overview")}
          </button>
          <button style={tabStyle(activeTab === "saida")} onClick={() => setActiveTab("saida")}>
            📤 {t("guide.tabs.saida")}
          </button>
          <button style={tabStyle(activeTab === "feedback")} onClick={() => setActiveTab("feedback")}>
            📡 {t("guide.tabs.feedback")}
          </button>
          <button style={tabStyle(activeTab === "comando")} onClick={() => setActiveTab("comando")}>
            🎛️ {t("guide.tabs.comando")}
          </button>
        </div>

        {/* Content */}
        <div style={{
          flex: 1,
          overflowY: "auto",
          padding: "16px 20px",
          fontSize: 12,
          lineHeight: 1.6,
          color: "var(--tx2)",
          fontFamily: "var(--fm)"
        }}>

          {/* OVERVIEW */}
          {activeTab === "overview" && (
            <div>
              <div style={{ background: "rgba(255, 180, 77, 0.1)", border: "1px solid rgba(255, 180, 77, 0.3)", borderRadius: 6, padding: 12, marginBottom: 16 }}>
                <p style={{ margin: 0 }}>
                  {t("guide.content.overview")}
                </p>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>📤</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--tx)" }}>{t("guide.groups.saida_title")}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>{t("guide.groups.saida_desc")}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <span style={{ fontSize: 20 }}>📡</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--tx)" }}>{t("guide.groups.feedback_title")}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>{t("guide.groups.feedback_desc")}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", gap: 8 }}>
                  <span style={{ fontSize: 20 }}>🎛️</span>
                  <div>
                    <div style={{ fontWeight: 700, color: "var(--tx)" }}>{t("guide.groups.comando_title")}</div>
                    <div style={{ fontSize: 11, color: "var(--tx3)" }}>{t("guide.groups.comando_desc")}</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* SAÍDAS */}
          {activeTab === "saida" && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--tx)" }}>
                {t("guide.tabs.saida")}
              </h2>

              <p style={{ marginBottom: 16, color: "var(--tx3)" }}>
                {t("guide.content.saida")}
              </p>

              {[1, 3, 5, 7].map((n) => {
                const desc = BORNE_DESCRIPTIONS[n];
                return (
                  <div key={n} style={{
                    background: "var(--card2)",
                    border: "1px solid var(--bdr)",
                    borderRadius: 6,
                    padding: 12,
                    marginBottom: 12
                  }}>
                    <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 6, color: "var(--orange)" }}>
                      🟠 {desc.fullName} (TB{n}-{n + 1})
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Função:</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>{desc.detail}</div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Proteção Relacionada:</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)", marginBottom: 4 }}>{desc.related}</div>
                    </div>
                    <div style={{ marginBottom: 8 }}>
                      <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 2 }}>Como Usar:</div>
                      <div style={{ fontSize: 11, color: "var(--tx3)" }}>{desc.usage}</div>
                    </div>
                    {n === 1 && (
                      <div style={{ fontSize: 10, background: "rgba(255, 180, 77, 0.1)", padding: 8, borderRadius: 4, marginTop: 8, fontStyle: "italic" }}>
                        💡 BO3 costuma acender em quase todos os testes porque a sobrecorrente é a proteção mais comum.
                      </div>
                    )}
                    {n === 3 && (
                      <div style={{ fontSize: 10, background: "rgba(255, 180, 77, 0.1)", padding: 8, borderRadius: 4, marginTop: 8, fontStyle: "italic" }}>
                        💡 Para BO4 acender: injete uma falta L-G (ex: Ia=5A, Ib=0, Ic=0) ou ative a função 50N/51N.
                      </div>
                    )}
                    {n === 5 && (
                      <div style={{ fontSize: 10, background: "rgba(255, 180, 77, 0.1)", padding: 8, borderRadius: 4, marginTop: 8, fontStyle: "italic" }}>
                        💡 Para BO5 acender: crie desequilíbrio entre fases (ex: Ia=5A, Ib=2A, Ic=1A) e ative a função 47.
                      </div>
                    )}
                    {n === 7 && (
                      <div style={{ fontSize: 10, background: "rgba(255, 180, 77, 0.1)", padding: 8, borderRadius: 4, marginTop: 8, fontStyle: "italic" }}>
                        💡 Para BO6 acender: reduza a frequência abaixo de 61Hz (padrão) e ative a função 81U.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* FEEDBACK */}
          {activeTab === "feedback" && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--tx)" }}>
                Feedback do Disjuntor (52a / 52b)
              </h2>

              <p style={{ marginBottom: 16, color: "var(--tx3)" }}>
                Contatos auxiliares que informam ao relé o status do disjuntor (aberto ou fechado).
              </p>

              <div style={{
                background: "rgba(129, 199, 132, 0.1)",
                border: "1px solid rgba(129, 199, 132, 0.3)",
                borderRadius: 6,
                padding: 12,
                marginBottom: 16
              }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>
                  ✅ 52a (Closed Contact) - TB 9-10
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  Indica que o <strong>DISJUNTOR ESTÁ FECHADO</strong> (alimentação ligada, operação normal).
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--tx3)" }}>
                  Quando o CB está fechado, este contato fica fechado (continuidade). Conecte a BI1 da maleta para confirmação.
                </p>
              </div>

              <div style={{
                background: "rgba(244, 67, 54, 0.1)",
                border: "1px solid rgba(244, 67, 54, 0.3)",
                borderRadius: 6,
                padding: 12,
                marginBottom: 16
              }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>
                  ⛔ 52b (Open Contact / Trip) - TB 11-12
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  Indica que o <strong>DISJUNTOR ESTÁ ABERTO</strong> (trip realizado, desligado).
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--tx3)" }}>
                  Quando o CB está aberto (após trip), este contato fica fechado (continuidade). Conecte a BI2 da maleta para confirmação.
                </p>
              </div>

              <div style={{
                background: "rgba(100, 181, 246, 0.1)",
                border: "1px solid rgba(100, 181, 246, 0.3)",
                borderRadius: 6,
                padding: 12
              }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>
                  🔄 Por que existem os dois?
                </p>
                <p style={{ margin: 0, fontSize: 11 }}>
                  52a e 52b são <strong>complementares</strong>. Quando um está fechado, o outro está aberto. Isso fornece redundância - o relé pode confirmar o status lendo os dois contatos para ter certeza.
                </p>
              </div>
            </div>
          )}

          {/* BOBINAS */}
          {activeTab === "comando" && (
            <div>
              <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12, color: "var(--tx)" }}>
                Bobinas de Comando (TC / FC)
              </h2>

              <p style={{ marginBottom: 16, color: "var(--tx3)" }}>
                Bobinas eletromagnéticas que o relé energiza para ordenar ao disjuntor que abra (trip) ou feche (restore).
              </p>

              <div style={{
                background: "rgba(64, 181, 246, 0.1)",
                border: "1px solid rgba(64, 181, 246, 0.3)",
                borderRadius: 6,
                padding: 12,
                marginBottom: 16
              }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>
                  ⚡ TC (Trip Coil) - TB 13-14
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  Bobina que <strong>ABRE O DISJUNTOR</strong>. É uma bobina eletromagnética que, quando energizada, puxa um pino mecânico para liberar a mola de abertura.
                </p>
                <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "var(--tx3)" }}>
                  <strong>Fluxo:</strong> Relé detecta falta → BO3 ativa → Energia flui por TC → Bobina cria campo magnético → Mecanismo libera mola → CB abre (trip).
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--tx3)" }}>
                  <strong>Voltagem típica:</strong> 24VDC ou 110VAC/120VAC (depende da maleta).
                </p>
              </div>

              <div style={{
                background: "rgba(76, 175, 80, 0.1)",
                border: "1px solid rgba(76, 175, 80, 0.3)",
                borderRadius: 6,
                padding: 12
              }}>
                <p style={{ margin: "0 0 8px 0", fontWeight: 700 }}>
                  🔄 FC (Close Coil) - TB 15-16
                </p>
                <p style={{ margin: "0 0 8px 0" }}>
                  Bobina que <strong>FECHA O DISJUNTOR</strong>. Funciona como TC mas em sentido inverso - puxa o mecanismo de fechamento (reclosing automático).
                </p>
                <p style={{ margin: "0 0 8px 0", fontSize: 11, color: "var(--tx3)" }}>
                  <strong>Fluxo:</strong> Após o trip, relé espera alguns segundos → Relé energiza FC → Bobina puxa mecanismo oposto → CB fecha (restauração da alimentação).
                </p>
                <p style={{ margin: 0, fontSize: 11, color: "var(--tx3)" }}>
                  <strong>Nota:</strong> FC é usada em "reclosing automático" - o relé tenta restaurar a alimentação se a falta foi temporária.
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div style={{
          padding: "12px 20px",
          borderTop: "1px solid var(--bdr)",
          background: "var(--card2)",
          textAlign: "right",
          fontSize: 11,
          color: "var(--tx3)"
        }}>
          <button onClick={onClose} style={{
            padding: "8px 16px",
            background: "var(--orange)",
            border: "none",
            color: "#111",
            fontWeight: 700,
            borderRadius: 6,
            cursor: "pointer"
          }}>
            Fechar Guia
          </button>
        </div>
      </div>
    </div>
  );
}
