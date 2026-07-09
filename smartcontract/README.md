# Coupang Stable Smart Contracts

Foundry workspace for Tempo-compatible EVM payment contracts.

## Structure

- `src/Payment.sol`: payment contract with the `pay` function
- `test/Payment.t.sol`: Foundry tests without external dependencies
- `script/DeployPayment.s.sol`: minimal deployment script contract
- `foundry.toml`: Foundry configuration

## Payment.pay

```solidity
function pay(
    address token,
    address recipient,
    uint256 amount,
    string calldata memo
) external payable returns (uint256 paymentId);
```

Use `token = address(0)` and send `msg.value = amount` for native-token payments.
Use an ERC-20 stablecoin token address after approving this contract for `amount`.

## Commands

Install Foundry first if `forge` is not available:

```bash
curl -L https://foundry.paradigm.xyz | bash
foundryup
```

Then run:

```bash
forge fmt
forge build
forge test
```

Tempo deployment example:

```bash
node scripts/deploy-payment.mjs
```

If you already ran `forge script` directly, sync the latest Foundry broadcast into the shared deployment file:

```bash
node scripts/sync-payment-deployment.mjs
```

The deployment script writes the latest Payment ABI and address to:

```text
..\blockchain-api\deployments\payment.json
```

`blockchain-api` reads `deployments/payment.json` from its own project directory, so redeploying `Payment` updates the API target without changing API code.
