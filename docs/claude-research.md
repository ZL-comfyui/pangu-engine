# Claude 生态全面研究笔记

> 整理日期：2026-07-27
> 整理人：沙僧（研发副手）
> 用途：盘古引擎团队决策参考

---

## 目录

1. [Claude 模型系列](#1-claude-模型系列)
2. [API 能力全景](#2-api-能力全景)
3. [Claude Code — 命令行编程助手](#3-claude-code--命令行编程助手)
4. [Agent SDK — 可编程 Agent 框架](#4-agent-sdk--可编程-agent-框架)
5. [MCP (Model Context Protocol)](#5-mcp-model-context-protocol)
6. [System Prompts 最佳实践](#6-system-prompts-最佳实践)
7. [与盘古引擎的关系](#7-与盘古引擎的关系)
8. [Claude Code 接入 OpenClaw 方案](#8-claude-code-接入-openclaw-方案)
9. [行动计划](#9-行动计划)

---

## 1. Claude 模型系列

### 1.1 当前模型矩阵（2026 Q3）

| 模型 | 定位 | 性能特点 | 输入价格 ($/M tokens) | 输出价格 ($/M tokens) | 上下文窗口 |
|------|------|---------|----------------------|----------------------|-----------|
| **Claude 4 Opus** | 旗舰，最强大 | 复杂推理、长文本理解、代码生成、多语言 | $15 | $75 | 200K |
| **Claude 4 Sonnet** | 主力平衡 | 日常编程、分析、写作，性价比最高 | $3 | $15 | 200K |
| **Claude 3.5 Haiku** | 快速轻量 | 简单任务、分类、快速响应 | $0.80 | $4 | 200K |
| **Claude 3 Opus** | 上代旗舰 | 仍在服务，但被 4 Opus 全面超越 | $15 | $75 | 200K |
| **Claude 3.5 Sonnet** | 上代主力 | 被 4 Sonnet 替代 | $3 | $15 | 200K |

> ⚠️ **注意**：Claude 目前不对中国大陆地区提供服务。API 访问需要通过海外服务器或经批准的第三方平台（如 Amazon Bedrock、Google Vertex AI）。

### 1.2 模型选择建议

| 场景 | 推荐模型 | 理由 |
|------|---------|------|
| 复杂代码审查/重构 | Claude 4 Opus | 深度推理最强 |
| 日常编码助手 | Claude 4 Sonnet | 性能/价格平衡 |
| 批量处理/简单分类 | Claude 3.5 Haiku | 速度最快、成本最低 |
| 长文档分析（>50K tokens） | Claude 4 Opus | 200K 窗口 + 最强理解力 |

### 1.3 关键能力边界

- **全系列支持**：200K 上下文窗口、Vision（图片理解）、Tool Use（函数调用）
- **Extended Thinking**：Opus 和 Sonnet 支持深度推理模式，适合数学、复杂逻辑
- **Batch Processing**：异步批处理可享受 50% 折扣
- **Prompt Caching**：重复使用的系统提示可缓存，节省 90% 成本

---

## 2. API 能力全景

### 2.1 Messages API

Claude 使用自家的 **Messages API**（非 OpenAI 兼容格式），需要适配：

```
POST https://api.anthropic.com/v1/messages
```

核心结构：
```json
{
  "model": "claude-sonnet-4-20250514",
  "max_tokens": 4096,
  "system": "你是一个编程助手...",
  "messages": [
    { "role": "user", "content": "帮我写一个排序函数" }
  ]
}
```

**与 OpenAI API 的关键差异**：
- `system` 是顶级字段，不在 messages 数组里
- content 支持 `text` 和 `image` 等多种类型
- 没有 `assistant` 和 `user` 之外的 role 类型
- 每次请求必须指定 `max_tokens`

### 2.2 Tool Use / Function Calling

```json
{
  "tools": [
    {
      "name": "get_weather",
      "description": "获取指定城市的天气",
      "input_schema": {
        "type": "object",
        "properties": {
          "city": { "type": "string", "description": "城市名" }
        },
        "required": ["city"]
      }
    }
  ]
}
```

- 支持并行工具调用（一次返回多个 tool_use blocks）
- 支持 `tool_choice` 强制/建议使用某个工具
- 支持 streaming 模式下的增量工具参数传递

### 2.3 Vision（图片理解）

```json
{
  "role": "user",
  "content": [
    { "type": "image", "source": { "type": "base64", "media_type": "image/png", "data": "..." } },
    { "type": "text", "text": "这张图里有什么？" }
  ]
}
```

- 支持 PNG、JPEG、GIF、WebP
- 单张图片最大 5MB（Opus）/ 最大分辨率处理
- 可在一段对话中传多张图片
- 支持 PDF 作为图片处理（逐页渲染）

### 2.4 Prompt Caching（提示缓存）

```bash
# 缓存 system prompt，后续请求 90% 折扣
curl https://api.anthropic.com/v1/messages \
  -H "anthropic-beta: prompt-caching-2024-07-31" \
  ...
```

- 最少缓存 1024 tokens（Opus）/ 2048 tokens（Sonnet/Haiku）
- 缓存有效期 5 分钟，每次命中自动续期
- **写入价格**：标准价的 1.25x
- **读取价格**：标准价的 0.1x（**节省 90%**）
- 适用场景：固定 system prompt、重复使用的工具定义、长文档重复分析

### 2.5 关键 API 能力汇总

| 能力 | 状态 | 说明 |
|------|------|------|
| 长上下文（200K） | ✅ 全系列 | 可一次性处理整本书级别内容 |
| Tool Use | ✅ 生产可用 | 并行调用、强制调用、流式参数 |
| Vision | ✅ 生产可用 | 多图片、PDF、高分辨率 |
| Prompt Caching | ✅ 生产可用 | 节省 90% 系统提示成本 |
| Streaming | ✅ 生产可用 | SSE 流式输出 |
| Extended Thinking | ✅ Beta | 深度推理链，Opus/Sonnet |
| Batch Processing | ✅ 生产可用 | 异步批量，50% 折扣 |
| Computer Use | ✅ Beta | 控制桌面/浏览器（安全敏感） |
| Citations | ✅ 生产可用 | 自动引用源文档内容 |

---

## 3. Claude Code — 命令行编程助手

### 3.1 概述

Claude Code 是 Anthropic 官方的 **Agentic 编程工具**（智能编程助手），能在终端、VS Code、桌面应用和浏览器中运行。

**核心能力**：
- 理解整个代码库（读文件、搜索、grep）
- 直接编辑文件（Write、Edit）
- 运行终端命令（Bash）
- 集成 git（提交、分支、PR）
- 连接 MCP 服务器（Jira、Slack、数据库等）

### 3.2 安装方式

```bash
# macOS/Linux/WSL
curl -fsSL https://claude.ai/install.sh | bash

# Windows PowerShell
irm https://claude.ai/install.ps1 | iex

# Homebrew
brew install --cask claude-code

# WinGet
winget install Anthropic.ClaudeCode
```

### 3.3 运行模式

```bash
# 交互式
cd your-project
claude

# 单次命令（headless 模式）
claude -p "修复 auth.py 中的 bug"

# 管道模式
tail -200 app.log | claude -p "分析这些日志中的异常"

# 批量代码审查
git diff main --name-only | claude -p "审查这些变更的安全问题"
```

### 3.4 核心特性

| 特性 | 说明 |
|------|------|
| **CLAUDE.md** | 项目级记忆文件，每 session 自动加载 |
| **Skills** | 可复用的工作流模板（如 `/review-pr`） |
| **Hooks** | 工具调用前后执行自定义脚本 |
| **Sub-agents** | 派生子 Agent 处理专项任务 |
| **Agent Teams** | 多 Agent 并行协作 |
| **MCP 集成** | 连接外部工具和数据源 |
| **Plan Mode** | 先分析后执行的审核模式 |
| **Permissions** | 精细的工具权限控制 |
| **Auto Memory** | 跨 session 自动记住项目信息 |

### 3.5 内置 Sub-agent 类型

| Agent | 模型 | 工具 | 用途 |
|-------|------|------|------|
| **Explore** | 继承主会话 | 只读（Read/Grep/Glob） | 代码库搜索探索 |
| **Plan** | 继承主会话 | 只读 | Plan Mode 下的研究 |
| **General-purpose** | 继承主会话 | 全部 | 复杂的多步骤任务 |
| statusline-setup | Sonnet | 受限 | 配置状态栏 |
| claude-code-guide | Haiku | 受限 | 回答功能问题 |

### 3.6 自定义 Sub-agent 示例

```markdown
---
name: code-reviewer
description: 扫描代码，建议可读性、性能和最佳实践改进
tools: Read, Grep, Glob
model: sonnet
---

你是代码改进专家。对每个问题，解释原因、展示当前代码、提供改进版本。
```

### 3.7 Claude Code 与 OpenClaw 的架构对比

| 维度 | Claude Code | OpenClaw |
|------|-----------|----------|
| 定位 | 编程助手 | 多 Agent 平台 |
| 界面 | 终端/IDE/桌面/Web | 飞书/WebChat/Discord/Telegram 等 |
| Agent 模型 | Sub-agent 树 | 独立 Agent + ACP 桥接 |
| 工具生态 | MCP + 内置工具 | 插件系统 + MCP |
| 编程能力 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐（通过子 Agent） |
| 多角色协作 | Agent Teams | 唐僧体系（多 Agent 角色） |
| 项目管理 | 较弱 | 更强（白龙马、甘特图） |

---

## 4. Agent SDK — 可编程 Agent 框架

### 4.1 概述

Claude Agent SDK 是 Claude Code 内核的 SDK 版本。允许开发者用 **Python 或 TypeScript** 构建自主 AI Agent。

### 4.2 快速示例

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions

async def main():
    async for message in query(
        prompt="Review utils.py for bugs that would cause crashes. Fix any issues you find.",
        options=ClaudeAgentOptions(
            allowed_tools=["Read", "Edit", "Glob"],
            permission_mode="acceptEdits",
        ),
    ):
        if hasattr(message, "result"):
            print(f"Done: {message.subtype}")

asyncio.run(main())
```

### 4.3 核心能力

| 能力 | 说明 |
|------|------|
| **内置工具** | Read, Write, Edit, Bash, Glob, Grep, WebSearch, WebFetch |
| **Hooks** | PreToolUse, PostToolUse, Stop, SessionStart, SessionEnd 等生命周期回调 |
| **Subagents** | 用 `AgentDefinition` 定义专业子 Agent |
| **MCP 集成** | 自动连接 MCP 服务器扩展工具 |
| **流式输出** | 实时获取 Agent 思考和执行过程 |
| **权限控制** | approve-all / approve-reads / deny-all |
| **多平台认证** | Anthropic API / Bedrock / Vertex AI / Foundry |

### 4.4 安装

```bash
# Python
uv add claude-agent-sdk
# 或
pip install claude-agent-sdk

# TypeScript
npm install @anthropic-ai/claude-agent-sdk
```

---

## 5. MCP (Model Context Protocol)

### 5.1 概述

MCP 是 Anthropic 推动的开源标准协议，类比"AI 应用的 USB-C 接口"。让 AI 应用（Claude、ChatGPT、VS Code 等）通过统一的协议连接外部工具和数据源。

### 5.2 架构

```
┌──────────────────────────────────────┐
│         MCP Host (AI 应用)            │
│  ┌──────────┐ ┌──────────┐          │
│  │MCP Client│ │MCP Client│  ...     │
│  │    #1    │ │    #2    │          │
│  └────┬─────┘ └────┬─────┘          │
└───────┼────────────┼────────────────┘
        │            │
   ┌────▼─────┐ ┌────▼─────────┐
   │MCP Server│ │MCP Server    │
   │  Local   │ │  Remote      │
   │ (stdio)  │ │(Streamable   │
   │          │ │  HTTP)       │
   └──────────┘ └──────────────┘
```

### 5.3 核心概念

#### 参与者
- **MCP Host**：AI 应用（Claude Code、VS Code、Cursor 等）
- **MCP Client**：维护与 MCP Server 连接的组件
- **MCP Server**：提供上下文数据的程序

#### 两层架构
1. **数据层**（JSON-RPC 2.0）：定义通信语义
2. **传输层**：Stdio（本地）/ Streamable HTTP（远程）

#### 三大原语（Server 端）
| 原语 | 说明 | 示例 |
|------|------|------|
| **Tools** | 可执行函数 | 查询数据库、调用 API、操作文件 |
| **Resources** | 数据源 | 文件内容、数据库 schema、API 响应 |
| **Prompts** | 可复用模板 | 系统提示、few-shot 示例 |

#### 三大原语（Client 端）
| 原语 | 说明 |
|------|------|
| **Sampling** | Server 请求 Client 的 LLM 生成回复 |
| **Elicitation** | Server 请求用户输入额外信息 |
| **Logging** | Server 向 Client 发送日志 |

### 5.4 Claude Code 中 MCP 的使用

```bash
# 添加远程 HTTP MCP 服务器
claude mcp add --transport http notion https://mcp.notion.com/mcp

# 添加本地 stdio 服务器
claude mcp add --transport stdio airtable -- npx -y airtable-mcp-server

# 带认证的远程服务器
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"

# 管理服务器
claude mcp list
claude mcp get github
claude mcp remove github
```

### 5.5 MCP 生态现状

- **官方目录**：https://claude.ai/directory（已验证的 Connector）
- **开源服务器**：https://github.com/modelcontextprotocol/servers
- **支持 MCP 的客户端**：Claude Desktop、Claude Code、VS Code、Cursor、ChatGPT 等
- **可构建的服务器**：Google Drive、Jira、Slack、Notion、GitHub、GitLab、PostgreSQL、Sentry 等

---

## 6. System Prompts 最佳实践

### 6.1 Anthropic 官方 Prompt Engineering 原则

基于 Anthropic 官方文档和课程，核心原则如下：

#### 原则 1：清晰直接（Be Clear and Direct）
```
❌ "你能帮我做点什么吗？"
✅ "用 Python 写一个函数，接收整数列表，返回中位数。包含类型注解和文档字符串。"
```

#### 原则 2：使用 XML 标签结构化
```
<instructions>
  <task>分析以下代码的性能瓶颈</task>
  <format>每个问题单独一段，包含：位置、原因、建议修复、预估改进幅度</format>
  <constraints>只关注时间复杂度 > O(n²) 的问题</constraints>
</instructions>
```

#### 原则 3：赋予角色（Role/Prompt）
```
你是一位有 15 年经验的 Python 代码审查专家。
你擅长发现难以察觉的并发 bug 和内存泄漏。
```

#### 原则 4：提供示例（Few-shot）
```
<examples>
  <example>
    <input>写一个用户注册函数</input>
    <output>包含：输入验证、密码哈希、数据库事务、异常处理、日志记录</output>
  </example>
</examples>
```

#### 原则 5：分步思考（Chain of Thought）
```
在给出最终答案之前，请：
1. 先列出可能的解决方案
2. 分析每种方案的优缺点
3. 做出推荐并说明理由
```

#### 原则 6：长上下文最佳实践
- 把最重要的信息放在开头和结尾
- 使用清晰的标题分段
- 将参考资料作为独立的数据块（用 XML 包裹）
- 利用 Prompt Caching 缓存固定部分

#### 原则 7：Think 标签（Thinking）
```
<thinking>
在回答之前，先思考：
- 用户真正需要什么？
- 有哪些边界条件要考虑？
- 是否有更优雅的解决方案？
</thinking>
```

### 6.2 实用 Prompt 模板

```markdown
<system>
你是一个 {角色}。你的任务是 {任务描述}。

<rules>
1. {规则1}
2. {规则2}
3. {规则3}
</rules>

<format>
{输出格式要求}
</format>

<examples>
{示例}
</examples>
</system>
```

---

## 7. 与盘古引擎的关系

### 7.1 能力对比：Claude vs DeepSeek

| 维度 | Claude 4 Opus/Sonnet | DeepSeek V3/R1 | 结论 |
|------|---------------------|----------------|------|
| **编程能力** | ⭐⭐⭐⭐⭐ 顶级 | ⭐⭐⭐⭐ 优秀 | Claude 更强 |
| **长文本理解** | ⭐⭐⭐⭐⭐ 200K 窗口 | ⭐⭐⭐⭐ 128K 窗口 | Claude 窗口更大 |
| **推理深度** | ⭐⭐⭐⭐⭐ Extended Thinking | ⭐⭐⭐⭐⭐ R1 推理链 | 持平 |
| **成本** | $3-15/M tokens | ~$0.27/M tokens | DeepSeek 便宜 10-50x |
| **中文能力** | ⭐⭐⭐⭐ 良好 | ⭐⭐⭐⭐⭐ 母语级 | DeepSeek 更好 |
| **可用性** | ❌ 中国不可用 | ✅ 国内直接访问 | DeepSeek 胜 |
| **工具生态** | ⭐⭐⭐⭐⭐ MCP + Agent SDK | ⭐⭐⭐ 较弱 | Claude 生态更丰富 |
| **合规性** | ⚠️ 需海外服务器 | ✅ 国内合规 | DeepSeek 胜 |

### 7.2 Claude 更适合的场景（vs DeepSeek）

1. **复杂代码重构**：Claude 4 Opus 的深度推理和代码理解，适合处理大型遗留系统的重构
2. **长文档分析**：200K 窗口一次性处理整本手册/技术规范，DeepSeek 的 128K 在一些场景不够
3. **MCP 生态集成**：需要连接 Jira、GitHub、Slack 等外部工具时，Claude 的 MCP 生态完胜
4. **Agent SDK 定制**：需要构建自定义编码 Agent 时，Claude Agent SDK 提供了完整的框架
5. **安全审计/代码审查**：Claude 对安全漏洞的敏感度更高，适合做客户的代码安全审查
6. **海外客户项目**：客户的海外基础设施上，Claude 可能更方便

### 7.3 DeepSeek 更适合的场景

1. **日常开发主力**：成本低、响应快、中文好，适合国内日常编码
2. **客户交付项目**：国内客户合规要求，DeepSeek 是安全选择
3. **大批量处理**：成本优势明显，适合每天大量 token 消耗
4. **中文内容生成**：中文文案、文档、翻译方面更自然

### 7.4 推荐策略：双引擎互补

```
┌─────────────────────────────────────┐
│         盘古引擎 AI 选型策略          │
├─────────────────────────────────────┤
│  主力引擎：DeepSeek                  │
│  ├─ 日常开发、中文任务、国内客户      │
│  └─ 成本优势、合规保障               │
│                                      │
│  特种引擎：Claude                    │
│  ├─ 复杂重构、安全审计、Agent 定制   │
│  ├─ 海外客户项目、MCP 生态集成       │
│  └─ 通过 OpenClaw ACP 按需调用       │
└─────────────────────────────────────┘
```

---

## 8. Claude Code 接入 OpenClaw 方案

### 8.1 架构概览

OpenClaw 通过 **ACP（Agent Client Protocol）** 可以原生接入 Claude Code 作为子 Agent。

```
┌──────────────────────────────────────────────────┐
│                   OpenClaw Gateway                │
│  ┌─────────────────────────────────────────┐     │
│  │           ACP Control Plane               │     │
│  │  ┌─────────────────────────────────┐    │     │
│  │  │     @openclaw/acpx Plugin        │    │     │
│  │  │  ┌─────────────────────────┐    │    │     │
│  │  │  │  Claude ACP Adapter      │    │    │     │
│  │  │  │  ┌───────────────────┐  │    │    │     │
│  │  │  │  │   Claude Code      │  │    │    │     │
│  │  │  │  │   (Harness)        │  │    │    │     │
│  │  │  │  └───────────────────┘  │    │    │     │
│  │  │  └─────────────────────────┘    │    │     │
│  │  └─────────────────────────────────┘    │     │
│  └─────────────────────────────────────────┘     │
│                      │                            │
│   ┌──────────────────┼──────────────────┐        │
│   ▼                  ▼                   ▼        │
│ 飞书群           WebChat           Discord 等     │
└──────────────────────────────────────────────────┘
```

### 8.2 接入步骤

#### Step 1：安装 ACP 插件

```bash
# 安装官方 ACPX 插件
openclaw plugins install @openclaw/acpx

# 启用插件
openclaw config set plugins.entries.acpx.enabled true
```

#### Step 2：配置 ACP

```json5
// 在 openclaw 配置中添加
{
  acp: {
    enabled: true,
    backend: "acpx",
    defaultAgent: "claude",  // 默认使用 Claude
    allowedAgents: ["claude", "codex"],
    maxConcurrentSessions: 8,
  }
}
```

#### Step 3：确保 Claude Code 已安装并登录

```bash
# 在 Gateway 主机上安装 Claude Code
# 参见上面的安装方式

# 确保已登录
claude
# 首次使用会引导登录
```

#### Step 4：配置权限模式

```bash
# Claude Code 需要写文件和执行命令的能力
openclaw config set plugins.entries.acpx.config.permissionMode approve-all
openclaw config set plugins.entries.acpx.config.nonInteractivePermissions fail
```

#### Step 5：验证

```text
/acp doctor    # 检查后端健康状态
/acp spawn claude --bind here    # 在对话中绑定 Claude Code
```

### 8.3 使用方式

#### 方式 1：飞书群/WebChat 中直接调用

```text
# 作为师父（唐僧），在飞书群中发送：
/acp spawn claude --bind here

# 接下来在这条对话中，所有消息都发给 Claude Code 处理
```

#### 方式 2：通过 sessions_spawn 作为子 Agent 调用

```json
{
  "task": "审查 auth 模块的安全漏洞并输出报告",
  "runtime": "acp",
  "agentId": "claude",
  "mode": "run"
}
```

#### 方式 3：绑定特定频道

```json5
{
  bindings: [
    {
      type: "acp",
      agentId: "claude",
      match: {
        channel: "discord",
        accountId: "default",
        peer: { kind: "channel", id: "CLAUDE_CHANNEL_ID" }
      },
      acp: { label: "claude-coding", cwd: "/workspace/project" }
    }
  ]
}
```

#### 方式 4：作为 OpenClaw Agent 角色

```json5
{
  agents: {
    list: [
      {
        id: "claude-coder",
        name: "Claude 编码助手",
        runtime: {
          type: "acp",
          acp: {
            agent: "claude",
            backend: "acpx",
            mode: "persistent"
          }
        }
      }
    ]
  }
}
```

这样唐僧可以直接把编码任务分发给 `claude-coder` 这个 Agent。

### 8.4 还可以反向：让 Claude Code 调用 OpenClaw

```
┌──────────┐    ACP     ┌───────────┐
│  Claude   │◄─────────►│  OpenClaw  │
│  Code     │  bridge   │  Gateway  │
└──────────┘            └───────────┘
```

```bash
# Claude Code 通过 MCP 连接到 OpenClaw 的对话
openclaw mcp serve
```

这可以让 Claude Code 获取 OpenClaw 中已有的项目上下文、对话历史等。

### 8.5 限制和注意事项

| 限制 | 说明 |
|------|------|
| **地区限制** | Claude 不对中国大陆提供服务，需要海外服务器运行 |
| **不经过沙箱** | ACP session 运行在 host 环境，不经过 OpenClaw 沙箱隔离 |
| **成本** | Claude API 费用远高于 DeepSeek，需要控制使用量 |
| **权限** | `approve-all` 模式有安全风险，生产环境需谨慎 |
| **模型路由** | Claude Code 的模型选择和 OpenClaw 的模型管理是独立的 |

---

## 9. 行动计划

### 9.1 立即可做（本周）

- [ ] 在海外服务器上安装 Claude Code CLI
- [ ] 安装 @openclaw/acpx 插件并配置
- [ ] 跑通 `/acp spawn claude --bind here` 基本流程
- [ ] 选择一个小型编码任务做端到端验证

### 9.2 短期（本月）

- [ ] 配置 Claude API Key 到 OpenClaw providers
- [ ] 测试 Prompt Caching 的成本优化效果
- [ ] 搭建 1-2 个 MCP Server（如连接 GitHub/GitLab）
- [ ] 编写 Claude Code 专用 CLAUDE.md 模板
- [ ] 对比 Claude 4 Sonnet vs DeepSeek V3 在典型编码场景的效果

### 9.3 中期（Q3）

- [ ] 将 Claude 集成到 Agent 编排体系中
- [ ] 建立"DeepSeek 日常 + Claude 特种"的双引擎调度规则
- [ ] 探索 Claude Agent SDK 构建定制 Agent
- [ ] 为海外客户项目准备 Claude 优先的技术栈

### 9.4 需要师父确认的事项

1. 海外服务器资源确认 —— 用于运行 Claude API 调用
2. Anthropic API 预算 —— 预估月度费用
3. 是否购买 Claude Pro/Max 订阅（$20/$200 月）用于 Claude Code

---

## 附录

### A. 参考资料

| 资源 | 链接 |
|------|------|
| Claude Code 官方文档 | https://code.claude.com/docs |
| MCP 官方文档 | https://modelcontextprotocol.io |
| Anthropic API 文档 | https://docs.anthropic.com |
| Claude 定价 | https://claude.com/pricing |
| OpenClaw ACP 文档 | 本地 docs/tools/acp-agents.md |
| Claude Agent SDK | https://code.claude.com/docs/en/agent-sdk/overview |
| MCP Server 仓库 | https://github.com/modelcontextprotocol/servers |

### B. 关键术语表

| 术语 | 英文 | 说明 |
|------|------|------|
| ACP | Agent Client Protocol | Agent 客户端协议，连接外部编程助手 |
| ACPX | - | OpenClaw 的 ACP 运行时插件 |
| MCP | Model Context Protocol | AI 应用连接外部工具的标准协议 |
| Agent SDK | Claude Agent SDK | Claude Code 内核的可编程 SDK |
| Prompt Caching | - | 缓存系统提示以降低 90% 成本 |
| Extended Thinking | - | 深度推理模式 |
| Tool Use | - | 函数调用/工具使用能力 |
