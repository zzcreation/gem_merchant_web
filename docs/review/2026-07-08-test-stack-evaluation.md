# Test Stack Evaluation: OpenClaw Sandbox 与 Playwright E2E

- **日期**: 2026-07-08
- **范围**: 里程碑 3 联机验收测试栈
- **结论**: 当前 OpenClaw sandbox browser 适合作为环境冒烟和人工辅助验证，不适合作为多人实时房间的主验收栈。建议新增 Playwright 双 browser context E2E 作为稳定、可重复的主验收方案；落地前需先补齐可复现的 worker dev 启动脚本、双服务拓扑、唯一房间码策略和在线 lobby 状态。

---

## 背景

里程碑 3 已完成 Durable Object 房间、WebSocket 协议、加入/准备/开始、行动广播、断线重连与服务端规则校验。验收阶段尝试使用 host browser + OpenClaw sandbox browser 模拟两个独立玩家：

- host browser 作为 HostA；
- sandbox browser 作为 Sandbox；
- 双方加入同一房间，ready，开始游戏；
- Sandbox 或 HostA 执行拿宝石行动；
- 另一端验证状态同步、回合推进与日志。

验收过程中，sandbox 可以打开页面、加入房间、点击准备，也曾与 HostA 成功开局。但后续把操作拆到新的 sandbox 子会话时，新的子会话无法复用上一轮浏览器状态，导致无法恢复已开局房间。

---

## 原方案：OpenClaw Host Browser + Sandbox Browser

### 目标

用 OpenClaw 提供的浏览器能力模拟真实双端：

1. parent/host 浏览器访问 `http://127.0.0.1:8787`；
2. sandbox 子会话浏览器访问 `http://172.31.254.42:8787`；
3. 两个浏览器加入同一 room code；
4. 双方 ready 后由 HostA 开始房间；
5. 当前玩家执行一项合法行动；
6. 另一端验证 snapshot / patch 已广播。

### 已验证能力

- sandbox 浏览器可访问本地 `wrangler dev` 暴露的服务。
- 应用可在 sandbox 中渲染 `Gem Merchant`。
- sandbox 可加入在线房间并点击 ready。
- host 双浏览器验证已通过：
  - HostA 与 HostB 加入同一房间；
  - 双方 ready 后开局；
  - HostA 拿白/蓝/绿各 1 枚；
  - HostB 视角看到 HostA token 更新、当前玩家推进、日志同步。

### 失败点

后续将 sandbox 行动阶段拆成新的子会话继续执行时，新 sandbox 子会话无法恢复上一轮状态：

- 浏览器打开时是全新页面或 `about:blank`；
- `localStorage` 中没有 `gem-merchant-room-session`；
- 没有上一轮下发给 Sandbox 的 `resumeToken`；
- 尝试重新加入已开局房间时，服务端返回拒绝，这是正确的服务端行为；
- fresh-room 重跑时，sandbox 可加入和 ready，但本地 `wrangler dev` 在等待过程中退出，导致后续 URL 连接失败。

---

## 根因分析

### 1. Sandbox browser 是 session scope

当前 OpenClaw 的 `browser-sandbox` 配置使用 session 级隔离：

```json
{
  "sandbox": {
    "mode": "all",
    "backend": "docker",
    "workspaceAccess": "rw",
    "scope": "session",
    "browser": {
      "enabled": true,
      "headless": true,
      "autoStart": true,
      "allowHostControl": false
    }
  }
}
```

这意味着每个新的 sandbox 子会话都会获得独立的容器、浏览器 profile 和 localStorage。不同子会话之间不应期待浏览器状态复用。

### 2. 子会话 run 模式不是长期浏览器控制器

本次验证把一个端到端流程拆成多个 sandbox 子会话执行。每个子会话是一次独立任务，不是对同一个浏览器 profile 的持续控制。因此第一个子会话里保存的页面状态、localStorage、WebSocket 连接和 resume token，不会自然出现在第二个子会话中。

### 3. Resume token 只存在浏览器本地

Gem Merchant 的断线恢复凭据 `resumeToken` 只发给当前玩家并存入该浏览器的 localStorage。新子会话没有这份 localStorage，因此无法以同一玩家身份恢复连接。

服务端拒绝新 join 已开局房间是正确行为。如果允许无 token 的新连接加入已开始对局，会破坏房间席位和视图脱敏模型。

### 4. Parent session 不能直接接管 sandbox browser

parent 会话不是 sandboxed session，没有 sandbox browser bridge。`target=sandbox` 只在拥有 sandbox browser 的子会话中可用。当前配置还设置了 `allowHostControl: false`，sandbox 子会话也不能反向控制 host browser。

