# Gem Merchant Web

2-5 人实时在线宝石商人网页桌游项目。

当前阶段：实时房间已完成端到端骨架，前端可通过房间码加入 Durable Object WebSocket 房间，并支持 resume token 断线重连。Playwright 双浏览器上下文 E2E 已覆盖两名玩家加入、准备、开局、拿宝石和跨端同步。

预览地址：<https://gem-merchant-web.zzcreation2022.workers.dev>

## 文档

- [PRODUCT.md](./docs/PRODUCT.md)：产品定位、规则与技术方案。
- [CHECKLIST.md](./docs/CHECKLIST.md)：按里程碑组织的开发进度清单。

## 当前约定

- 原创美术与原创界面。
- 基础版机制与数值按公开资料还原。
- 2-4 人为经典规则模式。
- 5 人为同机制扩展模式，普通宝石每色 8 个，贵族展示 6 张，需要后续平衡测试。
- 在线对战采用房间码邀请，必须真人玩家。
- UI 必须展示所有桌游公开信息，包括所有玩家声望、宝石、已购卡、永久折扣、贵族，以及预留卡公开/隐藏状态。
- 技术方向为 React + TypeScript + Vite + Cloudflare Workers / Durable Objects。

## 开发

```bash
npm install
npm run dev
npm run dev:worker
npm run build
npm run test
npm run test:e2e
```

首次运行 Playwright E2E 前安装 Chromium：

```bash
npx playwright install chromium
```

`npm run test:e2e` 会同时启动 `wrangler dev` (`127.0.0.1:8787`) 和 Vite (`127.0.0.1:5173`)，测试访问 Vite，并通过 Vite 的 `/api` WebSocket proxy 连接 Worker。

## Cloudflare 后台观测

- Worker 已在 `wrangler.toml` 中开启 Workers Logs / Observability。
- 在线房间会通过应用层 heartbeat 保活：客户端每 25 秒发送 `room.ping`，服务端返回 `room.pong` 并刷新玩家 `lastSeenAt`。
- 异常断线后客户端会按 1s / 2s / 5s / 10s 自动重连，并使用本地保存的 resume token 恢复原座位。
- 业务统计入口：`/admin/stats`，返回当前活跃房间数、在线玩家数、活跃连接数和房间摘要。

## 当前结构

- `src/`：前端桌面原型。
- `shared/game/`：共享规则模型、setup 和数据入口。
- `shared/protocol/`：前后端事件类型。
- `worker/`：Cloudflare Worker、Durable Object room 和 WebSocket 房间控制器。
- `tests/game/`：规则测试。
- `tests/worker/`：房间后端协议测试。
- `tests/e2e/`：Playwright 多浏览器上下文联机测试。
