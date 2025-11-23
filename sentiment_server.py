from flask import Flask, request, jsonify
from transformers import pipeline

app = Flask(__name__)

# 日本語感情分析モデル（ローカル）
sentiment_model = pipeline(
    "sentiment-analysis",
    model="jarvisx17/japanese-sentiment-analysis"
)

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json() or {}
    text = (data.get("text") or "").strip()

    if not text:
        return jsonify({"error": "text is required"}), 400

    try:
        result = sentiment_model(text)[0]
        raw_label = result["label"]  # "positive" / "negative"

        if raw_label == "positive":
            label = "positive"
        else:
            label = "negative"

        return jsonify({
            "text": text,
            "label": label
        })
    except Exception as e:
        print("Error in model:", e)
        return jsonify({"error": "internal model error"}), 500


if __name__ == "__main__":
    # ポート5000で起動
    app.run(host="127.0.0.1", port=5000, debug=True)
