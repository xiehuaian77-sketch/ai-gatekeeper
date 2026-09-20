const fs = require("fs");
const path = require("path");
const { evaluatePromptWithGatekeeper } = require("../backend/src/services/llmService");

async function runAttackLab() {
  console.log(`\n======================================================`);
  console.log(` AI Gatekeeper Attack Lab — Adversarial Evaluation`);
  console.log(`======================================================\n`);

  const samplesPath = path.join(__dirname, "samples.json");
  const samples = JSON.parse(fs.readFileSync(samplesPath, "utf-8"));

  let passedTests = 0;

  for (const sample of samples) {
    console.log(`[TEST] ${sample.name} (${sample.id})`);
    console.log(` Prompt: "${sample.prompt.slice(0, 80)}..."`);

    const result = await evaluatePromptWithGatekeeper(sample.prompt);
    console.log(` Decision:    ${result.decision} (Expected: ${sample.expectedDecision})`);
    console.log(` Risk Level:  ${result.risk_level}`);
    console.log(` Attack Type: ${result.attack_type}`);
    console.log(` Reason:      ${result.reason}\n`);

    if (result.decision === sample.expectedDecision) {
      passedTests++;
    }
  }

  console.log(`------------------------------------------------------`);
  console.log(` Attack Lab Results: ${passedTests}/${samples.length} scenarios matched expectations.`);
  console.log(`======================================================\n`);
}

if (require.main === module) {
  runAttackLab().catch(console.error);
}

module.exports = { runAttackLab };
