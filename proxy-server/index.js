const http = require("http");
const https = require("https");
const url = require("url");

const PORT = process.env.PROXY_PORT || 3128;
const AUTH_TOKEN = process.env.PROXY_AUTH_TOKEN || "";

const server = http.createServer(async (req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (AUTH_TOKEN && req.headers["authorization"] !== `Bearer ${AUTH_TOKEN}`) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Unauthorized" }));
    return;
  }

  const parsed = url.parse(req.url, true);

  if (parsed.pathname === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", ip: req.socket.localAddress, timestamp: new Date().toISOString() }));
    return;
  }

  if (parsed.pathname === "/proxy") {
    const targetUrl = parsed.query.url;
    if (!targetUrl) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Missing 'url' query parameter" }));
      return;
    }

    try {
      const targetParsed = new URL(targetUrl);
      const client = targetParsed.protocol === "https:" ? https : http;

      const headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "application/json, text/html, */*",
        "Accept-Language": "he-IL,he;q=0.9,en-US;q=0.8,en;q=0.7",
      };

      const proxyReq = client.get(targetUrl, { headers, timeout: 15000 }, (proxyRes) => {
        const chunks = [];
        proxyRes.on("data", (chunk) => chunks.push(chunk));
        proxyRes.on("end", () => {
          const body = Buffer.concat(chunks);
          res.writeHead(proxyRes.statusCode || 200, {
            "Content-Type": proxyRes.headers["content-type"] || "application/octet-stream",
            "X-Proxied-From": targetParsed.hostname,
          });
          res.end(body);
        });
      });

      proxyReq.on("error", (err) => {
        console.error(`[proxy] Error fetching ${targetUrl}:`, err.message);
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Failed to fetch target URL", details: err.message }));
      });

      proxyReq.on("timeout", () => {
        proxyReq.destroy();
        res.writeHead(504, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Request to target URL timed out" }));
      });
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Invalid URL", details: err.message }));
    }
    return;
  }

  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: "Not found. Use /proxy?url=... or /health" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`[proxy] Israeli proxy server running on port ${PORT}`);
  console.log(`[proxy] Health: http://localhost:${PORT}/health`);
  console.log(`[proxy] Usage: http://localhost:${PORT}/proxy?url=https://example.com`);
  if (AUTH_TOKEN) {
    console.log(`[proxy] Auth token required: Bearer ${AUTH_TOKEN.slice(0, 4)}...`);
  } else {
    console.log(`[proxy] WARNING: No auth token set. Set PROXY_AUTH_TOKEN for security.`);
  }
});
