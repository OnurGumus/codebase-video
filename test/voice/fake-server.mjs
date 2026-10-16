// One HTTP server answering every cloud provider's path, for the tests: no real service is ever called.
import http from "node:http";

/** A 0.5 s 440 Hz sine as a 24 kHz 16-bit mono WAV. */
export const wav = () => {
  const rate = 24000;
  const n = rate / 2;
  const buf = Buffer.alloc(44 + n * 2);
  buf.write("RIFF", 0);
  buf.writeUInt32LE(36 + n * 2, 4);
  buf.write("WAVEfmt ", 8);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(1, 22);
  buf.writeUInt32LE(rate, 24);
  buf.writeUInt32LE(rate * 2, 28);
  buf.writeUInt16LE(2, 32);
  buf.writeUInt16LE(16, 34);
  buf.write("data", 36);
  buf.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) {
    buf.writeInt16LE(Math.round(Math.sin((2 * Math.PI * 440 * i) / rate) * 12000), 44 + i * 2);
  }
  return buf;
};

/** The service's own error body in each provider's shape. */
const errorBody = (path, message) =>
  path.startsWith("/v1/text-to-speech/")
    ? { type: "application/json", body: JSON.stringify({ detail: { message } }) }
    : path === "/cognitiveservices/v1"
      ? { type: "text/plain", body: message }
      : { type: "application/json", body: JSON.stringify({ error: { message } }) };

/**
 * Starts the server. mode: ok, 400, echo (400 repeating the query and key headers), 429-once (429 then 200),
 * fail-twice (503 twice, then 200), html (200 with HTML), empty-401 (401 with an empty body, as Azure sends for a
 * wrong key or region).
 * Resolves to { url, requests, close }; requests holds { method, path, query, headers, body } (body a Buffer).
 */
export const start = (mode) =>
  new Promise((resolve) => {
    const requests = [];
    const server = http.createServer((req, res) => {
      const chunks = [];
      req.on("data", (c) => chunks.push(c));
      req.on("end", () => {
        const u = new URL(req.url, "http://x");
        requests.push({
          method: req.method,
          path: u.pathname,
          query: u.search,
          headers: req.headers,
          body: Buffer.concat(chunks),
        });
        const n = requests.length;
        const fail = (status, message) => {
          const e = errorBody(u.pathname, message);
          res.writeHead(status, { "content-type": e.type });
          res.end(e.body);
        };
        if (mode === "400") return fail(400, "voice not found");
        if (mode === "echo") {
          // a hostile service: its 400 repeats the query and every key header it was sent
          const h = req.headers;
          const keys = [h["xi-api-key"], h["authorization"], h["ocp-apim-subscription-key"]];
          return fail(400, `bad request ${u.search} ${keys.join(" ")}`);
        }
        if (mode === "empty-401") {
          res.writeHead(401);
          return res.end();
        }
        if (mode === "429-once" && n === 1) return fail(429, "slow down");
        if (mode === "fail-twice" && n <= 2) return fail(503, "try later");
        if (mode === "html") {
          res.writeHead(200, { "content-type": "text/html" });
          return res.end("<html>oops</html>");
        }
        if (u.pathname === "/v1/text:synthesize") {
          res.writeHead(200, { "content-type": "application/json" });
          return res.end(JSON.stringify({ audioContent: wav().toString("base64") }));
        }
        res.writeHead(200, { "content-type": "audio/wav" });
        res.end(wav());
      });
    });
    server.listen(0, "127.0.0.1", () =>
      resolve({
        url: `http://127.0.0.1:${server.address().port}`,
        requests,
        close: () => new Promise((r) => { server.close(r); server.closeAllConnections(); }),
      }),
    );
  });
