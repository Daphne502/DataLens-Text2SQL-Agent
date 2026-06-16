import os
import json
import time
import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from api.schemas import QueryRequest, QueryResponse, HealthResponse

load_dotenv()

DIFY_API_URL = os.getenv("DIFY_API_URL", "").rstrip("/")
DIFY_API_KEY = os.getenv("DIFY_API_KEY", "")

if not DIFY_API_URL or not DIFY_API_KEY:
    raise ValueError("请在 .env 中配置 DIFY_API_URL 和 DIFY_API_KEY")

app = FastAPI(
    title="DataLens API",
    description="Text2SQL Agent 网关层",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def parse_dify_outputs(outputs: dict) -> QueryResponse:
    """
    解析 Dify End 节点输出。
    End 变量名：status / raw_sql / result
    """
    status = outputs.get("status", "error")
    sql = outputs.get("raw_sql") or outputs.get("sql") or ""
    raw_result = outputs.get("result") or outputs.get("data") or ""

    # result 是 JSON 字符串，尝试解析
    data = raw_result
    if isinstance(raw_result, str) and raw_result.strip():
        try:
            data = json.loads(raw_result)
        except json.JSONDecodeError:
            data = raw_result

    corrected = str(outputs.get("corrected", "false")).lower() == "true"

    return QueryResponse(
        status=status,
        sql=sql,
        data=data,
        corrected=corrected,
        message=None if status == "success" else str(raw_result),
    )

@app.get("/")
def root():
    return {
        "service": "DataLens API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
        "query": "POST /api/v1/query",
    }

@app.get("/health", response_model=HealthResponse)
def health_check():
    return HealthResponse(status="ok")


@app.post("/api/v1/query", response_model=QueryResponse)
async def query_data(request: QueryRequest):
    start = time.perf_counter()

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{DIFY_API_URL}/workflows/run",
                headers={
                    "Authorization": f"Bearer {DIFY_API_KEY}",
                    "Content-Type": "application/json",
                },
                json={
                    "inputs": {"user_query": request.query.strip()},
                    "response_mode": "blocking",
                    "user": "datalens-api-user",
                },
            )
            response.raise_for_status()
            payload = response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Dify 请求失败: {str(e)}")

    elapsed_ms = int((time.perf_counter() - start) * 1000)

    data_block = payload.get("data") or {}
    wf_status = data_block.get("status")

    if wf_status != "succeeded":
        error_msg = data_block.get("error") or payload.get("message") or "工作流执行失败"
        return QueryResponse(
            status="error",
            sql="",
            data=None,
            corrected=False,
            elapsed_ms=elapsed_ms,
            message=str(error_msg),
        )

    outputs = data_block.get("outputs") or {}
    result = parse_dify_outputs(outputs)
    result.elapsed_ms = elapsed_ms
    return result