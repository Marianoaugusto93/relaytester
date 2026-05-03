import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";

const TUTORIAL_STEPS = [
  {
    id: "step1",
    title: "Bem-vindo ao RelayLab 360",
    description: "Uma plataforma integral para engenharia de proteção. Clique em 'Próximo' para começar o tour.",
    targetSelector: null,
    position: "center"
  },
  {
    id: "step2",
    title: "Aba Campo — Simulador de Fiação",
    description: "Configure a fiação física do teste. Conecte os terminais da maleta ao bloco de terminais e à chave de aferição.",
    targetSelector: ".nav-pill",
    position: "bottom"
  },
  {
    id: "step3",
    title: "Aba Relé — Injeção de Corrente",
    description: "Injete correntes trifásicas e tensões para simular faltas. Configure os fasores (magnitude e ângulo) para testar diferentes cenários de proteção.",
    targetSelector: ".nav-pill:nth-child(2)",
    position: "bottom"
  },
  {
    id: "step4",
    title: "Aba Painel — Circuito e Proteção",
    description: "Visualize o disjuntor, diagrama de comando (ladder) e diagrama unifilar. Monitore os estados da proteção e saídas binárias.",
    targetSelector: ".nav-pill:nth-child(3)",
    position: "bottom"
  },
  {
    id: "step5",
    title: "Configurações de Proteção",
    description: "Na aba Relé, configure os estágios de proteção (50/51, 67, 27/59, etc.) com seus parâmetros técnicos e curvas características.",
    targetSelector: null,
    position: "center"
  },
  {
    id: "step6",
    title: "Executar Simulação",
    description: "Clique em 'Injetar' para iniciar a simulação. O relé detectará a falta e disparará o disjuntor de acordo com as configurações de proteção.",
    targetSelector: null,
    position: "center"
  }
];

export default function Tutorial({ show, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [clipPos, setClipPos] = useState(null);
  const containerRef = useRef(null);

  const step = TUTORIAL_STEPS[currentStep];

  useEffect(() => {
    if (!show || !step.targetSelector) {
      setClipPos(null);
      return;
    }
    const el = document.querySelector(step.targetSelector);
    if (!el) {
      setClipPos(null);
      return;
    }
    const rect = el.getBoundingClientRect();
    const padding = 8;
    const x1 = Math.max(0, rect.left - padding);
    const y1 = Math.max(0, rect.top - padding);
    const x2 = Math.min(window.innerWidth, rect.right + padding);
    const y2 = Math.min(window.innerHeight, rect.bottom + padding);
    setClipPos({ x1, y1, x2, y2 });
  }, [show, step.targetSelector, currentStep]);

  const handleNext = () => {
    if (currentStep < TUTORIAL_STEPS.length - 1) {
      setCurrentStep(c => c + 1);
    } else {
      localStorage.setItem("tutorial_completed", "true");
      onDismiss();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) setCurrentStep(c => c - 1);
  };

  const handleSkip = () => {
    localStorage.setItem("tutorial_completed", "true");
    onDismiss();
  };

  const handleEscape = (e) => {
    if (e.key === "Escape") {
      const confirmed = window.confirm("Descartar tour?");
      if (confirmed) {
        localStorage.setItem("tutorial_completed", "true");
        onDismiss();
      }
    }
  };

  useEffect(() => {
    if (show) {
      window.addEventListener("keydown", handleEscape);
      return () => window.removeEventListener("keydown", handleEscape);
    }
  }, [show]);

  if (!show) return null;

  const maskPath = clipPos
    ? `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${clipPos.x1}px ${clipPos.y1}px, ${clipPos.x1}px ${clipPos.y2}px, ${clipPos.x2}px ${clipPos.y2}px, ${clipPos.x2}px ${clipPos.y1}px, ${clipPos.x1}px ${clipPos.y1}px)`
    : "polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%)";

  const boxStyle = clipPos
    ? {
        position: "fixed",
        left: `${Math.min(clipPos.x2 + 16, window.innerWidth - 320)}px`,
        top: `${Math.min(clipPos.y2 + 16, window.innerHeight - 200)}px`,
        zIndex: 4001
      }
    : {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        zIndex: 4001
      };

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 4000 }} ref={containerRef}>
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.6)",
          clipPath: maskPath,
          transition: "clip-path 0.3s ease",
          zIndex: 4000
        }}
      />
      <div
        style={{
          ...boxStyle,
          background: "var(--card)",
          border: "2px solid var(--orange)",
          borderRadius: 12,
          padding: 20,
          maxWidth: 320,
          boxShadow: "0 20px 60px rgba(0, 0, 0, 0.8)",
          animation: "fadeIn 0.3s ease"
        }}
      >
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, color: "var(--tx3)", fontWeight: 600, marginBottom: 4 }}>
            PASSO {currentStep + 1} DE {TUTORIAL_STEPS.length}
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--orange)", margin: 0 }}>
            {step.title}
          </h3>
        </div>
        <p style={{ fontSize: 13, color: "var(--tx2)", margin: "0 0 16px 0", lineHeight: 1.4 }}>
          {step.description}
        </p>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            onClick={handleSkip}
            style={{
              padding: "8px 14px",
              background: "var(--card2)",
              border: "1px solid var(--bdr)",
              borderRadius: 6,
              color: "var(--tx3)",
              fontSize: 11,
              fontWeight: 600,
              fontFamily: "var(--fh)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.target.style.color = "var(--tx2)"; e.target.style.borderColor = "var(--tx3)"; }}
            onMouseLeave={e => { e.target.style.color = "var(--tx3)"; e.target.style.borderColor = "var(--bdr)"; }}
          >
            PULAR
          </button>
          {currentStep > 0 && (
            <button
              onClick={handlePrev}
              style={{
                padding: "8px 14px",
                background: "var(--card2)",
                border: "1px solid var(--bdr)",
                borderRadius: 6,
                color: "var(--tx3)",
                fontSize: 11,
                fontWeight: 600,
                fontFamily: "var(--fh)",
                cursor: "pointer",
                transition: "all 0.2s"
              }}
              onMouseEnter={e => { e.target.style.color = "var(--tx2)"; e.target.style.borderColor = "var(--tx3)"; }}
              onMouseLeave={e => { e.target.style.color = "var(--tx3)"; e.target.style.borderColor = "var(--bdr)"; }}
            >
              ANTERIOR
            </button>
          )}
          <button
            onClick={handleNext}
            style={{
              padding: "8px 14px",
              background: "var(--orange)",
              border: "none",
              borderRadius: 6,
              color: "#0e1015",
              fontSize: 11,
              fontWeight: 700,
              fontFamily: "var(--fh)",
              cursor: "pointer",
              transition: "all 0.2s"
            }}
            onMouseEnter={e => { e.target.style.opacity = 0.9; }}
            onMouseLeave={e => { e.target.style.opacity = 1; }}
          >
            {currentStep === TUTORIAL_STEPS.length - 1 ? "CONCLUIR" : "PRÓXIMO"}
          </button>
        </div>
      </div>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: ${clipPos ? "translateY(-10px)" : "translate(-50%, -50%) scale(0.95)"}; }
          to { opacity: 1; transform: ${clipPos ? "translateY(0)" : "translate(-50%, -50%) scale(1)"}; }
        }
      `}</style>
    </div>,
    document.body
  );
}
