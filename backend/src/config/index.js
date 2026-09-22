require("dotenv").config();
const fs = require("fs");
const path = require("path");

let deployedSepolia = {};
try {
  const depPath = path.join(__dirname, "..", "..", "..", "deployments", "sepolia.json");
  if (fs.existsSync(depPath)) {
    deployedSepolia = JSON.parse(fs.readFileSync(depPath, "utf-8"));
  }
} catch {
  // ignore
}

const config = {
  port: parseInt(process.env.PORT || "3000", 10),
  host: process.env.HOST || "0.0.0.0",

  // Modes
  demoMode: process.env.DEMO_MODE !== "false",
  secureMode: process.env.SECURE_MODE !== "false",
  vulnerableDemoMode: process.env.VULNERABLE_DEMO_MODE === "true",

  // Chain & Network Configuration
  network: process.env.NETWORK || deployedSepolia.network || "sepolia",
  chainId: parseInt(
    process.env.CHAIN_ID || deployedSepolia.chainId || "11155111",
    10
  ),
  rpcUrl:
    process.env.SEPOLIA_RPC_URL ||
    process.env.ARBITRUM_SEPOLIA_RPC_URL ||
    "https://rpc.sepolia.org",

  // Contracts & Signer
  vaultAddress:
    process.env.VAULT_CONTRACT_ADDRESS ||
    process.env.CONTRACT_ADDRESS ||
    deployedSepolia.contractAddress ||
    "",
  gatekeeperPrivateKey: process.env.GATEKEEPER_PRIVATE_KEY || "",

  // Policy Limits
  maxClaimAmountEth: process.env.MAX_CLAIM_AMOUNT_ETH || "0.05",
  claimDeadlineWindowSeconds: 300, // 5 minutes validity
  maxPromptLengthBytes: 2048, // 2KB hard limit

  // LLM Configuration
  geminiApiKey: process.env.GEMINI_API_KEY || "",
  llmModel: process.env.LLM_MODEL || "gemini-3.5-flash-lite",

  // Deployment Info
  deploymentTxHash: deployedSepolia.deploymentTxHash || "",
  deployedAt: deployedSepolia.deployedAt || "",
};

module.exports = config;
