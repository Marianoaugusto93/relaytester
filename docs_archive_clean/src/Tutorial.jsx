import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "./i18n/useTranslation.js";
import { useLanguage } from "./i18n/LanguageContext.jsx";

const STEP_SELECTORS = [
  null,
  '[data-tutorial-target="nav-campo"]',
  '[data-tutorial-target="nav-relay"]',
  '[data-tutorial-target="nav-panel"]',
  null,
  null,
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
  const { t } = useTranslation();
  const { locale } = useLanguage();
  const [currentStep, setCurrentStep] = useState(0);
  const [clipPos, setClipPos] = useState(null);
  const debounceRef = useRef(null);

  // Get steps from locale directly (array access)
  const steps = useMemo(() => {
    try { return locale.tutorial.steps || []; } catch { return []; }
  }, [locale]);

  const totalSteps = steps.length;
  const step = steps[currentStep] || { title: "", description: "" };
  const selector = STEP_SELECTORS[currentStep] || null;

  const initialClipPos = useMemo(() => {
    return show ? computeClipPos(selector) : null;
  }, [show, currentStep, selector]);

  const recalcPos = useCallback(() => {
    setClipPos(computeClipPos(selector));
  }, [selector]);

  useEffect(() => {
    setClipPos(initialClipPos);
  }, [initialClipPos]);

  useEffect(() => {
    if (!show || !selector) return;
    const handler = () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => { recalcPos(); }, 200);
    };
    window.addEventListener("resize", handler);
    window.addEventListener("scroll", handler, true);
    return () => {
      window.removeEventListener("resize", handler);
      window.removeEventListener("scroll", handler, true);
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [show, selector, recalcPos]);

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
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
        const confirmed = window.confirm(t("tutorial.discardTour"));
        if (confirmed) {
          localStorage.setItem("tutorial_completed", "true");
          onDismiss();
        }
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [show, onDismiss, t]);

  if (!show || totalSteps === 0) return null;

  const maskPath = clipPos
    ? `polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%, ${clipPos.x1}px ${clipPos.y1}px, ${clipPos.x1}px ${clipPos.y2}px, ${clipPos.x2}px ${clipPos.y2}px, ${clipPos.x2}px ${clipPos.y1}px, ${clipPos.x1}px ${clipPos.y1}px)`
    : "polygon(0% 0%, 0% 100%, 100% 100%, 100% 0%)";

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
          <span>{t("tutorial.step")} {currentStep + 1} {t("tutorial.of")} {totalSteps}</span>
          <div className="tut-dots">
            {steps.map((_, i) => (
              <button
                key={i}
                className={`tut-dot${i === currentStep ? " on" : ""}`}
                onClick={() => setCurrentStep(i)}
                aria-label={`${t("tutorial.goToStep")} ${i + 1}`}
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
            {t("tutorial.dontShow")}
          </label>
          <div className="tut-btns">
            <button className="tut-btn tut-skip" onClick={handleSkip}>
              {t("tutorial.skip")}
            </button>
            <button
              className="tut-btn tut-prev"
              onClick={handlePrev}
              disabled={currentStep === 0}
            >
              {t("tutorial.prev")}
            </button>
            <button className="tut-btn tut-next" onClick={handleNext}>
              {currentStep === totalSteps - 1 ? t("tutorial.finish") : t("tutorial.next")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
