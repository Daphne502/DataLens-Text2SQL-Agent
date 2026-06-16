# DataLens：企业级自然语言数据查询终端（Text2SQL Agent）

![Python](https://img.shields.io/badge/Python-3.12-blue.svg) ![FastAPI](https://img.shields.io/badge/FastAPI-0.128-teal.svg) ![Next.js](https://img.shields.io/badge/Next.js-16-black.svg) ![Dify](https://img.shields.io/badge/Dify-Workflow-orange.svg) ![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Supabase-336791.svg)

用自然语言提问，自动生成 PostgreSQL 查询并返回结构化结果。智能体由 **Dify 工作流**编排，支持 SQL 执行失败后的 **Self-Reflection 自修正**；工程上采用 **Next.js + FastAPI 网关** 三层分离，数据存储于 **Supabase PostgreSQL**。

---

## 在线体验

| 入口 | 地址 |
|:---|:---|
| **前端（Vercel）** | [https://datalens-text2sql-agent.vercel.app](https://datalens-text2sql-agent.vercel.app) |
| **API（Hugging Face Spaces）** | [https://daphne502-datalens-api.hf.space](https://daphne502-datalens-api.hf.space) |
| **API 文档** | [https://daphne502-datalens-api.hf.space/docs](https://daphne502-datalens-api.hf.space/docs) |
| **健康检查** | [https://daphne502-datalens-api.hf.space/health](https://daphne502-datalens-api.hf.space/health) |

**示例问题：**

- `查询订单总数`
- `每个城市的用户数量是多少`
- `查询每个用户的 name 和所在 city`（会触发字段名自修正）

---

## 核心痛点与解决方案

| 核心痛点 | DataLens 解决方案 | 技术支撑 |
| :--- | :--- | :--- |
| **NL→SQL 不稳定** | Schema 注入 + Few-shot 示例约束生成 | Dify LLM + Prompt Engineering |
| **SQL 执行报错** | 根据数据库真实报错自动重写 SQL | Dify 条件分支 + 反思 LLM |
| **密钥与破坏性 SQL** | 密钥环境变量化 + SELECT 白名单拦截 | Dify ENV + Code 节点校验 |
| **Demo 难工程化** | UI / API / Agent 三层分离，多环境部署 | FastAPI + Next.js + Docker / Vercel / HF |

---

## 系统架构

### 逻辑架构

```mermaid
flowchart LR
    User(["用户"]) --> UI["Next.js 前端"]
    UI --> BFF["Next.js /api/chat"]
    BFF --> API["FastAPI 网关"]
    API --> Dify["Dify Workflow<br/>DataLens_Core"]
    Dify --> LLM1["Text2SQL LLM"]
    LLM1 --> Code1["SQL 执行"]
    Code1 --> Branch{成功?}
    Branch -->|是| End1["输出"]
    Branch -->|否| LLM2["反思 LLM"]
    LLM2 --> Code2["SQL 重试"]
    Code2 --> End2["输出"]
    Code1 --> Supabase[(Supabase PostgreSQL)]
    Code2 --> Supabase
    API --> UI
```

### Dify 工作流（`DataLens_Core.yml`）

```txt
用户输入 user_query
    → LLM 生成 SQL（含表结构 + Few-shot）
    → Code 清洗 + 安全校验 + Supabase RPC 执行
    → 条件分支（status contains success）
        ├─ true  → 输出 status / raw_sql / result
        └─ false → 反思 LLM（原问题 + 错误 SQL + 报错信息）
                 → Code 再次执行 → 输出
```

**设计要点：**

- Code 节点通过 **输入变量** 映射 Dify 环境变量 `SUPABASE_RPC_URL`、`SUPABASE_ANON_KEY`（不写死在 YAML）
- `is_safe_select()` 仅允许 `SELECT` / `WITH`，拦截 `DELETE` / `DROP` 等
- 反思节点 **temperature ≤ 0.2**，降低修正随机性

---

## 技术栈

| 层级 | 技术 |
| :--- | :--- |
| 智能体编排 | Dify Workflow（通义 qwen3.6-plus） |
| 数据库 | Supabase PostgreSQL（users / products / orders） |
| 后端网关 | FastAPI + Uvicorn + httpx |
| 前端 | Next.js 16 + React 19 + Tailwind CSS 4 |
| 部署 | Docker Compose（本地）/ Vercel（前端）/ HF Spaces Docker（API） |
| 评测 | 自研规则回归脚本（12 条 NL→SQL 用例） |

---

## 工程亮点

| 优化项 | 做法 | 效果 |
| :--- | :--- | :--- |
| 密钥安全 | Supabase Key 迁入 Dify ENV；FastAPI 持有 Dify Key | YAML / 代码无明文密钥 |
| SQL 安全 | Code 节点 SELECT 白名单 | 防止 LLM 生成破坏性语句 |
| Self-Reflection | 失败分支注入真实 DB 报错 | 字段名错误等可自动修正 |
| API 网关 | FastAPI 统一封装 Dify blocking 响应 | OpenAPI 可联调，Key 不暴露前端 |
| 结构化响应 | `{ status, sql, data, corrected, elapsed_ms }` | 前端 JSON / 表格双视图 |
| 质量回归 | `eval/run_eval.py` 批量评测 | **91.7%** 规则通过率（11/12） |

> 评测说明：规则型回归测试（status、SQL 关键词、数据非空），用于 Prompt / 流程改动后快速验证，不代表所有复杂 NL 查询 100% 正确。

---

## 目录结构

```text
DataLens-Text2SQL-Agent/
├── DataLens_Core.yml          # Dify 工作流 DSL（可导入 Dify）
├── docker-compose.yml         # 本地：api + frontend
├── .env.example               # 环境变量模板
├── backend_assets/
│   ├── api/
│   │   ├── main.py            # FastAPI 入口，代理 Dify
│   │   └── schemas.py         # 请求/响应模型
│   ├── Dockerfile             # 本地 API 镜像（port 8000）
│   ├── Dockerfile.hf          # HF Spaces API 镜像（port 7860）
│   ├── mock_data_generator.py # Supabase  mock 数据脚本
│   └── requirements.txt
├── frontend/
│   ├── app/
│   │   ├── page.tsx           # Text2SQL UI
│   │   └── api/chat/route.ts  # BFF，代理 FastAPI
│   ├── Dockerfile             # Next.js standalone
│   └── next.config.ts         # output: standalone
└── eval/
    ├── test_cases.json        # 12 条评测用例
    ├── run_eval.py            # 批量评测（调 FastAPI）
    └── eval_report.json       # 运行后生成（勿提交 Git）
```

---

## 快速开始

### 1. 克隆与环境变量

```bash
git clone https://github.com/Daphne502/DataLens-Text2SQL-Agent.git
cd DataLens-Text2SQL-Agent
cp .env.example .env
```

`.env` 必填项：

```bash
# Dify（FastAPI 使用）
DIFY_API_URL=https://api.dify.ai/v1
DIFY_API_KEY=app-xxxxxxxx

# Supabase mock 数据脚本（可选）
SUPABASE_DB_URI=postgresql://postgres.xxx:password@xxx.pooler.supabase.com:5432/postgres

# 本地开发
DATALENS_API_URL=http://127.0.0.1:8000
```

**Dify 工作流环境变量**（在 Dify 控制台 → DataLens_Core → ENV 配置，与 Code 节点输入变量映射）：

```bash
SUPABASE_RPC_URL=https://<project>.supabase.co/rest/v1/rpc/exec_sql
SUPABASE_ANON_KEY=eyJ...
```

> 导入 `DataLens_Core.yml` 后 Secret 值为空，需在 Dify 面板 **重新填写** 并发布。

---

### 2. 初始化数据库（可选）

```bash
pip install psycopg2-binary faker python-dotenv
python backend_assets/mock_data_generator.py
```

将创建 `users` / `products` / `orders` 三张表并插入 mock 数据（30 用户、10 商品、100 订单）。

---

### 3. 本地开发（双终端）

**终端 1 — FastAPI：**

```bash
cd backend_assets
pip install -r requirements.txt
uvicorn api.main:app --reload --host 0.0.0.0 --port 8000
```

**终端 2 — Next.js：**

```bash
cd frontend
npm install
npm run dev
```

| 入口 | 地址 |
|:---|:---|
| 前端 | http://127.0.0.1:3000 |
| API 文档 | http://127.0.0.1:8000/docs |
| 健康检查 | http://127.0.0.1:8000/health |

`frontend/.env.local`：

```bash
DATALENS_API_URL=http://127.0.0.1:8000
```

---

### 4. 本地 Docker Compose（推荐演示）

```bash
docker compose up --build
```

| 服务 | 地址 |
|:---|:---|
| Next.js 前端 | http://127.0.0.1:3000 |
| FastAPI | http://127.0.0.1:8000/docs |

- API 容器通过 `env_file: .env` 注入 `DIFY_*`
- Frontend 容器内 `DATALENS_API_URL=http://api:8000`（已在 `docker-compose.yml` 配置）

---

### 5. 线上部署：Vercel（前端）+ Hugging Face Spaces（API）

生产环境采用 **前后端分离双平台** 部署：

```
用户 → Vercel (Next.js) → HF Spaces (FastAPI) → Dify Cloud → Supabase
```

#### 5.1 Hugging Face Spaces — API

1. 新建 **Docker Space**，Root 指向 `backend_assets/`
2. 使用 **`Dockerfile.hf`**（监听 **7860** 端口）
3. Space → **Settings → Secrets** 配置：

   ```bash
   DIFY_API_URL=https://api.dify.ai/v1
   DIFY_API_KEY=app-xxxxxxxx
   ```

4. 部署完成后 API 根地址示例：  
   `https://daphne502-datalens-api.hf.space`

#### 5.2 Vercel — 前端

1. Import GitHub 仓库
2. **Root Directory** 设为 `frontend`
3. **Environment Variables**：

   ```bash
   DATALENS_API_URL=https://daphne502-datalens-api.hf.space
   ```

   > 填 HF Space **根域名**，不要加 `/docs` 或端口。

4. **Redeploy** 使环境变量生效

5. 线上前端：https://datalens-text2sql-agent.vercel.app

#### 5.3 部署对照表

| 环境 | 前端 | API | Dify | 数据库 |
|:---|:---|:---|:---|:---|
| 本地开发 | localhost:3000 | localhost:8000 | 云端 | Supabase |
| Docker Compose | localhost:3000 | localhost:8000 | 云端 | Supabase |
| **线上生产** | Vercel | HF Spaces :7860 | 云端 | Supabase |

---

## API 参考

### `GET /health`

```json
{ "status": "ok" }
```

### `POST /api/v1/query`

**请求：**

```json
{ "query": "查询订单总数" }
```

**响应：**

```json
{
  "status": "success",
  "sql": "SELECT COUNT(*) AS total_orders FROM orders",
  "data": [{ "total_orders": 100 }],
  "corrected": false,
  "elapsed_ms": 7562,
  "message": null
}
```

---

## 批量评测

```bash
# 确保 FastAPI 已启动
python eval/run_eval.py
```

报告输出至 `eval/eval_report.json`。

**最近一次评测摘要：**

| 指标 | 数值 |
|:---|:---|
| 用例数 | 12 |
| 通过率 | **91.7%**（11/12） |
| 平均耗时 | ~5987 ms |

---

## 开发日志

| 版本 | 内容 |
|:---|:---|
| v1.0 | Dify Text2SQL 工作流 + Supabase RPC 执行 |
| v1.1 | Self-Reflection 自修正分支 |
| v2.0 | 密钥环境变量化 + SQL SELECT 白名单 |
| v2.1 | Few-shot Prompt + 结构化 End 输出 |
| v2.2 | FastAPI 网关 + Next.js 三层分离 |
| v2.3 | 12 条规则评测 + Docker Compose |
| v2.4 | Vercel 前端 + HF Spaces API 线上部署 |

---

## FAQ

**Q：Dify Code 节点报「缺少 SUPABASE_RPC_URL」？**  
A：环境变量需在 Dify ENV 面板配置，并在 Code 节点 **输入变量** 中映射为 `supabase_rpc_url` / `supabase_anon_key` 传入 `main()`，不能仅用 `os.environ.get`。

**Q：Vercel 前端报 API 连接失败？**  
A：检查 `DATALENS_API_URL` 是否为 HF Space 根域名；HF Space 需已启动且 Secrets 中 `DIFY_*` 正确。

**Q：「删除所有订单」为什么还能返回 success？**  
A：Code 层会安全拦截 DELETE；工作流进入反思分支后 LLM 可能改写成合法 SELECT，端到端仍可能 success。评测 case_11 因此设计为边界用例。

**Q：Dify 与 FastAPI 各管什么？**  
A：Dify 负责 NL→SQL、执行、自修正；FastAPI 负责 API 网关、Dify Key 保管、响应格式统一。Next.js 只调 FastAPI，不直连 Dify。

---

## License

MIT © 2026 Daphne

> Designed by [Daphne502](https://github.com/Daphne502) — 2026
