# Coupang Stable Blockchain API

Node.js JSON-RPC 2.0 server for calling the `Payment` contract on a Tempo-compatible EVM network.

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

Set these values in `.env`:

- `PORT`: local server port, defaults to `3000`
- `RPC_PATH`: JSON-RPC endpoint path, defaults to `/rpc`
- `TEMPO_RPC_URL`: Tempo RPC endpoint
- `PAYMENT_DEPLOYMENT_FILE`: Payment deployment JSON, defaults to `deployments/payment.json`
- `PRIVATE_KEY`: signer private key, with or without `0x`

`Payment` ABI and deployed address are loaded from the deployment file. The API reloads that file when it changes, so a new contract deployment does not require editing API source code.

## Health Check

```http
GET /health
```

## Browser UI

```text
http://localhost:3000/
```

## JSON-RPC Methods

- `rpc_methods`
- `chain_getBlockNumber`
- `chain_getTransactionReceipt`
- `payment_getDeployment`
- `payment_pay`
- `payment_getPayment`
- `payment_estimatePayGas`

## Examples

List supported methods:

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"rpc_methods"}'
```

Send a native-token payment:

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 2,
    "method": "payment_pay",
    "params": {
      "token": "0x0000000000000000000000000000000000000000",
      "recipient": "0xRecipient",
      "amount": "1000000000000000000",
      "memo": "order-1001",
      "native": true
    }
  }'
```

Send an ERC-20 stablecoin payment:

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 3,
    "method": "payment_pay",
    "params": {
      "token": "0xToken",
      "recipient": "0xRecipient",
      "amount": "25000000",
      "memo": "order-1002"
    }
  }'
```

Read a payment record:

```bash
curl -X POST http://localhost:3000/rpc \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "id": 4,
    "method": "payment_getPayment",
    "params": {
      "paymentId": "1"
    }
  }'
```
