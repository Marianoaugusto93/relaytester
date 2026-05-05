import { useState, useEffect, useRef, useCallback, useMemo } from "react";
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
    targetSelector: '[data-tutorial-target="nav-campo"]',
    position: "bottom"
  },
  {
    id: "step3",
    title: "Aba Relé — Injeção de Corrente",
    description: "Injete correntes trifásicas e tensões para simular faltas. Configure os fasores (magnitude e ângulo) para testar diferentes cenários de proteção.",
    targetSelector: '[data-tutorial-target="nav-relay"]',
    position: "bottom"
  },
  {
    id: "step4",
    title: "Aba Painel — Circuito e Proteção",
    description: "Visualize o disjuntor, diagrama de comando (ladder) e diagrama unifilar. Monitore os estados da proteção e saídas binárias.",
    targetSelector: '[data-tutorial-target="nav-panel"]',
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

function computeClipPos(selector) {
  if (!selector) return null;
  const el = document.querySelector(selector);
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  const padding = 8;
  return {
    x1: Math.max(0, rect.left - padding),
    y1: Math.max(0, rect.top - padding),
    x2: Math.min(window.innerWidth, rect.right + padding),
    y2: Math.min(window.innerHeight, rect.bottom + padding)
  };
}

export default function Tutorial({ show, onDismiss }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [clipPos, setClipPos] = useState(null);
  const debounceRef = useRef(null);

  const step = TUTORIAL_STEPS[currentStep];

  // Compute clipPos synchronously for first render (eliminates flash)
  const initialClipPos = useMemo(() => {
    return show ? computeClipPos(step.targetSelector) : null;
  }, [show, currentStep]);

  // Recalculate highlight position for current step
  const recalcPos = useCallback(() => {
    setClipPos(computeClipPos(step.targetSelector));
  }, [step.targetSelector]);

  // Sync clipPos with computed value on show/step change
  useEffect(() => {
    setClipPos(initialClipPos);
  }, [initialClipPos]);

  // Resize/scroll listener with 200ms debounce
  useEffect(() => {
    if (!show || !step.targetSelector) return;

    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        recalcPos();
      }, 200);
    };

    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);

    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [show, step.targetSelector, recalcPos]);

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

  useEffect(() => {
    if (!show) return;
    const handleEscape = (e) => {
      if (e.key === "Escape") {
        const confirmed = window.confirm("Descartar tour?");
        if (confirmed) {
          localStorage.setItem("tutorial_completed", "true");
          onDismiss();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [show, onDismiss]);

  if (!show) return null;

  const maskPath = clipPos
    ? `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${clipPos.x1}px ${clipPos.y1}px, ${clipPos.x1}px ${clipPos.y2}px, ${clipPos.x2}px ${clipPos.y2}px, ${clipPos.x2}px ${clipPos.y1}px, ${clipPos.x1}px ${clipPos.y1}px)`
    : "polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%)";

  // Bubble position: anchored to highlight box or centered
  const bubbleStyle = clipPos
    ? {
        position: "fixed",
        left: `${Math.min(clipPos.x2 + 16, window.innerWidth - 340)}px`,
        top: `${Math.min(clipPos.y2 + 16, window.innerHeight - 220)}px`
      }
    : {
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)"
      };

  // Highlight box dimensions
  const highlightStyle = clipPos
    ? {
        left: `${clipPos.x1}px`,
        top: `${clipPos.y1}px`,
        width: `${clipPos.x2 - clipPos.x1}px`,
        height: `${clipPos.y2 - clipPos.y1}px`
      }
    : null;

  return createPortal(
    <div className="tut-portal">
      <div
        className="tut-overlay"
        style={{ clipPath: maskPath }}
        onClick={handleSkip}
      />
      {clipPos && highlightStyle && (
        <div className="tut-highlight" style={highlightStyle} />
      )}
      <div className="tut-bubble" style={bubbleStyle}>
        <div className="tut-step-counter">
          <span>PASSO {currentStep + 1} DE {TUTORIAL_STEPS.length}</span>
          <div className="tut-dots">
            {TUTORIAL_STEPS.map((_, i) => (
              <button
                key={i}
                className={`tut-dot${i === currentStep ? " on" : ""}`}
                onClick={() => setCurrentStep(i)}
                aria-label={`Ir para passo ${i + 1}`}
              />
            ))}
          </div>
        </div>
        <div className="tut-title">{step.title}</div>
        <div className="tut-desc">{step.description}</div>
        <div className="tut-footer">
          <label className="tut-dont-show">
            <input
              type="checkbox"
              onChange={e => {
                if (e.target.checked) localStorage.setItem("tutorial_completed", "true");
                else localStorage.removeItem("tutorial_completed");
              }}
            />
            Não mostrar novamente
          </label>
          <div className="tut-btns">
            <button className="tut-btn tut-skip" onClick={handleSkip}>
              PULAR
            </button>
            <button
              className="tut-btn tut-prev"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              ANTERIOR
            </button>
            <button className="tut-btn tut-next" onClick={handleNext}>
              {currentStep === TUTORIAL_STEPS.length - 1 ? "CONCLUIR" : "PRÓXIMO"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
