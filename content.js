// content.js — Runs on LeetCode problem pages
// Responsibilities: scrape problem data, inject sidebar UI, manage chat state.

(function () {
  "use strict";

  // ── Guard: only inject once ──────────────────────────────────────────────
  if (document.getElementById("asa-sidebar")) return;

  // ── State ────────────────────────────────────────────────────────────────
  let problemData = null;
  let conversationHistory = [];
  let isLoading = false;
  let currentHintLevel = 0;
  let sidebarVisible = false;

  // ── Wait for page to fully render (LeetCode is React-heavy) ──────────────
  const initDelay = 2000;
  setTimeout(init, initDelay);

  function init() {
    problemData = extractProblemData();
    injectSidebar();
    injectToggleButton();
  }

  // ── Problem Data Extraction ───────────────────────────────────────────────
  function extractProblemData() {
    const data = { title: "", difficulty: "", description: "", examples: "", constraints: "" };

    // Title — try multiple selectors for resilience
    const titleSelectors = [
      '[data-cy="question-title"]',
      ".text-title-large a",
      "div[class*='title'] a",
      "h4 a",
      ".css-v3d350",
      '[class*="question-title"]',
    ];
    for (const sel of titleSelectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) { data.title = el.textContent.trim(); break; }
    }

    // Fallback: grab from page <title>
    if (!data.title) {
      const pageTitle = document.title;
      const match = pageTitle.match(/^(.+?)\s*-\s*LeetCode/);
      if (match) data.title = match[1].trim();
    }

    // Difficulty
    const diffSelectors = [
      '[diff]',
      '.css-10o4wqw',
      '[class*="difficulty"]',
      'div[class*="Difficulty"]',
    ];
    for (const sel of diffSelectors) {
      const el = document.querySelector(sel);
      if (el?.textContent?.trim()) {
        const text = el.textContent.trim();
        if (/easy|medium|hard/i.test(text)) { data.difficulty = text; break; }
      }
    }

    // Problem description content area
    const descSelectors = [
      '[data-track-load="description_content"]',
      ".xFUwe",
      '[class*="question-content"]',
      ".content__u3I1",
      "div.description__24sA",
      '[class*="description"]',
    ];

    let descEl = null;
    for (const sel of descSelectors) {
      descEl = document.querySelector(sel);
      if (descEl) break;
    }

    if (descEl) {
      const fullText = descEl.innerText || descEl.textContent || "";

      // Extract examples block
      const exampleMatch = fullText.match(/Example\s*\d*[\s\S]*?(?=Constraints:|$)/i);
      if (exampleMatch) data.examples = exampleMatch[0].trim().substring(0, 1500);

      // Extract constraints block
      const constraintMatch = fullText.match(/Constraints:[\s\S]*$/i);
      if (constraintMatch) data.constraints = constraintMatch[0].trim().substring(0, 800);

      // Description = everything before first Example
      const descMatch = fullText.match(/^[\s\S]*?(?=Example\s*\d*:|$)/i);
      if (descMatch) data.description = descMatch[0].trim().substring(0, 2000);
      else data.description = fullText.substring(0, 2000);
    }

    return data;
  }

  // ── Sidebar HTML ─────────────────────────────────────────────────────────
  function injectSidebar() {
    const sidebar = document.createElement("div");
    sidebar.id = "asa-sidebar";
    sidebar.className = "asa-sidebar asa-hidden";
    sidebar.innerHTML = `
      <div class="asa-header">
        <div class="asa-header-left">
          <div class="asa-logo">
            <span class="asa-logo-icon">⚡</span>
            <span class="asa-logo-text">CodeSensei</span>
          </div>
          <div class="asa-problem-badge" id="asa-problem-badge">Loading…</div>
        </div>
        <button class="asa-close-btn" id="asa-close-btn" title="Close panel">✕</button>
      </div>

      <div class="asa-api-warning" id="asa-api-warning" style="display:none;">
        <span>⚠️ No API key set.</span>
        <button class="asa-link-btn" id="asa-open-popup-btn">Configure →</button>
      </div>

      <div class="asa-chat-area" id="asa-chat-area">
        <div class="asa-welcome">
          <div class="asa-welcome-icon">🎓</div>
          <h3>Ready to learn?</h3>
          <p>Click <strong>Analyze Problem</strong> to start, or jump straight to a hint!</p>
        </div>
      </div>

      <div class="asa-input-area">
        <div class="asa-btn-grid">
          <button class="asa-btn asa-btn-primary" id="asa-btn-analyze">
            <span>🔍</span> Analyze Problem
          </button>
          <button class="asa-btn asa-btn-hint" id="asa-btn-hint1">
            <span>💡</span> Get Hint
          </button>
          <button class="asa-btn asa-btn-hint" id="asa-btn-hint2">
            <span>🔦</span> Deeper Hint
          </button>
          <button class="asa-btn asa-btn-hint" id="asa-btn-hint3">
            <span>🗺️</span> Full Hint
          </button>
          <button class="asa-btn asa-btn-solution" id="asa-btn-solution">
            <span>✅</span> Show Solution
          </button>
          <button class="asa-btn asa-btn-refresh" id="asa-btn-refresh">
            <span>🔄</span> Refresh Data
          </button>
        </div>

        <div class="asa-ask-row">
          <textarea
            id="asa-question-input"
            class="asa-question-input"
            placeholder="Ask a specific question…"
            rows="2"
          ></textarea>
          <button class="asa-send-btn" id="asa-btn-ask">
            <span>Ask</span> ➤
          </button>
        </div>
      </div>
    `;
    document.body.appendChild(sidebar);

    // Event listeners
    document.getElementById("asa-close-btn").addEventListener("click", toggleSidebar);
    document.getElementById("asa-btn-analyze").addEventListener("click", () => sendRequest("ANALYZE"));
    document.getElementById("asa-btn-hint1").addEventListener("click", () => sendRequest("HINT_1"));
    document.getElementById("asa-btn-hint2").addEventListener("click", () => sendRequest("HINT_2"));
    document.getElementById("asa-btn-hint3").addEventListener("click", () => sendRequest("HINT_3"));
    document.getElementById("asa-btn-solution").addEventListener("click", confirmAndShowSolution);
    document.getElementById("asa-btn-refresh").addEventListener("click", refreshProblemData);
    document.getElementById("asa-btn-ask").addEventListener("click", handleUserQuestion);
    document.getElementById("asa-open-popup-btn")?.addEventListener("click", () => {
      chrome.runtime.sendMessage({ type: "OPEN_POPUP" });
    });

    // Allow Enter (without Shift) to send question
    document.getElementById("asa-question-input").addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleUserQuestion(); }
    });

    // Check API key and update badge
    checkApiKey();
    updateProblemBadge();
  }

  // ── Toggle Button (floating) ─────────────────────────────────────────────
  function injectToggleButton() {
    const btn = document.createElement("button");
    btn.id = "asa-toggle-btn";
    btn.className = "asa-toggle-btn";
    btn.innerHTML = `<span>⚡</span><span class="asa-toggle-label">AI Tutor</span>`;
    btn.title = "Open AI Study Assistant";
    btn.addEventListener("click", toggleSidebar);
    document.body.appendChild(btn);
  }

  function toggleSidebar() {
    const sidebar = document.getElementById("asa-sidebar");
    const toggleBtn = document.getElementById("asa-toggle-btn");
    sidebarVisible = !sidebarVisible;
    if (sidebarVisible) {
      sidebar.classList.remove("asa-hidden");
      toggleBtn.classList.add("asa-toggle-active");
    } else {
      sidebar.classList.add("asa-hidden");
      toggleBtn.classList.remove("asa-toggle-active");
    }
  }

  // ── API Key Check ────────────────────────────────────────────────────────
  function checkApiKey() {
    chrome.runtime.sendMessage({ type: "GET_API_KEY" }, (res) => {
      const warning = document.getElementById("asa-api-warning");
      if (!res?.key) warning.style.display = "flex";
      else warning.style.display = "none";
    });
  }

  // ── Problem Badge ────────────────────────────────────────────────────────
  function updateProblemBadge() {
    const badge = document.getElementById("asa-problem-badge");
    if (problemData?.title) {
      badge.textContent = problemData.title.length > 28
        ? problemData.title.substring(0, 28) + "…"
        : problemData.title;
      badge.title = problemData.title;
    } else {
      badge.textContent = "No problem detected";
    }
  }

  // ── Request Handler ───────────────────────────────────────────────────────
  async function sendRequest(action, userQuestion = "") {
    if (isLoading) return;

    // Re-extract if needed
    if (!problemData?.description) {
      problemData = extractProblemData();
    }

    isLoading = true;
    setButtonsDisabled(true);

    const userLabel = {
      ANALYZE: "🔍 Analyze this problem",
      HINT_1: "💡 Give me a hint",
      HINT_2: "🔦 Give me a deeper hint",
      HINT_3: "🗺️ Give me a detailed hint",
      SOLUTION: "✅ Show me the full solution",
      QUESTION: `❓ ${userQuestion}`,
    }[action] || action;

    appendMessage("user", userLabel);
    const loadingId = appendLoadingMessage();

    try {
      const response = await chrome.runtime.sendMessage({
        type: "AI_REQUEST",
        payload: {
          problem: problemData,
          action,
          userQuestion,
          hintLevel: currentHintLevel,
          conversationHistory,
        },
      });

      removeLoadingMessage(loadingId);

      if (!response.success) {
        handleError(response.error);
        return;
      }

      const aiText = response.data;

      // Update conversation history for context continuity
      conversationHistory.push(
        { role: "user", content: userLabel },
        { role: "assistant", content: aiText }
      );
      // Keep history manageable (last 6 exchanges)
      if (conversationHistory.length > 12) {
        conversationHistory = conversationHistory.slice(-12);
      }

      appendMessage("ai", aiText);
    } catch (err) {
      removeLoadingMessage(loadingId);
      handleError(err.message);
    } finally {
      isLoading = false;
      setButtonsDisabled(false);
    }
  }

  function handleUserQuestion() {
    const input = document.getElementById("asa-question-input");
    const question = input.value.trim();
    if (!question) return;
    input.value = "";
    input.style.height = "auto";
    sendRequest("QUESTION", question);
  }

  function confirmAndShowSolution() {
    if (confirm("Show the full solution? Try the hints first — you'll learn more! Continue?")) {
      sendRequest("SOLUTION");
    }
  }

  function refreshProblemData() {
    problemData = extractProblemData();
    updateProblemBadge();
    appendMessage("system", "🔄 Problem data refreshed. The assistant now has the latest content.");
  }

  // ── Chat UI Helpers ───────────────────────────────────────────────────────
  function appendMessage(role, content) {
    const chatArea = document.getElementById("asa-chat-area");

    // Remove welcome screen on first message
    const welcome = chatArea.querySelector(".asa-welcome");
    if (welcome) welcome.remove();

    const msgDiv = document.createElement("div");
    msgDiv.className = `asa-message asa-message-${role}`;

    if (role === "ai") {
      msgDiv.innerHTML = `
        <div class="asa-message-avatar">⚡</div>
        <div class="asa-message-bubble">${renderMarkdown(content)}</div>
      `;
    } else if (role === "user") {
      msgDiv.innerHTML = `
        <div class="asa-message-bubble">${escapeHtml(content)}</div>
        <div class="asa-message-avatar">👤</div>
      `;
    } else {
      // system message
      msgDiv.innerHTML = `<div class="asa-system-msg">${escapeHtml(content)}</div>`;
    }

    chatArea.appendChild(msgDiv);
    chatArea.scrollTop = chatArea.scrollHeight;
    return msgDiv;
  }

  function appendLoadingMessage() {
    const id = "asa-loading-" + Date.now();
    const chatArea = document.getElementById("asa-chat-area");
    const div = document.createElement("div");
    div.id = id;
    div.className = "asa-message asa-message-ai";
    div.innerHTML = `
      <div class="asa-message-avatar">⚡</div>
      <div class="asa-message-bubble asa-loading-bubble">
        <span class="asa-dot"></span><span class="asa-dot"></span><span class="asa-dot"></span>
        <span class="asa-loading-text">CodeSensei is thinking…</span>
      </div>
    `;
    chatArea.appendChild(div);
    chatArea.scrollTop = chatArea.scrollHeight;
    return id;
  }

  function removeLoadingMessage(id) {
    document.getElementById(id)?.remove();
  }

  function handleError(errorCode) {
    const messages = {
      NO_API_KEY: "⚠️ No API key found. Click the extension icon in your toolbar to add your Groq API key.",
      INVALID_API_KEY: "❌ Your API key is invalid. Please check it in the extension popup.",
      RATE_LIMITED: "⏳ You've hit the API rate limit. Please wait a moment and try again.",
    };
    const msg = messages[errorCode] || `❌ Error: ${errorCode}. Please try again.`;
    appendMessage("system", msg);
    isLoading = false;
    setButtonsDisabled(false);
  }

  function setButtonsDisabled(disabled) {
    const btns = document.querySelectorAll(".asa-btn, .asa-send-btn");
    btns.forEach((btn) => (btn.disabled = disabled));
  }

  // ── Minimal Markdown Renderer ─────────────────────────────────────────────
  function renderMarkdown(text) {
    return text
      // Code blocks with language
      .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
        `<pre class="asa-code-block"><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`
      )
      // Inline code
      .replace(/`([^`]+)`/g, "<code class='asa-inline-code'>$1</code>")
      // Bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // Italic
      .replace(/\*(.+?)\*/g, "<em>$1</em>")
      // H2
      .replace(/^## (.+)$/gm, "<h2 class='asa-md-h2'>$1</h2>")
      // H3
      .replace(/^### (.+)$/gm, "<h3 class='asa-md-h3'>$1</h3>")
      // Unordered list items
      .replace(/^[\-\*] (.+)$/gm, "<li>$1</li>")
      .replace(/(<li>[\s\S]*?<\/li>)+/g, (m) => `<ul class='asa-md-ul'>${m}</ul>`)
      // Numbered list items
      .replace(/^\d+\. (.+)$/gm, "<li>$1</li>")
      // Horizontal rule
      .replace(/^---$/gm, "<hr class='asa-md-hr'>")
      // Line breaks (paragraphs)
      .replace(/\n\n/g, "</p><p class='asa-md-p'>")
      .replace(/\n/g, "<br>")
      // Wrap in paragraph
      .replace(/^(.+)$/, "<p class='asa-md-p'>$1</p>");
  }

  function escapeHtml(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
})();
