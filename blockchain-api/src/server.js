import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { ethers } from "ethers";
import { getPaymentDeploymentFile, loadPaymentDeployment } from "./paymentAbi.js";

const {
  PORT = "3000",
  RPC_PATH = "/rpc",
  TEMPO_RPC_URL,
  PRIVATE_KEY
} = process.env;

const JSON_RPC_VERSION = "2.0";
const NATIVE_TOKEN = ethers.ZeroAddress;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

const ErrorCode = {
  PARSE_ERROR: -32700,
  INVALID_REQUEST: -32600,
  METHOD_NOT_FOUND: -32601,
  INVALID_PARAMS: -32602,
  INTERNAL_ERROR: -32603
};

if (!TEMPO_RPC_URL) {
  throw new Error("TEMPO_RPC_URL is required");
}

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir));

const provider = new ethers.JsonRpcProvider(TEMPO_RPC_URL);

let readPaymentContract;
let writePaymentContract;
let activeDeploymentKey;

function getPaymentDeployment() {
  const deployment = loadPaymentDeployment();

  if (!ethers.isAddress(deployment.address)) {
    throw rpcError(ErrorCode.INVALID_PARAMS, "Payment deployment address must be a valid address");
  }

  return deployment;
}

function getDeploymentKey(deployment) {
  return `${deployment.deploymentFile}:${deployment.address}:${deployment.updatedAt ?? ""}`;
}

function getReadPaymentContract() {
  const deployment = getPaymentDeployment();
  const deploymentKey = getDeploymentKey(deployment);

  if (readPaymentContract && activeDeploymentKey === deploymentKey) {
    return readPaymentContract;
  }

  readPaymentContract = new ethers.Contract(deployment.address, deployment.abi, provider);
  writePaymentContract = undefined;
  activeDeploymentKey = deploymentKey;
  return readPaymentContract;
}

function getWritePaymentContract() {
  const deployment = getPaymentDeployment();
  const deploymentKey = getDeploymentKey(deployment);

  if (writePaymentContract && activeDeploymentKey === deploymentKey) {
    return writePaymentContract;
  }

  if (!PRIVATE_KEY) {
    throw rpcError(
      ErrorCode.INVALID_PARAMS,
      "PRIVATE_KEY is required for payment methods"
    );
  }

  const privateKey = PRIVATE_KEY.startsWith("0x") ? PRIVATE_KEY : `0x${PRIVATE_KEY}`;
  const wallet = new ethers.Wallet(privateKey, provider);
  writePaymentContract = new ethers.Contract(deployment.address, deployment.abi, wallet);
  readPaymentContract = undefined;
  activeDeploymentKey = deploymentKey;

  return writePaymentContract;
}

app.get("/health", (_req, res) => {
  const deploymentStatus = getDeploymentStatus();

  res.json({
    ok: true,
    rpcPath: RPC_PATH,
    deployment: deploymentStatus
  });
});

app.post(RPC_PATH, async (req, res) => {
  const request = req.body;

  if (Array.isArray(request)) {
    if (request.length === 0) {
      return res.json(errorResponse(null, ErrorCode.INVALID_REQUEST, "Empty batch is invalid"));
    }

    const responses = (await Promise.all(request.map(handleJsonRpcRequest))).filter(Boolean);
    return responses.length > 0 ? res.json(responses) : res.status(204).send();
  }

  const response = await handleJsonRpcRequest(request);
  return response ? res.json(response) : res.status(204).send();
});

app.use((error, _req, res, _next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res
      .status(400)
      .json(errorResponse(null, ErrorCode.PARSE_ERROR, "Invalid JSON payload"));
  }

  console.error(error);
  return res
    .status(500)
    .json(errorResponse(null, ErrorCode.INTERNAL_ERROR, error.message || "Unexpected error"));
});

const server = app.listen(Number(PORT), () => {
  console.log(`JSON-RPC server listening on http://localhost:${PORT}${RPC_PATH}`);
});

server.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});

async function handleJsonRpcRequest(request) {
  if (!isJsonRpcRequest(request)) {
    return errorResponse(getRequestId(request), ErrorCode.INVALID_REQUEST, "Invalid JSON-RPC request");
  }

  const { id, method } = request;
  const isNotification = !Object.hasOwn(request, "id");

  try {
    const result = await callMethod(method, request.params);
    return isNotification ? null : successResponse(id, normalizeJson(result));
  } catch (error) {
    const normalizedError = toRpcError(error);
    return isNotification
      ? null
      : errorResponse(id, normalizedError.code, normalizedError.message, normalizedError.data);
  }
}

async function callMethod(method, params) {
  switch (method) {
    case "rpc_methods":
      return [
        "rpc_methods",
        "chain_getBlockNumber",
        "chain_getTransactionReceipt",
        "payment_getDeployment",
        "payment_pay",
        "payment_getPayment",
        "payment_estimatePayGas"
      ];
    case "chain_getBlockNumber":
      return provider.getBlockNumber();
    case "chain_getTransactionReceipt":
      return getTransactionReceipt(params);
    case "payment_getDeployment":
      return getPublicPaymentDeployment();
    case "payment_pay":
      return pay(params);
    case "payment_getPayment":
      return getPayment(params);
    case "payment_estimatePayGas":
      return estimatePayGas(params);
    default:
      throw rpcError(ErrorCode.METHOD_NOT_FOUND, `Method not found: ${method}`);
  }
}

function getPublicPaymentDeployment() {
  const deployment = getPaymentDeployment();

  return {
    contractName: deployment.contractName,
    network: deployment.network,
    chainId: deployment.chainId,
    address: deployment.address,
    transactionHash: deployment.transactionHash,
    deploymentFile: deployment.deploymentFile,
    updatedAt: deployment.updatedAt,
    abiLength: deployment.abi.length
  };
}

