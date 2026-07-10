import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const deployment = readJson("deployments/payment.json");
const server = readText("src/server.js");
const html = readText("public/index.html");
const app = readText("public/app.js");

assert(Array.isArray(deployment.abi), "payment.json must include an abi array");
assert(hasAbiEntry("function", "pay"), "payment.json must include pay(address,address,uint256)");
assert(hasAbiEntry("event", "PaymentCompleted"), "payment.json must include PaymentCompleted event");
assert(hasAbiEntry("error", "InvalidToken"), "payment.json must include InvalidToken error");
assert(hasAbiEntry("error", "InvalidRecipient"), "payment.json must include InvalidRecipient error");
assert(hasAbiEntry("error", "InvalidAmount"), "payment.json must include InvalidAmount error");
assert(hasAbiEntry("error", "TransferFailed"), "payment.json must include TransferFailed error");

assert(server.includes('"payment_pay"'), "server.js must expose payment_pay");
assert(server.includes("contract.pay(token, recipient, parsedAmount)"), "server.js must call Payment.pay");

assert(html.includes('id="payment-form"'), "index.html must include payment form");
assert(html.includes('id="payment-token"'), "index.html must include token input");
assert(html.includes('id="payment-recipient"'), "index.html must include recipient input");
assert(html.includes('id="payment-amount"'), "index.html must include amount input");
assert(app.includes('callRpc("payment_pay"'), "app.js must submit payment_pay");

console.log("Payment API validation OK");

function hasAbiEntry(type, name) {
  return deployment.abi.some((entry) => entry.type === type && entry.name === name);
}

function readJson(relativePath) {
  return JSON.parse(readText(relativePath));
}

function readText(relativePath) {
  return fs.readFileSync(path.join(root, relativePath), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}
