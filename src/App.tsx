import {
  CircleDollarSign,
  Copy,
  Crown,
  Gem,
  Play,
  ShieldCheck,
  Users,
} from 'lucide-react'
import './App.css'

const players = [
  {
    name: '阿岚',
    score: 8,
    gems: ['white', 'blue', 'green', 'gold'],
    discounts: { white: 2, blue: 1, green: 1, red: 0, black: 2 },
    reserved: 2,
    active: true,
  },
  {
    name: '墨川',
    score: 5,
    gems: ['blue', 'green', 'red'],
    discounts: { white: 1, blue: 2, green: 0, red: 2, black: 0 },
    reserved: 1,
    active: false,
  },
  {
    name: '你',
    score: 11,
    gems: ['white', 'red', 'black', 'gold'],
    discounts: { white: 3, blue: 1, green: 0, red: 2, black: 1 },
    reserved: 3,
    active: false,
  },
]

const nobles = [
  ['white', 'white', 'white', 'blue', 'blue', 'blue'],
  ['green', 'green', 'green', 'red', 'red', 'red'],
  ['blue', 'blue', 'black', 'black', 'black'],
  ['white', 'green', 'green', 'red', 'black'],
]

const market = [
  [
    { tier: 'III', points: 4, gem: 'black', cost: ['white', 'white', 'blue', 'green', 'green', 'red'] },
    { tier: 'III', points: 5, gem: 'blue', cost: ['white', 'green', 'green', 'red', 'black'] },
    { tier: 'III', points: 3, gem: 'green', cost: ['blue', 'blue', 'red', 'red', 'black'] },
    { tier: 'III', points: 4, gem: 'red', cost: ['white', 'blue', 'green', 'black', 'black'] },
  ],
  [
    { tier: 'II', points: 2, gem: 'white', cost: ['blue', 'green', 'red', 'red'] },
    { tier: 'II', points: 1, gem: 'green', cost: ['white', 'white', 'blue', 'black'] },
    { tier: 'II', points: 2, gem: 'black', cost: ['green', 'green', 'red', 'white'] },
    { tier: 'II', points: 3, gem: 'blue', cost: ['white', 'green', 'red', 'black'] },
  ],
  [
    { tier: 'I', points: 0, gem: 'red', cost: ['white', 'blue', 'green'] },
    { tier: 'I', points: 1, gem: 'white', cost: ['blue', 'green', 'black'] },
    { tier: 'I', points: 0, gem: 'blue', cost: ['white', 'red', 'black'] },
    { tier: 'I', points: 0, gem: 'green', cost: ['blue', 'red', 'black'] },
  ],
]

const bank = [
  { color: 'white', count: 7 },
  { color: 'blue', count: 7 },
  { color: 'green', count: 7 },
  { color: 'red', count: 7 },
  { color: 'black', count: 7 },
  { color: 'gold', count: 5 },
]

function App() {
  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Gem size={21} />
          </span>
          <div>
            <h1>Gem Merchant</h1>
            <p>房间 GM-7428 · 经典规则 · 第 7 回合</p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" aria-label="复制房间码">
            <Copy size={18} />
          </button>
          <button className="primary-button" type="button">
            <Play size={18} />
            开始
          </button>
        </div>
      </header>

      <section className="game-layout" aria-label="游戏桌面">
        <aside className="player-rail" aria-label="玩家公开信息">
          {players.map((player) => (
            <article className={player.active ? 'player-panel active' : 'player-panel'} key={player.name}>
              <div className="panel-title">
                <div>
                  <h2>{player.name}</h2>
                  <p>{player.active ? '当前行动' : '等待'}</p>
                </div>
                <strong>{player.score}</strong>
              </div>
              <div className="gem-row">
                {player.gems.map((gem, index) => (
                  <span className={`gem-token ${gem}`} key={`${player.name}-${gem}-${index}`} />
                ))}
              </div>
              <div className="discount-grid">
                {Object.entries(player.discounts).map(([color, value]) => (
                  <span className={`discount ${color}`} key={color}>
                    {value}
                  </span>
                ))}
              </div>
              <div className="meta-row">
                <span>
                  <ShieldCheck size={15} />
                  预留 {player.reserved}
                </span>
                <span>
                  <Crown size={15} />
                  贵族 0
                </span>
              </div>
            </article>
          ))}
        </aside>

        <section className="table-surface" aria-label="公共牌桌">
          <div className="table-header">
            <div className="noble-track" aria-label="贵族">
              {nobles.map((requirements, index) => (
                <article className="noble-tile" key={index}>
                  <Crown size={18} />
                  <strong>3</strong>
                  <div className="mini-cost">
                    {requirements.map((gem, gemIndex) => (
                      <span className={`mini-gem ${gem}`} key={`${gem}-${gemIndex}`} />
                    ))}
                  </div>
                </article>
              ))}
            </div>
            <div className="bank" aria-label="公共宝石池">
              {bank.map((item) => (
                <button className={`bank-token ${item.color}`} type="button" key={item.color}>
                  <span>{item.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className="market" aria-label="发展卡市场">
            {market.map((row) => (
              <div className="market-row" key={row[0].tier}>
                <div className="tier-label">{row[0].tier}</div>
                {row.map((card, index) => (
                  <article className={`dev-card ${card.gem}`} key={`${card.tier}-${index}`}>
                    <div className="card-top">
                      <strong>{card.points}</strong>
                      <span className={`bonus ${card.gem}`} />
                    </div>
                    <div className="card-art">
                      <CircleDollarSign size={36} />
                    </div>
                    <div className="card-cost">
                      {card.cost.map((gem, gemIndex) => (
                        <span className={`mini-gem ${gem}`} key={`${gem}-${gemIndex}`} />
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ))}
          </div>
        </section>

        <aside className="action-panel" aria-label="当前玩家操作">
          <div className="panel-title">
            <div>
              <h2>行动</h2>
              <p>阿岚的回合</p>
            </div>
            <Users size={20} />
          </div>
          <div className="action-stack">
            <button className="secondary-button selected" type="button">
              拿 3 颗不同宝石
            </button>
            <button className="secondary-button" type="button">
              拿 2 颗同色宝石
            </button>
            <button className="secondary-button" type="button">
              购买所选发展卡
            </button>
            <button className="secondary-button" type="button">
              预留所选发展卡
            </button>
          </div>
          <ol className="event-log" aria-label="最近行动">
            <li>你购买了蓝色工坊，获得 1 声望。</li>
            <li>墨川预留了一张 II 级发展卡。</li>
            <li>阿岚拿取白、蓝、绿宝石。</li>
          </ol>
        </aside>
      </section>
    </main>
  )
}

export default App
