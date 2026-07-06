# Gem Merchant Web 产品文档

版本：v0.1  
日期：2026-07-03  
最后更新：2026-07-06  
项目目录：`workspace/projects/zzc/gem_merchant_web`

本文档描述产品定位、规则、协议与技术方案。开发进度按里程碑维护在 [CHECKLIST.md](./CHECKLIST.md)。

## 1. 项目定位

`gem_merchant_web` 是一款 2-5 人实时在线对战的网页桌游，玩法目标是完整复刻基础版《璀璨宝石 / Splendor》的数值结构、回合机制、经济节奏和胜负判定，同时采用原创美术、原创界面和原创世界观包装，避免直接使用原版商标、卡面、插画和 UI。

产品目标：

- 机制层：严格还原基础版核心机制、卡牌数值、贵族需求、宝石池、购买、预留、折扣、终局和结算。
- 表现层：原创“宝石商人”主题，使用自有视觉资产、卡牌插画、图标和动效。
- 在线层：支持房间码邀请，2-5 人真人实时对战，禁止 AI 补位。
- 部署层：以 Cloudflare 免费/低成本服务为主要目标，支持静态前端 + 边缘实时后端部署。

## 2. 已确认需求

| 模块 | 需求 |
| --- | --- |
| 美术与界面 | 原创美术和原创界面 |
| 机制与数值 | 100% 还原基础版机制和数值，保证平衡性与趣味性 |
| 版本范围 | 先做基础版，不做扩展包 |
| 在线模式 | 房间码邀请，实时 2-5 人 |
| 玩家类型 | 必须真人，不做 AI 补位 |
| 卡牌数据 | 用户暂无数据，基于公开资料整理 |
| 技术方向 | 接受 React + TypeScript + Vite + Cloudflare Workers / Durable Objects |
| 项目目录 | `gem_merchant_web` |
| 当前产出 | 先建目录和产品文档，再发 review |

## 3. 关键边界与风险

### 3.1 版权与商标边界

本项目只复刻公开规则可描述的机制与数值，不直接复制原版名称体系、卡面插画、官方 UI、商标、Logo、说明书排版和商业宣传素材。

建议产品命名使用原创名称，例如：

- 中文名：宝石商人
- 英文名：Gem Merchant
- 房间内副标题：实时宝石引擎构筑对战

### 3.2 2-5 人与基础版规则冲突

基础版官方规则支持 2-4 人。用户要求 2-5 人在线对战，因此产品需要分成两档：

- `classic`：2-4 人，严格基础版规则。
- `extended_5p`：5 人扩展模式，机制沿用基础版，但人数不是官方基础版范围，需要额外平衡测试。

推荐默认房间支持 2-5 人，但在规则说明中标注：

- 2-4 人：经典规则。
- 5 人：扩展房间，使用同一套卡牌与机制，宝石池、贵族数量和节奏需通过 playtest 校准。

### 3.3 卡牌数据来源风险

公开资料中可找到卡牌和贵族数据，但不同来源可能存在录入差异。开发流程必须加入数据校验：

- 第一轮：从公开数据源整理 JSON。
- 第二轮：用至少两个公开来源交叉校验。
- 第三轮：如有实体桌游或可靠表格，人工最终核对。
- 第四轮：写自动测试，验证总牌数、等级分布、颜色分布、分值分布和贵族数量。

## 4. 参考资料

- 官方规则 PDF：`https://bghub.org/r/splendor.pdf`
- Board Game Arena 规则摘要：`https://en.doc.boardgamearena.com/Gamehelpsplendor`
- GitHub 公开卡牌 CSV 参考：`https://github.com/bouk/splendimax/blob/master/Splendor%20Cards.csv`
- GitHub 公开贵族 CSV 参考：`https://github.com/machow/splendid/blob/master/misc/nobles.csv`
- BoardGameGeek 公开资料页：`https://boardgamegeek.com/filepage/226245/splendor-all-cards-and-nobles`

