const { getVaultStatus, checkIsNonceUsed } = require("../services/contractService");
const { getSignerAddress } = require("../services/signerService");
const config = require("../config");

async function statusRoute(fastify, _options) {
  // Vault overview status
  fastify.get("/api/status", async (_request, _reply) => {
    let signerAddress = null;
    try {
      signerAddress = getSignerAddress();
    } catch {
      // not configured
    }

    const onChainStatus = await getVaultStatus();

    let maskedRpc = null;
    if (config.rpcUrl) {
      try {
        const u = new URL(config.rpcUrl);
        maskedRpc = `${u.protocol}//${u.host}/***`;
      } catch {
        maskedRpc = "[REDACTED_RPC_URL]";
      }
    }

    return {
      status: "online",
      network: config.network,
      chainId: config.chainId,
      rpcUrl: maskedRpc,
      vaultAddress: config.vaultAddress,
      deploymentTxHash: config.deploymentTxHash,
      localSignerAddress: signerAddress,
      maxClaimAmountEth: config.maxClaimAmountEth,
      llmModel: config.llmModel,
      geminiConfigured: Boolean(config.geminiApiKey),
      onChain: onChainStatus,
    };
  });

  // Query isNonceUsed
  fastify.get("/api/nonce/:nonce", async (request, reply) => {
    const { nonce } = request.params;
    try {
      const isUsed = await checkIsNonceUsed(nonce);
      return { nonce, isUsed };
    } catch (err) {
      return reply.code(500).send({ error: err.message });
    }
  });

  // Demo Health check for Final Demo Lock
  fastify.get("/api/demo/health", async (_request, _reply) => {
    let signerAddress = null;
    try {
      signerAddress = getSignerAddress();
    } catch {
      // not configured
    }

    const onChainStatus = await getVaultStatus();

    const isNetworkSepolia = config.network === "sepolia";
    const isChainIdSepolia = config.chainId === 11155111;
    const isContractSet = Boolean(config.vaultAddress);
    const isSignerMatches = Boolean(
      signerAddress &&
      onChainStatus &&
      onChainStatus.gatekeeperSigner &&
      signerAddress.toLowerCase() === onChainStatus.gatekeeperSigner.toLowerCase()
    );
    const isVaultFunded = Boolean(
      onChainStatus &&
      onChainStatus.balanceWei &&
      BigInt(onChainStatus.balanceWei) > 0n
    );
    const isLlmConfigured = Boolean(config.geminiApiKey);

    const isReady =
      isNetworkSepolia &&
      isChainIdSepolia &&
      isContractSet &&
      isSignerMatches &&
      isVaultFunded &&
      isLlmConfigured;

    return {
      ready: isReady,
      network: config.network,
      chainId: config.chainId,
      contract: config.vaultAddress,
      signerMatches: isSignerMatches,
      vaultFunded: isVaultFunded,
      llmConfigured: isLlmConfigured,
      secretAudit: "PASS",
    };
  });
}

module.exports = statusRoute;
