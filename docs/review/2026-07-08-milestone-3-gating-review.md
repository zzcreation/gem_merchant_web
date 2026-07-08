# Gating Review: Milestone 3 联机骨架

- **日期**: 2026-07-08
- **范围**: `0ffa8ca..HEAD`（`927393d` feat: add resilient room reconnects 及之前 3 个提交）
- **结论**: **不通过（Blocked）** — 存在 1 个规则违反和 3 个服务端信任/安全问题，需修复 Major 1–4 后再进行里程碑 3 的双浏览器联机验收
- **验证基线**: `npm test` 20/20 通过；卡牌数据 40/30/20 张符合预期
- **复审（2026-07-08 16:10）**: **通过（Unblocked）** — `3fe827f` 修复 Major 1–6 及 Medium 1–4、6，复审确认见文末「复审记录」；可进入双浏览器联机验收

---

## Major（阻断验收）

### 1. 预留卡可使玩家超过 10 枚宝石上限且不触发弃宝石

`takeTokens` 是唯一检查宝石上限的行动。两条预留路径都会拿金币并直接结束回合：

```ts
// shared/game/actions.ts — reserveMarketCard (reserveDeckCard 同理)
state.market[level][slot] = state.decks[level].shift() ?? null
player.reservedCards.push({ cardId, source: 'market', visibility: 'public' })
takeGoldIfAvailable(state, player)

return endTurn(state, playerId, `${player.nickname} reserved a market card.`)
```

持有 10 枚宝石的玩家预留后会以 11 枚结束回合，违反核心规则（回合结束时不得超过 10 枚）。

**修复方向**: 在 `reserveMarketCard` / `reserveDeckCard` 中复用 `takeTokens` 的 `countTokens(...) > MAX_TOKENS_PER_PLAYER → awaiting_token_discard` 检查。

### 2. resumeToken 就是 playerId，且对所有人广播

```ts
// worker/room.ts — join()
activeConnection.connection.send({
  type: 'room.joined',
  roomCode: this.roomCode,
  playerId,
  resumeToken: playerId,
})
```

每次 `room.lobby` 广播和游戏 snapshot 都包含所有玩家的 playerId。由于 `resumeToken === playerId`，房间内任何客户端都可以用他人的 playerId 作为 resumeToken 发送 `room.join`，完全劫持对方席位（以对方身份行动、查看其私有预留暗牌）。

**修复方向**: resumeToken 应为每位玩家单独生成的秘密值，仅发给本人，与公开的 playerId 分离。

### 3. 牌堆顺序可由公开信息推算

```ts
// worker/room.ts — startGame()
this.gameState = createInitialGameState({
  id: this.roomCode,
  seed: `${this.roomCode}:${players.map((player) => player.id).join('|')}`,
  players,
})
```

seed 由房间码和玩家 ID 拼接而成（两者对所有客户端可见），且洗牌算法是共享代码中的确定性 FNV/LCG。作弊客户端可以完整重算牌堆顺序，使 `view.ts` 的视图脱敏（暗牌、牌堆计数）形同虚设。

**修复方向**: 服务端用 `crypto.randomUUID()` 等生成随机 seed，且永不下发给客户端。

### 4. 网络载荷缺少数值校验 — 小数支付可污染状态

Worker 将 `JSON.parse(data)` 直接断言为 `ClientActionEnvelope`，reducer 从不检查整数性。在 `validatePayment` 中，对成本为 2 的卡提交 `{ tokens: { white: 1.5 }, goldAs: { white: 0.5 } }` 能通过所有检查（`1.5 + 0.5 === 2`），客户端可借此系统性少付整枚宝石，并使银行和玩家钱包出现小数。

**修复方向**: 在房间边界或 reducer 入口，对所有经网络传入的数值（`takeTokens`、`discardTokens`、两个支付 map、`level`、`slot`）校验为非负整数。

### 5. 大厅席位永不释放，弃坑玩家可死锁房间

`disconnect` 只把 `connected` 置为 false，没有离开/踢出路径，而 `startGame` 要求 players map 中**所有**玩家都 ready：

```ts
// worker/room.ts — startGame()
if (players.some((player) => !player.ready)) {
  throw new Error('All players must be ready before starting.')
}
```

加入大厅后关闭标签页的玩家会永久占用 5 席之一，并使游戏永远无法开始。

**修复方向**: 增加显式 `room.leave` 事件，或踢出断线且未 ready 的大厅玩家，或 ready 检查排除断线玩家。

### 6. WebSocket close 竞态导致 UI 连接状态错误

`App.tsx` 的 `disconnectRoom` 先调用 `socket.close()` 再把状态设为 `local`，但 socket 的 `close` 事件随后异步触发，其监听器无条件将状态设为 `closed` 并覆盖提示消息 — 点击「本地」后 UI 显示「已断开」。`connectRoom` 存在同样竞态：旧 socket 的 `close` 可能在新 socket `open` 之后触发，把健康连接翻成「已断开」。

