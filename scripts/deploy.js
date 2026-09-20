const { ethers, network } = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log(`\n======================================================`);
  console.log(` Deploying GatekeeperVault to network: ${network.name}`);
  console.log(`==============================================\n`);

  const signers = await ethers.getSigners();
  if (!signers || signers.length === 0) {
    throw new Error(
      `No accounts configured for network '${network.name}'. Please configure GATEKEEPER_PRIVATE_KEY in .env.`
    );
  }

  const deployer = signers[0];
  console.log(`Deployer address: ${deployer.address}`);

  const balance = await ethers.provider.getBalance(deployer.address);
  console.log(`Deployer balance: ${ethers.formatEther(balance)} ETH`);

  if (balance === 0n) {
    throw new Error(
      `Deployer account ${deployer.address} has 0 balance on ${network.name}. Please fund it with testnet ETH first.`
    );
  }

  // Gatekeeper signer address from env or fallback to deployer
  const gatekeeperSignerAddress =
    process.env.GATEKEEPER_SIGNER_ADDRESS || deployer.address;
  console.log(`Gatekeeper Signer: ${gatekeeperSignerAddress}`);

  // Safe initial funding: only fund if deployer has sufficient surplus beyond gas
  let initialFunding = 0n;
  if (process.env.INITIAL_VAULT_FUNDING) {
    initialFunding = ethers.parseEther(process.env.INITIAL_VAULT_FUNDING);
  } else if (balance > ethers.parseEther("0.02")) {
    initialFunding = ethers.parseEther("0.005");
  }

  console.log(`Initial Vault Funding: ${ethers.formatEther(initialFunding)} ETH`);

  const GatekeeperVault = await ethers.getContractFactory("GatekeeperVault");
  const vault = await GatekeeperVault.deploy(gatekeeperSignerAddress, {
    value: initialFunding,
  });

  await vault.waitForDeployment();
  const vaultAddress = await vault.getAddress();
  const deploymentTx = vault.deploymentTransaction();
  const deploymentTxHash = deploymentTx?.hash || "N/A";
  const chainId = (await ethers.provider.getNetwork()).chainId;

  console.log(`\n======================================================`);
  console.log(`[DEPLOYMENT SUCCESS]`);
  console.log(`NETWORK:            ${network.name}`);
  console.log(`CHAIN_ID:           ${chainId}`);
  console.log(`CONTRACT_ADDRESS:   ${vaultAddress}`);
  console.log(`DEPLOYMENT_TX_HASH: ${deploymentTxHash}`);

  let explorerBase = "";
  if (Number(chainId) === 11155111) {
    explorerBase = "https://sepolia.etherscan.io";
  } else if (Number(chainId) === 421614) {
    explorerBase = "https://sepolia.arbiscan.io";
  }

  if (explorerBase) {
    console.log(`Contract Explorer:  ${explorerBase}/address/${vaultAddress}`);
    console.log(`Tx Explorer:        ${explorerBase}/tx/${deploymentTxHash}`);
  }
  console.log(`======================================================\n`);

  // Save deployment artifact
  const deploymentDir = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  const deploymentData = {
    network: network.name,
    chainId: chainId.toString(),
    contractAddress: vaultAddress,
    gatekeeperSigner: gatekeeperSignerAddress,
    deployedAt: new Date().toISOString(),
    deploymentTxHash,
    explorerUrl: explorerBase ? `${explorerBase}/address/${vaultAddress}` : null,
  };

  const deploymentPath = path.join(deploymentDir, `${network.name}.json`);
  fs.writeFileSync(deploymentPath, JSON.stringify(deploymentData, null, 2));
  console.log(`Saved deployment info to: ${deploymentPath}\n`);
}

main().catch((error) => {
  console.error("\n[DEPLOYMENT FAILED]:", error.message || error);
  process.exitCode = 1;
});
