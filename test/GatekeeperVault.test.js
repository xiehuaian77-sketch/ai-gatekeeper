const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("GatekeeperVault", function () {
  let vault;
  let owner;
  let gatekeeperSigner;
  let attacker;
  let unauthorizedSigner;
  let chainId;
  let vaultAddress;

  const MAX_CLAIM_AMOUNT = ethers.parseEther("0.05");
  const INITIAL_VAULT_FUNDING = ethers.parseEther("0.2");

  function getDomain(customVerifyingContract = vaultAddress, customChainId = chainId) {
    return {
      name: "AI Gatekeeper Vault",
      version: "1",
      chainId: customChainId,
      verifyingContract: customVerifyingContract,
    };
  }

  const types = {
    ClaimAuthorization: [
      { name: "recipient", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "nonce", type: "uint256" },
      { name: "deadline", type: "uint256" },
    ],
  };

  async function createSignature(signer, message, customDomain = null) {
    const domain = customDomain || getDomain();
    const rawSig = await signer.signTypedData(domain, types, message);
    return ethers.Signature.from(rawSig);
  }

  beforeEach(async function () {
    [owner, gatekeeperSigner, attacker, unauthorizedSigner] = await ethers.getSigners();
    const network = await ethers.provider.getNetwork();
    chainId = network.chainId;

    const GatekeeperVault = await ethers.getContractFactory("GatekeeperVault");
    vault = await GatekeeperVault.deploy(gatekeeperSigner.address, {
      value: INITIAL_VAULT_FUNDING,
    });
    await vault.waitForDeployment();
    vaultAddress = await vault.getAddress();
  });

  describe("Deployment & Configuration", function () {
    it("should set the correct gatekeeperSigner and funding balance", async function () {
      expect(await vault.gatekeeperSigner()).to.equal(gatekeeperSigner.address);
      expect(await ethers.provider.getBalance(vaultAddress)).to.equal(INITIAL_VAULT_FUNDING);
      expect(await vault.MAX_CLAIM_AMOUNT()).to.equal(MAX_CLAIM_AMOUNT);
    });

    it("should reject deployment with zero address signer", async function () {
      const GatekeeperVault = await ethers.getContractFactory("GatekeeperVault");
      await expect(
        GatekeeperVault.deploy(ethers.ZeroAddress)
      ).to.be.revertedWithCustomError(GatekeeperVault, "ZeroSignerAddress");
    });
  });

  describe("Replay Protection & isNonceUsed", function () {
    it("should correctly report isNonceUsed before and after claim", async function () {
      const nonce = 1001n;
      expect(await vault.isNonceUsed(nonce)).to.equal(false);

      const amount = ethers.parseEther("0.02");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

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
      ).to.emit(vault, "FundsReleased").withArgs(attacker.address, amount, nonce);

      expect(await vault.isNonceUsed(nonce)).to.equal(true);
    });

    it("should revert if the same nonce is claimed a second time", async function () {
      const nonce = 1002n;
      const amount = ethers.parseEther("0.01");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

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

      // Second claim with same nonce must revert
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

    it("should revert if signed nonce does not match claim param nonce", async function () {
      const signedNonce = 2001n;
      const paramNonce = 2002n;
      const amount = ethers.parseEther("0.01");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount,
        nonce: signedNonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

      // Caller submits different nonce than what was signed
      await expect(
        vault.connect(attacker).claim(
          message.recipient,
          message.amount,
          paramNonce,
          message.deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });
  });

  describe("Amount Limits & Vault Balance", function () {
    it("should revert if amount > MAX_CLAIM_AMOUNT (0.05 ether)", async function () {
      const nonce = 3001n;
      const excessAmount = ethers.parseEther("0.051");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount: excessAmount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

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
      ).to.be.revertedWithCustomError(vault, "ExceedsMaxClaimAmount").withArgs(
        excessAmount,
        MAX_CLAIM_AMOUNT
      );
    });

    it("should revert if amount > vault balance", async function () {
      // Deploy a low balance vault (0.01 ether)
      const GatekeeperVault = await ethers.getContractFactory("GatekeeperVault");
      const lowVault = await GatekeeperVault.deploy(gatekeeperSigner.address, {
        value: ethers.parseEther("0.01"),
      });
      await lowVault.waitForDeployment();
      const lowVaultAddr = await lowVault.getAddress();

      const nonce = 3002n;
      const amount = ethers.parseEther("0.03"); // Under MAX_CLAIM_AMOUNT, but exceeds vault's 0.01 ETH
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const lowDomain = {
        name: "AI Gatekeeper Vault",
        version: "1",
        chainId,
        verifyingContract: lowVaultAddr,
      };

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message, lowDomain);

      await expect(
        lowVault.connect(attacker).claim(
          message.recipient,
          message.amount,
          message.nonce,
          message.deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(lowVault, "InsufficientVaultBalance");
    });
  });

  describe("Signature & Security Boundary Verification", function () {
    it("should revert if signature is from an unauthorized signer", async function () {
      const nonce = 4001n;
      const amount = ethers.parseEther("0.02");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      // Attacker signs for themselves instead of gatekeeperSigner
      const fakeSig = await createSignature(unauthorizedSigner, message);

      await expect(
        vault.connect(attacker).claim(
          message.recipient,
          message.amount,
          message.nonce,
          message.deadline,
          fakeSig.v,
          fakeSig.r,
          fakeSig.s
        )
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });

    it("should revert if claim amount is tampered from signed amount", async function () {
      const nonce = 4002n;
      const signedAmount = ethers.parseEther("0.01");
      const tamperedAmount = ethers.parseEther("0.03");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount: signedAmount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

      await expect(
        vault.connect(attacker).claim(
          message.recipient,
          tamperedAmount,
          message.nonce,
          message.deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });

    it("should revert if recipient is tampered from signed recipient", async function () {
      const nonce = 4003n;
      const amount = ethers.parseEther("0.01");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

      await expect(
        vault.connect(attacker).claim(
          owner.address, // Tampered recipient
          amount,
          nonce,
          deadline,
          sig.v,
          sig.r,
          sig.s
        )
      ).to.be.revertedWithCustomError(vault, "InvalidSignature");
    });

    it("should revert if signature is expired", async function () {
      const nonce = 4004n;
      const amount = ethers.parseEther("0.01");
      // Deadline in the past
      const expiredDeadline = BigInt(Math.floor(Date.now() / 1000) - 100);

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline: expiredDeadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

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

    it("should revert if signature was generated for another verifyingContract", async function () {
      const nonce = 4005n;
      const amount = ethers.parseEther("0.01");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const wrongDomain = getDomain(ethers.Wallet.createRandom().address);
      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message, wrongDomain);

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

    it("should revert if signature was generated for another chainId", async function () {
      const nonce = 4006n;
      const amount = ethers.parseEther("0.01");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const wrongDomain = getDomain(vaultAddress, 999999n);
      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message, wrongDomain);

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
  });

  describe("Deposit & Fund Transfer", function () {
    it("should accept direct deposits via deposit() and receive()", async function () {
      const depositAmount = ethers.parseEther("0.05");
      await expect(
        owner.sendTransaction({
          to: vaultAddress,
          value: depositAmount,
        })
      ).to.emit(vault, "VaultFunded").withArgs(owner.address, depositAmount);

      await expect(
        vault.connect(owner).deposit({ value: depositAmount })
      ).to.emit(vault, "VaultFunded").withArgs(owner.address, depositAmount);

      expect(await ethers.provider.getBalance(vaultAddress)).to.equal(
        INITIAL_VAULT_FUNDING + depositAmount * 2n
      );
    });

    it("should successfully transfer funds to attacker upon valid claim", async function () {
      const nonce = 5001n;
      const amount = ethers.parseEther("0.03");
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

      const message = {
        recipient: attacker.address,
        amount,
        nonce,
        deadline,
      };

      const sig = await createSignature(gatekeeperSigner, message);

      const initialAttackerBalance = await ethers.provider.getBalance(attacker.address);

      const tx = await vault.connect(attacker).claim(
        message.recipient,
        message.amount,
        message.nonce,
        message.deadline,
        sig.v,
        sig.r,
        sig.s
      );
      const receipt = await tx.wait();
      const gasSpent = receipt.gasUsed * receipt.gasPrice;

      const finalAttackerBalance = await ethers.provider.getBalance(attacker.address);
      expect(finalAttackerBalance).to.equal(
        initialAttackerBalance + amount - gasSpent
      );
    });
  });
});
