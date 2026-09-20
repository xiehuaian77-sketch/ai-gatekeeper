const { expect } = require("chai");
const { ethers } = require("hardhat");
const { validateClaimPolicy, validateLlmDecision } = require("../backend/src/services/policyGuard");
const {
  signClaimAuthorization,
  CLAIM_TYPES,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
} = require("../backend/src/services/signerService");
const config = require("../backend/src/config");

describe("Phase 2 Security Boundary Verification (10 Critical Checks)", function () {
  let vault;
  let gatekeeperSigner;
  let attacker;
  let unauthorizedSigner;
  let chainId;
  let vaultAddress;

  const INITIAL_FUNDING = ethers.parseEther("0.2");

  beforeEach(async function () {
    const [, _gatekeeperSigner, _attacker, _unauthorizedSigner] = await ethers.getSigners();
    gatekeeperSigner = _gatekeeperSigner;
    attacker = _attacker;
    unauthorizedSigner = _unauthorizedSigner;
    const network = await ethers.provider.getNetwork();
    chainId = Number(network.chainId);

    const GatekeeperVault = await ethers.getContractFactory("GatekeeperVault");
    vault = await GatekeeperVault.deploy(gatekeeperSigner.address, {
      value: INITIAL_FUNDING,
    });
    await vault.waitForDeployment();
    vaultAddress = await vault.getAddress();

    // Set server config for test
    config.vaultAddress = vaultAddress;
    config.chainId = chainId;
    // Use gatekeeperSigner private key (Hardhat standard test key #1)
    config.gatekeeperPrivateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
  });

  // Check 1: DENY 状态不能调用 Signer
  it("Check 1: DENY state from LLM evaluation is blocked by Policy Guard and must NEVER proceed to Signer", async function () {
    const denyLlmOutput = {
      decision: "DENY",
      risk_level: "HIGH",
      attack_type: "PROMPT_INJECTION",
      reason: "Adversarial pattern detected",
    };
    const llmEvaluation = validateLlmDecision(denyLlmOutput);

    let signerInvoked = false;
    const policyResult = validateClaimPolicy({
      recipient: attacker.address,
      amountWei: ethers.parseEther("0.01").toString(),
      llmEvaluation,
    });

    if (policyResult.passed) {
      signerInvoked = true;
      await signClaimAuthorization({
        recipient: attacker.address,
        amount: policyResult.amount,
        nonce: policyResult.nonce,
        deadline: policyResult.deadline,
      });
    }

    expect(policyResult.passed).to.be.false;
    expect(policyResult.code).to.equal("LLM_APPROVAL_DENIED");
    expect(signerInvoked).to.be.false;
  });

  // Check 2: 用户不能自己指定 signer
  it("Check 2: Contract rejects claims signed by an attacker-specified unauthorized signer", async function () {
    const nonce = 8001n;
    const amount = ethers.parseEther("0.01");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: vaultAddress,
    };

    const message = {
      recipient: attacker.address,
      amount,
      nonce,
      deadline,
    };

    // Attacker tries to use their own private key
    const rawSig = await unauthorizedSigner.signTypedData(domain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "InvalidSignature");
  });

  // Check 3: 用户不能修改 contract address
  it("Check 3: Contract rejects signatures generated for a different verifying contract address", async function () {
    const nonce = 8002n;
    const amount = ethers.parseEther("0.01");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const fakeContractAddress = ethers.Wallet.createRandom().address;

    const fakeDomain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: fakeContractAddress,
    };

    const message = {
      recipient: attacker.address,
      amount,
      nonce,
      deadline,
    };

    const rawSig = await gatekeeperSigner.signTypedData(fakeDomain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "InvalidSignature");
  });

  // Check 4: 用户不能修改 chainId
  it("Check 4: Contract rejects cross-chain replay signatures with different chainId", async function () {
    const nonce = 8003n;
    const amount = ethers.parseEther("0.01");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const wrongChainId = 11155111; // Sepolia chain ID

    const wrongChainDomain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId: wrongChainId,
      verifyingContract: vaultAddress,
    };

    const message = {
      recipient: attacker.address,
      amount,
      nonce,
      deadline,
    };

    const rawSig = await gatekeeperSigner.signTypedData(wrongChainDomain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "InvalidSignature");
  });

  // Check 5: 用户不能修改 domain
  it("Check 5: Signatures with modified domain name or version must revert on contract", async function () {
    const nonce = 8004n;
    const amount = ethers.parseEther("0.01");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const tamperedDomain = {
      name: "Tampered Gatekeeper Vault",
      version: "2",
      chainId,
      verifyingContract: vaultAddress,
    };

    const message = {
      recipient: attacker.address,
      amount,
      nonce,
      deadline,
    };

    const rawSig = await gatekeeperSigner.signTypedData(tamperedDomain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "InvalidSignature");
  });

  // Check 6: 用户不能修改签名类型
  it("Check 6: Signer Service strictly adheres to ClaimAuthorization type and rejects arbitrary type injection", function () {
    expect(CLAIM_TYPES).to.have.property("ClaimAuthorization");
    expect(CLAIM_TYPES.ClaimAuthorization).to.deep.equal([
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ]);
  });

  // Check 7: 用户不能请求 arbitrary message signing
  it("Check 7: Signer Service only exposes signClaimAuthorization and rejects arbitrary string or message signing", async function () {
    const signer = require("../backend/src/services/signerService");
    expect(signer.signMessage).to.be.undefined;
    expect(signer.personalSign).to.be.undefined;
    expect(signer.eth_sign).to.be.undefined;

    // Passing invalid recipient must immediately throw
    await expect(
      signer.signClaimAuthorization({
        recipient: "not-an-address",
        amount: 1000n,
        nonce: 1n,
        deadline: 9999999999n,
      })
    ).to.be.rejected;
  });

  // Check 8: amount 超过限制时拒绝
  it("Check 8: Rejects amount exceeding MAX_CLAIM_AMOUNT both in Policy Guard and in Contract", async function () {
    const excessiveAmount = ethers.parseEther("0.1"); // Max is 0.05 ETH
    const llmEvaluation = validateLlmDecision({
      decision: "ALLOW",
      risk_level: "LOW",
      attack_type: "NONE",
      reason: "Bypass granted",
    });

    // 1. Policy Guard rejects
    const policyResult = validateClaimPolicy({
      recipient: attacker.address,
      amountWei: excessiveAmount.toString(),
      llmEvaluation,
    });
    expect(policyResult.passed).to.be.false;
    expect(policyResult.code).to.equal("EXCEEDS_MAX_CLAIM_AMOUNT");

    // 2. Contract also rejects even if signed
    const nonce = 8008n;
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);
    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: vaultAddress,
    };
    const message = {
      recipient: attacker.address,
      amount: excessiveAmount,
      nonce,
      deadline,
    };
    const rawSig = await gatekeeperSigner.signTypedData(domain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "ExceedsMaxClaimAmount");
  });

  // Check 9: deadline 过期时拒绝
  it("Check 9: Contract rejects expired deadline", async function () {
    const nonce = 8009n;
    const amount = ethers.parseEther("0.02");
    const expiredDeadline = BigInt(Math.floor(Date.now() / 1000) - 100);

    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: vaultAddress,
    };
    const message = {
      recipient: attacker.address,
      amount,
      nonce,
      deadline: expiredDeadline,
    };
    const rawSig = await gatekeeperSigner.signTypedData(domain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "SignatureExpired");
  });

  // Check 10: nonce 重复时拒绝
  it("Check 10: Contract rejects duplicate nonce replay attacks", async function () {
    const nonce = 8010n;
    const amount = ethers.parseEther("0.02");
    const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

    const domain = {
      name: EIP712_DOMAIN_NAME,
      version: EIP712_DOMAIN_VERSION,
      chainId,
      verifyingContract: vaultAddress,
    };
    const message = {
      recipient: attacker.address,
      amount,
      nonce,
      deadline,
    };
    const rawSig = await gatekeeperSigner.signTypedData(domain, CLAIM_TYPES, message);
    const sig = ethers.Signature.from(rawSig);

    // First claim succeeds
    await vault.connect(attacker).claim(
      message.recipient,
      message.amount,
      message.nonce,
      message.deadline,
      sig.v,
      sig.r,
      sig.s
    );

    expect(await vault.isNonceUsed(nonce)).to.be.true;

    // Second claim with identical nonce must revert
    await expect(
      vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      )
    ).to.be.revertedWithCustomError(vault, "NonceAlreadyUsed").withArgs(nonce);
  });
});