参考资料只用于规则理解、数据整理和交叉校验。最终产品不应复用原版视觉素材。

## 5. 核心玩法概述

玩家扮演宝石贸易势力，通过获取宝石筹码、购买发展卡、积累永久宝石折扣、吸引贵族赞助来获得声望。任一玩家达到 15 分后触发终局，完成当前轮，使所有玩家行动次数相同后结算。最高分获胜；若同分，购买发展卡更少者获胜。

## 6. 游戏组件

### 6.1 宝石与黄金

颜色定义：

| 内部 key | 原型色 | 产品命名建议 | 用途 |
| --- | --- | --- | --- |
| `white` | 白 | 月辉石 | 普通宝石 |
| `blue` | 蓝 | 深海蓝晶 | 普通宝石 |
| `green` | 绿 | 森翠石 | 普通宝石 |
| `red` | 红 | 赤焰石 | 普通宝石 |
| `black` | 黑 | 黑曜晶 | 普通宝石 |
| `gold` | 金 | 商会金券 | 万能宝石 |

官方基础版宝石数量：

| 人数 | 普通宝石每色 | 黄金 |
| --- | ---: | ---: |
| 2 人 | 4 | 5 |
| 3 人 | 5 | 5 |
| 4 人 | 7 | 5 |
| 5 人扩展 | 8 | 5 |

### 6.2 发展卡

基础版共有 90 张发展卡：

| 等级 | 数量 | 市场展示 |
| --- | ---: | ---: |
| Level 1 | 40 | 4 张 |
| Level 2 | 30 | 4 张 |
| Level 3 | 20 | 4 张 |

每张发展卡包含：

```ts
type GemColor = 'white' | 'blue' | 'green' | 'red' | 'black';

interface DevelopmentCard {
  id: string;
  level: 1 | 2 | 3;
  bonus: GemColor;
  prestige: number;
  cost: Partial<Record<GemColor, number>>;
  artSeed: string;
}
```

说明：

- `bonus`：购买后永久提供的折扣颜色。
- `prestige`：声望分。
- `cost`：购买成本。
- `artSeed`：原创卡面生成或匹配使用，不存原版插画。

### 6.3 贵族

基础版共有 10 张贵族牌。每张贵族：

- 固定 3 分。
- 有若干颜色发展卡数量需求。
- 只看已购买发展卡的永久 bonus，不看手中宝石筹码。
- 回合结束自动检查。
- 同一回合最多获得 1 位贵族。
- 若同时满足多个贵族，当前玩家选择其中 1 个。

数据结构：

```ts
interface NobleTile {
  id: string;
  prestige: 3;
  requirement: Partial<Record<GemColor, number>>;
  artSeed: string;
}
```

贵族展示数量：

| 人数 | 贵族数量 |
| --- | ---: |
| 2 人 | 3 |
| 3 人 | 4 |
| 4 人 | 5 |
| 5 人扩展 | 6 |

## 7. 回合规则

每名玩家的回合必须且只能执行 1 个主要行动。

### 7.1 拿 3 个不同颜色宝石

规则：

- 可从普通宝石池拿最多 3 个不同颜色宝石。
- 不可拿黄金。
- 不能重复颜色。
- 严格还原基础版裁定：只有公共池中可选不同颜色不足 3 种时，才允许少于 3 个；不能在可拿满 3 个不同颜色时主动少拿。
- 行动结束后，如果总筹码超过 10，必须弃到 10。

### 7.2 拿 2 个同色宝石

规则：

- 选择 1 种普通宝石颜色。
- 行动开始时，该颜色公共池必须至少有 4 个。
- 拿取 2 个该颜色宝石。
- 行动结束后，如果总筹码超过 10，必须弃到 10。

### 7.3 预留 1 张发展卡

规则：

