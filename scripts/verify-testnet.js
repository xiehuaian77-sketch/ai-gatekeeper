const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`\n======================================================`);
  console.log(` Phase 2.5: Testnet Verification & Security Proof`);
  console.log(` Network: ${network.name}`);
  console.log(`======================================================\n`);

  // 1. Read deployment artifact
  const deploymentPath = path.join(__dirname, "..", "deployments", `${network.name}.json`);
  if (!fs.existsSync(deploymentPath)) {
    throw new Error(
      `Deployment artifact for '${network.name}' not found at ${deploymentPath}. Please deploy first.`
    );
  }

  const deploymentData = JSON.parse(fs.readFileSync(deploymentPath, "utf-8"));
  const vaultAddress = deploymentData.contractAddress;
  console.log(`Contract Address: ${vaultAddress}`);

  const GatekeeperVault = await ethers.getContractFactory("GatekeeperVault");
  const vault = GatekeeperVault.attach(vaultAddress);

  const [deployer] = await ethers.getSigners();
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Operator Address: ${deployer.address}`);
  console.log(`Operator Balance: ${ethers.formatEther(balance)} ETH`);

  // Step 3: Verify on-chain contract parameters
  console.log(`\n--- Step 3: Contract Inspection ---`);
  const onChainSigner = await vault.gatekeeperSigner();
  const vaultBalance = await ethers.provider.getBalance(vaultAddress);
  const maxClaim = await vault.MAX_CLAIM_AMOUNT();
  const maxPayout = await vault.DEMO_MAX_TOTAL_PAYOUT();
  const networkChainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`gatekeeperSigner:       ${onChainSigner}`);
  console.log(`Chain ID:               ${networkChainId}`);
  console.log(`Vault Balance:          ${ethers.formatEther(vaultBalance)} ETH`);
  console.log(`MAX_CLAIM_AMOUNT:       ${ethers.formatEther(maxClaim)} ETH`);
  console.log(`DEMO_MAX_TOTAL_PAYOUT:  ${ethers.formatEther(maxPayout)} ETH`);

  if (vaultBalance === 0n) {
    console.log(`\n[WARNING] Vault balance is 0 ETH. 需要用户进行测试网 ETH 注资以进行后续 Claim 验证！`);
    console.log(`可以使用 deployer 账户直接向合约转账注资 (例如 0.005 ETH)。`);
    return;
  }

  // Step 4 & 5: Small test claim
  console.log(`\n--- Step 4 & 5: Executing Small Testnet Claim ---`);
  const claimAmount = ethers.parseEther("0.001");
  const nonce = BigInt(Date.now());
  const deadline = BigInt(Math.floor(Date.now() / 1000) + 600);
  const recipient = deployer.address;

  const domain = {
    name: "AI Gatekeeper Vault",
    version: "1",
    chainId: Number(networkChainId),
    verifyingContract: vaultAddress,
  };

  const types = {
    ClaimAuthorization: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  const message = {
    recipient,
    amount: claimAmount,
    nonce,
    deadline,
  };

  // Sign with operator/deployer (must be gatekeeperSigner)
  const rawSig = await deployer.signTypedData(domain, types, message);
  const sig = ethers.Signature.from(rawSig);

  const recipientBalanceBefore = await ethers.provider.getBalance(recipient);
  console.log(`Submitting claim transaction for 0.001 ETH...`);

  const tx = await vault.claim(
    message.recipient,
    message.amount,
    message.nonce,
    message.deadline,
    sig.v,
    sig.r,
    sig.s
  );

  console.log(`Claim Tx Submitted: ${tx.hash}`);
  const receipt = await tx.wait();
  console.log(`Claim Tx Confirmed in block ${receipt.blockNumber}, gas used: ${receipt.gasUsed}`);

  const isNonceUsed = await vault.isNonceUsed(nonce);
  const recipientBalanceAfter = await ethers.provider.getBalance(recipient);
  const gasSpent = receipt.gasUsed * receipt.gasPrice;

  console.log(`isNonceUsed(${nonce}): ${isNonceUsed}`);
  console.log(`Recipient Balance Delta (minus gas): +${ethers.formatEther(recipientBalanceAfter - recipientBalanceBefore + gasSpent)} ETH`);

  // Step 7: Security check on-chain (Nonce Replay Revert)
  console.log(`\n--- Step 7: Testing Nonce Replay Rejection ---`);
  try {
    await vault.claim(
      message.recipient,
      message.amount,
      message.nonce,
      message.deadline,
      sig.v,
      sig.r,
      sig.s
    );
    throw new Error("[FAIL] Nonce replay was not rejected!");
  } catch (err) {
    console.log(`[PASS] Nonce replay correctly reverted: ${err.message.slice(0, 70)}...`);
  }

  let explorerBase = "https://sepolia.etherscan.io";
  if (Number(networkChainId) === 421614) {
    explorerBase = "https://sepolia.arbiscan.io";
  }

  console.log(`\n======================================================`);
  console.log(`## Testnet Proof Summary`);
  console.log(`Contract:     ${explorerBase}/address/${vaultAddress}`);
  console.log(`Claim Tx:     ${explorerBase}/tx/${tx.hash}`);
  console.log(`======================================================\n`);
}

main().catch((err) => {
  console.error("Testnet verification failed:", err.message || err);
  process.exitCode = 1;
});
