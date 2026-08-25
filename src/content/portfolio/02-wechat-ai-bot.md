---
title: "WeChat AI Bot: 基于 LangGraph 与 ChromaDB 的微信智能助手"
description: "基于 ComWeChatRobot + FastAPI + LangGraph + ChromaDB 打造的企业微信与个人微信智能助手，支持本地知识库检索、多轮对话上下文管理与群聊智能客服。"
pubDate: 2026-08-13
category: "AI 应用"
heroImage: "/images/project-cloud.svg"
tags: ["LangGraph", "FastAPI", "ChromaDB", "Python", "WeChat", "RAG"]
liveUrl: "https://xiehuaian.de5.net"
githubUrl: "https://github.com/xiehuaian77-sketch/wechat-ai-bot"
featured: true
---

## 🌟 项目简介

**WeChat AI Bot** 是一个针对微信生态深度定制的智能助手系统。通过结合 ComWeChatRobot 底层通信与 LangGraph 图状态机，实现了高度拟人化、支持私域知识库检索与智能任务调度的机器人系统。

## 🚀 核心特性

- **基于 ChromaDB 的本地向量 RAG**：精准检索企业文档、QA 知识库并进行抗幻觉生成；
- **LangGraph 图状态机**：多轮会话意图识别、路由跳转与复杂任务中断恢复；
- **FastAPI 高性能异步后端**：毫秒级响应群消息与私聊指令；
- **多模型无缝兼容**：支持 DeepSeek、Kimi、通义千问、OpenAI 等主流大模型接口。
