/*!
 * RelayLab Bridge — iframe-side client
 * --------------------------------------------------------------------------
 * Lets a standalone simulator (served via <iframe> by the React app) exchange
 * messages with the parent's ArtifactBus using window.postMessage.
 *
 * Usage inside a standalone HTML simulator:
 *   <script src="/relaylab-bridge.js"></script>
 *   RelayLabBridge.publish("fault.currents", { If_kA: 6.28, kV: 138 });
 *   RelayLabBridge.subscribe("scenario.json", (payload) => { ... });
 *
 * Degrades gracefully: when opened directly (no parent frame), publish() is a
 * no-op and `RelayLabBridge.available` is false, so the simulator still works.
 */
(function () {
  "use strict";
  var SOURCE = "relaylab-bridge";
  var VERSION = 1;
  var parentWin = (window.parent && window.parent !== window) ? window.parent : null;
  var ORIGIN = window.location.origin;
  var subs = Object.create(null); // topic -> [fn]

  function publish(topic, payload) {
    if (!parentWin || typeof topic !== "string") return false;
    parentWin.postMessage({ source: SOURCE, v: VERSION, topic: topic, payload: payload }, ORIGIN);
    return true;
  }

  function subscribe(topic, fn) {
    (subs[topic] || (subs[topic] = [])).push(fn);
    return function unsubscribe() {
      subs[topic] = (subs[topic] || []).filter(function (f) { return f !== fn; });
    };
  }

  window.addEventListener("message", function (e) {
    if (e.origin !== ORIGIN) return;            // same-origin only
    var d = e.data;
    if (!d || d.source !== SOURCE) return;        // ignore foreign messages
    (subs[d.topic] || []).forEach(function (fn) {
      try { fn(d.payload); } catch (err) { console.error("[RelayLabBridge]", err); }
    });
    (subs["*"] || []).forEach(function (fn) {
      try { fn(d.topic, d.payload); } catch (err) { console.error("[RelayLabBridge]", err); }
    });
  });

  // Announce presence so the parent can register this frame for downstream messages.
  if (parentWin) {
    parentWin.postMessage({ source: SOURCE, v: VERSION, topic: "__bridge.hello", payload: {} }, ORIGIN);
  }

  window.RelayLabBridge = { publish: publish, subscribe: subscribe, available: !!parentWin };
})();
