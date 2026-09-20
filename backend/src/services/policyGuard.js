const { isAddress, parseEther } = require("viem");
const config = require("../config");
const { logEvent } = require("../utils/logger");

const MAX_CLAIM_WEI = parseEther(config.maxClaimAmountEth);

// In-memory set of nonces issued by this server session to prevent local duplicate issuance
const issuedNonces = new Set();

function generateUniqueNonce() {
  let nonce;
  do {
    // High-resolution timestamp + random salt
    const rand = Math.floor(Math.random() * 10000);
    nonce = BigInt(Date.now()) * 10000n + BigInt(rand);
  } while (issuedNonces.has(nonce.toString()));

  issuedNonces.add(nonce.toString());
  return nonce;
}

/**
 * Validates the structured output from LLM Gatekeeper
 */
function validateLlmDecision(llmOutput) {
  if (!llmOutput || typeof llmOutput !== "object") {
    throw new Error("Invalid LLM output: not an object");
  }

  const { decision, risk_level, attack_type, reason } = llmOutput;

  if (!["ALLOW", "DENY"].includes(decision)) {
    throw new Error(`Invalid decision value in LLM output: ${decision}`);
  }

  return {
    isAllowed: decision === "ALLOW",
    decision,
    risk_level: risk_level || "UNKNOWN",
    attack_type: attack_type || "NONE",
    reason: reason || "No reason provided",
  };
}

/**
 * Validates claim parameters against backend policy limits
 */
function validateClaimPolicy({ recipient, amountWei, llmEvaluation }) {
  // 1. Recipient check
  if (!recipient || !isAddress(recipient)) {
    return {
      passed: false,
      code: "INVALID_RECIPIENT",
      error: "Recipient must be a valid Ethereum address.",
    };
  }

  // 2. LLM Gatekeeper Approval check
  if (!llmEvaluation.isAllowed) {
    logEvent("POLICY_BLOCKED_LLM_DENY", {
      recipient,
      reason: llmEvaluation.reason,
      attack_type: llmEvaluation.attack_type,
    });
    return {
      passed: false,
      code: "LLM_APPROVAL_DENIED",
      error: `Gatekeeper denied release: ${llmEvaluation.reason}`,
    };
  }

  // 3. Amount limit check
  const amount = BigInt(amountWei || parseEther("0.01").toString());
  if (amount <= 0n) {
    return {
      passed: false,
      code: "INVALID_AMOUNT",
      error: "Claim amount must be greater than zero.",
    };
  }

  if (amount > MAX_CLAIM_WEI) {
    logEvent("POLICY_BLOCKED_AMOUNT_EXCEEDED", {
      recipient,
      requestedAmount: amount.toString(),
      maxAllowed: MAX_CLAIM_WEI.toString(),
    });
    return {
      passed: false,
      code: "EXCEEDS_MAX_CLAIM_AMOUNT",
      error: `Requested amount exceeds max claim limit of ${config.maxClaimAmountEth} ETH.`,
    };
  }

  const nonce = generateUniqueNonce();
  const deadline = BigInt(Math.floor(Date.now() / 1000) + config.claimDeadlineWindowSeconds);

  return {
    passed: true,
    recipient,
    amount,
    nonce,
    deadline,
  };
}

module.exports = {
  validateLlmDecision,
  validateClaimPolicy,
  generateUniqueNonce,
  MAX_CLAIM_WEI,
};
