# Gem Merchant Web 开发清单

按里程碑组织的开发进度清单。产品需求、规则与技术方案见 [PRODUCT.md](./PRODUCT.md)。

最后更新：2026-07-09

## 状态说明

- `[x]` 已完成并通过本地验证。
- `[ ]` 尚未开始或等待下一轮开发。
- `[review]` 已完成，等待用户 review 后再继续。

当前进度：里程碑 3 已完成端到端联机骨架：Durable Object room 路由、WebSocket Hibernation 接入、房间控制器、加入/准备/开始/行动广播协议、前端房间连接栏、secret resume token 断线重连和服务端测试。2026-07-08 的 [gating review](./review/2026-07-08-milestone-3-gating-review.md) Major 1-6 已修复并通过本地验证；host 双浏览器联机广播复核通过，sandbox 浏览器已确认可访问、加入和准备。后续评估见 [测试栈评估](./review/2026-07-08-test-stack-evaluation.md)，主验收栈已迁移为 Playwright 双 browser context E2E。

测试策略提醒：OpenClaw sandbox browser 已可用，但只作为环境冒烟与人工辅助验证，不作为日常快速开发内循环。日常开发优先使用 `npm test`、`npm run test:e2e`、host browser、本地 `wrangler dev` 与 Vite proxy。

## 里程碑 0：脚手架与数据整理

- [x] 建立项目目录与独立 Git 仓库，推送 GitHub `zzcreation/gem_merchant_web`。
- [x] 初始化 React + TypeScript + Vite 脚手架。
- [x] 建立 `shared/game`、`shared/protocol`、`worker`、`tests` 目录。
- [x] 完成产品文档：定位、版权边界、规则、协议、脱敏与架构方案。
- [x] 整理 90 张发展卡与 10 张贵族数据，明确来源与交叉校验流程。
- [x] 新增数据完整性校验与测试。
- [x] `npm run test` / `build` / `lint` 通过。
- [x] 产品文档与数据变更完成 review 后进入里程碑 1。
- [ ] 初始化 Cloudflare Workers + Durable Objects（延后至里程碑 3 实时房间后端）。

## 里程碑 1：单机规则闭环

- [x] 纯函数规则引擎：setup、拿宝石、预留、购买、弃宝石、贵族、终局。
- [x] 客户端视图脱敏函数。
- [x] 覆盖核心规则边界的单元测试。
- [x] 测试环境可完整跑完一局。

## 里程碑 2：本地多人 UI

- [x] 游戏桌面：卡牌市场、宝石池、玩家区、贵族区、日志。
- [x] 本地 mock 多玩家轮流行动。
- [x] 原创视觉占位管线（`artSeed` 程序化占位，后续替换）。
- [review] 浏览器中可无后端完成一局 mock 游戏。

## 里程碑 3：实时房间后端

- [x] Durable Object 房间模型。
- [x] WebSocket：加入、准备、开始、行动、广播。
- [x] 断线重连与 snapshot 同步。
- [x] 按玩家视角脱敏的 snapshot / patch。
- [x] WebSocket Hibernation。
- [review] 房间码邀请，2-4 人在线实时对战。
- [x] 修复 gating review 中的 Major 1-6：见 [2026-07-08 里程碑 3 gating review](./review/2026-07-08-milestone-3-gating-review.md)。
- [x] 联机验收：Playwright 双 browser context 验证创建房间、加入房间、准备、开局、拿宝石行动和跨端同步。
- [x] 测试栈评估：将 OpenClaw sandbox browser 降级为环境冒烟，新增 Playwright 多人 E2E 主验收方案。

## 里程碑 4：移动端与体验打磨

- [x] 在线 lobby 渲染真实房间 roster，不再在开局前显示本地 mock 棋盘。
- [x] 在线行动按 `actionId` 等待服务端确认后再显示成功和清空选择。
- [x] 市场卡购买支持手动支付分配与自动填充建议。
- [x] 预留卡购买入口、贵族选择、弃宝石手动面板。
- [ ] 移动端布局。
- [ ] 动效、音效、错误提示。

## 里程碑 5：5 人扩展与部署

- [ ] 启用并校准 5 人扩展模式。
- [ ] Cloudflare 部署配置与可公开访问的 preview。
- [ ] 基础监控与错误日志。
