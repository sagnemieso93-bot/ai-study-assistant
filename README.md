# ⚡ AI Study Assistant — Chrome Extension

**CodeSensei** is an AI-powered tutoring Chrome extension that helps you learn algorithmic problem-solving on LeetCode. It acts as a Socratic tutor — guiding you to the answer through hints and explanations rather than just giving you solutions.

---

## 📁 File Structure

```
ai-study-assistant/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker: handles Groq API calls
├── content.js          # Injected into LeetCode: scrapes problem + injects UI
├── styles.css          # Sidebar styles (injected into page)
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic (API key management)
└── icons/
    ├── icon16.png
    ├── icon48.png
    └── icon128.png
```

---

## 🚀 Step 1 — Get a Free Groq API Key

1. Go to **[console.groq.com](https://console.groq.com)** and sign up for a free account
2. Click **"API Keys"** in the left sidebar
3. Click **"Create API Key"**, give it a name, and copy it
4. Keep it — you'll need it in Step 3

> **Free tier:** Groq gives you generous free credits. LLaMA 3 70B is fast and capable.

---

## 🔧 Step 2 — Load the Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Toggle **"Developer mode"** ON (top-right corner)
3. Click **"Load unpacked"**
4. Select the `ai-study-assistant/` folder
5. The extension will appear with the ⚡ icon in your toolbar

---

## 🔑 Step 3 — Add Your API Key

1. Click the **⚡ CodeSensei icon** in your Chrome toolbar
2. Paste your Groq API key into the input field  
   *(keys start with `gsk_...`)*
3. Click **"💾 Save API Key"**
4. You should see a green "API key configured ✓" status

Your key is stored securely in `chrome.storage.local` — it never leaves your browser except when making API calls directly to Groq.

---

## 🧪 Step 4 — Test on LeetCode

1. Go to any LeetCode problem, e.g.:  
   `https://leetcode.com/problems/two-sum/`
2. Wait ~2 seconds for the page to load fully
3. Look for the **"⚡ AI Tutor"** floating button in the bottom-right corner
4. Click it to open the sidebar
5. Click **"🔍 Analyze Problem"** to start!

---

## 🎓 How to Use

| Button | What it does |
|--------|-------------|
| **🔍 Analyze Problem** | Full analysis: restatement, thinking model, pattern ID, first hint |
| **💡 Get Hint** | Gentle nudge — a guiding question only |
| **🔦 Deeper Hint** | Reveals the algorithm/approach conceptually |
| **🗺️ Full Hint** | Step-by-step pseudocode walkthrough |
| **✅ Show Solution** | Full C++ solution with comments + complexity analysis |
| **🔄 Refresh Data** | Re-scrapes the problem (useful if page reloaded) |
| **Ask** | Ask the AI any specific question about the problem |

---

## 🤖 AI Behavior

The AI (CodeSensei) is prompted to act as a **Socratic tutor**:

- **Never gives the answer immediately** — guides you to think
- **Identifies patterns** (Two Pointers, DP, BFS/DFS, etc.)
- **Progressive hints** — each one reveals a bit more
- **Full solution** only when explicitly requested
- **C++ code** with inline comments when solution is shown
- **Complexity analysis** (time + space)
- **Practice problems** suggested after each solution
- **Conversation memory** — context maintained within a session

---

## 🛡️ Security

- API key stored in `chrome.storage.local` (sandboxed per extension)
- Key is never sent to any server except directly to `api.groq.com`
- No analytics, no telemetry, no external logging
- All communication is HTTPS

---

## ⚠️ Troubleshooting

**"No problem detected" in badge:**
- Wait a few more seconds after page load (LeetCode is React-heavy)
- Click "🔄 Refresh Data" in the sidebar

**Sidebar doesn't appear:**
- Make sure you're on a URL matching `leetcode.com/problems/*`
- Reload the page and wait 2 seconds

**API errors:**
- `INVALID_API_KEY` — Double-check your key in the popup starts with `gsk_`
- `RATE_LIMITED` — Wait 30–60 seconds (Groq free tier limit)
- Network errors — Check your internet connection

**Extension icon not in toolbar:**
- Click the puzzle piece 🧩 icon in Chrome toolbar
- Pin "AI Study Assistant" to always show it

---

## 🔄 Updating for Other Sites

To add support for other coding sites, update `manifest.json`:

```json
"content_scripts": [{
  "matches": [
    "https://leetcode.com/problems/*",
    "https://www.hackerrank.com/challenges/*",
    "https://codeforces.com/problemset/problem/*"
  ],
  ...
}]
```

Then extend the selector arrays in `content.js` → `extractProblemData()` for those sites' DOM structures.

---

## 📝 Models & Configuration

Edit `background.js` to change settings:

```js
const MODEL = "llama3-70b-8192";  // or "llama3-8b-8192" (faster/cheaper)
```

Available Groq models:
- `llama3-70b-8192` — Best quality (recommended)
- `llama3-8b-8192` — Faster, lower quality
- `mixtral-8x7b-32768` — Larger context window

---

## 📄 License

MIT — Use freely for personal learning.