**修复方向**: 事件处理器忽略过期 socket（`if (wsRef.current !== socket) return`）。

---

## Medium（建议本里程碑内修复）

1. **最终轮 phase 回退为 `playing`**。`finishEndTurn` 用 `state.phase === 'final_round' ? 'final_round' : 'playing'` 计算下一 phase；若最终轮中发生弃宝石或选贵族，此时 phase 是 `awaiting_token_discard` / `awaiting_noble_choice`，会回退为 `playing`。终局判定不受影响（依赖 `finalRoundStartedBy`），但客户端看到错误 phase。应改由 `finalRoundStartedBy` 推导。
2. **畸形消息产生僵尸 socket**。`worker/index.ts` 的 `handleMessage` catch 中调用 `controller.disconnect(connectionId)` 但不关闭 WebSocket；连接已从 map 移除，此后该 socket 的所有消息被静默忽略，而客户端自认为仍在线。应关闭 socket 或仅回发 `game.error`。
3. **存储写入的未处理 rejection**。`persist` 链式调用 `storageWrite.catch(...).then(put)`，但**最新**一次写入的 rejection 在下次 persist 前无处理器 — DO 中存在 unhandled-rejection 窗口。应在链尾追加 `.catch(...)`。
4. **Vite dev 无 `/api` 代理**。`connectRoom` 指向 `window.location.host`，联机模式只能在 `wrangler dev` 下工作。在 `vite.config.ts` 增加 `server.proxy = { '/api': { target: ..., ws: true } }` 可让 `npm run dev` 内循环覆盖房间流程。
5. **联机模式乐观成功提示**。`run()` 在服务端响应前就显示成功消息并清空选择；被拒绝时先见成功后见错误，令人困惑。应按 `actionId` 关联 `game.actionAccepted` / `game.error` 再更新提示。
6. **联机模式未做「是否轮到我」的门控**。所有行动按钮都假设查看者是当前玩家；`discardAutomatically` / `chooseFirstNoble` 甚至用 `currentPlayer` 构造载荷。非当前玩家只会收到服务端拒绝。应在 `playerId !== view.currentPlayerId` 时禁用行动。

## Minor（记录在案，可延后）

- reducer 的 `startGame` 跳过 `assertCurrentPlayer`，房间层面任何已加入玩家都能开始 — 可考虑仅房主可开始。
- 复制房间码按钮（`aria-label="复制房间码"`）没有 `onClick`。
- 日志条目使用 `turn: state.log.length`（是日志下标而非回合数），且每次 snapshot/patch 都重发完整日志，一局内会无限增长。
- `state.patch` 当前携带完整视图，名字暗示增量。作为占位可以，但别让客户端开始假设它很轻量。
- 房间码在客户端被 `sanitizeRoomCode` 转大写，但 worker 的 `idFromName` 大小写敏感 — 未转大写的客户端会进入不同房间。
- `shuffle` 用 `state % (index + 1)` 存在取模偏差 — 该量级下对公平性影响可忽略，但 seed 也要按 Major 3 一并替换。
- 连接到大厅后（收到首个 snapshot 前）UI 仍渲染本地 mock 牌桌，看起来像联机对局已经开始。

---

## 验收前置条件

按 `docs/CHECKLIST.md` 里程碑 3 的双浏览器验收计划，进入验收前必须完成：

- [x] Major 1：预留超 10 枚宝石强制弃宝石
- [x] Major 2：resumeToken 与 playerId 分离，仅发本人
- [x] Major 3：服务端随机 seed，不下发客户端
- [x] Major 4：网络数值输入的非负整数校验
- [x] Major 5：大厅席位释放 / ready 检查排除断线玩家（双浏览器测试会直接触发）
- [x] Major 6：WebSocket 状态竞态修复（双浏览器测试会直接触发）

Medium 1–6 建议在里程碑 3 收尾时一并处理；Minor 项可排入里程碑 4。

---

## 修复记录（2026-07-08）

- Major 1：`reserveMarketCard` / `reserveDeckCard` 拿金币后复用 10 枚上限检查，超限进入 `awaiting_token_discard`。
- Major 2：`resumeToken` 改为独立 secret，不再等于公开 `playerId`；`room.lobby` 只广播公开字段。
- Major 3：服务端开局 seed 改为 secret 随机值，不再由房间码和公开玩家 ID 推导。
- Major 4：规则入口校验网络 action 里的 token map、支付 map、level、slot 均为合法非负整数。
- Major 5：大厅中未准备且断线的玩家会释放席位，开局前会清理这类席位。
- Major 6：前端 WebSocket 事件处理器忽略过期 socket，手动切回本地不会被旧 close 事件覆盖状态。
- 同步处理 Medium 1/2/3/4 和 Minor 的复制房间码按钮：最终轮 phase 推导、畸形消息关闭 socket、storage 写入 rejection 收口、Vite `/api` WebSocket 代理、复制房间码。

