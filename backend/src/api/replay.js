const { executeOnChainClaim, getVaultStatus, checkIsNonceUsed } = require("../services/contractService");
const { logEvent } = require("../utils/logger");
const config = require("../config");

async function replayRoute(fastify, _options) {
  fastify.post("/api/replay", async (request, reply) => {
    const { recipient, amount, nonce, deadline, v, r, s } = request.body || {};

    if (!recipient || !amount || !nonce || !deadline || !v || !r || !s) {
      return reply.code(400).send({
        success: false,
        error: "Missing required parameters for replay: recipient, amount, nonce, deadline, v, r, s",
      });
    }

    logEvent("REPLAY_ATTACK_ATTEMPT", {
      recipient,
      amount: amount.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    });

    // 1. Fetch vault balance before replay attempt
    const beforeStatus = await getVaultStatus();
    const isNonceAlreadyUsed = await checkIsNonceUsed(nonce);

    // 2. Attempt to submit the duplicate claim to the smart contract
    try {
      const txResult = await executeOnChainClaim({
        recipient,
        amount,
        nonce,
        deadline,
        v,
        r,
        s,
      });

      return reply.send({
        success: true,
        reverted: false,
        txHash: txResult.txHash,
        message: "Warning: Transaction did not revert.",
      });
    } catch (err) {
      // Expected revert: NonceAlreadyUsed or SignatureExpired
      const afterStatus = await getVaultStatus();

      // Sanitize revert reason to prevent logging raw signature parameters
      const sanitizedRevertReason = err.message ? err.message.replace(/0x[a-fA-F0-9]{64}/g, "[HEX_DATA]") : "";

      logEvent("REPLAY_ATTACK_REVERTED", {
        nonce: nonce.toString(),
        isNonceUsedBefore: isNonceAlreadyUsed,
        balanceBefore: beforeStatus.balanceWei,
        balanceAfter: afterStatus.balanceWei,
        revertReason: sanitizedRevertReason,
      });

      let errorReason = "Transaction Reverted";
      if (err.message.includes("NonceAlreadyUsed") || isNonceAlreadyUsed) {
        errorReason = "Transaction Reverted: NonceAlreadyUsed";
      } else if (err.message.includes("SignatureExpired")) {
        errorReason = "Transaction Reverted: SignatureExpired";
      }

      return reply.send({
        success: false,
        reverted: true,
        errorName: isNonceAlreadyUsed ? "NonceAlreadyUsed" : "TransactionReverted",
        message: errorReason,
        details: err.message,
        nonce: nonce.toString(),
        isNonceUsed: isNonceAlreadyUsed,
        vaultBalanceBeforeWei: beforeStatus.balanceWei,
        vaultBalanceAfterWei: afterStatus.balanceWei,
        secondaryPayoutWei: "0",
        contractAddress: config.vaultAddress,
        chainId: config.chainId.toString(),
      });
    }
  });
}

module.exports = replayRoute;
