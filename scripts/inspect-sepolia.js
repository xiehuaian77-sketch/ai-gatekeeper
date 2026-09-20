const { formatEther } = require("viem");
const config = require("../backend/src/config");
const { getSignerAddress } = require("../backend/src/services/signerService");
const { getVaultStatus, checkIsNonceUsed } = require("../backend/src/services/contractService");

async function main() {
  console.log("\n======================================================");
  console.log(" Sepolia Gatekeeper Vault Live On-Chain Inspection");
  console.log("======================================================\n");

  console.log(`Target Contract Address: ${config.vaultAddress}`);
  console.log(`Configured Chain ID:     ${config.chainId}`);
  console.log(`Configured Network:      ${config.network}`);

  // Mask RPC URL if it contains an API key
  const maskedRpc = config.rpcUrl ? config.rpcUrl.replace(/(\/v2\/|\/v3\/)[a-zA-Z0-9_-]{10,}/, "$1[REDACTED_API_KEY]") : "NONE";
  console.log(`RPC URL:                 ${maskedRpc}`);

  // 1. Check signer address from GATEKEEPER_PRIVATE_KEY
  let localSignerAddress = "NOT CONFIGURED";
  try {
    localSignerAddress = getSignerAddress();
    console.log(`Local Signer Address:    ${localSignerAddress}`);
  } catch (err) {
    console.log(`Local Signer Error:      ${err.message}`);
  }

  // 2. Read on-chain data via contractService (Viem)
  console.log("\n--- Querying On-Chain State via Viem contractService ---");
  const onChain = await getVaultStatus();
  if (onChain.error) {
    console.error("Viem getVaultStatus error:", onChain.error);
  } else {
    console.log(`On-Chain Contract Address: ${onChain.vaultAddress}`);
    console.log(`On-Chain Signer Address:   ${onChain.gatekeeperSigner}`);
    console.log(`On-Chain Vault Balance:    ${formatEther(BigInt(onChain.balanceWei))} ETH (${onChain.balanceWei} wei)`);
    console.log(`On-Chain MAX_CLAIM_AMOUNT: ${formatEther(BigInt(onChain.maxClaimWei))} ETH`);
    console.log(`On-Chain MAX_TOTAL_PAYOUT: ${formatEther(BigInt(onChain.maxPayoutWei))} ETH`);
    console.log(`On-Chain totalPaidOut:     ${formatEther(BigInt(onChain.totalPaidOutWei))} ETH`);
  }

  // 3. Test isNonceUsed for sample nonce 1
  const nonce1Used = await checkIsNonceUsed(1);
  console.log(`On-Chain isNonceUsed(1):   ${nonce1Used}`);

  // 4. Verification Check: local signer address vs on-chain signer address
  console.log("\n--- Signer Alignment Check ---");
  if (localSignerAddress.toLowerCase() === (onChain.gatekeeperSigner || "").toLowerCase()) {
    console.log(`[PASS] Local GATEKEEPER_PRIVATE_KEY matches on-chain gatekeeperSigner: ${localSignerAddress}`);
  } else {
    console.log(`[FAIL/WARNING] Mismatch: Local Signer (${localSignerAddress}) != On-chain Signer (${onChain.gatekeeperSigner})`);
  }

  console.log("\n======================================================\n");
}

main().catch((err) => {
  console.error("Inspection failed:", err.message || err);
  process.exit(1);
});
