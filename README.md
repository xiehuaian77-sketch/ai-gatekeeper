# 谢怀安 (Huaian.dev) - 暗色科技风个人空间

[![Astro](https://img.shields.io/badge/Astro-5.x-BC52EE?style=flat-square&logo=astro&logoColor=white)](https://astro.build)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Site](https://img.shields.io/badge/Domain-xiehuaian.de5.net-00f0ff?style=flat-square)](https://xiehuaian.de5.net)

集作品集展示与多主题技术博客于一体的高性能暗色科技风（Dark Tech）个人网站。

## ✨ 核心特性

- 🚀 **极速静态性能**：基于 Astro 5 孤岛架构（Islands），零 JS 默认运行时，Lighthouse 满分体验；
- 🎨 **暗色科技美学 (Dark Tech)**：深邃黑夜底色、点阵网格背景、电光青与霓虹紫流光双色点缀、毛玻璃质感与卡片 Hover 微光发光效果；
- 💻 **仿真终端组件 (Cyber Terminal)**：首页交互式极客终端窗口；
- 📝 **类型安全内容驱动**：内置 Content Collections（Zod 校验），支持 Markdown/MDX 文章与作品集；
- 🔍 **博客多维筛选与毫秒级即时搜索**：支持按分类、标签筛选及标题/正文即时模糊检索；
- 📑 **文章目录 (TOC) & 中英文阅读时长预估**；
- 🌐 **全套 SEO & RSS**：自动生成 `sitemap-index.xml` 与 `/rss.xml` 订阅源。

## 🛠️ 本地运行

```bash
# 安装依赖
npm install

# 启动开发服务器 (http://localhost:4321)
npm run dev

# 静态构建 (输出至 dist/)
npm run build

# 预览构建产物
npm run preview
```

## 🚀 部署与自定义域名

- **托管推荐**：Cloudflare Pages / Vercel
- **自定义域名**：`xiehuaian.de5.net`
- **DNS 配置**：添加 CNAME 记录指向托管平台分配的 `*.pages.dev` 或 `cname.vercel-dns.com`

---

## 🛡️ AI Gatekeeper — Prompt Firewall for On-chain Funds (SOC Console)

> *"AI decides. Policy constrains. Cryptography authorizes. Smart contracts enforce."*  
> **10-Second Value Proposition for Judges:** LLMs must never directly hold or transfer private keys or funds. AI Gatekeeper sandwiches AI decisions between deterministic Policy Guards and cryptographic EIP-712 signatures, verified on-chain by non-custodial smart contracts (`GatekeeperVault.sol`) with strict nonce replay protection.

> **TESTNET ONLY — NO REAL FUNDS**  
> Network: Ethereum Sepolia (Chain ID: `11155111`)  
> Web UI: `http://localhost:3000` (AI Security Operations Center)

### 📊 SOC Console Architecture & Security Dashboard

- **Security Overview Bar**: Real-time status cards for AI Gatekeeper (Dual-Guard Fail-Closed), Policy Engine (2KB Limit & Max Claim Caps), Smart Contract (`0xeD75...91F3`), and Vault Balance.
- **Attack Console & Presets**: 6 production scenarios in 3 distinct tiers:
  - 🟢 **Legitimate Request**: 01 Valid Authorized Claim Request ➔ Decision: `VALID ALLOW`
  - 🔴 **Adversarial Requests**: 02 System Injection, 03 DAN Jailbreak, 04 Social Engineering, 05 Obfuscated Base64 ➔ Decision: `DENIED`
  - 🟡 **Security Boundary**: 06 Controlled Boundary Demonstration ➔ Decision: `CONTROLLED ALLOW` (`ALLOW ≠ EXECUTION`)
- **Security Decision Panel**: Threat classification, risk level, Prompt SHA-256 copyable hash, and cryptographic tuple verification.
- **EIP-712 Cryptographic Authorization**: Transparent tuple preview (Contract, ChainId, Recipient, Amount, Nonce, Deadline, Signature).
- **Manual Broadcast Gateway**: Safety confirmation step protecting faucet funds; transactions are broadcast to Ethereum Sepolia only after explicit human confirmation.
- **On-chain Replay Lab**: Real-time test reproducing duplicate nonce submissions, proving EVM-level `NonceAlreadyUsed` revert.
- **SOC Event Log & Toasts**: Real-time audit trail capturing all evaluation, authorization, broadcast, and replay events.

### 🎤 Hackathon Pitch Scripts / 现场演示讲稿

#### 30秒标准演示版 (30-Second Standard Pitch)
> “AI Gatekeeper 是 AI Agent 的链上安全执行层。我们先验证一个合法且具有有效授权上下文的请求可以正常通过。然后使用 Prompt Injection 验证恶意请求会被 Policy Guard 拦截。最后展示一个 Controlled Boundary Case：即使 AI 返回 Allow，也不等于资金已经执行，仍然需要 EIP-712 授权、人工确认和智能合约验证。我们的目标，是让 AI 成为链上资金执行前的实时风控层，而不是直接控制资金。”

#### 15秒极简电梯版 (15-Second Elevator Pitch)
> “AI Gatekeeper 是 AI Agent 的链上安全执行层。合法请求可以通过，恶意请求会被拦截，而即使 AI 在边界情况下 Allow，也必须经过 EIP-712、人工确认和智能合约验证。我们让 AI 做实时风控，而不是直接控制资金。”

### 🔄 2-Minute Live Demo Walkthrough

1. **Step 1 — Preflight Verification**:
   ```bash
   npm run demo:check
   ```
   Ensures RPC, contracts, signer address, vault balance, and zero leaked secrets.

2. **Step 2 — Launch SOC Console**:
   ```bash
   npm start
   ```
   Open `http://localhost:3000` in your browser.

3. **Step 3 — Run 7-Stage Full Security Demo**:
   - Click **`RUN FULL SECURITY DEMO`** in the top header.
   - **Stage 1 (Legitimate Request)**: Valid authorized claim request ➔ AI & Policy verify credentials ➔ Decision: `VALID ALLOW` (🟢 Low risk, prompt accepted).
   - **Stage 2 (Adversarial Request)**: Adversarial prompt injection ➔ AI & Policy block request ➔ Decision: `DENIED` (🔴 Zero signature, zero tx, zero ETH leaked).
   - **Stage 3 (Controlled Boundary Case)**: Controlled demonstration boundary test ➔ Decision: `CONTROLLED ALLOW` (🟡 Proves that **ALLOW ≠ EXECUTION**).
   - **Stage 4 (EIP-712 Authorization)**: EIP-712 typed signature generated for strictly `0.001 ETH`.
   - **Stage 5 (Human Confirmation Gate)**: Pauses at Human Confirmation Gate (`WAITING FOR HUMAN CONFIRMATION`) with cryptographic parameters visible.
   - **Stage 6 (Sepolia Execution)**: Smart contract verifies boundary conditions and nonce on Ethereum Sepolia.
   - **Stage 7 (Replay Protection)**: Simulates duplicate nonce replay attack ➔ Smart contract reverts with `NonceAlreadyUsed` ➔ Zero secondary payout.

### ⛓️ Verified Sepolia Deployments
- **Contract Address**: [`0xeD751070AbDF02b6Cce845E2228DCd6bbAbc91F3`](https://sepolia.etherscan.io/address/0xeD751070AbDF02b6Cce845E2228DCd6bbAbc91F3)
- **Deployment Tx**: [`0x2a282f84ad587d6f735aef64f8566ef55fabc24bf30e0fab82832a521a4bb416`](https://sepolia.etherscan.io/tx/0x2a282f84ad587d6f735aef64f8566ef55fabc24bf30e0fab82832a521a4bb416)
- **Verified Claim Tx**: [`0x86f21f42b26bf36876e34c6be2e0478ffbc411207f1f1578ece8d87527d6f18e`](https://sepolia.etherscan.io/tx/0x86f21f42b26bf36876e34c6be2e0478ffbc411207f1f1578ece8d87527d6f18e)

---

© 2026 [Xie Huaian (谢怀安)](https://github.com/xiehuaian77-sketch).
