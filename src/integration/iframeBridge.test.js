import { describe, it, expect, vi } from "vitest";
import { createIframeBridge, isForwardableTopic, BRIDGE_SOURCE } from "./iframeBridge.js";

const ORIGIN = "https://app.test";

// Minimal fake window with an addEventListener-driven message dispatcher
function fakeWindow() {
  const listeners = [];
  return {
    location: { origin: ORIGIN },
    addEventListener: (type, fn) => { if (type === "message") listeners.push(fn); },
    removeEventListener: (type, fn) => {
      const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1);
    },
    _dispatch: (evt) => listeners.forEach((fn) => fn(evt)),
  };
}

function msg({ origin = ORIGIN, source = BRIDGE_SOURCE, topic, payload, src }) {
  return { origin, data: { source, v: 1, topic, payload }, source: src };
}

describe("isForwardableTopic", () => {
  it("accepts normal topics", () => {
    expect(isForwardableTopic("fault.currents")).toBe(true);
  });
  it("rejects bridge-internal and empty topics", () => {
    expect(isForwardableTopic("__bridge.hello")).toBe(false);
    expect(isForwardableTopic("")).toBe(false);
    expect(isForwardableTopic(null)).toBe(false);
  });
});

describe("createIframeBridge — inbound (iframe → bus)", () => {
  it("publishes same-origin tagged messages to the bus", () => {
    const publish = vi.fn();
    const w = fakeWindow();
    const b = createIframeBridge({ publish, win: w });
    b.start();
    w._dispatch(msg({ topic: "fault.currents", payload: { If: 6.28 } }));
    expect(publish).toHaveBeenCalledWith("fault.currents", { If: 6.28 });
  });

  it("ignores foreign-origin messages", () => {
    const publish = vi.fn();
    const w = fakeWindow();
    createIframeBridge({ publish, win: w }).start();
    w._dispatch(msg({ origin: "https://evil.test", topic: "fault.currents", payload: {} }));
    expect(publish).not.toHaveBeenCalled();
  });

  it("ignores messages without the bridge source marker", () => {
    const publish = vi.fn();
    const w = fakeWindow();
    createIframeBridge({ publish, win: w }).start();
    w._dispatch(msg({ source: "something-else", topic: "fault.currents", payload: {} }));
    expect(publish).not.toHaveBeenCalled();
  });

  it("registers the frame on hello but does not publish it", () => {
    const publish = vi.fn();
    const w = fakeWindow();
    const frame = { postMessage: vi.fn() };
    const b = createIframeBridge({ publish, win: w });
    b.start();
    w._dispatch(msg({ topic: "__bridge.hello", payload: {}, src: frame }));
    expect(publish).not.toHaveBeenCalled();
    expect(b.frames.has(frame)).toBe(true);
  });
});

describe("createIframeBridge — outbound (bus → iframe)", () => {
  it("forwards to registered frames with explicit targetOrigin", () => {
    const w = fakeWindow();
    const frame = { postMessage: vi.fn() };
    const b = createIframeBridge({ publish: () => {}, win: w });
    b.start();
    w._dispatch(msg({ topic: "__bridge.hello", payload: {}, src: frame }));
    b.forward("scenario.json", { id: "x" });
    expect(frame.postMessage).toHaveBeenCalledWith(
      { source: BRIDGE_SOURCE, v: 1, topic: "scenario.json", payload: { id: "x" } },
      ORIGIN
    );
  });

  it("does not forward bridge-internal topics", () => {
    const w = fakeWindow();
    const frame = { postMessage: vi.fn() };
    const b = createIframeBridge({ publish: () => {}, win: w });
    b.start();
    w._dispatch(msg({ topic: "__bridge.hello", payload: {}, src: frame }));
    b.forward("__bridge.hello", {});
    expect(frame.postMessage).not.toHaveBeenCalled();
  });

  it("stop() clears registered frames and detaches listener", () => {
    const publish = vi.fn();
    const w = fakeWindow();
    const frame = { postMessage: vi.fn() };
    const b = createIframeBridge({ publish, win: w });
    b.start();
    w._dispatch(msg({ topic: "__bridge.hello", payload: {}, src: frame }));
    b.stop();
    expect(b.frames.size).toBe(0);
    w._dispatch(msg({ topic: "fault.currents", payload: {} }));
    expect(publish).not.toHaveBeenCalled();
  });
});