- 可预留市场中面朝上的任意 1 张发展卡。
- 也可盲抽任意等级牌堆顶部 1 张。
- 每名玩家最多持有 3 张预留卡。
- 预留卡不可丢弃，只能未来购买。
- 预留时若公共池有黄金，获得 1 个黄金；若黄金已空，仍可预留但不获得黄金。
- 从市场预留后，立刻从同等级牌堆补 1 张到市场；若牌堆为空，空位保留。

### 7.4 购买 1 张发展卡

可购买对象：

- 市场中面朝上的发展卡。
- 自己预留区的发展卡。

支付规则：

- 已购买卡牌提供永久折扣。
- 折扣先抵扣对应颜色成本。
- 普通宝石支付剩余成本。
- 黄金可替代任意颜色缺口。
- 已支付宝石和黄金返回公共池。
- 购买市场卡后立即补牌。
- 购买预留卡后，该预留槽清空。

### 7.5 回合结束检查

顺序建议：

1. 执行主要行动。
2. 若市场卡被拿走，补牌。
3. 若筹码超过 10，进入弃牌阶段。
4. 检查贵族访问。
5. 检查是否达到 15 分并触发终局。
6. 切换到下一玩家。

注意：官方规则中宝石上限检查和贵族检查在行动后发生。为避免线上争议，系统需在规则引擎中固定顺序，并在 UI 中明确提示。

## 8. 终局与胜负

触发条件：

- 任一玩家总声望达到 15 分或以上。

终局流程：

- 标记进入终局。
- 当前轮继续进行，直到所有玩家行动次数相同。
- 结算总声望。

排名规则：

1. 总声望高者胜。
2. 同分时，购买发展卡数量少者胜。
3. 若仍相同，建议并列；也可在扩展规则中加入预留卡更少者胜，但经典规则优先并列或按平台规则配置。

## 9. 5 人扩展模式方案

因为基础版官方人数为 2-4，5 人模式需要作为产品扩展：

### 9.1 默认 5 人参数

| 参数 | 默认值 |
| --- | --- |
| 普通宝石每色 | 8 |
| 黄金 | 5 |
| 贵族展示 | 6 |
| 市场展示 | 每等级 4 张 |
| 终局分数 | 15 |
| 预留上限 | 3 |

### 9.2 需要重点验证的问题

- 公共宝石是否过紧，导致 5 人早期行动拥堵。
- 贵族展示 6 张是否提升贵族路线收益。
- 90 张发展卡是否足够支撑 5 人完整体验。
- 第 5 位玩家在回合顺位上的劣势是否需要房主可选随机首家或轮盘首家。

### 9.3 建议实现

首版保留 5 人模式，但在 UI 中标记为“扩展模式”。核心规则不改变，只调整 setup 参数，并在测试阶段记录：

- 平均回合数。
- 平均游戏时长。
- 首家胜率。
- 末家胜率。
- 贵族路线胜率。
- 高等级卡路线胜率。

## 10. 房间与在线体验

### 10.1 房间流程

1. 首页选择“创建房间”。
2. 输入昵称。
3. 创建房间码，例如 `G7K2Q`。
4. 复制邀请链接。
5. 其他玩家通过房间码或链接加入。
6. 房主选择人数上限、规则模式、是否公开观战。
7. 2 人以上且全员准备后，房主开始游戏。

### 10.2 房间状态

```ts
type RoomPhase =
  | 'lobby'
  | 'starting'
  | 'playing'
  | 'final_round'
  | 'finished'
  | 'abandoned';
```

### 10.3 玩家状态

```ts
interface PlayerState {
  id: string;
  nickname: string;
  seatIndex: number;
  connected: boolean;
  ready: boolean;
  tokens: Record<GemColor | 'gold', number>;
  purchasedCardIds: string[];
  reservedCardIds: string[];
  nobleIds: string[];
  score: number;
  turnCount: number;
}
```

预留卡需要记录来源，用于客户端视图脱敏：

```ts
type ReservedCardVisibility = 'public' | 'private';

interface ReservedCardRef {
  cardId: string;
  source: 'market' | 'deck';
  visibility: ReservedCardVisibility;
}
```

说明：

