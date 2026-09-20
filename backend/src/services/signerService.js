const { privateKeyToAccount } = require("viem/accounts");
const { parseSignature, isAddress } = require("viem");
const config = require("../config");
const { logEvent } = require("../utils/logger");

const EIP712_DOMAIN_NAME = "AI Gatekeeper Vault";
const EIP712_DOMAIN_VERSION = "1";

const CLAIM_TYPES = {
  ClaimAuthorization: [
    { name: "recipient", type: "address" },
    { name: "amount", type: "uint256" },
    { name: "nonce", type: "uint256" },
    { name: "deadline", type: "uint256" },
  ],
};

let _account = null;

function getSignerAccount() {
  if (_account) return _account;

  if (!config.gatekeeperPrivateKey) {
    throw new Error("GATEKEEPER_PRIVATE_KEY is not configured in environment.");
  }

  let formattedKey = config.gatekeeperPrivateKey.trim();
  if (!formattedKey.startsWith("0x")) {
    formattedKey = `0x${formattedKey}`;
  }

  _account = privateKeyToAccount(formattedKey);
  return _account;
}

function getSignerAddress() {
  return getSignerAccount().address;
}

/**
 * Signs an EIP-712 ClaimAuthorization tuple strictly.
 * Cannot sign arbitrary data or transactions.
 */
async function signClaimAuthorization({ recipient, amount, nonce, deadline }) {
  if (!isAddress(recipient)) {
    throw new Error(`Invalid recipient address: ${recipient}`);
  }
  if (!config.vaultAddress || !isAddress(config.vaultAddress)) {
    throw new Error(`Invalid or missing vaultAddress: ${config.vaultAddress}`);
  }

  const account = getSignerAccount();

  const domain = {
    name: EIP712_DOMAIN_NAME,
    version: EIP712_DOMAIN_VERSION,
    chainId: BigInt(config.chainId),
    verifyingContract: config.vaultAddress,
  };

  const message = {
    recipient,
    amount: BigInt(amount),
    nonce: BigInt(nonce),
    deadline: BigInt(deadline),
  };

  logEvent("SIGNER_SIGNING_REQUEST", {
    recipient,
    amount: amount.toString(),
    nonce: nonce.toString(),
    deadline: deadline.toString(),
    verifyingContract: config.vaultAddress,
    chainId: config.chainId,
    signerAddress: account.address,
  });

  const rawSignature = await account.signTypedData({
    domain,
    types: CLAIM_TYPES,
    primaryType: "ClaimAuthorization",
    message,
  });

  const parsed = parseSignature(rawSignature);

  logEvent("SIGNER_SIGNATURE_GENERATED", {
    recipient,
    nonce: nonce.toString(),
    v: Number(parsed.v),
    r: `${parsed.r.slice(0, 10)}...[MASKED]`,
    s: `${parsed.s.slice(0, 10)}...[MASKED]`,
  });

  return {
    rawSignature,
    v: Number(parsed.v),
    r: parsed.r,
    s: parsed.s,
    domain,
    message: {
      recipient,
      amount: amount.toString(),
      nonce: nonce.toString(),
      deadline: deadline.toString(),
    },
  };
}

module.exports = {
  getSignerAccount,
  getSignerAddress,
  signClaimAuthorization,
  EIP712_DOMAIN_NAME,
  EIP712_DOMAIN_VERSION,
  CLAIM_TYPES,
};
