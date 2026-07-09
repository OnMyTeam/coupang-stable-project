const state = {
  id: 1,
  history: []
};

const endpointInput = document.querySelector("#rpc-endpoint");
const responseTitle = document.querySelector("#response-title");
const responseBadge = document.querySelector("#response-badge");
const responseOutput = document.querySelector("#response-output");
const historyList = document.querySelector("#history-list");
const rawPayload = document.querySelector("#raw-payload");

endpointInput.value = `${window.location.origin}/rpc`;
rawPayload.value = pretty({
  jsonrpc: "2.0",
  id: state.id,
  method: "payment_getDeployment"
});

document.querySelector("#health-button").addEventListener("click", checkHealth);
document.querySelector("#block-button").addEventListener("click", getBlockNumber);
document.querySelector("#methods-button").addEventListener("click", getMethods);
document.querySelector("#clear-history-button").addEventListener("click", clearHistory);
document.querySelector("#format-raw-button").addEventListener("click", formatRawPayload);

document.querySelector("#raw-panel").addEventListener("submit", async (event) => {
  event.preventDefault();
  await sendRaw();
});

renderHistory();

async function checkHealth() {
  const startedAt = performance.now();
  setQuickStatus("#health-status", "Checking");

  try {
    const response = await fetch(`${window.location.origin}/health`);
    const data = await response.json();
    const elapsed = Math.round(performance.now() - startedAt);
    setQuickStatus("#health-status", response.ok ? `${elapsed} ms` : "Error");
    showResponse("Health", data, response.ok);
    addHistory("GET /health", response.ok, data);
  } catch (error) {
    setQuickStatus("#health-status", "Error");
    showResponse("Health", toErrorBody(error), false);
    addHistory("GET /health", false, error.message);
  }
}

async function getBlockNumber() {
  const response = await callRpc("chain_getBlockNumber");
  if (response?.result !== undefined) {
    setQuickStatus("#block-number", `#${response.result}`);
  }
}

async function getMethods() {
  const response = await callRpc("rpc_methods");
  if (Array.isArray(response?.result)) {
    setQuickStatus("#method-count", `${response.result.length} methods`);
  }
}

async function sendRaw() {
  try {
    const payload = JSON.parse(rawPayload.value);
    const response = await postJson(endpointInput.value, payload);
    const ok = !hasRpcError(response);
    showResponse("Raw", response, ok);
    addHistory(Array.isArray(payload) ? "batch" : payload.method || "raw", ok, response);
  } catch (error) {
    showResponse("Raw", toErrorBody(error), false);
    addHistory("raw", false, error.message);
  }
}

function formatRawPayload() {
  try {
    rawPayload.value = pretty(JSON.parse(rawPayload.value));
  } catch (error) {
    showResponse("Format", toErrorBody(error), false);
  }
}

async function callRpc(method, params) {
  const payload = {
    jsonrpc: "2.0",
    id: state.id++,
    method,
    ...(params === undefined ? {} : { params })
  };

  responseTitle.textContent = method;
  setBadge("Loading", "");
  responseOutput.textContent = pretty(payload);

  try {
    const response = await postJson(endpointInput.value, payload);
    const ok = !response.error;
    showResponse(method, response, ok);
    addHistory(method, ok, response);
    return response;
  } catch (error) {
    const body = toErrorBody(error);
    showResponse(method, body, false);
    addHistory(method, false, error.message);
    return null;
  }
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function showResponse(title, body, ok) {
  responseTitle.textContent = title;
  setBadge(ok ? "OK" : "Error", ok ? "ok" : "error");
  responseOutput.textContent = pretty(body);
}

function setBadge(text, className) {
  responseBadge.textContent = text;
  responseBadge.className = `badge ${className}`.trim();
}

function addHistory(method, ok, body) {
  state.history.unshift({
    method,
    ok,
    body,
    time: new Date().toLocaleTimeString()
  });
  state.history = state.history.slice(0, 8);
  renderHistory();
}

function renderHistory() {
  if (state.history.length === 0) {
    historyList.innerHTML = '<div class="history-empty">No requests yet</div>';
    return;
  }

  historyList.innerHTML = state.history
    .map(
      (item, index) => `
        <button class="history-item" type="button" data-history-index="${index}">
          <span class="history-method">${escapeHtml(item.method)}</span>
          <span>${escapeHtml(summary(item.body))}</span>
          <span class="history-status ${item.ok ? "ok" : "error"}">${item.ok ? "OK" : "Error"} ${escapeHtml(item.time)}</span>
        </button>
      `
    )
    .join("");

  historyList.querySelectorAll(".history-item").forEach((item) => {
    item.addEventListener("click", () => {
      const historyItem = state.history[Number(item.dataset.historyIndex)];
      showResponse(historyItem.method, historyItem.body, historyItem.ok);
    });
  });
}

function clearHistory() {
  state.history = [];
  renderHistory();
}

function summary(body) {
  if (body?.result?.hash) {
    return body.result.hash;
  }

  if (body?.result?.paymentId) {
    return `paymentId ${body.result.paymentId}`;
  }

  if (body?.error?.message) {
    return body.error.message;
  }

  if (body?.result !== undefined) {
    return JSON.stringify(body.result).slice(0, 90);
  }

  return String(body).slice(0, 90);
}

function hasRpcError(response) {
  if (Array.isArray(response)) {
    return response.some((entry) => entry?.error);
  }

  return Boolean(response?.error);
}

function setQuickStatus(selector, value) {
  document.querySelector(selector).textContent = value;
}

function pretty(value) {
  return JSON.stringify(value, null, 2);
}

function toErrorBody(error) {
  return {
    error: {
      message: error.message || "Unexpected error"
    }
  };
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
