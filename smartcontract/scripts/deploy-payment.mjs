import { execFileSync } from "node:child_process";
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

const rpcUrl = process.env.TEMPO_RPC_URL;
const privateKey = normalizePrivateKey(process.env.PRIVATE_KEY);
const chainId = process.env.TEMPO_CHAIN_ID || "";
const network = process.env.NETWORK || "tempo";

if (!rpcUrl) {
  throw new Error("TEMPO_RPC_URL is required");
}

if (!privateKey) {
  throw new Error("PRIVATE_KEY is required");
}

run("forge", ["build"]);

const scriptArgs = [
  "script",
  "script/DeployPayment.s.sol:DeployPayment",
  "--rpc-url",
  rpcUrl,
  "--private-key",
  privateKey,
  "--broadcast",
  "--json"
];

const output = run("forge", scriptArgs);
const broadcastData = findBroadcastData();
const address = findDeployedAddress(output) || broadcastData.address;
const transactionHash = findTransactionHash(output) || broadcastData.transactionHash;
const artifact = readJson(path.join(smartcontractRoot, "out", "Payment.sol", "Payment.json"));

if (!address) {
  throw new Error(`Could not find deployed Payment address in forge output or broadcast files:\n${output}`);
}

const deployment = {
  contractName: "Payment",
  network,
  chainId,
  address,
  transactionHash,
  abi: artifact.abi,
  updatedAt: new Date().toISOString()
};

fs.mkdirSync(path.dirname(deploymentFile), { recursive: true });
fs.writeFileSync(deploymentFile, `${JSON.stringify(deployment, null, 2)}\n`);

console.log(`Payment deployed to: ${address}`);
console.log(`Deployment saved to: ${deploymentFile}`);

function run(command, args) {
  try {
    return execFileSync(command, args, {
      cwd: smartcontractRoot,
      env: process.env,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    });
  } catch (error) {
    const stdout = error.stdout?.toString() || "";
    const stderr = error.stderr?.toString() || "";
    throw new Error(`${command} ${args.join(" ")} failed\n${stdout}\n${stderr}`);
  }
}

function findDeployedAddress(output) {
  const jsonObjects = parseJsonObjects(output);

  for (const item of jsonObjects) {
    const address =
      item.deployedTo ||
      item.contractAddress ||
      item.address ||
      item?.returns?.payment?.value ||
      item?.logs?.find?.((log) => log?.address)?.address;

    if (isAddress(address)) {
      return address;
    }

    const receiptAddress = item?.transactions?.find?.((tx) => isAddress(tx?.contractAddress))
      ?.contractAddress;
    if (receiptAddress) {
      return receiptAddress;
    }
  }

  const textMatch = output.match(/(?:Deployed to|contractAddress|address)[^0-9a-fA-F]*(0x[0-9a-fA-F]{40})/);
  if (textMatch) {
    return textMatch[1];
  }

  return "";
}

function findTransactionHash(output) {
  const jsonObjects = parseJsonObjects(output);

  for (const item of jsonObjects) {
    const hash =
      item.transactionHash ||
      item.txHash ||
      item.hash ||
      item?.transactions?.find?.((tx) => isHash(tx?.hash))?.hash;

    if (isHash(hash)) {
      return hash;
    }
  }

  const textMatch = output.match(/0x[0-9a-fA-F]{64}/);
  return textMatch?.[0] || "";
}

function findBroadcastData() {
  const broadcastRoot = path.join(smartcontractRoot, "broadcast", "DeployPayment.s.sol");
  const candidates = findFiles(broadcastRoot, "run-latest.json");

  for (const file of candidates.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)) {
    const broadcast = readJson(file);
    const tx = broadcast.transactions?.find((transaction) =>
      transaction.contractName === "Payment" && isAddress(transaction.contractAddress)
    );

    if (tx) {
      return {
        address: tx.contractAddress,
        transactionHash: tx.hash || tx.transactionHash || ""
      };
    }
  }

  return {
    address: "",
    transactionHash: ""
  };
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

function parseJsonObjects(output) {
  const objects = [];

  for (const line of output.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed.startsWith("{") || !trimmed.endsWith("}")) {
      continue;
    }

    try {
      objects.push(JSON.parse(trimmed));
    } catch {
      // Forge can print non-JSON status lines even with --json.
    }
  }

  const whole = output.trim();
  if (whole.startsWith("{") && whole.endsWith("}")) {
    try {
      objects.push(JSON.parse(whole));
    } catch {
      // Handled by line parsing above.
    }
  }

  return objects;
}

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, "utf8"));
}

function isAddress(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{40}$/.test(value);
}

function isHash(value) {
  return typeof value === "string" && /^0x[0-9a-fA-F]{64}$/.test(value);
}

function normalizePrivateKey(value) {
  if (!value) {
    return "";
  }

  return value.startsWith("0x") ? value : `0x${value}`;
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