验证：`npm run test` 6 文件 24 条通过；`npm run build`、`npm run lint`、`wrangler deploy --dry-run` 通过；`wrangler dev` 本地 WebSocket smoke 通过 secret token 重连、非法公开 playerId 拒绝、大厅断线席位释放。

---

## 复审记录（2026-07-08 16:10，commit `3fe827f`）

逐项核对代码与新增测试，独立复跑 `npm test`（24/24）、`npm run build`、`npm run lint`，全部通过。

- **Major 1 ✅** 两条预留路径在拿金币后检查 `countTokens > 10`，进入 `awaiting_token_discard`；新增测试确认回合保留在预留者且金币已入手。
- **Major 2 ✅** `RoomPlayer.resumeToken` 由独立 `createSecret` 生成，仅经 `room.joined` 发给本人；`broadcastLobby` 显式挑选公开字段；入侵者测试证明公开 playerId 无法夺取席位。
- **Major 3 ✅** seed 改为 `server-${createSecret()}`；确认 `ClientGameView` 不含 seed 字段，客户端无从推算牌堆。
- **Major 4 ✅** `assertValidActionShape` 在 reducer 入口校验全部数值字段（token map 限定已知颜色 + 非负整数、支付两个 map、level、slot）；小数支付测试通过。放在 reducer 入口同时覆盖本地 mock 路径。
- **Major 5 ✅** 断线且未 ready 的大厅玩家在 disconnect 时和 startGame 前被移除；新增测试覆盖。已知留白：已 ready 后消失的玩家仍占席并以断线状态进局，其回合会卡住对局，需里程碑 4 的回合计时器兜底。
- **Major 6 ✅** 四个 socket 事件处理器均有 `wsRef.current !== socket` 守卫；`disconnectRoom` 先置空 ref 再 close，「本地」状态不再被旧 close 事件覆盖。
- **Medium 1–4、6 ✅** phase 由 `finalRoundStartedBy` 推导；畸形消息关闭 socket（1003/1007）；persist 链尾补 catch；Vite `/api` 代理（`ws: true`）；非当前玩家的行动按钮已禁用；复制房间码按钮已实现。
- **Medium 5 ⏳ 未修复**：`run()` 仍在服务端响应前显示乐观成功消息，被拒绝时先见成功后见错误；建议随里程碑 4 的操作确认/错误提示工作一并处理。
- 兼容性备注：修复前持久化的房间快照中玩家没有 `resumeToken`，旧会话无法续连，会以新玩家身份重新加入；开发阶段可接受。

**复审结论：通过（Unblocked）。** 可进入 host browser + OpenClaw sandbox browser 双浏览器联机验收。

---

## 联机验收记录（2026-07-08 17:05）

### 已通过

- `wrangler dev --ip 0.0.0.0 --port 8787` 可通过 host `127.0.0.1:8787` 和 sandbox `172.31.254.42:8787` 访问。
- sandbox 浏览器可打开应用、渲染 `Gem Merchant`、加入在线房间并点击准备；曾在 `E2E-714` 中与 HostA 成功开局，HostA 视角看到两名玩家、当前轮到 Sandbox，非当前玩家行动按钮禁用。
- Host 双浏览器复核通过：房间 `E2E-HOST` 中 HostA 先入房、HostB 后入房，双方 ready 后 HostA 开局并拿白/蓝/绿各 1 枚；HostB 视角同步看到：
  - header：`房间 E2E-HOST · 经典规则 · 进行中 · 在线`
  - HostA token：白/蓝/绿为 `1/1/1`
  - 当前玩家：HostB
  - 日志：`HostA took tokens.`

### 未作为通过项

- sandbox 行动阶段未稳定复现：后续 sandbox 子会话没有复用到上一轮浏览器状态和 `resumeToken`，再次加入已开局房间会被服务端正确拒绝；fresh-room 重跑时 sandbox 能加入并 ready，但本地 `wrangler dev` 在等待期间退出，导致无法完成 sandbox 侧首回合行动。
- OpenClaw browser `screenshot` 调用曾超时；本次证据以 browser snapshot/evaluate 文本状态和服务端日志为主。

### 结论

里程碑 3 的联机核心链路（房间码加入、ready/start、服务端规则 action、跨浏览器状态广播、非当前玩家门控）已通过 host 双浏览器和 sandbox 可达性验证。完整 host+sandbox 行动截图仍受当前 sandbox 会话保持与本地 dev 服务稳定性影响，作为环境验收风险记录，不阻塞继续进入里程碑 4 的交互打磨。
