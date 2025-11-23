# 感情分析アプリ
※ Node.jsの勉強用


本リポジトリは、入力されたテキストに対してネガティブ/ポジティブを判定するアプリです。

## 構成要素および技術スタック
- フロント（HTML, JavaScript）
- 感情分析API（Python）
    - 入力テキストに対して、ネガティブ/ポジティブのいずれかのラベルを返すAPI
    - モデルはHuggingFaceからロードしたモデルを使用
        - 使用モデル：`jarvisx17/japanese-sentiment-analysis`
- バックエンドAPIサーバ（Node.js）
    - 感情分析API連携（PythonサーバへのHTTPリクエスト）
    - DBキャッシュ：SQLiteを使用（DBファイル: `sentiments.db`）

## Environments
- Node.js
```sh
node -v
v24.11.1
npm -v
11.6.2
```
```sh
npm init -y
npm install express better-sqlite3 dotenv cors
```
- Python
```sh
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
export HF_HUB_CACHE=./models
```

## Run
別ターミナルで下記を実行。
```sh
python sentiment_server.py
node server.js
```