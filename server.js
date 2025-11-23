// server.js
const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
require("dotenv").config();

// ==============================
// 設定値
// ==============================
const app = express();
const PORT = process.env.PORT || 8000;
const DB_PATH = process.env.DB_PATH || "sentiments.db";

// Python 側の感情分析 API
// - ローカル開発: デフォルトの 127.0.0.1:5000
// - 本番: SENTIMENT_API_URL を環境変数で上書き
const SENTIMENT_API_URL =
  process.env.SENTIMENT_API_URL || "http://127.0.0.1:5000/predict";

// Node 18 未満なら、ここで node-fetch を require するなどして polyfill が必要:
// const fetch = (...args) => import("node-fetch").then(({ default: f }) => f(...args));

// ==============================
// DB 初期化
// ==============================
const db = new Database(DB_PATH);

db.prepare(
  `
  CREATE TABLE IF NOT EXISTS sentiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT UNIQUE,
    label TEXT
  )
`
).run();

const findStmt = db.prepare("SELECT label FROM sentiments WHERE text = ?");
const insertStmt = db.prepare(
  "INSERT OR IGNORE INTO sentiments (text, label) VALUES (?, ?)"
);

function findLabelByText(text) {
  const row = findStmt.get(text);
  return row ? row.label : null;
}

function insertSentiment(text, label) {
  insertStmt.run(text, label);
}

// ==============================
// ミドルウェア
// ==============================
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ==============================
// Python サーバ呼び出し
// ==============================
async function callPythonSentiment(text) {
  let response;
  try {
    response = await fetch(SENTIMENT_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch (networkError) {
    console.error("[Python API] Network error:", networkError);
    throw new Error("Python server unreachable");
  }

  let data = {};
  try {
    data = await response.json();
  } catch (parseError) {
    console.error("[Python API] Failed to parse JSON:", parseError);
  }

  if (!response.ok) {
    console.error("[Python API] Error response:", response.status, data);
    throw new Error(data.error || "Python server error");
  }

  if (!data.label) {
    console.error("[Python API] Missing label in response:", data);
    throw new Error("No label from Python server");
  }

  return data.label; // "positive" or "negative"
}

// ==============================
// ルーティング
// ==============================

// ヘルスチェック用
app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

// ネガポジ判定
app.post("/predict", async (req, res) => {
  const text = (req.body.text || "").trim();

  if (!text) {
    return res.status(400).json({ error: "text is required" });
  }

  try {
    // 1. DB キャッシュ確認
    const cachedLabel = findLabelByText(text);
    if (cachedLabel) {
      return res.json({
        text,
        label: cachedLabel,
        fromCache: true,
      });
    }

    // 2. Python のローカルモデルに投げる
    const label = await callPythonSentiment(text);

    // 3. DB に保存
    insertSentiment(text, label);

    // 4. 返却
    return res.json({
      text,
      label,
      fromCache: false,
    });
  } catch (err) {
    console.error("[/predict] Internal error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ==============================
// サーバ起動
// ==============================
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Using DB: ${DB_PATH}`);
  console.log(`Sentiment API: ${SENTIMENT_API_URL}`);
});
