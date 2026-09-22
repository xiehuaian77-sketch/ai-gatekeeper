const fs = require("fs");
const path = require("path");
const { evaluatePromptWithGatekeeper } = require("../backend/src/services/llmService");
const { validateClaimPolicy, validateLlmDecision } = require("../backend/src/services/policyGuard");

async function runAttackLab() {
  console.log(`\n======================================================`);
  console.log(` AI Gatekeeper Attack Lab — Adversarial & Security Boundary`);
  console.log(`======================================================\n`);

  const samplesPath = path.join(__dirname, "samples.json");
  const samples = JSON.parse(fs.readFileSync(samplesPath, "utf-8"));

  let passedTests = 0;
  const mockRecipient = "0x2985959D97108F6e62F30Bf43E441E8E51b99ED6";

  for (const sample of samples) {
    console.log(`[TEST] ${sample.name} (${sample.id})`);
    console.log(` Prompt: "${sample.prompt.slice(0, 80)}..."`);

    const result = await evaluatePromptWithGatekeeper(sample.prompt);
    console.log(` Decision:    ${result.decision} (Expected: ${sample.expectedDecision})`);
    console.log(` Risk Level:  ${result.risk_level}`);
    console.log(` Attack Type: ${result.attack_type}`);
    console.log(` Reason:      ${result.reason}`);

    const validatedLlm = validateLlmDecision(result);
    const policyResult = validateClaimPolicy({
      recipient: mockRecipient,
      amountWei: "1000000000000000", // 0.001 ETH
      llmEvaluation: validatedLlm,
    });

    let boundaryOk = false;
    if (sample.expectedDecision === "DENY") {
      // Invariant: Adversarial request blocked before signature generation & broadcast
      if (!policyResult.passed && policyResult.code === "LLM_APPROVAL_DENIED") {
        boundaryOk = true;
        console.log(` Boundary:    PASS (Blocked by Policy Guard | Zero signature | Zero broadcast | 0 ETH payout)\n`);
      } else {
        console.log(` Boundary:    FAIL (Adversarial request was not blocked by Policy Guard)\n`);
      }
    } else if (sample.expectedDecision === "ALLOW") {
      // Invariant: ALLOW passes policy, but requires EIP-712 + Human Confirmation (ALLOW != EXECUTION)
      if (policyResult.passed && policyResult.nonce && policyResult.deadline) {
        boundaryOk = true;
        console.log(` Boundary:    PASS (Policy passed -> EIP-712 ready -> Human confirmation required -> ALLOW != EXECUTION)\n`);
      } else {
        console.log(` Boundary:    FAIL (Expected valid policy progression)\n`);
      }
    }

    if (result.decision === sample.expectedDecision && boundaryOk) {
      passedTests++;
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(` Attack Lab Results: ${passedTests}/${samples.length} scenarios matched expectations & security boundaries.`);
  console.log(`======================================================\n`);

  if (passedTests !== samples.length) {
    process.exitCode = 1;
  }
}

if (require.main === module) {
  runAttackLab().catch((err) => {
    console.error(err);
    process.exitCode = 1;
  });
}

module.exports = { runAttackLab };
