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

  // -- Fetch Interception ─────────────────────────────────────
  var originalFetch = window.fetch;
  window.fetch = function () {
    var args = Array.prototype.slice.call(arguments);
    var input = args[0];
    var init = args[1] || {};
    var method = (init.method || "GET").toUpperCase();
    var url = typeof input === "string" ? input : (input && input.url ? input.url : String(input));
    var startTime = Date.now();

    return originalFetch.apply(window, args).then(
      function (response) {
        var clone = response.clone();
        clone.text().then(function (body) {
          send({
            type: "network",
            method: method,
            url: url,
            status: response.status,
            statusText: response.statusText || "",
            reqType: "fetch",
            startTime: startTime,
            duration: Date.now() - startTime,
            responseSize: body.length,
            error: null,
          });
        }).catch(function () {
          send({
            type: "network",
            method: method,
            url: url,
            status: response.status,
            statusText: response.statusText || "",
            reqType: "fetch",
            startTime: startTime,
            duration: Date.now() - startTime,
            responseSize: null,
            error: null,
          });
        });
        return response;
      },
      function (err) {
        send({
          type: "network",
          method: method,
          url: url,
          status: null,
          statusText: "",
          reqType: "fetch",
          startTime: startTime,
          duration: Date.now() - startTime,
          responseSize: null,
          error: err ? err.message || String(err) : "Network error",
        });
        throw err;
      }
    );
  };

  // -- XHR Interception ──────────────────────────────────────
  var XHR = XMLHttpRequest.prototype;
  var originalOpen = XHR.open;
  var originalSend = XHR.send;

  XHR.open = function (method, url) {
    this.__kodiq = { method: (method || "GET").toUpperCase(), url: url };
    return originalOpen.apply(this, arguments);
  };

  XHR.send = function () {
    var meta = this.__kodiq;
    if (meta) {
      meta.startTime = Date.now();
      var xhr = this;
      var onDone = function () {
        send({
          type: "network",
          method: meta.method,
          url: meta.url,
          status: xhr.status || null,
          statusText: xhr.statusText || "",
          reqType: "xhr",
          startTime: meta.startTime,
          duration: Date.now() - meta.startTime,
          responseSize: xhr.responseText ? xhr.responseText.length : null,
          error: xhr.status === 0 ? "Network error" : null,
        });
      };
      this.addEventListener("load", onDone);
      this.addEventListener("error", function () {
        send({
          type: "network",
          method: meta.method,
          url: meta.url,
          status: null,
          statusText: "",
          reqType: "xhr",
          startTime: meta.startTime,
          duration: Date.now() - meta.startTime,
          responseSize: null,
          error: "Network error",
        });
      });
      this.addEventListener("abort", function () {
        send({
          type: "network",
          method: meta.method,
          url: meta.url,
          status: null,
          statusText: "",
          reqType: "xhr",
          startTime: meta.startTime,
          duration: Date.now() - meta.startTime,
          responseSize: null,
          error: "Aborted",
        });
      });
    }
    return originalSend.apply(this, arguments);
  };

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
