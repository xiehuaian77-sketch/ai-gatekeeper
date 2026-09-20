const { evaluatePromptWithGatekeeper } = require("../services/llmService");
const { validateLlmDecision } = require("../services/policyGuard");
const { logSecurityAudit, hashPrompt } = require("../utils/logger");
const config = require("../config");

async function evaluateRoute(fastify, _options) {
  fastify.post("/api/evaluate", async (request, reply) => {
    const { prompt, sessionId } = request.body || {};

    // 1. Validate prompt presence
    if (typeof prompt !== "string") {
      return reply.code(400).send({
        error: "Missing or invalid 'prompt' field in request body. Must be a string.",
      });
    }

    // 2. Reject prompts exceeding 2KB
    const promptByteLength = Buffer.byteLength(prompt, "utf8");
    if (promptByteLength > config.maxPromptLengthBytes) {
      return reply.code(400).send({
        error: `Prompt size of ${promptByteLength} bytes exceeds the maximum allowed limit of ${config.maxPromptLengthBytes} bytes (2KB).`,
        maxAllowedBytes: config.maxPromptLengthBytes,
        actualBytes: promptByteLength,
      });
    }

    const pHash = hashPrompt(prompt);

    // 3. AI Gatekeeper Evaluation
    const rawLlmOutput = await evaluatePromptWithGatekeeper(prompt);
    const evaluation = validateLlmDecision(rawLlmOutput);

    // Map fields cleanly to standard API schema
    const responsePayload = {
      decision: evaluation.decision,
      riskLevel: evaluation.risk_level,
      attackType: evaluation.attack_type,
      reason: evaluation.reason,
      promptHash: pHash,
    };

    // 4. Log Security Audit entry (zero secrets)
    logSecurityAudit({
      sessionId: sessionId || `eval-${Date.now()}`,
      promptHash: pHash,
      decision: responsePayload.decision,
      riskLevel: responsePayload.riskLevel,
      attackType: responsePayload.attackType,
      signatureGenerated: false,
      txHash: null,
      chainId: config.chainId,
      contractAddress: config.vaultAddress,
    });

    return reply.send(responsePayload);
  });
}

module.exports = evaluateRoute;