- 从市场明牌预留：`visibility = 'public'`，所有玩家可见具体卡牌。
- 从牌堆顶盲抽预留：`visibility = 'private'`，只有持有者可见具体卡牌；其他玩家只能看到 1 张隐藏预留卡占位，直到该卡被购买后公开。

### 10.4 公开信息同步

UI 必须完整展示与实体桌游一致的公开信息，不能因为线上化而隐藏关键对局状态。

每名对手公开展示：

- 当前声望值。
- 当前宝石筹码数量，包含黄金。
- 已购买发展卡数量，并按宝石颜色统计永久折扣。
- 已购买发展卡明细，至少可展开查看。
- 已预留卡牌数量与来源。市场明牌预留卡对所有玩家公开具体卡牌；牌堆盲抽预留卡只对持有者展示具体卡牌，对其他玩家显示隐藏占位。
- 已获得贵族。
- 当前是否在线、是否轮到该玩家、是否处于弃宝石/选贵族等等待状态。

隐藏信息：

- 牌堆顺序。
- 牌堆顶部未知卡。
- 其他玩家从牌堆盲抽预留的具体卡牌。

这些信息只能保存在服务端权威状态中，不能出现在发送给非持有者客户端的 snapshot 或 patch 中。

### 10.5 断线重连

必须支持：

- 刷新页面后自动重连。
- 短线断开后保留座位。
- 玩家断线时房间显示“等待重连”。
- 当前玩家断线超过配置时间后，房间进入暂停状态或允许房主解散。

不做：

- AI 接管。
- 自动代打。

推荐配置：

- 重连保留：10 分钟。
- 当前回合断线暂停：默认开启。
- 房间无人在线保留：30 分钟。

### 10.6 在线挂机与回合计时

真人对战且无 AI 接管时，保持连接但不操作的玩家同样可能让房间卡死。MVP 先采用保守策略：

- 每回合默认 90 秒计时，可由房主在 60/90/120 秒中选择。
- 倒计时 30 秒时向当前玩家和房间发出提醒。
- 超时后不自动随机操作，避免破坏竞技公平。
- 超时处理默认进入“等待/暂停”状态，并允许房主发起跳过投票。
- 若全体其他在线玩家同意，服务端执行 `game.passTurn`，记录日志并进入下一玩家。
- 排位、公开匹配等未来模式可再引入更严格的超时判负或自动托管策略。

## 11. 前端产品界面

### 11.1 设计原则

整体应是桌游桌面，而不是营销落地页。首屏直接进入可操作体验：

- 创建房间 / 加入房间。
- 房间大厅。
- 游戏桌面。

视觉风格建议：

- 原创宝石商会主题。
- 深色桌面 + 明亮宝石色点缀，但避免全屏单一紫蓝渐变。
- 卡牌信息密度高，桌游感强。
- 所有可行动作有明确 hover、disabled、selected 状态。

### 11.2 游戏桌面布局

桌面端：

- 中央：三层发展卡市场。
- 顶部：贵族区、公共宝石池、房间码。
- 左侧/右侧：玩家公开信息面板，展示每名玩家声望、宝石、黄金、永久折扣、已购卡、预留卡、贵族和在线状态。
- 底部：当前玩家资产、预留卡、操作区。
- 右下：日志与最近行动。

移动端：

- 顶部：当前回合、公共宝石、房间状态。
- 中部：可横向切换的卡牌等级市场。
- 底部：玩家资产、操作按钮。
- 对手公开信息、预留卡、贵族、日志放入抽屉或标签页，但必须能一键查看，不能隐藏到深层菜单。

### 11.3 核心交互

拿宝石：

- 点击宝石池选择。
- 自动判断是否可拿 3 不同或 2 同色。
- 超过 10 时弹出弃宝石面板。

买卡：

- 卡牌显示当前成本、折扣后仍需支付、是否可购买。
- 点击可购买卡弹确认面板。
- 支付黄金时提供自动分配，也允许手动调整。

