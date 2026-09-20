const {
  createPublicClient,
  createWalletClient,
  http,
  custom,
  parseAbi,
} = require("viem");
const { privateKeyToAccount } = require("viem/accounts");
const config = require("../config");
const { logEvent } = require("../utils/logger");

const VAULT_ABI = parseAbi([
  "function claim(address recipient, uint256 amount, uint256 nonce, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external",
  "function isNonceUsed(uint256 nonce) external view returns (bool)",
  "function totalPaidOut() external view returns (uint256)",
  "function MAX_CLAIM_AMOUNT() external view returns (uint256)",
  "function DEMO_MAX_TOTAL_PAYOUT() external view returns (uint256)",
  "function gatekeeperSigner() external view returns (address)",
  "function domainSeparator() external view returns (bytes32)",
  "event FundsReleased(address indexed recipient, uint256 amount, uint256 nonce)",
]);

const { sepolia, hardhat } = require("viem/chains");

function getChain() {
  if (config.chainId === 11155111) return sepolia;
  return hardhat;
}

function getTransport() {
  if (config.network === "hardhat" && global.hardhatProvider) {
    return custom(global.hardhatProvider);
  }
  return http(config.rpcUrl);
}

function getPublicClient() {
  return createPublicClient({
    chain: getChain(),
    transport: getTransport(),
  });
}

function getWalletClient() {
  if (!config.gatekeeperPrivateKey) {
    throw new Error("GATEKEEPER_PRIVATE_KEY missing for wallet client.");
  }
  let key = config.gatekeeperPrivateKey.trim();
  if (!key.startsWith("0x")) key = `0x${key}`;

  const account = privateKeyToAccount(key);
  return createWalletClient({
    account,
    chain: getChain(),
    transport: getTransport(),
  });
}

/**
 * Reads vault status from on-chain contract
 */
async function getVaultStatus() {
  if (!config.vaultAddress) {
    return { error: "Vault address not configured" };
  }

  const publicClient = getPublicClient();
  const address = config.vaultAddress;

  try {
    const [balance, totalPaidOut, maxClaim, maxPayout, signer] = await Promise.all([
      publicClient.getBalance({ address }),
      publicClient.readContract({
        address,
        abi: VAULT_ABI,
        functionName: "totalPaidOut",
      }),
      publicClient.readContract({
        address,
        abi: VAULT_ABI,
        functionName: "MAX_CLAIM_AMOUNT",
      }),
      publicClient.readContract({
        address,
        abi: VAULT_ABI,
        functionName: "DEMO_MAX_TOTAL_PAYOUT",
      }),
      publicClient.readContract({
        address,
        abi: VAULT_ABI,
        functionName: "gatekeeperSigner",
      }),
    ]);

    return {
      vaultAddress: address,
      balanceWei: balance.toString(),
      totalPaidOutWei: totalPaidOut.toString(),
      maxClaimWei: maxClaim.toString(),
      maxPayoutWei: maxPayout.toString(),
      gatekeeperSigner: signer,
    };
  } catch (err) {
    console.error("Failed to read vault status:", err.message);
    return { error: err.message };
  }
}

/**
 * Checks whether a given nonce is already used on-chain
 */
async function checkIsNonceUsed(nonce) {
  if (!config.vaultAddress) return false;
  const publicClient = getPublicClient();
  return publicClient.readContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "isNonceUsed",
    args: [BigInt(nonce)],
  });
}

/**
 * Executes the on-chain claim transaction using the Viem client
 */
async function executeOnChainClaim({
  recipient,
  amount,
  nonce,
  deadline,
  v,
  r,
  s,
}) {
  const walletClient = getWalletClient();
  const publicClient = getPublicClient();

  logEvent("ONCHAIN_SUBMIT_CLAIM", {
    vaultAddress: config.vaultAddress,
    recipient,
    amount: amount.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
  });

  const hash = await walletClient.writeContract({
    address: config.vaultAddress,
    abi: VAULT_ABI,
    functionName: "claim",
    args: [
      recipient,
      BigInt(amount),
      BigInt(nonce),
      BigInt(deadline),
      Number(v),
      r,
      s,
    ],
  });

  logEvent("ONCHAIN_TX_SENT", { txHash: hash });

  const receipt = await publicClient.waitForTransactionReceipt({
    hash,
    confirmations: 1,
  });

  logEvent("ONCHAIN_TX_CONFIRMED", {
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status,
  });

  return {
    txHash: hash,
    blockNumber: receipt.blockNumber.toString(),
    gasUsed: receipt.gasUsed.toString(),
    status: receipt.status,
  };
}

module.exports = {
  VAULT_ABI,
  getPublicClient,
  getWalletClient,
  getVaultStatus,
  checkIsNonceUsed,
  executeOnChainClaim,
};
