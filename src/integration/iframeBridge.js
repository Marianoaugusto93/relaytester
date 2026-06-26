/**
 * iframeBridge — parent-side bridge between standalone iframe simulators and
 * the React ArtifactBus.
 *
 * Standalone simulators (Manobras, Simulador NR, Coordenograma) are embedded as
 * <iframe>s and load `/relaylab-bridge.js`. This module:
 *   1. listens for their postMessage events and re-publishes them on the ArtifactBus;
 *   2. forwards ArtifactBus events back down to every registered iframe window.
 *
 * Security: only same-origin messages tagged with our SOURCE marker are accepted,
 * and downstream postMessage uses the explicit origin as targetOrigin.
 */

import { useEffect } from "react";
import { useArtifactBus } from "../estudos/context/ArtifactBus.jsx";

export const BRIDGE_SOURCE = "relaylab-bridge";
export const BRIDGE_VERSION = 1;

/**
 * Internal/bridge-control topics are not forwarded back to iframes (avoids echo).
 * @param {string} topic
 * @returns {boolean}
 */
export function isForwardableTopic(topic) {
  return typeof topic === "string" && topic.length > 0 && !topic.startsWith("__");
}

/**
 * Create a bridge core. Framework-agnostic so it can be unit-tested without React.
 * @param {Object} opts
 * @param {(topic: string, payload: any) => void} opts.publish - ArtifactBus publish
 * @param {string} [opts.origin] - expected origin (defaults to window.location.origin)
 * @param {Window} [opts.win] - window object (injectable for tests)
 * @returns {{ handleMessage: Function, forward: Function, start: Function, stop: Function, frames: Set<Window> }}
 */
export function createIframeBridge({ publish, origin, win } = {}) {
  const w = win || (typeof window !== "undefined" ? window : undefined);
  const ORIGIN = origin || (w && w.location ? w.location.origin : "");
  const frames = new Set();

  function handleMessage(e) {
    if (e.origin !== ORIGIN) return;
    const d = e.data;
    if (!d || d.source !== BRIDGE_SOURCE) return;
    if (e.source && typeof e.source.postMessage === "function") frames.add(e.source);
    if (d.topic === "__bridge.hello") return; // registration ping only
    if (typeof publish === "function") publish(d.topic, d.payload);
  }

  function forward(topic, payload) {
    if (!isForwardableTopic(topic)) return;
    frames.forEach((frame) => {
      try {
        frame.postMessage({ source: BRIDGE_SOURCE, v: BRIDGE_VERSION, topic, payload }, ORIGIN);
      } catch {
        frames.delete(frame); // frame was torn down
      }
    });
  }

  function start() { w && w.addEventListener("message", handleMessage); }
  function stop() { w && w.removeEventListener("message", handleMessage); frames.clear(); }

  return { handleMessage, forward, start, stop, frames };
}

/**
 * useIframeBridge — mount the bridge for the lifetime of the component.
 * Re-publishes iframe messages onto the ArtifactBus and forwards bus events down.
 * Call once high in the tree (inside ArtifactBusProvider), e.g. in AppInner.
 */
export function useIframeBridge() {
  const bus = useArtifactBus();
  useEffect(() => {
    const bridge = createIframeBridge({ publish: bus.publish });
    bridge.start();
    const unsub = bus.subscribe("*", (topic, payload) => bridge.forward(topic, payload));
    return () => { unsub(); bridge.stop(); };
  }, [bus]);
}
