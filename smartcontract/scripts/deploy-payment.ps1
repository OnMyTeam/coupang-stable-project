param(
    [string]$RpcUrl = $env:TEMPO_RPC_URL,
    [string]$PrivateKey = $env:PRIVATE_KEY,
    [string]$Network = "tempo",
    [string]$DeploymentFile
)

$ErrorActionPreference = "Stop"

$smartcontractRoot = Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..")
$projectRoot = Resolve-Path -LiteralPath (Join-Path $smartcontractRoot "..")

if (-not $DeploymentFile) {
    $DeploymentFile = Join-Path $projectRoot "blockchain-api\deployments\payment.json"
}

if (-not $RpcUrl) {
    throw "TEMPO_RPC_URL is required. Set it in the environment or pass -RpcUrl."
}

if (-not $PrivateKey) {
    throw "PRIVATE_KEY is required. Set it in the environment or pass -PrivateKey."
}

Set-Location $smartcontractRoot

Write-Host "Building Payment contract..."
& forge build
if ($LASTEXITCODE -ne 0) {
    throw "forge build failed."
}

Write-Host "Deploying Payment contract to $Network..."
$createOutput = & forge create "src/Payment.sol:Payment" `
    --rpc-url $RpcUrl `
    --private-key $PrivateKey `
    --json 2>&1

if ($LASTEXITCODE -ne 0) {
    $message = $createOutput | Out-String
    throw "forge create failed. $message"
}

$createText = ($createOutput | Out-String).Trim()
$jsonStart = $createText.IndexOf("{")
$jsonEnd = $createText.LastIndexOf("}")

if ($jsonStart -lt 0 -or $jsonEnd -lt $jsonStart) {
    throw "forge create did not return JSON output: $createText"
}

$createJson = $createText.Substring($jsonStart, $jsonEnd - $jsonStart + 1) | ConvertFrom-Json

$address = $createJson.deployedTo
if (-not $address) {
    $address = $createJson.contractAddress
}
if (-not $address) {
    $address = $createJson.address
}
if (-not $address) {
    throw "Could not find deployed address in forge output: $createText"
}

$transactionHash = $createJson.transactionHash
if (-not $transactionHash) {
    $transactionHash = $createJson.txHash
}

$artifactFile = Join-Path $smartcontractRoot "out\Payment.sol\Payment.json"
if (-not (Test-Path -LiteralPath $artifactFile)) {
    throw "Payment artifact not found: $artifactFile"
}

$artifact = Get-Content -LiteralPath $artifactFile -Raw | ConvertFrom-Json
$chainId = $env:TEMPO_CHAIN_ID

$deployment = [ordered]@{
    contractName = "Payment"
    network = $Network
    chainId = $chainId
    address = $address
    transactionHash = $transactionHash
    abi = $artifact.abi
    updatedAt = (Get-Date).ToUniversalTime().ToString("o")
}

$deploymentDir = Split-Path -Parent $DeploymentFile
New-Item -ItemType Directory -Force -Path $deploymentDir | Out-Null

$deployment | ConvertTo-Json -Depth 100 | Set-Content -LiteralPath $DeploymentFile -Encoding UTF8

Write-Host "Payment deployment saved to $DeploymentFile"
Write-Host "Payment address: $address"
