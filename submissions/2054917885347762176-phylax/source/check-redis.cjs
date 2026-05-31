const fs = require("fs");
const tls = require("tls");
const net = require("net");

const envText = fs.readFileSync(".env.local", "utf8");
const line = envText.split(/\r?\n/).find((x) => x.startsWith("REDIS_URL="));
if (!line) {
  console.error("REDIS_URL not found in .env.local");
  process.exit(1);
}

const raw = line.replace(/^REDIS_URL=/, "").trim().replace(/^["']|["']$/g, "");
const url = new URL(raw);

const username = decodeURIComponent(url.username || "");
const password = decodeURIComponent(url.password || "");
const host = url.hostname;
const port = Number(url.port || 6379);
const useTls = url.protocol === "rediss:";

function resp(args) {
  return `*${args.length}\r\n` + args.map((a) => `$${Buffer.byteLength(String(a))}\r\n${a}\r\n`).join("");
}

const socket = useTls
  ? tls.connect({ host, port, servername: host })
  : net.connect({ host, port });

let buffer = "";

socket.setTimeout(10000);

socket.on("connect", () => {
  const commands = [];

  if (password) {
    if (username) commands.push(resp(["AUTH", username, password]));
    else commands.push(resp(["AUTH", password]));
  }

  commands.push(resp(["PING"]));
  socket.write(commands.join(""));
});

socket.on("data", (chunk) => {
  buffer += chunk.toString();
  if (buffer.includes("+PONG")) {
    console.log("Redis PING: PASS");
    console.log(`Endpoint: ${url.protocol}//${host}:${port}`);
    console.log(`Auth: ${password ? "present" : "missing"}`);
    socket.end();
    process.exit(0);
  }

  if (buffer.includes("-ERR") || buffer.includes("-WRONGPASS") || buffer.includes("-NOAUTH")) {
    console.error("Redis PING: FAIL");
    console.error(buffer.replace(password, "[REDACTED]"));
    socket.end();
    process.exit(1);
  }
});

socket.on("timeout", () => {
  console.error("Redis PING: FAIL timeout");
  socket.destroy();
  process.exit(1);
});

socket.on("error", (err) => {
  console.error("Redis PING: FAIL", err.message);
  process.exit(1);
});
