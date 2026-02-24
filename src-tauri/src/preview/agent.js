// ── Kodiq DevTools Agent ──────────────────────────────────────────────────────
// Injected into preview webview via initialization_script().
// Monkey-patches console, captures errors, sends data to Rust via WebSocket.
// Port is replaced at runtime by Rust: __KODIQ_DEVTOOLS_PORT__

(function () {
  if (window.__KODIQ_DEVTOOLS__) return;
  window.__KODIQ_DEVTOOLS__ = true;

  var PORT = __KODIQ_DEVTOOLS_PORT__;
  var ws = null;
  var queue = [];
  var MAX_QUEUE = 200;

  // -- WebSocket Connection ──────────────────────────────────────
  function connect() {
    try {
      ws = new WebSocket("ws://127.0.0.1:" + PORT);
      ws.onopen = function () {
        for (var i = 0; i < queue.length; i++) ws.send(queue[i]);
        queue = [];
      };
      ws.onclose = function () {
        ws = null;
        setTimeout(connect, 1000);
      };
      ws.onerror = function () {
        ws = null;
      };
    } catch (_e) {
      /* WebSocket unavailable */
    }
  }

  function send(data) {
    var msg = JSON.stringify(data);
    if (ws && ws.readyState === WebSocket.OPEN) {
      ws.send(msg);
    } else if (queue.length < MAX_QUEUE) {
      queue.push(msg);
    }
  }

  // -- Serialization ────────────────────────────────────────────
  function serialize(arg) {
    if (arg === undefined) return "__undefined__";
    if (arg === null) return null;
    if (typeof arg === "string") return arg;
    if (typeof arg === "number" || typeof arg === "boolean") return arg;
    if (arg instanceof Error)
      return { __type: "Error", message: arg.message, stack: arg.stack };
    if (arg instanceof HTMLElement)
      return "<" + arg.tagName.toLowerCase() + (arg.id ? "#" + arg.id : "") + (arg.className ? "." + arg.className.split(" ").join(".") : "") + ">";
    try {
      return JSON.parse(JSON.stringify(arg));
    } catch (_e) {
      return String(arg);
    }
  }

  // -- Console Monkey-Patch ─────────────────────────────────────
  var original = {};
  var levels = ["log", "warn", "error", "info", "debug"];
  for (var i = 0; i < levels.length; i++) {
    (function (level) {
      original[level] = console[level];
      console[level] = function () {
        var args = Array.prototype.slice.call(arguments);
        original[level].apply(console, args);
        send({
          type: "console",
          level: level,
          args: args.map(serialize),
          timestamp: Date.now(),
        });
      };
    })(levels[i]);
  }

  // -- Error Capture ────────────────────────────────────────────
  window.addEventListener("error", function (e) {
    send({
      type: "console",
      level: "error",
      args: [e.message || "Unknown error"],
      timestamp: Date.now(),
      stack: e.error ? e.error.stack : e.filename + ":" + e.lineno + ":" + e.colno,
    });
  });

  window.addEventListener("unhandledrejection", function (e) {
    send({
      type: "console",
      level: "error",
      args: ["Unhandled Promise Rejection:", serialize(e.reason)],
      timestamp: Date.now(),
    });
  });

  connect();
})();
