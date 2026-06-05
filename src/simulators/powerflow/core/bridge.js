/**
 * postMessage Bridge Protocol
 *
 * Enables React components to communicate with iframe-based Newton-Raphson
 * simulator via message passing. Decouples UI from solver implementation.
 *
 * Message Format:
 * {
 *   type: 'solve' | 'serialize' | 'deserialize' | 'result' | 'error',
 *   id: <number>,
 *   payload: <Object>,
 *   error: <string> (on errors)
 * }
 */

/**
 * Create a message for solver request.
 * @param {number} id - Message ID for correlation
 * @param {string} type - Message type ('solve', 'serialize', etc.)
 * @param {Object} payload - Message data
 * @returns {Object} Message object
 */
export function createMessage(id, type, payload) {
  return {
    id,
    type,
    payload,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create a success result message.
 * @param {number} id - Correlation ID from request
 * @param {Object} result - Result data
 * @returns {Object} Result message
 */
export function createResult(id, result) {
  return {
    id,
    type: 'result',
    payload: result,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Create an error message.
 * @param {number} id - Correlation ID from request
 * @param {string} error - Error message
 * @returns {Object} Error message
 */
export function createError(id, error) {
  return {
    id,
    type: 'error',
    error,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Bridge client: sends requests to solver iframe.
 * Maintains request→response correlation via ID mapping.
 */
export class SolverBridgeClient {
  constructor(iframeWindow, origin = '*') {
    this.iframe = iframeWindow;
    this.origin = origin;
    this.messageId = 0;
    this.pending = new Map(); // id → {resolve, reject, timeout}
    this.timeout = 10000; // 10s default

    window.addEventListener('message', (ev) => this._handleMessage(ev));
  }

  /**
   * Send solve request to iframe solver.
   * @param {Object} network - {buses, branches}
   * @param {Object} options - {timeout}
   * @returns {Promise<Object>} Solver result {converged, iter, maxMis}
   */
  async solve(network, options = {}) {
    const msgId = ++this.messageId;
    const msg = createMessage(msgId, 'solve', { network });

    return this._request(msg, options.timeout || this.timeout);
  }

  /**
   * Send serialize request.
   * @param {Object} network - Network model
   * @returns {Promise<string>} JSON string
   */
  async serialize(network) {
    const msgId = ++this.messageId;
    const msg = createMessage(msgId, 'serialize', { network });
    return this._request(msg);
  }

  /**
   * Send deserialize request.
   * @param {string} json - JSON string
   * @returns {Promise<Object>} Network {buses, branches}
   */
  async deserialize(json) {
    const msgId = ++this.messageId;
    const msg = createMessage(msgId, 'deserialize', { json });
    return this._request(msg);
  }

  /**
   * Send raw message and wait for correlated response.
   * @private
   */
  _request(msg, timeout = this.timeout) {
    return new Promise((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        this.pending.delete(msg.id);
        reject(new Error(`Message ${msg.id} timed out after ${timeout}ms`));
      }, timeout);

      this.pending.set(msg.id, { resolve, reject, timeoutId });
      this.iframe.postMessage(msg, this.origin);
    });
  }

  /**
   * Handle incoming messages from iframe.
   * @private
   */
  _handleMessage(event) {
    if (event.origin !== this.origin && this.origin !== '*') return;

    const msg = event.data;
    if (!msg || !msg.id || !this.pending.has(msg.id)) return;

    const { resolve, reject, timeoutId } = this.pending.get(msg.id);
    clearTimeout(timeoutId);
    this.pending.delete(msg.id);

    if (msg.type === 'result') {
      resolve(msg.payload);
    } else if (msg.type === 'error') {
      reject(new Error(msg.error));
    } else {
      reject(new Error(`Unknown message type: ${msg.type}`));
    }
  }
}

/**
 * Bridge server: receives requests in iframe solver context.
 * Dispatches to appropriate handler (solve, serialize, deserialize).
 */
export class SolverBridgeServer {
  constructor(handlers = {}) {
    this.handlers = {
      solve: handlers.solve || (() => ({ converged: false })),
      serialize: handlers.serialize || (() => '{}'),
      deserialize: handlers.deserialize || (() => ({ buses: [], branches: [] })),
      ...handlers,
    };

    window.addEventListener('message', (ev) => this._handleRequest(ev));
  }

  /**
   * Process incoming request message.
   * @private
   */
  async _handleRequest(event) {
    const msg = event.data;
    if (!msg || !msg.id || !msg.type) return;

    try {
      const handler = this.handlers[msg.type];
      if (!handler) {
        throw new Error(`Unknown message type: ${msg.type}`);
      }

      const result = await handler(msg.payload);
      const response = createResult(msg.id, result);
      window.parent.postMessage(response, event.origin);
    } catch (err) {
      const response = createError(msg.id, err.message);
      window.parent.postMessage(response, event.origin);
    }
  }
}
