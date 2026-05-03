import { createContext, useContext, useState } from "react";

const HelpContext = createContext(null);

export function HelpProvider({ children }) {
  const [helpOpen, setHelpOpen] = useState(false);
  const [activeTopicId, setActiveTopicId] = useState("getting-started");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const setPageRef = require('react').useRef(null);

  function openHelp(topicId = "getting-started") {
    setActiveTopicId(topicId);
    setHelpOpen(true);
  }

  function closeHelp() {
    setHelpOpen(false);
  }

  function registerSetPage(setPage) {
    setPageRef.current = setPage;
  }

  function startTutorial(step = 0) {
    setTutorialStep(step);
    setTutorialOpen(true);
  }

  function closeTutorial() {
    setTutorialOpen(false);
  }

  return (
    <HelpContext.Provider value={{ helpOpen, activeTopicId, openHelp, closeHelp, tutorialOpen, tutorialStep, closeTutorial, registerSetPage, startTutorial }}>
      {children}
    </HelpContext.Provider>
  );
}

export function useHelp() {
  const ctx = useContext(HelpContext);
  if (!ctx) throw new Error("useHelp must be used inside HelpProvider");
  return ctx;
}
