import { useMemo, useState } from 'react'
import {
  CircleDollarSign,
  Copy,
  Crown,
  Gem,
  Play,
  RotateCcw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { applyGameAction } from '../shared/game/actions'
import { GEM_COLORS, TOKEN_COLORS } from '../shared/game/constants'
import { getDevelopmentCard, getNoble } from '../shared/game/catalog'
import { createInitialGameState } from '../shared/game/setup'
import { createClientGameView } from '../shared/game/view'
import type { GameState, GemColor, PaymentPlan, PlayerState, TokenColor } from '../shared/game/types'
import './App.css'

type Level = 1 | 2 | 3

const playerSetups = [
  { id: 'p1', nickname: '阿岚' },
  { id: 'p2', nickname: '墨川' },
  { id: 'p3', nickname: '你' },
]

function createMockGame(): GameState {
  return applyGameAction(
    createInitialGameState({
      id: 'GM-7428',
      seed: 'local-mock',
      players: playerSetups,
    }),
    'p1',
    { type: 'startGame' },
  )
}

function App() {
  const [game, setGame] = useState(createMockGame)
  const [selectedTokens, setSelectedTokens] = useState<Partial<Record<GemColor, number>>>({})
  const [selectedCard, setSelectedCard] = useState<{ level: Level; slot: number } | null>(null)
  const [message, setMessage] = useState('本地 mock 对局已开始。')
  const currentPlayer = game.players[game.currentPlayerId]
  const view = useMemo(() => createClientGameView(game, game.currentPlayerId), [game])
  const selectedCardId = selectedCard ? game.market[selectedCard.level][selectedCard.slot] : null

  function run(action: Parameters<typeof applyGameAction>[2], successMessage: string) {
    try {
      setGame((current) => applyGameAction(current, current.currentPlayerId, action))
      setSelectedTokens({})
      setSelectedCard(null)
      setMessage(successMessage)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '行动失败。')
    }
  }

  function toggleToken(color: GemColor) {
    setSelectedTokens((current) => {
      const nextAmount = ((current[color] ?? 0) + 1) % 3
      const next = { ...current }
      if (nextAmount === 0) {
        delete next[color]
      } else {
        next[color] = nextAmount
      }
      return next
    })
  }

  function buySelectedCard() {
    if (!selectedCardId || !selectedCard) {
      setMessage('先选择一张市场卡。')
      return
    }

    const payment = createPaymentPlan(currentPlayer, selectedCardId)
    if (!payment) {
      setMessage('当前玩家暂时买不起这张卡。')
      return
    }

    run(
      { type: 'buyMarketCard', level: selectedCard.level, slot: selectedCard.slot, payment },
      `${currentPlayer.nickname} 购买了市场卡。`,
    )
  }

  function reserveSelectedCard() {
    if (!selectedCard) {
      setMessage('先选择一张市场卡。')
      return
    }

    run(
      { type: 'reserveMarketCard', level: selectedCard.level, slot: selectedCard.slot },
      `${currentPlayer.nickname} 预留了市场卡。`,
    )
  }

  function discardAutomatically() {
    run(
      { type: 'discardTokens', tokens: chooseDiscard(currentPlayer) },
      `${currentPlayer.nickname} 弃到 10 颗宝石。`,
    )
  }

  function chooseFirstNoble() {
    const nobleId = findEligibleNobleIds(game, currentPlayer)[0]
    if (!nobleId) {
      setMessage('没有可选择的贵族。')
      return
    }
    run({ type: 'chooseNoble', nobleId }, `${currentPlayer.nickname} 获得贵族。`)
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">
            <Gem size={21} />
          </span>
          <div>
            <h1>Gem Merchant</h1>
            <p>
              房间 {game.id} · {game.mode === 'classic' ? '经典规则' : '5 人扩展'} ·{' '}
              {phaseText(game.phase)}
            </p>
          </div>
        </div>
        <div className="topbar-actions">
          <button className="icon-button" type="button" aria-label="复制房间码">
            <Copy size={18} />
          </button>
          <button
            className="icon-button"
            type="button"
            aria-label="重开本地对局"
            onClick={() => {
              setGame(createMockGame())
              setSelectedTokens({})
              setSelectedCard(null)
              setMessage('已重开本地 mock 对局。')
            }}
          >
            <RotateCcw size={18} />
          </button>
          <button
            className="primary-button"
            type="button"
            onClick={() => run({ type: 'passTurn', reason: 'no_legal_action' }, '跳过当前回合。')}
          >
            <Play size={18} />
            跳过
          </button>
        </div>
      </header>

      <section className="game-layout" aria-label="游戏桌面">
        <aside className="player-rail" aria-label="玩家公开信息">
          {game.playerOrder.map((playerId) => {
            const player = view.players[playerId]
            return (
              <article
                className={playerId === game.currentPlayerId ? 'player-panel active' : 'player-panel'}
                key={player.id}
              >
                <div className="panel-title">
                  <div>
                    <h2>{player.nickname}</h2>
                    <p>{playerId === game.currentPlayerId ? '当前行动' : '等待'}</p>
                  </div>
                  <strong>{player.score}</strong>
                </div>
                <div className="gem-row">
                  {TOKEN_COLORS.map((color) => (
                    <span className={`player-token ${color}`} key={color}>
                      {player.tokens[color]}
                    </span>
                  ))}
                </div>
                <div className="discount-grid">
                  {GEM_COLORS.map((color) => (
                    <span className={`discount ${color}`} key={color}>
                      {countPurchasedBonus(game.players[player.id], color)}
                    </span>
                  ))}
                </div>
                <div className="reserved-list">
                  {player.reservedCards.length === 0 ? (
                    <span>无预留</span>
                  ) : (
                    player.reservedCards.map((reserved, index) => (
                      <span className="reserved-pill" key={`${player.id}-${index}`}>
                        {reserved.type === 'hidden' ? '暗牌' : cardLabel(reserved.cardId)}
                      </span>
                    ))
                  )}
                </div>
                <div className="meta-row">
                  <span>
                    <ShieldCheck size={15} />
                    已购 {player.purchasedCardIds.length}
                  </span>
                  <span>
                    <Crown size={15} />
                    贵族 {player.nobleIds.length}
                  </span>
                </div>
              </article>
            )
          })}
        </aside>

        <section className="table-surface" aria-label="公共牌桌">
          <div className="table-header">
            <div className="noble-track" aria-label="贵族">
              {game.nobles.map((nobleId) => {
                const noble = getNoble(nobleId)
                return (
                  <article className="noble-tile" key={noble.id}>
                    <Crown size={18} />
                    <strong>{noble.prestige}</strong>
                    <div className="mini-cost">
                      {costDots(noble.requirement).map((gem, index) => (
                        <span className={`mini-gem ${gem}`} key={`${noble.id}-${gem}-${index}`} />
                      ))}
                    </div>
                  </article>
                )
              })}
            </div>
            <div className="bank" aria-label="公共宝石池">
              {TOKEN_COLORS.map((color) => (
                <button
                  className={`bank-token ${color} ${selectedTokens[color as GemColor] ? 'selected' : ''}`}
                  disabled={color === 'gold' || game.bank[color] === 0}
                  type="button"
                  key={color}
                  onClick={() => color !== 'gold' && toggleToken(color)}
                >
                  <span>{game.bank[color]}</span>
                  {selectedTokens[color as GemColor] ? <em>{selectedTokens[color as GemColor]}</em> : null}
                </button>
              ))}
            </div>
          </div>

          <div className="market" aria-label="发展卡市场">
            {([3, 2, 1] as const).map((level) => (
              <div className="market-row" key={level}>
                <div className="tier-label">L{level}</div>
                {game.market[level].map((cardId, slot) => {
                  const card = cardId ? getDevelopmentCard(cardId) : null
                  const isSelected = selectedCard?.level === level && selectedCard.slot === slot
                  return (
                    <button
                      className={card ? `dev-card ${card.bonus} ${isSelected ? 'selected' : ''}` : 'dev-card empty'}
                      disabled={!card}
                      key={`${level}-${slot}-${cardId ?? 'empty'}`}
                      type="button"
                      onClick={() => setSelectedCard({ level, slot })}
                    >
                      {card ? (
                        <>
                          <div className="card-top">
                            <strong>{card.prestige}</strong>
                            <span className={`bonus ${card.bonus}`} />
                          </div>
                          <div className="card-art">
                            <CircleDollarSign size={36} />
                            <span>{card.artSeed.split('-').slice(0, 2).join(' ')}</span>
                          </div>
                          <div className="card-cost">
                            {costDots(card.cost).map((gem, index) => (
                              <span className={`mini-gem ${gem}`} key={`${card.id}-${gem}-${index}`} />
                            ))}
                          </div>
                        </>
                      ) : (
                        <span>空位</span>
                      )}
                    </button>
                  )
                })}
              </div>
            ))}
          </div>
        </section>

        <aside className="action-panel" aria-label="当前玩家操作">
          <div className="panel-title">
            <div>
              <h2>行动</h2>
              <p>{currentPlayer.nickname} 的回合</p>
            </div>
            <Users size={20} />
          </div>

          <div className="status-banner">{message}</div>

          <div className="selection-box">
            <span>已选宝石</span>
            <strong>
              {GEM_COLORS.map((color) => `${colorName(color)} ${selectedTokens[color] ?? 0}`).join(' · ')}
            </strong>
          </div>

          <div className="action-stack">
            <button
              className="secondary-button selected"
              type="button"
              onClick={() =>
                run(
                  { type: 'takeTokens', tokens: selectedTokens },
                  `${currentPlayer.nickname} 拿取宝石。`,
                )
              }
            >
              拿所选宝石
            </button>
            <button className="secondary-button" type="button" onClick={buySelectedCard}>
              购买所选市场卡
            </button>
            <button className="secondary-button" type="button" onClick={reserveSelectedCard}>
              预留所选市场卡
            </button>
            <div className="deck-actions">
              {([1, 2, 3] as const).map((level) => (
                <button
                  className="small-button"
                  disabled={game.decks[level].length === 0}
                  key={level}
                  type="button"
                  onClick={() =>
                    run(
                      { type: 'reserveDeckCard', level },
                      `${currentPlayer.nickname} 盲抽预留 L${level}。`,
                    )
                  }
                >
                  盲抽 L{level} ({view.deckCounts[level]})
                </button>
              ))}
            </div>
            {game.phase === 'awaiting_token_discard' ? (
              <button className="secondary-button danger" type="button" onClick={discardAutomatically}>
                自动弃到 10
              </button>
            ) : null}
            {game.phase === 'awaiting_noble_choice' ? (
              <button className="secondary-button" type="button" onClick={chooseFirstNoble}>
                选择首个可得贵族
              </button>
            ) : null}
          </div>

          <ol className="event-log" aria-label="最近行动">
            {game.log
              .slice(-6)
              .reverse()
              .map((entry) => (
                <li key={entry.id}>{entry.message}</li>
              ))}
          </ol>
        </aside>
      </section>
    </main>
  )
}

