const { evaluatePromptWithGatekeeper } = require("../services/llmService");
const {
  validateLlmDecision,
  validateClaimPolicy,
} = require("../services/policyGuard");
const { signClaimAuthorization } = require("../services/signerService");
const { executeOnChainClaim } = require("../services/contractService");
const { logSecurityAudit, hashPrompt, logEvent } = require("../utils/logger");
const config = require("../config");

async function claimRoute(fastify, _options) {
  fastify.post("/api/claim", async (request, reply) => {
    const { prompt, recipient, amountWei, sessionId } = request.body || {};
    const effectiveSessionId = sessionId || `claim-${Date.now()}`;

    // 1. Validate prompt
    if (typeof prompt !== "string") {
      return reply.code(400).send({
        success: false,
        error: "Missing or invalid 'prompt' in request body.",
      });
    }

    // 2. Reject prompts exceeding 2KB
    const promptByteLength = Buffer.byteLength(prompt, "utf8");
    if (promptByteLength > config.maxPromptLengthBytes) {
      return reply.code(400).send({
        success: false,
        error: `Prompt size of ${promptByteLength} bytes exceeds the maximum allowed limit of ${config.maxPromptLengthBytes} bytes (2KB).`,
      });
    }

    // 3. Validate recipient
    if (!recipient || typeof recipient !== "string") {
      return reply.code(400).send({
        success: false,
        error: "Missing or invalid 'recipient' address in request body.",
      });
    }

    const pHash = hashPrompt(prompt);

    // 4. AI Gatekeeper Evaluation
    const rawLlmOutput = await evaluatePromptWithGatekeeper(prompt);
    const llmEvaluation = validateLlmDecision(rawLlmOutput);

    // 5. Policy Guard Check (LLM decision + limits + recipient validation)
    const policyResult = validateClaimPolicy({
      recipient,
      amountWei,
      llmEvaluation,
    });

    if (!policyResult.passed) {
      // DENY state MUST NEVER call Signer
      logSecurityAudit({
        sessionId: effectiveSessionId,
        promptHash: pHash,
        decision: llmEvaluation.decision,
        riskLevel: llmEvaluation.risk_level,
        attackType: llmEvaluation.attack_type,
        signatureGenerated: false,
        txHash: null,
        chainId: config.chainId,
        contractAddress: config.vaultAddress,
      });

      return reply.code(403).send({
        success: false,
        code: policyResult.code,
        error: policyResult.error,
        decision: llmEvaluation.decision,
        riskLevel: llmEvaluation.risk_level,
        attackType: llmEvaluation.attack_type,
        reason: llmEvaluation.reason,
      });
    }

    // 6. Signer Service generates EIP-712 Signature
    let signatureBundle;
    try {
      signatureBundle = await signClaimAuthorization({
        recipient: policyResult.recipient,
        amount: policyResult.amount,
        nonce: policyResult.nonce,
        deadline: policyResult.deadline,
      });
    } catch (signErr) {
      logEvent("SIGNER_ERROR", { error: signErr.message });
      logSecurityAudit({
        sessionId: effectiveSessionId,
        promptHash: pHash,
        decision: "ALLOW",
        riskLevel: llmEvaluation.risk_level,
        attackType: llmEvaluation.attack_type,
        signatureGenerated: false,
        txHash: null,
        chainId: config.chainId,
        contractAddress: config.vaultAddress,
      });
      return reply.code(500).send({
        success: false,
        code: "SIGNER_FAILED",
        error: `Signer failed: ${signErr.message}`,
      });
    }

    // 7. Execute on-chain claim transaction via Viem
    try {
      const txResult = await executeOnChainClaim({
        recipient: policyResult.recipient,
        amount: policyResult.amount,
        nonce: policyResult.nonce,
        deadline: policyResult.deadline,
        v: signatureBundle.v,
        r: signatureBundle.r,
        s: signatureBundle.s,
      });

      // Log Security Audit entry with confirmed txHash
      logSecurityAudit({
        sessionId: effectiveSessionId,
        promptHash: pHash,
        decision: "ALLOW",
        riskLevel: llmEvaluation.risk_level,
        attackType: llmEvaluation.attack_type,
        signatureGenerated: true,
        txHash: txResult.txHash,
        chainId: config.chainId,
        contractAddress: config.vaultAddress,
      });

      return reply.send({
        success: true,
        txHash: txResult.txHash,
        amount: policyResult.amount.toString(),
        recipient: policyResult.recipient,
        chainId: config.chainId.toString(),
        contractAddress: config.vaultAddress,
        blockNumber: txResult.blockNumber,
        gasUsed: txResult.gasUsed,
        nonce: policyResult.nonce.toString(),
        deadline: policyResult.deadline.toString(),
        signature: {
          v: signatureBundle.v,
          r: signatureBundle.r,
          s: signatureBundle.s,
        },
      });
    } catch (txErr) {
      logEvent("ONCHAIN_EXECUTION_FAILED", { error: txErr.message });
      logSecurityAudit({
        sessionId: effectiveSessionId,
        promptHash: pHash,
        decision: "ALLOW",
        riskLevel: llmEvaluation.risk_level,
        attackType: llmEvaluation.attack_type,
        signatureGenerated: true,
        txHash: null,
        chainId: config.chainId,
        contractAddress: config.vaultAddress,
      });

      return reply.code(502).send({
        success: false,
        code: "ONCHAIN_REVERT",
        error: `On-chain execution failed: ${txErr.message}`,
        chainId: config.chainId.toString(),
        contractAddress: config.vaultAddress,
      });
    }
  });
}

module.exports = claimRoute;