### 5. Dev server 进程稳定性影响验收

`wrangler dev` 在一次长时间等待中退出，导致 `172.31.254.42:8787`、`10.255.255.254:8787` 和 `127.0.0.1:8787` 均连接失败。多人 E2E 依赖一个持续可用的 dev server，当前手动编排方式对进程生命周期不够稳。

需要注意的是，之前的退出不一定说明 `wrangler dev` 本身不适合 E2E。更可能的因素是它运行在交互式 TTY/手工会话中，stdin 关闭或会话结束会带走进程。Playwright `webServer` 应以非交互/CI 方式启动并捕获日志，再评估是否需要迁移到 Miniflare 或 `@cloudflare/vitest-pool-workers`。

### 6. 联机 lobby UI 是 E2E 前置阻断项

应用进入在线 lobby 后，在收到游戏 snapshot 前仍显示本地 mock 棋盘，例如本地房间 `GM-7428` 和本地玩家。这不只是视觉问题，也会影响测试稳定性和状态语义：

- 当前视图由 `onlineView ?? localView` 推导，未开局时会回退到本地 mock view；
- ready toggle 依赖 viewer player 状态，未收到 online snapshot 时可能读到 mock player；
- `room.lobby` 事件目前只更新提示信息，没有把 lobby roster 存入客户端状态；
- 用户和测试脚本无法可靠看到其他玩家的 ready 状态。

因此 Playwright E2E 前应先补在线 lobby 状态模型：存储 `room.lobby` roster，未开局时渲染真实 lobby，并让准备按钮由在线 lobby player 状态驱动。

### 7. 当前仓库缺少可复现的 Worker 启动依赖

`package.json` 当前没有 `wrangler` devDependency，也没有 worker dev script。之前验证依赖全局或 `npx wrangler`，这不足以支撑“一条命令可复现”和 CI。

E2E 落地时应将 `wrangler` 固定为 devDependency，并新增例如 `dev:worker` 的脚本，供 Playwright `webServer` 调用。

### 8. Durable Object 本地状态会跨运行保留

`wrangler dev` 会把 Durable Object 状态持久化到本地 `.wrangler/state`。如果 E2E 重复使用固定房间码，第二次运行可能命中已开始的旧房间，并再次得到 `Cannot join a game that has already started`。

测试必须每次生成唯一 room code，或者让 `wrangler dev` 使用临时 `--persist-to` 目录。唯一 room code 是首选，因为它同时模拟真实用户创建新房间的路径。

---

## 对原方案的评估

### 适合保留的用途

OpenClaw sandbox browser 仍有价值，适合用于：

- 验证 sandbox 网络是否能访问本地服务；
- 冒烟测试页面能否渲染；
- 人工确认在线房间可加入、按钮可点击；
- 在同一个长生命周期子会话内完成一次完整交互；
- 复核真实隔离环境下的浏览器兼容性。

### 不适合作为主验收栈的原因

- 状态依赖子会话生命周期，拆分任务后无法复用浏览器 profile。
- 失败证据主要依赖文本报告，截图/trace/video 不稳定。
- 多玩家同步需要精确协调两个浏览器，跨 agent 编排成本高。
- `wrangler dev` 生命周期由人工或外部会话维护，容易在等待期间丢失。
- 不便接入 CI，也不便在本地一条命令复现。

---

## 可选改造方案

### 方案 A：把完整流程放进同一个 sandbox 子会话

让一个 sandbox 子会话从打开页面、加入、ready、等待开局到执行行动全部完成，中途不切换子会话。

**优点**

- 改动最小；
- 可以继续利用现有 OpenClaw sandbox；
- localStorage 和 WebSocket 状态在同一子会话内可保持。

**缺点**

- 仍然难以稳定协调 host 端动作；
- 失败证据不如 Playwright trace 完整；
- 不适合 CI；
- 子会话中断后无法恢复。

### 方案 B：把 sandbox scope 改成 agent 级共享

将 sandbox scope 从 `session` 改成更共享的 agent 级别，使同一个 agent 的多个子会话可能复用同一浏览器环境。

**优点**

- 可以跨子会话保留 localStorage；
- 对当前验证脚本改动较小。

**缺点**

- 降低隔离性，旧测试状态可能污染新测试；
- 需要额外清理 profile；
- 与 sandbox 的安全/可重复性目标相冲突；
- 不建议作为默认配置。

### 方案 C：增加 test-only resume hook

在测试环境中把 `resumeToken` 暴露给父进程或测试控制器，再由新子会话注入 localStorage 或通过特定接口恢复玩家身份。

