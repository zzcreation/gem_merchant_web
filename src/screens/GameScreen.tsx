import { getNoble } from '../../shared/game/catalog'
import { ActionPanel } from '../components/ActionPanel'
import { Market } from '../components/Market'
import { NobleFace } from '../components/NobleFace'
import { PlayerRail } from '../components/PlayerPanel'
import { RoomBar } from '../components/RoomBar'
import { TokenPool } from '../components/TokenPool'
import type { FeedbackState, FeedbackTone } from '../components/StatusBanner'
import type { GameSession } from '../hooks/useGameSession'
import type { ConnectionStatus } from '../lib/format'
import '../styles/layout.css'
import { LobbyScreen } from './LobbyScreen'

type RoomControls = {
  roomCode: string
  nickname: string
  playerId: string | null
  roomMenuOpen: boolean
  connectionStatus: ConnectionStatus
  setRoomCodeInput: (value: string) => void
  setNickname: (value: string) => void
  setRoomMenuOpen: (open: boolean) => void
  connectRoom: () => void
  disconnectRoom: () => void
  sendRoomEvent: (payload: { type: 'room.ready'; ready: boolean } | { type: 'room.start' }, expectedVersion: number) => string | null
}

type GameScreenProps = {
  session: GameSession
  room: RoomControls
  feedback: FeedbackState
  showFeedback: (text: string, tone?: FeedbackTone) => void
  onResetLocal: () => void
}

export function GameScreen({ session, room, feedback, showFeedback, onResetLocal }: GameScreenProps) {
  const { view, currentPlayer, viewerPlayer, canAct, isViewerTurn } = session

  return (
    <main className="app-shell">
      {session.serverIndicatorText ? (
        <div className="server-indicator" role="status" aria-live="polite">
          <span className="loading-spinner small" />
          <span>{session.serverIndicatorText}</span>
        </div>
      ) : null}
      <RoomBar
        displayRoomId={session.displayRoomId}
        modeLabel={view.mode === 'classic' ? '经典规则' : '5 人扩展'}
        displayPhase={session.displayPhase}
        connectionStatus={room.connectionStatus}
        roomCode={room.roomCode}
        nickname={room.nickname}
        roomMenuOpen={room.roomMenuOpen}
        isConnecting={session.isConnecting}
        onRoomMenuToggle={room.setRoomMenuOpen}
        onRoomCodeChange={room.setRoomCodeInput}
        onNicknameChange={room.setNickname}
        onJoin={room.connectRoom}
        onGoLocal={room.disconnectRoom}
        onCopyRoomCode={() => showFeedback('房间码已复制。', 'success')}
        onResetLocal={onResetLocal}
      />

      {session.isOnlineLobby ? (
        <LobbyScreen
          roomCode={room.roomCode}
          displayRoomCode={session.onlineLobby?.roomCode}
          players={session.onlineLobby?.players ?? []}
          feedback={feedback}
          isViewerReady={session.lobbyViewer?.ready ?? false}
          disabled={!room.playerId || session.isActionPending}
          onToggleReady={() =>
            room.sendRoomEvent({ type: 'room.ready', ready: !(session.lobbyViewer?.ready ?? false) }, 0)
          }
          onStartRoom={() => room.sendRoomEvent({ type: 'room.start' }, 0)}
        />
      ) : (
        <section className="game-layout" aria-label="游戏桌面">
          <PlayerRail
            players={view.playerOrder.map((id) => view.players[id])}
            currentPlayerId={view.currentPlayerId}
          />

          <section className="table-surface" aria-label="公共牌桌">
            <div className="table-header">
              <div className="noble-track" aria-label="贵族">
                {view.nobles.map((nobleId) => (
                  <NobleFace key={nobleId} noble={getNoble(nobleId)} />
                ))}
              </div>
              <TokenPool
                bank={view.bank}
                selectedTokens={session.selectedTokens}
                canAct={canAct}
                className="bank desktop-bank"
                onToggle={session.toggleToken}
              />
            </div>

            <Market
              market={view.market}
              selectedCard={session.selectedCard}
              viewerPlayer={viewerPlayer}
              onSelectCard={session.selectMarketCard}
            />
          </section>

          <ActionPanel
            view={view}
            currentPlayer={currentPlayer}
            viewerPlayer={viewerPlayer}
            canAct={canAct}
            isViewerTurn={isViewerTurn}
            isActionPending={session.isActionPending}
            feedback={feedback}
            gameResults={session.gameResults}
            selectedTokens={session.selectedTokens}
            hasSelectedTokens={session.hasSelectedTokens}
            viewerVisibleReservedCards={session.viewerVisibleReservedCards}
            selectedReservedCardId={session.selectedReservedCardId}
            selectedCardId={session.selectedCardId}
            selectedPaymentCardId={session.selectedPaymentCardId}
            paymentPlan={session.paymentPlan}
            canBuySelectedMarketCard={session.canBuySelectedMarketCard}
            canBuySelectedReservedCard={session.canBuySelectedReservedCard}
            discardPlan={session.discardPlan}
            discardNeeded={session.discardNeeded}
            eligibleNobleIds={session.eligibleNobleIds}
            onToggleToken={session.toggleToken}
            onSelectReservedCard={session.selectReservedCard}
            onSuggestPayment={session.suggestPayment}
            onUpdatePayment={session.updatePayment}
            onCanIncreasePayment={session.canIncreasePayment}
            onTakeSelectedTokens={session.takeSelectedTokens}
            onBuyMarketCard={session.buySelectedCard}
            onBuyReservedCard={session.buySelectedReservedCard}
            onReserveMarketCard={session.reserveSelectedCard}
            onPassTurn={session.passTurn}
            onReserveDeck={session.reserveDeckCard}
            onUpdateDiscard={session.updateDiscard}
            onSubmitDiscard={session.submitDiscardPlan}
            onAutoDiscard={session.discardAutomatically}
            onChooseNoble={session.chooseNoble}
          />
        </section>
      )}
    </main>
  )
}
