import { createContext, useContext, useRef } from "react";

/**
 * ArtifactBus — minimal pub/sub bus for inter-tool communication in Estudos.
 * Topics (Sprint 1+):
 *   "fault.result"  — FaultStudyTool publishes Isc results → SendToRelayButton subscribes
 *   "tcc.apply"     — TccTool publishes curve → Relé tab applies (Sprint 2)
 *
 * Intentionally synchronous and ref-based to avoid unnecessary re-renders.
 * Listeners are registered once per mount; payload objects are treated as immutable.
 */
const ArtifactBusContext = createContext(null);

/**
 * ArtifactBusProvider — wraps the Estudos subtree (and optionally all of AppInner).
 * @param {Object} props
 * @param {React.ReactNode} props.children
 */
export function ArtifactBusProvider({ children }) {
  // Map<topic: string, Set<listener: Function>>
  const listenersRef = useRef(new Map());

  /**
   * Subscribe to a topic. Returns an unsubscribe function.
   * @param {string} topic
   * @param {Function} listener - called with (payload) on each publish
   * @returns {Function} unsubscribe
   */
  function subscribe(topic, listener) {
    if (!listenersRef.current.has(topic)) {
      listenersRef.current.set(topic, new Set());
    }
    listenersRef.current.get(topic).add(listener);
    return () => {
      listenersRef.current.get(topic)?.delete(listener);
    };
  }

  /**
   * Publish a payload to all subscribers of a topic.
   * Each listener is isolated; a failing listener does not block others.
   * @param {string} topic
   * @param {*} payload - immutable value; do not mutate after publishing
   */
  function publish(topic, payload) {
    listenersRef.current.get(topic)?.forEach(fn => {
      try {
        fn(payload);
      } catch (e) {
        console.error(`[ArtifactBus] Listener error on topic "${topic}":`, e);
      }
    });
  }

  const value = { subscribe, publish };

  return (
    <ArtifactBusContext.Provider value={value}>
      {children}
    </ArtifactBusContext.Provider>
  );
}

/**
 * useArtifactBus — consume ArtifactBusContext.
 * @throws {Error} if used outside ArtifactBusProvider
 * @returns {{ subscribe: Function, publish: Function }}
 */
export function useArtifactBus() {
  const ctx = useContext(ArtifactBusContext);
  if (!ctx) throw new Error("useArtifactBus must be used inside ArtifactBusProvider");
  return ctx;
}
