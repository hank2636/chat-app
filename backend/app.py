import os
from fastapi import FastAPI, Request
import requests
import asyncio
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
import json


app = FastAPI()

# 設置 CORS 中間件，允許所有來源
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 或指定你的前端網址，例如 http://localhost:5173
    allow_credentials=True,
    allow_methods=["*"],  # 這行允許 OPTIONS、GET、POST 等
    allow_headers=["*"],
)

# 儲存消息和事件
message_queue = asyncio.Queue()

file_message_queue = asyncio.Queue()

@app.post("/chat")
async def chat(req: Request):
    data = await req.json()
    user_message = data["message"]

    # webhook_url = "http://localhost:5678/webhook/2539239c-86e0-4143-9d29-0ad10ed1c151"
    webhook_url = "http://localhost:5678/webhook-test/2539239c-86e0-4143-9d29-0ad10ed1c151"
    res = requests.post(webhook_url, data={"text": user_message, "sessionId": "user_123"})
    if res.status_code != 200:
        return {"status": "failed to send to webhook"}
    else:
        res_json = json.loads(res.text)
        reply_message = res_json.get("reply", "")
        reply_message = reply_message.replace('*','')
        return {"status": "ok", "reply": reply_message}
    # try:
    #     reply_message = await asyncio.wait_for(message_queue.get(), timeout=30)
    #     reply_message = reply_message.replace("**", " ").replace('"','')
        
    #     return {"status": "ok", "reply": reply_message}

    # except asyncio.TimeoutError:
    #     return {"status": "timeout", "message": "等候回應超時"}

PDF_DIR = "/home/hank/chat-app/backend/files"

@app.post("/upload_file")
async def upload_file(req: Request):
    data = await req.json()
    file_name = data["file_name"]
    # test
    # webhook_url_upload = "http://localhost:5678/webhook-test/4c345e81-a825-4796-b1cc-cf5cae7cb2e5"
    # prod
    webhook_url_upload = "http://localhost:5678/webhook/4c345e81-a825-4796-b1cc-cf5cae7cb2e5"
    file_path = os.path.join(PDF_DIR, file_name)
    _, ext = os.path.splitext(file_name)  # ext 會是例如 '.pdf'
    print(ext)
    with open(file_path, "rb") as f:
        res = requests.post(webhook_url_upload,
                            files={"file": (file_name, f, f"application/{ext.replace('.','')}")},
                            data={"file_name": file_name})
        print(res.text)
    if res.status_code != 200:
        return {"status": "failed to send to webhook"}
    else:
        return {"status": "ok", "reply": 'ok'}
    # try:
    #     reply_message = await asyncio.wait_for(file_message_queue.get(), timeout=20)
    #     return {"status": "ok", "reply": reply_message}

    # except asyncio.TimeoutError:
    #     return {"status": "timeout", "message": "等候回應超時"}
    # finally:
    #     message_queue = asyncio.Queue()

@app.post("/reply")
async def reply(req: Request):
    data = await req.json()
    print('2',data)
    reply_message = data.get("reply", "無回應")
    await message_queue.put(reply_message)

    return {"status": "received"}

@app.post("/file_reply")
async def file_reply(req: Request):
    data = await req.json()
    print(data)
    reply_message = data.get("file_reply", "無回應")
    await file_message_queue.put(reply_message)

    return {"status": "received"}



@app.get("/files/{pdf_name}")
async def get_pdf_file(pdf_name: str):
    file_path = os.path.join(PDF_DIR, pdf_name)
    if os.path.exists(file_path):
        return FileResponse(path=file_path, filename=pdf_name, media_type='application/pdf')
    else:
        return {"error": "File not found"}