import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultDeploymentFile = path.resolve(__dirname, "../deployments/payment.json");

let cachedDeployment;
let cachedMtimeMs;

export function getPaymentDeploymentFile() {
  const configuredPath = process.env.PAYMENT_DEPLOYMENT_FILE;

  if (!configuredPath) {
    return defaultDeploymentFile;
  }

  return path.isAbsolute(configuredPath)
    ? configuredPath
    : path.resolve(process.cwd(), configuredPath);
}

export function loadPaymentDeployment() {
  const deploymentFile = getPaymentDeploymentFile();

  if (!fs.existsSync(deploymentFile)) {
    throw new Error(`Payment deployment file does not exist: ${deploymentFile}`);
  }

  const stat = fs.statSync(deploymentFile);
  if (cachedDeployment && cachedMtimeMs === stat.mtimeMs) {
    return cachedDeployment;
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

  if (!deployment.address || !Array.isArray(deployment.abi)) {
    throw new Error(`Payment deployment file must include address and abi: ${deploymentFile}`);
  }

  cachedDeployment = {
    ...deployment,
    deploymentFile
  };
  cachedMtimeMs = stat.mtimeMs;

  return cachedDeployment;
}