预留：

- 卡牌菜单提供“预留”。
- 牌堆顶部提供“盲抽预留”。
- 预留达到 3 张时禁用。

贵族：

- 满足条件后弹出选择贵族。
- 若只有一个可获得，自动获得并播放轻量动画。

## 12. 技术方案

### 12.1 推荐技术栈

前端：

- React 19
- TypeScript
- Vite
- MVP 已安装：React、TypeScript、Vite、lucide-react。
- MVP 后续按需引入：Zustand 或 Jotai、TanStack Router、CSS Modules 或 Tailwind CSS、Framer Motion、Zod。
- 原则：先完成规则闭环和实时房间，避免在首版过早引入非必要前端依赖。

后端：

- Cloudflare Workers
- Durable Objects：房间状态、WebSocket 协调、房间码索引和事务性存储
- MVP 不接入 D1/KV：房间码可使用 `DurableObjectNamespace.idFromName(roomCode)` 作为天然索引；对局 snapshot 和日志优先使用 Durable Object storage。
- D1：仅在需要跨房间查询、排行榜、历史战绩或审计报表时再加入。
- KV：仅在需要跨服务短期缓存或全局静态配置时再加入。
- R2：后续存原创卡牌图、分享图、回放文件。

实时通信：

- WebSocket over Durable Objects。
- 明确采用 Durable Objects WebSocket Hibernation API，房间空闲时降低 duration 成本，匹配免费/低成本部署目标。
- 客户端发送 intent，不直接修改状态
- 服务端权威规则引擎校验 intent 并广播 patch/snapshot

测试：

- Vitest：规则引擎单元测试
- fast-check：规则属性测试
- Playwright：端到端多人房间测试
- MSW：前端接口 mock

### 12.2 目录结构建议

```text
gem_merchant_web/
  README.md
  package.json
  wrangler.toml
  docs/
    PRODUCT.md
    CHECKLIST.md
  src/
    app/
    components/
    routes/
    styles/
    assets/
  worker/
    index.ts
    room-object.ts
    storage.ts
  shared/
    game/
      constants.ts
      types.ts
      setup.ts
      actions.ts
      reducer.ts
      scoring.ts
      validation.ts
      data/
        development-cards.ts
        nobles.ts
    protocol/
      client-events.ts
      server-events.ts
      schemas.ts
  tests/
    game/
    e2e/
```

### 12.3 权威状态模型

```ts
interface GameState {
  id: string;
  mode: 'classic' | 'extended_5p';
  phase: RoomPhase;
  seed: string;
  playerOrder: string[];
  currentPlayerId: string;
  firstPlayerId: string;
  finalRoundStartedBy?: string;
  bank: Record<GemColor | 'gold', number>;
  decks: Record<1 | 2 | 3, string[]>;
  market: Record<1 | 2 | 3, Array<string | null>>;
  nobles: string[];
  players: Record<string, PlayerState>;
  log: GameLogEntry[];
  version: number;
}
```

`GameState` 是服务端权威状态，允许包含完整牌堆顺序、所有卡牌 id 和所有玩家预留卡真实信息。它不能直接广播给客户端。

### 12.4 客户端视图脱敏

服务端必须将 `GameState` 转换为按玩家视角脱敏的 `ClientGameView` 后再发送：

```ts
interface ClientGameView {
  id: string;
  mode: 'classic' | 'extended_5p';
  phase: RoomPhase;
  playerOrder: string[];
  currentPlayerId: string;
  bank: Record<GemColor | 'gold', number>;
  deckCounts: Record<1 | 2 | 3, number>;
  market: Record<1 | 2 | 3, Array<string | null>>;
  nobles: string[];
  players: Record<string, ClientPlayerView>;
  log: GameLogEntry[];
  version: number;
}

interface ClientPlayerView {
  id: string;
  nickname: string;
  seatIndex: number;
  connected: boolean;
  ready: boolean;
  tokens: Record<GemColor | 'gold', number>;
  purchasedCardIds: string[];
  reservedCards: Array<
    | { type: 'public'; cardId: string; source: 'market' }
    | { type: 'hidden'; source: 'deck' }
    | { type: 'private'; cardId: string; source: 'deck' }
  >;
  nobleIds: string[];
  score: number;
  turnCount: number;
}
```

