// background.js — Service Worker (Manifest V3)
// Handles all Groq API communication securely.

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
//const MODEL = "Llama 3.3 70B Specdec";
const MODEL = "llama-3.3-70b-versatile";   // Best quality (Llama 3.3 70B)

// ── Message Router ────────────────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "AI_REQUEST") {
    handleAIRequest(message.payload)
      .then((result) => sendResponse({ success: true, data: result }))
      .catch((err) => sendResponse({ success: false, error: err.message }));
    return true; // Keep channel open for async response
  }

  if (message.type === "SAVE_API_KEY") {
    chrome.storage.local.set({ groqApiKey: message.key }, () => {
      sendResponse({ success: true });
    });
    return true;
  }

  if (message.type === "GET_API_KEY") {
    chrome.storage.local.get("groqApiKey", (result) => {
      sendResponse({ key: result.groqApiKey || null });
    });
    return true;
  }
});

// ── Core AI Handler ───────────────────────────────────────────────────────────
async function handleAIRequest({ problem, action, userQuestion, hintLevel, conversationHistory }) {
  const { groqApiKey } = await chrome.storage.local.get("groqApiKey");

  if (!groqApiKey) {
    throw new Error("NO_API_KEY");
  }

  const systemPrompt = buildSystemPrompt();
  const userMessage = buildUserMessage(problem, action, userQuestion, hintLevel);

  // Build messages array including conversation history for context
  const messages = [
    { role: "system", content: systemPrompt },
    ...(conversationHistory || []),
    { role: "user", content: userMessage },
  ];

  const response = await fetch(GROQ_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${groqApiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      max_tokens: 2048,
      temperature: 0.6,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    if (response.status === 401) throw new Error("INVALID_API_KEY");
    if (response.status === 429) throw new Error("RATE_LIMITED");
    throw new Error(errorBody?.error?.message || `API Error ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("Empty response from AI");
  return content;
}

// ── Prompt Builders ───────────────────────────────────────────────────────────
function buildSystemPrompt() {
  return `You are "CodeSensei", an expert programming tutor specializing in data structures, algorithms, and competitive programming. Your role is to TEACH, not just give answers.

TEACHING PHILOSOPHY:
- Guide the student to discover solutions themselves through Socratic questioning
- Build intuition by connecting patterns to real-world analogies
- Celebrate progress and encourage when students are stuck
- Use clear, precise language with appropriate technical terminology

RESPONSE FORMATTING:
- Use markdown with headers (##), bullet points, bold (**text**), and code blocks (\`\`\`cpp)
- Structure responses clearly with distinct sections
- Keep explanations concise but complete
- For code, always include inline comments

IMPORTANT RULES:
1. NEVER give the full solution unless the user explicitly asks with "Show Solution"
2. For hints, guide thinking WITHOUT writing actual code
3. Always explain the WHY behind patterns and approaches
4. After solving, always suggest a similar practice problem`;
}

function buildUserMessage(problem, action, userQuestion, hintLevel) {
  const problemContext = problem
    ? `
## Problem Context
**Title:** ${problem.title || "Unknown"}
**Difficulty:** ${problem.difficulty || "Unknown"}

**Description:**
${problem.description || "Not available"}

**Examples:**
${problem.examples || "Not available"}

**Constraints:**
${problem.constraints || "Not available"}
`
    : "No problem context available.";

  switch (action) {
    case "ANALYZE":
      return `${problemContext}

Please analyze this problem as a tutor. Your response must include these sections:

## 🔍 Problem Restatement
Restate the problem in simple terms, clarifying what inputs we receive and exactly what output is needed.

## 🧠 How to Think About This
Walk me through the mental model — what kind of problem is this? What questions should I ask myself first?

## 🏷️ Pattern Recognition
Identify the algorithmic pattern(s) this problem belongs to (e.g., Two Pointers, Sliding Window, DP, BFS/DFS, etc.) and briefly explain WHY this pattern fits.

## 💡 Hint Level 1 (Gentle Nudge)
Give a very gentle hint — just a question or direction to think in, without any code or algorithm details.

## ⏭️ Next Steps
Ask me what I'd like to explore next: deeper hints, see the approach, or ask a specific question.`;

    case "HINT_1":
      return `${problemContext}

Give me **Hint Level 1** — a gentle nudge that helps me think in the right direction WITHOUT revealing the algorithm or approach. Ask me a guiding question that leads my thinking. No code at all.`;

    case "HINT_2":
      return `${problemContext}

Give me **Hint Level 2** — a medium hint. Reveal the general algorithmic approach and data structure to use, explain WHY it fits, and describe the high-level strategy in plain English. Still NO code — describe it conceptually only.`;

    case "HINT_3":
      return `${problemContext}

Give me **Hint Level 3** — a detailed hint. Walk me through the algorithm step-by-step in pseudocode or numbered steps. Explain each step's purpose. You may use pseudocode but not actual C++ code yet.`;

    case "SOLUTION":
      return `${problemContext}

The student has explicitly requested the full solution. Provide:

## ✅ Complete C++ Solution

\`\`\`cpp
// Well-commented, clean C++ solution here
\`\`\`

## 🔬 Code Walkthrough
Explain each major section of the code and why each step is done.

## ⏱️ Complexity Analysis
- **Time Complexity:** O(...) — explain why
- **Space Complexity:** O(...) — explain why

## 🔄 Similar Practice Problems
Suggest 2-3 similar LeetCode problems to reinforce this pattern, with their numbers and names.`;

    case "QUESTION":
      return `${problemContext}

The student has a question:
"${userQuestion}"

Answer their question clearly and helpfully. Stay in tutor mode — guide their thinking rather than just giving answers. If their question reveals a misconception, gently correct it.`;

    default:
      return `${problemContext}\n\nPlease help me understand this problem.`;
  }
}