function createPaymentPlan(player: PlayerState, cardId: string): PaymentPlan | null {
  const card = getDevelopmentCard(cardId)
  const tokens: PaymentPlan['tokens'] = {}
  const goldAs: PaymentPlan['goldAs'] = {}
  let remainingGold = player.tokens.gold

  for (const color of GEM_COLORS) {
    const due = Math.max(0, (card.cost[color] ?? 0) - countPurchasedBonus(player, color))
    const normal = Math.min(player.tokens[color], due)
    const gold = due - normal
    if (gold > remainingGold) {
      return null
    }
    if (normal > 0) tokens[color] = normal
    if (gold > 0) {
      goldAs[color] = gold
      remainingGold -= gold
    }
  }

  return { tokens, goldAs }
}

function countPurchasedBonus(player: PlayerState, color: GemColor): number {
  return player.purchasedCardIds.filter((cardId) => getDevelopmentCard(cardId).bonus === color).length
}

function chooseDiscard(player: PlayerState): Partial<Record<TokenColor, number>> {
  const discard: Partial<Record<TokenColor, number>> = {}
  let extra = TOKEN_COLORS.reduce((sum, color) => sum + player.tokens[color], 0) - 10
  for (const color of TOKEN_COLORS) {
    if (extra <= 0) break
    const amount = Math.min(player.tokens[color], extra)
    if (amount > 0) {
      discard[color] = amount
      extra -= amount
    }
  }
  return discard
}

function findEligibleNobleIds(game: GameState, player: PlayerState): string[] {
  return game.nobles.filter((nobleId) => {
    const noble = getNoble(nobleId)
    return GEM_COLORS.every((color) => countPurchasedBonus(player, color) >= (noble.requirement[color] ?? 0))
  })
}

function costDots(cost: Partial<Record<GemColor, number>>): GemColor[] {
  return GEM_COLORS.flatMap((color) => Array.from({ length: cost[color] ?? 0 }, () => color))
}

function cardLabel(cardId: string): string {
  const card = getDevelopmentCard(cardId)
  return `L${card.level} ${colorName(card.bonus)} ${card.prestige}`
}

function colorName(color: GemColor): string {
  return {
    white: '白',
    blue: '蓝',
    green: '绿',
    red: '红',
    black: '黑',
  }[color]
}

function phaseText(phase: GameState['phase']): string {
  return {
    lobby: '大厅',
    playing: '进行中',
    awaiting_token_discard: '等待弃宝石',
    awaiting_noble_choice: '选择贵族',
    final_round: '最终轮',
    finished: '已结束',
    abandoned: '已废弃',
  }[phase]
}

export default App