脱敏规则：

- 牌堆只发送剩余张数，不发送顺序和具体卡牌 id。
- 当前玩家自己的盲抽预留卡发送 `{ type: 'private', cardId }`。
- 其他玩家的盲抽预留卡发送 `{ type: 'hidden' }`。
- 市场明牌预留卡对所有玩家发送 `{ type: 'public', cardId }`。
- patch 同样必须按接收玩家视角脱敏，不能用同一份 patch 广播所有隐藏信息。

### 12.5 支付计划

```ts
interface PaymentPlan {
  tokens: Partial<Record<GemColor, number>>;
  goldAs: Partial<Record<GemColor, number>>;
}
```

支付校验规则：

- 折扣先抵扣对应颜色成本。
- `tokens[color]` 支付对应颜色普通宝石。
- `goldAs[color]` 表示用黄金替代该颜色缺口。
- 普通宝石与黄金支付合计必须刚好等于折扣后的剩余成本，不允许多付。
- 玩家不能支付自己没有的普通宝石或黄金。
- 若玩家拥有普通宝石，是否允许主动不用普通宝石而改用黄金：MVP 采用宽松桌游裁定，允许玩家手动选择黄金支付，只要总支付合法且不多付。
- 自动支付只是 UI 辅助，服务端永远以 `PaymentPlan` 校验结果为准。

### 12.6 客户端事件

```ts
interface ClientActionEnvelope<T> {
  actionId: string;
  expectedVersion: number;
  payload: T;
}

type ClientEvent =
  | { type: 'room.join'; roomCode: string; nickname: string; resumeToken?: string }
  | { type: 'room.ready'; ready: boolean }
  | { type: 'room.start' }
  | { type: 'game.takeTokens'; tokens: Partial<Record<GemColor, number>> }
  | { type: 'game.reserveMarketCard'; level: 1 | 2 | 3; slot: number }
  | { type: 'game.reserveDeckCard'; level: 1 | 2 | 3 }
  | { type: 'game.buyMarketCard'; level: 1 | 2 | 3; slot: number; payment: PaymentPlan }
  | { type: 'game.buyReservedCard'; cardId: string; payment: PaymentPlan }
  | { type: 'game.discardTokens'; tokens: Partial<Record<GemColor | 'gold', number>> }
  | { type: 'game.chooseNoble'; nobleId: string }
  | { type: 'game.passTurn'; reason: 'timeout_vote' | 'no_legal_action' };
```

客户端通过 `ClientActionEnvelope<ClientEvent>` 发送行动。服务端使用 `actionId` 做幂等保护，使用 `expectedVersion` 拒绝基于过期状态的行动。

### 12.7 服务端事件

```ts
type ServerEvent =
  | { type: 'state.snapshot'; view: ClientGameView }
  | { type: 'state.patch'; patch: ClientGamePatch; version: number }
  | { type: 'room.playerJoined'; playerId: string; nickname: string }
  | { type: 'room.playerLeft'; playerId: string; reason: 'disconnect' | 'leave' }
  | { type: 'room.timer'; currentPlayerId: string; remainingMs: number }
  | { type: 'game.error'; actionId?: string; code: string; message: string }
  | { type: 'game.actionAccepted'; actionId: string; version: number };
```

### 12.8 服务端原则

- 所有规则判断只在服务端完成。
- 客户端只提交意图。
- 每个 action 必须具备幂等保护：`actionId` 在同一玩家、同一房间内不可重复执行。
- 每个房间状态维护递增 `version`。
- 客户端断线重连时请求当前 snapshot，服务端按该玩家视角生成脱敏视图。
- 所有随机洗牌使用 seed，可复现。
- 游戏结束后保存最终 snapshot 和行动日志；MVP 先写 Durable Object storage，后续如需跨房间查询再同步到 D1。

