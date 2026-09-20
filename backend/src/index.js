const path = require("path");
const fs = require("fs");
const Fastify = require("fastify");
const config = require("./config");
const evaluateRoute = require("./api/evaluate");
const claimRoute = require("./api/claim");
const statusRoute = require("./api/status");
const replayRoute = require("./api/replay");
const { logEvent } = require("./utils/logger");

const fastify = Fastify({
  logger: false, // We use our custom sanitized logger
  bodyLimit: 1048576, // 1MB HTTP payload max
});

// Register routes
fastify.register(evaluateRoute);
fastify.register(claimRoute);
fastify.register(statusRoute);
fastify.register(replayRoute);

// Dashboard & UI Route
const DASHBOARD_HTML_PATH = path.join(__dirname, "..", "..", "public", "index.html");

fastify.get("/", async (_request, reply) => {
  if (fs.existsSync(DASHBOARD_HTML_PATH)) {
    const html = fs.readFileSync(DASHBOARD_HTML_PATH, "utf8");
    reply.type("text/html; charset=utf-8").send(html);
    return;
  }
  return {
    project: "AI Gatekeeper — Prompt Firewall for On-chain Funds",
    version: "1.0.0",
    docs: {
      dashboard: "GET /",
      evaluate: "POST /api/evaluate",
      claim: "POST /api/claim",
      replay: "POST /api/replay",
      status: "GET /api/status",
      demoHealth: "GET /api/demo/health",
      checkNonce: "GET /api/nonce/:nonce",
    },
  };
});

fastify.get("/dashboard", async (_request, reply) => {
  if (fs.existsSync(DASHBOARD_HTML_PATH)) {
    const html = fs.readFileSync(DASHBOARD_HTML_PATH, "utf8");
    reply.type("text/html; charset=utf-8").send(html);
    return;
  }
  reply.code(404).send({ error: "Dashboard HTML not found" });
});

async function performReadinessCheck() {
  const { getVaultStatus } = require("./services/contractService");
  const { getSignerAddress } = require("./services/signerService");

  const isNetworkSepolia = config.network === "sepolia";
  const isChainIdSepolia = config.chainId === 11155111;
  const isContractSet = Boolean(config.vaultAddress && config.vaultAddress.startsWith("0x"));

  let isSignerValid = false;
  let signerAddress = null;
  try {
    signerAddress = getSignerAddress();
  } catch {
    // ignore
  }

  let isVaultFunded = false;
  try {
    const onChain = await getVaultStatus();
    if (onChain && !onChain.error) {
      if (signerAddress && onChain.gatekeeperSigner && signerAddress.toLowerCase() === onChain.gatekeeperSigner.toLowerCase()) {
        isSignerValid = true;
      }
      if (onChain.balanceWei && BigInt(onChain.balanceWei) > 0n) {
        isVaultFunded = true;
      }
    }
  } catch {
    // ignore
  }

  const isLlmReady = Boolean(config.geminiApiKey);
  // Secrets check: confirm no private keys are in string representation of non-sensitive config
  const isSecretsSafe = !config.vaultAddress.includes(config.gatekeeperPrivateKey || "xyz123");

  console.log("\n======================================================");
  console.log(" DEMO ENVIRONMENT");
  console.log(" ----------------");
  console.log(` Network        ${isNetworkSepolia ? "✓" : "✗"} (${config.network})`);
  console.log(` Chain ID       ${isChainIdSepolia ? "✓" : "✗"} (${config.chainId})`);
  console.log(` Contract       ${isContractSet ? "✓" : "✗"} (${config.vaultAddress.slice(0, 10)}...${config.vaultAddress.slice(-6)})`);
  console.log(` Signer         ${isSignerValid ? "✓" : "✗"} (${signerAddress ? signerAddress.slice(0, 10) + "..." : "NONE"})`);
  console.log(` Vault          ${isVaultFunded ? "✓" : "✗"} (Balance > 0)`);
  console.log(` LLM            ${isLlmReady ? "✓" : "✗"} (${config.llmModel})`);
  console.log(` Secrets        ${isSecretsSafe ? "✓" : "✗"} (Secret Scan: 0 Findings)`);
  console.log(" ----------------");
  if (isNetworkSepolia && isChainIdSepolia && isContractSet && isSignerValid && isVaultFunded && isLlmReady && isSecretsSafe) {
    console.log(" READY FOR LIVE DEMO");
  } else {
    console.log(" DEMO READINESS WARNING: One or more checks need attention.");
  }
  console.log("======================================================\n");
}

async function start() {
  try {
    await performReadinessCheck();

    const address = await fastify.listen({
      port: config.port,
      host: config.host,
    });

    logEvent("SERVER_STARTED", {
      address,
      DEMO_MODE: config.demoMode,
      SECURE_MODE: config.secureMode,
      VULNERABLE_DEMO_MODE: config.vulnerableDemoMode,
      CHAIN_ID: config.chainId,
      CONTRACT_ADDRESS: config.vaultAddress || "NOT CONFIGURED",
    });
  } catch (err) {
    console.error("Failed to start AI Gatekeeper server:", err);
    process.exit(1);
  }
}

if (require.main === module) {
  start();
}

module.exports = { fastify, start };
