// server.js
const express = require("express");
const Database = require("better-sqlite3");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 8000;

// ======== DB 初期化 ========
const db = new Database("sentiments.db");

db.prepare(`
  CREATE TABLE IF NOT EXISTS sentiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT UNIQUE,
    label TEXT
  )
`).run();

const findStmt = db.prepare("SELECT label FROM sentiments WHERE text = ?");
const insertStmt = db.prepare(
  "INSERT OR IGNORE INTO sentiments (text, label) VALUES (?, ?)"
);

// ======== ミドルウェア ========
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// ======== Python サーバ呼び出し ========
// Node 18 以降なら fetch はグローバルに入っています
async function callPythonSentiment(text) {
  const res = await fetch("http://127.0.0.1:5000/predict", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    console.error("Python server error:", res.status, data);
    throw new Error(data.error || "Python server error");
  }

  if (!data.label) {
    throw new Error("No label from Python server");
  }

  return data.label; // "positive" or "negative"
}

// ======== API: ネガポジ判定 ========
app.post("/predict", async (req, res) => {
  try {
    const text = (req.body.text || "").trim();
    if (!text) {
      return res.status(400).json({ error: "text is required" });
    }

    // 1. DBキャッシュ確認
    const row = findStmt.get(text);
    if (row && row.label) {
      return res.json({
        text,
        label: row.label,
        fromCache: true,
      });
    }

    // 2. Python のローカルモデルに投げる
    const label = await callPythonSentiment(text);

    // 3. DBに保存
    insertStmt.run(text, label);

    // 4. 返却
    return res.json({
      text,
      label,
      fromCache: false,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ======== サーバ起動 ========
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
