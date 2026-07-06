# Gem Merchant Web 开发清单

按里程碑组织的开发进度清单。产品需求、规则与技术方案见 [PRODUCT.md](./PRODUCT.md)。

最后更新：2026-07-06

## 状态说明

- `[x]` 已完成并通过本地验证。
- `[ ]` 尚未开始或等待下一轮开发。
- `[review]` 已完成，等待用户 review 后再继续。

当前进度：里程碑 0 基本完成，产品文档与数据处于 review 阶段，等待 review 通过后进入里程碑 1 规则引擎开发。

## 里程碑 0：脚手架与数据整理

- [x] 建立项目目录与独立 Git 仓库，推送 GitHub `zzcreation/gem_merchant_web`。
- [x] 初始化 React + TypeScript + Vite 脚手架。
- [x] 建立 `shared/game`、`shared/protocol`、`worker`、`tests` 目录。
- [x] 完成产品文档：定位、版权边界、规则、协议、脱敏与架构方案。
- [x] 整理 90 张发展卡与 10 张贵族数据，明确来源与交叉校验流程。
- [x] 新增数据完整性校验与测试。
- [x] `npm run test` / `build` / `lint` 通过。
- [review] 产品文档与数据变更等待用户 review。
- [ ] 初始化 Cloudflare Workers + Durable Objects。

## 里程碑 1：单机规则闭环

- [ ] 纯函数规则引擎：setup、拿宝石、预留、购买、弃宝石、贵族、终局。
- [ ] 客户端视图脱敏函数。
- [ ] 覆盖核心规则边界的单元测试。
- [ ] 测试环境可完整跑完一局。

## 里程碑 2：本地多人 UI

- [ ] 游戏桌面：卡牌市场、宝石池、玩家区、贵族区、日志。
- [ ] 本地 mock 多玩家轮流行动。
- [ ] 原创视觉占位管线（`artSeed` 程序化占位，后续替换）。
- [ ] 浏览器中可无后端完成一局 mock 游戏。

## 里程碑 3：实时房间后端

- [ ] Durable Object 房间模型。
- [ ] WebSocket：加入、准备、开始、行动、广播。
- [ ] 断线重连与 snapshot 同步。
- [ ] 按玩家视角脱敏的 snapshot / patch。
- [ ] WebSocket Hibernation。
- [ ] 房间码邀请，2-4 人在线实时对战。

## 里程碑 4：移动端与体验打磨

- [ ] 移动端布局。
- [ ] 操作确认、支付分配、贵族选择、弃宝石弹窗。
- [ ] 动效、音效、错误提示。

## 里程碑 5：5 人扩展与部署

- [ ] 启用并校准 5 人扩展模式。
- [ ] Cloudflare 部署配置与可公开访问的 preview。
- [ ] Playwright 多人 E2E。
- [ ] 基础监控与错误日志。