## 13. 规则引擎测试清单

### 13.1 Setup

- 2 人普通宝石每色 4，黄金 5，贵族 3。
- 3 人普通宝石每色 5，黄金 5，贵族 4。
- 4 人普通宝石每色 7，黄金 5，贵族 5。
- 5 人扩展普通宝石每色 8，黄金 5，贵族 6。
- 每等级市场初始 4 张，若牌堆不足则允许空位。

### 13.2 拿宝石

- 允许拿 3 个不同普通宝石。
- 只有公共池中可选不同颜色不足 3 种时，才允许少于 3 个；可拿满时禁止主动少拿。
- 禁止拿 3 个中包含黄金。
- 禁止拿重复颜色作为 3 宝石行动。
- 当池中同色少于 4 时，禁止拿 2 个同色。
- 拿完超过 10 必须弃牌，弃完前不能进入下一玩家。

### 13.3 预留

- 预留市场卡后补牌。
- 预留市场明牌后，该预留卡继续作为公开信息展示给所有玩家。
- 预留牌堆盲抽卡后，只有持有者可见具体卡牌；其他玩家只看到隐藏预留卡占位。
- 盲抽预留卡被购买后，卡牌进入购买区并对所有玩家公开。
- 预留上限 3。
- 黄金为空时仍可预留。
- 预留卡不可主动丢弃。

### 13.4 购买

- 折扣正确抵扣成本。
- 黄金可补任意颜色缺口。
- 不允许过度支付。
- `PaymentPlan` 中普通宝石与黄金替代必须刚好覆盖折扣后的剩余成本。
- 允许玩家在支付合法且不多付的前提下手动选择黄金替代某颜色缺口。
- 购买后宝石返回公共池。
- 购买后卡牌进入玩家购买区。
- 购买市场卡后补牌。
- 购买预留卡后释放预留槽。

### 13.5 贵族

- 只计算发展卡 bonus，不计算宝石筹码。
- 满足条件后回合末获得。
- 多个可获得时必须选择 1 个。
- 每回合最多获得 1 个。
- 贵族不补充。

### 13.6 终局

- 达到 15 分后触发终局。
- 补齐当前轮。
- 分数最高胜。
- 同分购买卡更少者胜。
- 可复现完整行动日志。

### 13.7 无合法行动与超时

- 极端状态下若当前玩家无法拿宝石、无法预留、无法购买，服务端允许 `game.passTurn`，日志记录为无合法行动跳过。
- 预留已满 3 张时禁止继续预留。
- 宝石池不足时不能构成非法拿取。
- 房主发起并通过超时跳过投票后，服务端允许 `game.passTurn`，日志记录为超时跳过。

## 14. 开发里程碑

产品分为六个里程碑，逐项进度与交付状态见 [CHECKLIST.md](./CHECKLIST.md)。

| 里程碑 | 主题 | 关键交付 |
| --- | --- | --- |
| 0 | 脚手架与数据整理 | 可运行空项目、完整卡牌/贵族数据、数据校验测试 |
| 1 | 单机规则闭环 | 纯函数规则引擎，测试环境可完整跑完一局 |
| 2 | 本地多人 UI | 无后端 mock 对局、桌面端基础 UI 与原创占位视觉 |
| 3 | 实时房间后端 | Durable Object 房间、WebSocket 对战、按视角脱敏 snapshot |
| 4 | 移动端与体验打磨 | 移动端布局、操作弹窗、动效与错误提示 |
| 5 | 5 人扩展与部署 | 5 人模式、Cloudflare 部署、E2E 与基础监控 |

## 15. MVP 范围

必须做：

- 创建房间、加入房间、房间码邀请。
- 2-5 真人座位。
- 准备与开始。
- 基础版全部发展卡和贵族数据。
- 规则引擎服务端权威校验。
- 发展卡市场、宝石池、贵族、玩家资产。
- 拿宝石、预留、购买、弃宝石、贵族选择。
- 终局与排名。
- 断线重连。
- Cloudflare 部署。

