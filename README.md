# chat-app

## 啟動後端

下載 uv

`curl -Ls https://astral.sh/uv/install.sh | sh`

`source ~/.bashrc`

確認版本

`uv --version`

`cd backend`

自動建立虛擬環境

`uv sync`

進入虛擬環境

`source .venv/bin/activate`

請先更換後端 app.py 的 webhook_url 及 webhook_url_upload

`uvicorn app:app --reload --host 0.0.0.0 --port 4000`

## 啟動前端
`npm run dev`