**优点**

- 可以绕过子会话 localStorage 丢失；
- 能继续拆分子任务。

**缺点**

- 引入只为测试存在的特殊入口；
- 容易偏离真实用户路径；
- 需要非常小心避免泄露到生产环境；
- 不如直接使用专业 E2E runner 干净。

### 方案 D：允许 sandbox 控制 host browser

设置 `allowHostControl: true`，让 sandbox 子会话直接控制 host 浏览器。

**优点**

- 可以集中控制两个浏览器。

**缺点**

- 削弱 sandbox 隔离；
- host 浏览器状态也会进入测试污染面；
- 不推荐作为常规验收方案。

---

## 推荐新方案：Playwright 双 Context E2E

### 核心思路

在仓库内新增 Playwright 测试，用一个 test process 创建两个独立 browser context，分别模拟 Sandbox 和 HostA。

两个 context 天然隔离 localStorage、cookies 和页面状态，但由同一段测试代码统一调度，因此可以稳定执行多人实时流程。

### 推荐服务拓扑

推荐使用 Playwright 的多 `webServer` 配置启动两个本地服务：

1. `npm run dev:worker` 启动 `wrangler dev`，监听 `127.0.0.1:8787`，提供 Durable Object 与 `/api` WebSocket；
2. `npm run dev -- --host 127.0.0.1 --port 5173` 启动 Vite，提供最新前端代码；
3. Playwright 测试访问 `http://127.0.0.1:5173`；
4. Vite 的 `/api` proxy 转发到 `127.0.0.1:8787`，包括 WebSocket。

这样不需要每次先 build，也避免 `wrangler.toml` 的 `[assets] directory = "./dist"` 服务到陈旧 dist。它比“`npm run build && wrangler dev` 后测试 `8787`”更适合开发和 CI 快速反馈。

可选的生产近似模式仍可保留为单独 job：

1. `npm run build`；
2. `npm run dev:worker`；
3. 测试访问 `http://127.0.0.1:8787`。

该模式更接近部署形态，但速度更慢，也更容易因为 stale dist 造成误判。

### 需要新增的依赖与脚本

建议在实现时新增：

```json
{
  "scripts": {
    "dev:worker": "wrangler dev --local --ip 127.0.0.1 --port 8787",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui"
  },
  "devDependencies": {
    "@playwright/test": "...",
    "wrangler": "..."
  }
}
```

首次本地或 CI 环境安装浏览器依赖：

```bash
npx playwright install --with-deps chromium
```

WSL2 环境尤其需要 `--with-deps` 安装系统依赖。

### 建议覆盖的首个 E2E 场景

1. 启动本地 Worker dev server 和 Vite dev server；
2. 生成唯一 room code，例如 `E2E-${Date.now().toString(36)}`；
3. 打开 Sandbox 页面，输入 room code 和昵称，作为第一个玩家加入房间；
4. 打开 HostA 页面，使用同一 room code 加入房间；
5. 两端点击 ready；
6. HostA 点击开始房间；
7. Sandbox 选择三种不同普通宝石并点击“拿所选宝石”；
8. HostA 断言：
   - 房间处于进行中；
   - Sandbox token 增加；
   - 银行对应 token 减少；
   - 当前玩家推进到 HostA；
   - 日志精确出现 `Sandbox took tokens.`。

这里不需要“如果 Sandbox 是当前玩家”的分支。规则 setup 以 `playerOrder[0]` 作为 `currentPlayerId`，因此让 Sandbox 第一个加入即可确定 Sandbox 首手行动。

### Playwright 配置建议

- `webServer` 使用数组，同时启动 worker 和 Vite；
- `baseURL` 指向 `http://127.0.0.1:5173`；
- `trace: 'retain-on-failure'`；
- `screenshot: 'only-on-failure'`；
- `video: 'retain-on-failure'`；
- suite 级共享 webServer，不要每个 test 单独启动，避免变慢和端口竞争；
- room code 每个 test 唯一，避免 Durable Object 状态复用污染。

### Selector 建议

已有可直接使用的可访问控件：

- `getByLabel('房间码')`；
- `getByLabel('昵称')`；
- `getByRole('button', { name: '加入' })`；
- `getByRole('button', { name: '准备' })`；
- `getByRole('button', { name: '开始房间' })`；
- `getByRole('button', { name: '拿所选宝石' })`。

更需要补 `data-testid` 的是断言目标：

- room status；
- current player；
- player token summary；
- bank token summary；
- action log。

日志断言可以精确使用 engine log：`Sandbox took tokens.`。

### 备选拓扑