function getDeploymentStatus() {
  try {
    const deployment = getPublicPaymentDeployment();
    return {
      ok: true,
      ...deployment
    };
  } catch (error) {
    return {
      ok: false,
      deploymentFile: getPaymentDeploymentFile(),
      error: error.message
    };
  }
}

async function pay(params) {
  const { token, recipient, amount, memo, native } = parsePaymentParams(params);
  const payment = getWritePaymentContract();
  const value = native ? amount : 0n;

  const tx = await payment.pay(token, recipient, amount, memo, { value });
  const receipt = await tx.wait();
  const event = findPaymentCompletedEvent(receipt);

  return {
    hash: tx.hash,
    blockNumber: receipt.blockNumber,
    paymentId: event?.paymentId ?? null,
    payer: event?.payer ?? null,
    token,
    recipient,
    amount
  };
}

async function getPayment(params) {
  const { paymentId } = parseObjectParams(params, ["paymentId"]);
  const id = parseUint(paymentId, "paymentId");
  const payment = getReadPaymentContract();
  const record = await payment.getPayment(id);

  return {
    payer: record.payer,
    token: record.token,
    recipient: record.recipient,
    amount: record.amount,
    memo: record.memo,
    paidAt: record.paidAt
  };
}

async function estimatePayGas(params) {
  const { token, recipient, amount, memo, native } = parsePaymentParams(params);
  const payment = getWritePaymentContract();
  const value = native ? amount : 0n;

  return payment.pay.estimateGas(token, recipient, amount, memo, { value });
}

async function getTransactionReceipt(params) {
  const { hash } = parseObjectParams(params, ["hash"]);

  if (!ethers.isHexString(hash, 32)) {
    throw rpcError(ErrorCode.INVALID_PARAMS, "hash must be a 32-byte transaction hash");
  }

  const receipt = await provider.getTransactionReceipt(hash);
  if (!receipt) {
    return null;
  }

  return {
    hash: receipt.hash,
    blockHash: receipt.blockHash,
    blockNumber: receipt.blockNumber,
    from: receipt.from,
    to: receipt.to,
    status: receipt.status,
    gasUsed: receipt.gasUsed,
    cumulativeGasUsed: receipt.cumulativeGasUsed
  };
}

function parsePaymentParams(params) {
  const { token = NATIVE_TOKEN, recipient, amount, memo = "", native = false } =
    parseObjectParams(params, ["recipient", "amount"]);

  if (!ethers.isAddress(token)) {
    throw rpcError(ErrorCode.INVALID_PARAMS, "token must be a valid address");
  }

  if (!ethers.isAddress(recipient)) {
    throw rpcError(ErrorCode.INVALID_PARAMS, "recipient must be a valid address");
  }

  if (typeof memo !== "string") {
    throw rpcError(ErrorCode.INVALID_PARAMS, "memo must be a string");
  }

  const parsedAmount = parseUint(amount, "amount");
  const isNative = native || token === NATIVE_TOKEN;

  return {
    token,
    recipient,
    amount: parsedAmount,
    memo,
    native: isNative
  };
}

function parseObjectParams(params, requiredKeys) {
  if (!params || Array.isArray(params) || typeof params !== "object") {
    throw rpcError(ErrorCode.INVALID_PARAMS, "params must be an object");
  }

  for (const key of requiredKeys) {
    if (!Object.hasOwn(params, key)) {
      throw rpcError(ErrorCode.INVALID_PARAMS, `Missing required param: ${key}`);
    }
  }

  return params;
}

function parseUint(value, name) {
  try {
    const parsed = BigInt(value);
    if (parsed <= 0n) {
      throw new Error("must be positive");
    }
    return parsed;
  } catch {
    throw rpcError(ErrorCode.INVALID_PARAMS, `${name} must be a positive uint value`);
  }
}

function findPaymentCompletedEvent(receipt) {
  const payment = getWritePaymentContract();

  for (const log of receipt.logs) {
    try {
      const parsed = payment.interface.parseLog(log);
      if (parsed?.name === "PaymentCompleted") {
        return {
          paymentId: parsed.args.paymentId,
          payer: parsed.args.payer
        };
      }
    } catch {
      // Ignore logs emitted by other contracts in the same transaction.
    }
  }

  return null;
}

function isJsonRpcRequest(request) {
  return (
    request &&
    typeof request === "object" &&
    !Array.isArray(request) &&
    request.jsonrpc === JSON_RPC_VERSION &&
    typeof request.method === "string" &&
    (!Object.hasOwn(request, "params") ||
      Array.isArray(request.params) ||
      typeof request.params === "object") &&
    (!Object.hasOwn(request, "id") ||
      typeof request.id === "string" ||
      typeof request.id === "number" ||
      request.id === null)
  );
}

function successResponse(id, result) {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    result
  };
}

function errorResponse(id, code, message, data) {
  return {
    jsonrpc: JSON_RPC_VERSION,
    id,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data })
    }
  };
}

function rpcError(code, message, data) {
  const error = new Error(message);
  error.code = code;
  error.data = data;
  return error;
}

function toRpcError(error) {
  if (typeof error?.code === "number") {
    return error;
  }

  return rpcError(ErrorCode.INTERNAL_ERROR, error?.shortMessage || error?.message || "Internal error");
}

function getRequestId(request) {
  if (request && typeof request === "object" && Object.hasOwn(request, "id")) {
    return request.id;
  }

  return null;
}

function normalizeJson(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (Array.isArray(value)) {
    return value.map(normalizeJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, normalizeJson(entry)])
    );
  }

  return value;
}
