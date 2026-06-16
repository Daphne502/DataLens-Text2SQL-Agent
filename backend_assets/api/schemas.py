from pydantic import BaseModel, Field
from typing import Optional, Any

class QueryRequest(BaseModel):
    query: str = Field(..., min_length=1, description="用户自然语言问题")

class QueryResponse(BaseModel):
    status: str = Field(..., description="success 或 error")
    sql: str = Field(default="", description="最终执行的 SQL")
    data: Any = Field(default=None, description="查询结果（解析后的 JSON）")
    corrected: bool = Field(default=False, description="是否经过反思节点修正")
    elapsed_ms: Optional[int] = Field(None, description="Dify 工作流耗时")
    message: Optional[str] = Field(None, description="错误信息")

class HealthResponse(BaseModel):
    status: str = "ok"