如果 `wrangler dev` 在 Playwright webServer 非交互启动后仍不稳定，再考虑：

1. 使用临时 `--persist-to` 目录隔离状态；
2. 使用 Miniflare / workerd programmatic integration；
3. 引入 `@cloudflare/vitest-pool-workers` 补真实 Worker + Durable Object + WebSocket Hibernation 的协议层覆盖。

其中 `@cloudflare/vitest-pool-workers` 可补齐当前 Layer 2 只测 `GameRoomController` fake connections、未覆盖 `worker/index.ts` 真实 DO/Hibernation 路径的缺口，但可以后置，不阻塞第一版 Playwright E2E。

### 优点

- 一条命令可复现；
- 可接入 CI；
- 两个玩家可被同一测试精确调度；
- localStorage 隔离真实且可控；
- trace/screenshot/video 证据完整；
- 失败可定位到具体 selector、network 或断言；
- 不依赖 OpenClaw 子会话生命周期。

### 风险与成本

- 需要新增 Playwright 依赖；
- 需要新增 pinned `wrangler` 依赖和 worker dev script；
- 需要用双 webServer 明确前端与 worker 的服务拓扑；
- 需要保证每次 E2E 使用唯一 room code 或临时持久化目录；
- 在线 lobby UI 状态模型需要先修正；
- UI assertion selector 需要补充 `data-testid`；
- 第一次落地会增加少量测试配置维护成本。

---

## 建议的测试分层

### 1. 单元与规则层：Vitest

继续覆盖：

- 规则 reducer；
- token 上限；
- 预留、购买、贵族、终局；
- action shape validation；
- 视图脱敏。

### 2. 协议与房间层：Vitest / Worker integration

继续覆盖：

- join / resume；
- ready / start；
- 非法 action 拒绝；
- 断线席位释放；
- snapshot / patch 形状；
- secret resume token 不泄露。

当前主要覆盖 `GameRoomController` 与 fake connections。真实 Durable Object、`worker/index.ts` 路由和 WebSocket Hibernation 路径主要将由 Playwright E2E 间接覆盖；后续可用 `@cloudflare/vitest-pool-workers` 补更细的 worker integration。

### 3. UI 多人链路：Playwright

新增覆盖：

- 双玩家加入同一房间；
- ready / start；
- 当前玩家行动；
- 非当前玩家按钮禁用；
- 另一端实时看到状态更新；
- 断线刷新后可恢复。

### 4. 环境冒烟：OpenClaw Sandbox

保留为非阻断或人工验收：

- sandbox 可访问本地服务；
- 页面可渲染；
- 能加入房间；
- 能完成一次基础点击；
- 记录环境问题，而不是作为主验收凭据。

---

## 推荐迁移步骤

1. 修正在线 lobby UI：连接到在线房间但未开始时存储并渲染 `room.lobby` roster，准备按钮由在线玩家状态驱动，不再回退到本地 mock 棋盘。
2. 为关键断言目标补充稳定 `data-testid`：
   - room status；
   - current player；
   - player token summary；
   - bank token summary；
   - action log。
3. 添加 pinned `wrangler` devDependency 和 `dev:worker` script。
4. 添加 Playwright 基础配置、`@playwright/test`、`test:e2e` 和 `test:e2e:ui` scripts。
5. 使用双 `webServer`：worker 在 `8787`，Vite 在 `5173`，测试访问 Vite。
6. 编写首个双 context 联机 E2E，使用唯一 room code，并让 Sandbox 第一个加入以确定首手。
7. 设置 trace/screenshot/video 仅在失败时保留。
8. 更新首次安装说明：`npx playwright install --with-deps chromium`。
9. 将 `docs/CHECKLIST.md` 的“Playwright 多人 E2E”从里程碑 5 前移到里程碑 4 前置或里程碑 3 收尾项。
10. OpenClaw sandbox 验收降级为环境冒烟，不再阻塞主流程。

---

## 最终建议

保留原 OpenClaw sandbox browser 方案，但调整定位：它用于真实隔离环境的冒烟验证，不再承担多人实时联机主验收。

主验收栈建议迁移到 Playwright 双 browser context，并明确使用“wrangler worker + Vite frontend”的双服务拓扑：

- 更稳定；
- 更接近工程化 E2E；
- 更容易复现；
- 更适合 CI；
- 更能给 review 留下可靠证据。

对 Gem Merchant Web 来说，下一步最值得做的是先修正在线 lobby UI，再新增 Playwright 双 context E2E，并把“两个玩家在线开局后，Sandbox 首手拿三种宝石，HostA 看到状态同步和回合推进”固化成自动化测试。
