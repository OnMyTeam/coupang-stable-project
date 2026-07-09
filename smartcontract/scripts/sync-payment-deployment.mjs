import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const smartcontractRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(smartcontractRoot, "..");

loadEnvFile(path.join(smartcontractRoot, ".env"));

const deploymentFile = path.resolve(
  process.env.PAYMENT_DEPLOYMENT_FILE ||
    path.join(projectRoot, "blockchain-api", "deployments", "payment.json")
);
const network = process.env.NETWORK || "tempo";

const broadcast = findLatestPaymentBroadcast();
const artifact = readJson(path.join(smartcontractRoot, "out", "Payment.sol", "Payment.json"));

const deployment = {
  contractName: "Payment",
  network,
  chainId: String(broadcast.chain || process.env.TEMPO_CHAIN_ID || ""),
  address: broadcast.address,
  transactionHash: broadcast.transactionHash,
  abi: artifact.abi,
  updatedAt: new Date().toISOString()
};

fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
fs.writeFileSync(deploymentFile, `${JSON.stringify(deployment, null, 2)}\n`);

console.log(`Payment deployment synced from: ${broadcast.file}`);
console.log(`Payment deployed to: ${deployment.address}`);
console.log(`Deployment saved to: ${deploymentFile}`);

function findLatestPaymentBroadcast() {
  const broadcastRoot = path.join(smartcontractRoot, "broadcast", "DeployPayment.s.sol");
  const candidates = findFiles(broadcastRoot, "run-latest.json").sort(
    (a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs
  );

  for (const file of candidates) {
    const broadcast = readJson(file);
    const transaction = broadcast.transactions?.find(
      (item) => item.contractName === "Payment" && isAddress(item.contractAddress)
    );
    const receipt = broadcast.receipts?.find((item) => isAddress(item.contractAddress));
    const returnedAddress = broadcast.returns?.payment?.value;
    const address = transaction?.contractAddress || receipt?.contractAddress || returnedAddress;

    if (isAddress(address)) {
      return {
        file,
        chain: broadcast.chain,
        address,
        transactionHash: transaction?.hash || receipt?.transactionHash || ""
      };
    }
  }

  throw new Error(`No Payment deployment found under ${broadcastRoot}`);
}

function findFiles(root, fileName) {
  if (!fs.existsSync(root)) {
    return [];
  }

  const found = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const fullPath = path.join(root, entry.name);

    if (entry.isDirectory()) {
      found.push(...findFiles(fullPath, fileName));
    } else if (entry.isFile() && entry.name === fileName) {
      found.push(fullPath);
    }
  }

  return found;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function isAddress(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function loadEnvFile(file) {
  if (!fs.existsSync(file)) {
    return;
  }

  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex < 1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^['"]|['"]$/g, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}
