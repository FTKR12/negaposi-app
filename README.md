# Environments
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
pip install flask transformers sentencepiece torch fugashi unidic_lite
```

# deploy
```sh
python sentiment_server.py
node server.js
```