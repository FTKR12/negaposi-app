from __future__ import annotations

import logging
from typing import Dict, Any

from flask import Flask, request, jsonify
from transformers import pipeline, Pipeline

# ===================
# 設定
# ===================

MODEL_NAME = "jarvisx17/japanese-sentiment-analysis"
HOST = "127.0.0.1"
PORT = 5000
DEBUG = True

# ===================
# ロギング設定
# ===================

logging.basicConfig(
    level=logging.INFO if DEBUG else logging.WARNING,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger(__name__)

# ===================
# Flask アプリ
# ===================

app = Flask(__name__)

# ===================
# モデル関連
# ===================

_sentiment_model: Pipeline | None = None


def get_sentiment_model() -> Pipeline:
    """
    感情分析モデルを遅延ロードして返す。
    モジュール import 時ではなく、初回リクエスト時にロードされる。
    """
    global _sentiment_model
    if _sentiment_model is None:
        logger.info("Loading sentiment model: %s", MODEL_NAME)
        _sentiment_model = pipeline(
            task="sentiment-analysis",
            model=MODEL_NAME,
        )
        logger.info("Model loaded successfully")
    return _sentiment_model


def classify_sentiment(text: str) -> str:
    """
    テキストをポジ / ネガいずれかのラベルに分類する。
    返り値は "positive" または "negative"。
    """
    model = get_sentiment_model()
    result: Dict[str, Any] = model(text)[0]

    raw_label = str(result.get("label", "")).lower()
    logger.debug("Raw model output: %s", result)

    # jarvisx17/japanese-sentiment-analysis は "positive" / "negative" を返す想定
    if raw_label == "positive":
        return "positive"
    # 想定外ラベルに備えてフォールバック
    return "negative"


# ===================
# ルーティング
# ===================

@app.route("/predict", methods=["POST"])
def predict() -> Any:
    data = request.get_json(silent=True) or {}
    text = str(data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        label = classify_sentiment(text)
        return jsonify(
            {
                "text": text,
                "label": label,
            }
        )
    except Exception as exc:  # 予期せぬエラーもログに残す
        logger.exception("Error while classifying sentiment: %s", exc)
        return jsonify({"error": "internal model error"}), 500


@app.route("/health", methods=["GET"])
def health() -> Any:
    """
    簡易ヘルスチェック用エンドポイント。
    デプロイ先の監視（Render 等）から叩くことも想定。
    """
    return jsonify({"status": "ok"}), 200


# ===================
# ローカル開発用エントリポイント
# ===================

if __name__ == "__main__":
    app.run(host=HOST, port=PORT, debug=DEBUG)
