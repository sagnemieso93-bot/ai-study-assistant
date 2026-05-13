// popup.js — Extension popup logic

document.addEventListener("DOMContentLoaded", () => {
  const apiInput = document.getElementById("api-key-input");
  const saveBtn = document.getElementById("save-btn");
  const clearBtn = document.getElementById("clear-key-btn");
  const openLeetCodeBtn = document.getElementById("open-leetcode-btn");
  const toggleVisibility = document.getElementById("toggle-visibility");
  const toast = document.getElementById("toast");
  const statusDot = document.getElementById("status-dot");
  const statusText = document.getElementById("status-text");

  let isVisible = false;

  // ── Load existing key on open ──────────────────────────────────────────
  chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (res) => {
    if (res?.key) {
      apiInput.value = res.key;
      setStatus("active", "API key configured ✓");
    } else {
      setStatus("none", "No API key set");
    }
  });

  // ── Toggle key visibility ──────────────────────────────────────────────
  toggleVisibility.addEventListener("click", () => {
    isVisible = !isVisible;
    apiInput.type = isVisible ? "text" : "password";
    toggleVisibility.textContent = isVisible ? "🙈" : "👁";
  });

  // ── Save API key ───────────────────────────────────────────────────────
  saveBtn.addEventListener("click", () => {
    const key = apiInput.value.trim();

    if (!key) {
      showToast("error", "⚠️ Please enter an API key");
      return;
    }

    if (!key.startsWith("gsk_")) {
      showToast("error", "⚠️ Groq API keys start with gsk_");
      return;
    }

    chrome.runtime.sendMessage({ type: "SAVE_API_KEY", key }, (res) => {
      if (res?.success) {
        showToast("success", "✓ API key saved securely");
        setStatus("active", "API key configured ✓");
      } else {
        showToast("error", "❌ Failed to save key");
      }
    });
  });

  // ── Clear API key ──────────────────────────────────────────────────────
  clearBtn.addEventListener("click", () => {
    if (!confirm("Remove your API key? You'll need to re-enter it to use the assistant.")) return;

    chrome.storage.local.remove("groqApiKey", () => {
      apiInput.value = "";
      showToast("success", "✓ API key removed");
      setStatus("error", "No API key set");
    });
  });

  // ── Open LeetCode ──────────────────────────────────────────────────────
  openLeetCodeBtn.addEventListener("click", () => {
    chrome.tabs.create({ url: "https://leetcode.com/problemset/" });
  });

  // ── Allow Enter key to save ────────────────────────────────────────────
  apiInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveBtn.click();
  });

  // ── Helpers ───────────────────────────────────────────────────────────
  function showToast(type, message) {
    toast.className = `toast show ${type}`;
    toast.textContent = message;
    setTimeout(() => { toast.className = "toast"; }, 3000);
  }

  function setStatus(state, message) {
    statusText.textContent = message;
    statusDot.className = "status-dot";
    if (state === "active") statusDot.classList.add("active");
    else if (state === "error") statusDot.classList.add("error");
  }
});
