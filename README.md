# DataLens: Text2SQL Agent Workspace

<div align='center'>

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?logo=next.js&logoColor=white)](https://nextjs.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Dify](https://img.shields.io/badge/Dify.ai-Agentic_Workflow-1C64F2?logo=robot&logoColor=white)](https://dify.ai/)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase&logoColor=white)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Deployed_on-Vercel-black?logo=vercel&logoColor=white)](https://vercel.com/)

**基于大模型反思机制 (Reflection) 构建的企业级数据查询终端** <br>
*使用自然语言，即时获取并渲染结构化业务数据。*

[**点击访问线上 Demo**](https://datalens-text2sql-agent.vercel.app) · [**报告 Bug**](https://github.com/Daphne502/DataLens-Text2SQL-Agent/issues)

</div>
<br/>

**在线视频演示：**
[![Bilibili](https://i1.hdslb.com/bfs/archive/398f6ef28f1214650b7d3aea2730a6829bdafcda.jpg@308w_174h)](https://www.bilibili.com/video/BV1szXaBhEmG/)

## 核心特性 (Key Features)

* **Agentic Workflow 与反思纠错 (Reflection)**：打破传统单向 Text2SQL 极高的失败率。当生成的 SQL 语法错误或执行报错时，Agent 会自动提取错误日志，进入 **"反思节点"** 重新生成修正后的 SQL，直至成功获取数据（设有最大重试防死循环机制）。
* **Serverless 安全架构**：摒弃前端直接调用大模型 API 的危险做法，通过 Next.js API Routes (Serverless Functions) 搭建中转代理，将 Dify API 密钥安全封装在后端环境变量中。
* **智能数据渲染引擎**：前端自带健壮的数据解析器，无论后端返回的是纯 JSON 数组还是嵌套的字符串化 JSON，都能自动提取并渲染为 **Data Table** 和 **Raw JSON 面板**。
* **SaaS 级交互体验**：采用类似 Vercel / Linear 的高级暗色主题 (Zinc Palette)，内置 Command Bar、毛玻璃吸顶表头 (Backdrop-blur) 与微交互动效。

## 系统架构 (Architecture)

本项目采用前后端分离与大模型工作流编排解耦的架构设计：

```mermaid
graph TD
    classDef frontend fill:#18181b,stroke:#3f3f46,stroke-width:2px,color:#fafafa;
    classDef backend fill:#09090b,stroke:#27272a,stroke-width:2px,color:#fafafa;
    classDef dify fill:#1e3a8a,stroke:#3b82f6,stroke-width:2px,color:#eff6ff;
    classDef db fill:#064e3b,stroke:#10b981,stroke-width:2px,color:#ecfdf5;
    classDef user fill:#3f3f46,stroke:#71717a,stroke-width:2px,color:#fafafa;

    User(("👨‍💻 用户")):::user
    UI["Next.js 前端界面<br/>(Command Bar)"]:::frontend

    User -->|"输入自然语言"| UI


    UI -->|"① POST /api/chat"| API["Next.js API Route<br/>(Serverless Proxy)"]:::backend
    UI -.->|"⑦ 智能解析返回结果"| RENDER{"渲染引擎"}:::frontend

    API -->|"② 安全调用 (隐藏 Key)"| DIFY_START(("Dify Start")):::dify

    subgraph "Dify Agentic Workflow (核心业务流)"
        DIFY_START --> LLM_GEN["LLM: Text2SQL 生成节点"]:::dify
        
        LLM_GEN -->|"③ 输出 SQL"| PYTHON_EXEC["Python 执行节点<br/>(Psycopg2)"]:::dify
        
        %% 错误重试环路 (虚线表示条件触发)
        PYTHON_EXEC -.->|"执行报错"| LLM_REFLECT["LLM: 反思与纠错节点<br/>(分析报错信息)"]:::dify
        LLM_REFLECT -.->|"修正 SQL"| LLM_GEN
        
        PYTHON_EXEC -->|"⑤ 执行成功"| RESULT_JSON["格式化 JSON 结果"]:::dify
    end

    DB[("Supabase Postgres<br/>业务数据库")]:::db

    PYTHON_EXEC <==>|"④ 执行查询 & 返回数据"| DB

    RESULT_JSON -.->|"返回 Response"| API
    API -.->|"⑥ 返回业务数据"| UI

    RENDER -->|"动态生成"| TABLE["Data Table 视图"]:::frontend
    RENDER -->|"格式化"| JSON_VIEW["JSON 视图"]:::frontend

    API ~~~ RENDER
```

## 技术栈 (Tech Stack)

* **前端 (Frontend)**: React, Next.js 15 (App Router), Tailwind CSS v4
* **AI 编排 (LLMOps)**: Dify.ai
* **大模型 (LLM)**: Qwen
* **数据库 (Database)**: Supabase (PostgreSQL)
* **数据构造脚本**: Python 3, Faker
* **部署环境 (Deployment)**: Vercel

## 项目结构 (Project Structure)

```text
DataLens-Text2SQL-Agent/
├── backend_assets/              # 后端资产与脚本
│   ├── venv/                    # Python 虚拟环境
│   └── mock_data_generator.py   # 连接 Supabase 生成电商测试数据的 Python 脚本
│
├── frontend/                    # Next.js 独立前端工程 (Vercel 部署根目录)
│   ├── app/
│   │   ├── api/chat/route.ts    # 后端 API 路由 (处理与 Dify 的安全通信)
│   │   ├── globals.css          # Tailwind CSS 全局变量与定制滚动条
│   │   ├── layout.tsx           # 根布局
│   │   └── page.tsx             # 核心 UI 组件 (Search, Table, JSON Toggles)
│   ├── public/                  # 静态资源
│   ├── next.config.ts           # Next.js 配置
│   └── package.json             # 前端依赖
│
└── README.md                    # 项目说明文档
```

## 快速开始 (Getting Started)

如果你想在本地运行此项目进行二次开发：

**1. 准备环境**
确保你已安装 Node.js (v18+) 和 npm。

**2. 克隆项目**

```bash
git clone https://github.com/Daphne502/DataLens-Text2SQL-Agent.git
cd DataLens-Text2SQL-Agent/frontend
```

**3. 安装前端依赖**

```Bash
npm install
```

**4. 配置环境变量**
在 frontend 目录下创建一个 .env.local 文件，填入你的 Dify API 凭据：

```env
# Dify 工作流 API 密钥
DIFY_API_KEY=app-xxxxxxxxxxxxxxxxxxxxxx
# Dify 接口地址 (默认为官方云服务)
DIFY_API_URL=https://api.dify.ai/v1
```

**5. 启动开发服务器**

```Bash
npm run dev
```

打开浏览器访问 `http://localhost:3000`, 即可看到 DataLens 控制台界面。

## 部署 (Deployment)

本项目专为 Vercel 优化，支持一键部署：

1. 在 Vercel 中导入本 GitHub 仓库。
2. 将 Root Directory 设置为 frontend。
3. 在 Environment Variables 中添加 DIFY_API_KEY 和 DIFY_API_URL。
4. 点击 Deploy 即可。

## 许可证 (License)

本项目采用 MIT License 开源。

---
*Powered by Next.js & Agentic Workflow.*
