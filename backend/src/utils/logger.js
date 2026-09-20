const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const LOG_DIR = path.join(__dirname, "..", "..", "..", "demo-log");

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Blacklisted keys that must NEVER appear in logs
const SENSITIVE_PATTERNS = [
  /private_?key/i,
  /mnemonic/i,
  /recovery_?phrase/i,
  /seed_?phrase/i,
  /secret_?phrase/i,
  /secret/i,
  /api_?key/i,
  /password/i,
  /token/i,
  /authorization/i,
  /credential/i,
];

// 12 to 24 word mnemonic recovery phrase pattern
const MNEMONIC_PATTERN = /^([a-z]{3,12}\s+){11,23}[a-z]{3,12}$/i;

function hashPrompt(prompt) {
  if (!prompt || typeof prompt !== "string") return null;
  return crypto.createHash("sha256").update(prompt).digest("hex");
}

function maskStringSecrets(str) {
  if (typeof str !== "string") return str;
  // If string looks like a private key (0x + 64 hex chars)
  if (/^0x[a-fA-F0-9]{64}$/.test(str)) {
    return "[REDACTED_PRIVATE_KEY]";
  }
  // If string looks like a 12/24 word mnemonic recovery phrase
  if (MNEMONIC_PATTERN.test(str.trim())) {
    return "[REDACTED_SECRET_RECOVERY_PHRASE]";
  }
  // If string contains an RPC URL with API key (e.g. /v2/KEY or /v3/KEY or ?key=KEY)
  let masked = str.replace(/(https?:\/\/[^\s"'`]+(?:\/v[23]\/|\?key=))[a-zA-Z0-9_-]{12,}/gi, "$1[REDACTED_API_KEY]");
  return masked;
}

function sanitizeObject(obj, seen = new WeakSet()) {
  if (obj === null || typeof obj !== "object") {
    return maskStringSecrets(obj);
  }

  if (seen.has(obj)) {
    return "[CIRCULAR]";
  }
  seen.add(obj);

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObject(item, seen));
  }

  const clean = {};
  for (const [key, value] of Object.entries(obj)) {
    const isSensitive = SENSITIVE_PATTERNS.some((pattern) => pattern.test(key));
    const isPublicHash = /^(txHash|hash|blockHash|promptHash|verifyingContract|contractAddress|recipient|signerAddress|r|s)$/i.test(key);

    if (isSensitive) {
      clean[key] = "[REDACTED]";
    } else if (typeof value === "object" && value !== null) {
      clean[key] = sanitizeObject(value, seen);
    } else if (!isPublicHash && typeof value === "string") {
      clean[key] = maskStringSecrets(value);
    } else {
      clean[key] = value;
    }
  }
  return clean;
}

function logEvent(eventType, data = {}) {
  const timestamp = new Date().toISOString();
  const sanitized = sanitizeObject(data);

  const entry = {
    timestamp,
    eventType,
    ...sanitized,
  };

  const logLine = JSON.stringify(entry);
  console.log(`[${timestamp}] [${eventType}]`, JSON.stringify(sanitized));

  try {
    const logFilePath = path.join(
      LOG_DIR,
      `demo-${timestamp.slice(0, 10)}.log`
    );
    fs.appendFileSync(logFilePath, logLine + "\n");
  } catch (err) {
    console.error("Failed to write to demo-log file:", err);
  }

  return entry;
}

function logSecurityAudit({
  sessionId,
  promptHash,
  decision,
  riskLevel,
  attackType,
  signatureGenerated,
  txHash,
  chainId,
  contractAddress,
  extra = {},
}) {
  return logEvent("SECURITY_AUDIT_LOG", {
    sessionId: sessionId || "session-" + Date.now(),
    promptHash,
    decision,
    riskLevel,
    attackType,
    signatureGenerated: Boolean(signatureGenerated),
    txHash: txHash || null,
    chainId: chainId || null,
    contractAddress: contractAddress || null,
    ...extra,
  });
}

module.exports = {
  sanitizeObject,
  logEvent,
  logSecurityAudit,
  hashPrompt,
};
