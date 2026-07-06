# Gem Merchant Web

2-5 人实时在线宝石商人网页桌游项目。

当前阶段：React + TypeScript + Vite 脚手架已建立，已加入第一版桌面原型、共享规则目录、基础数据、纯函数规则引擎和规则测试。

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
npm run build
npm run test
```

## 当前结构

- `src/`：前端桌面原型。
- `shared/game/`：共享规则模型、setup 和数据入口。
- `shared/protocol/`：前后端事件类型。
- `worker/`：Cloudflare Worker 入口占位。
- `tests/game/`：规则测试。