暂不做：

- AI 玩家。
- 账号系统。
- 排位系统。
- 付费系统。
- 扩展包。
- 官方卡面复制。
- 语音聊天。
- 复杂观战和回放。

## 16. 数据文件规范

发展卡数据示例：

```ts
export const DEVELOPMENT_CARDS: DevelopmentCard[] = [
  {
    id: 'l1-white-001',
    level: 1,
    bonus: 'white',
    prestige: 0,
    cost: { blue: 1, green: 1, red: 1, black: 1 },
    artSeed: 'moon-market-apprentice',
  },
];
```

贵族数据示例：

```ts
export const NOBLES: NobleTile[] = [
  {
    id: 'noble-001',
    prestige: 3,
    requirement: { white: 3, blue: 3, green: 3 },
    artSeed: 'guild-patron-emerald-court',
  },
];
```

数据校验：

- 发展卡总数必须为 90。
- Level 1 必须为 40。
- Level 2 必须为 30。
- Level 3 必须为 20。
- 贵族总数必须为 10。
- 每张卡必须有唯一 id。
- 每张卡必须有 bonus。
- cost 中不得出现 gold。
- prestige 不得小于 0。

## 17. UI 原创化方向

主题建议：宝石商会、矿脉契约、远航贸易、工坊匠人。

卡牌层级命名：

- Level 1：矿脉与学徒
- Level 2：工坊与商队
- Level 3：大师工艺与王室订单

贵族命名：

- 商会赞助人
- 城邦执政官
- 王室收藏家
- 远航公爵

这些命名只影响表现，不改变数值和机制。

## 18. 部署方案

### 18.1 Cloudflare 架构

```text
Browser
  -> Cloudflare Pages: React static app
  -> Cloudflare Worker: API + WebSocket entry
  -> Durable Object: one room per object
  -> Durable Object storage: room snapshot / action log
  -> Optional later: D1 / KV / R2
```

### 18.2 免费服务适配

首版尽量减少持久化写入：

- 房间实时状态保存在 Durable Object 内存，并定期写入 Durable Object storage。
- 房间码直接通过 `idFromName(roomCode)` 定位 Durable Object，不需要 KV。
- 结束对局先保存在 Durable Object storage；需要历史战绩、跨房间查询或审计时再同步到 D1。
- WebSocket 使用 Durable Objects Hibernation API，降低空闲房间成本。
- 静态资源走 Pages。

### 18.3 环境

```text
local: Vite dev server + Miniflare
preview: Cloudflare preview deployment
production: Cloudflare Pages + Workers
```

## 19. 质量标准

规则质量：

- 单元测试覆盖所有核心规则。
- 属性测试覆盖随机行动不变量。
- 至少 30 局模拟游戏无死锁。

在线质量：

- 弱网断线可恢复。
- 多端状态一致。
- 同一行动不会重复执行。
- 非当前玩家不能行动。

体验质量：

- 桌面端一屏看清主桌面。
- 移动端核心操作不依赖复杂缩放。
- 可购买/不可购买状态清楚。
- 玩家永远知道现在轮到谁、自己能做什么。

## 20. 当前待确认项

这些不阻塞下一步开发，但建议在开发前确认：

1. 5 人模式是否在 UI 上明确标注“扩展模式”。
2. 同分规则是否只使用“购买发展卡更少者胜”，还是增加“仍相同则并列”。
3. 房间是否允许观战，当前建议 MVP 不做。
4. 是否需要房主踢人/解散房间。
5. 原创视觉是偏“古典宝石商会”还是偏“轻幻想卡牌”。
6. 回合超时跳过是否采用全体其他在线玩家一致同意，还是允许房主单独裁决。
7. 原创卡面最终生产方式：程序化生成、AI 辅助生成、外包绘制或混合流程。
