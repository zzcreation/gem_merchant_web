import { useRef, useState } from 'react'
import { useGameSession } from './hooks/useGameSession'
import { useOnlineRoom } from './hooks/useOnlineRoom'
import { AboutScreen } from './screens/AboutScreen'
import { GameScreen } from './screens/GameScreen'
import { LandingScreen } from './screens/LandingScreen'
import { LoadingScreen } from './screens/LoadingScreen'
import type { AppScreen } from './lib/appScreen'
import type { FeedbackState, FeedbackTone } from './components/StatusBanner'

const APP_VERSION = 'v0.0.0'

function App() {
  const [screen, setScreen] = useState<AppScreen>('landing')
  const [feedback, setFeedback] = useState<FeedbackState>({ tone: 'info', text: '本地 mock 对局已开始。' })

  function showFeedback(text: string, tone: FeedbackTone = 'info') {
    setFeedback({ text, tone })
  }

  const clearSelectionRef = useRef<() => void>(() => {})
  const onlineRoom = useOnlineRoom({
    onClearActionSelection: () => clearSelectionRef.current(),
    onShowFeedback: showFeedback,
    onScreenChange: setScreen,
  })

  const session = useGameSession({
    onlineView: onlineRoom.onlineView,
    onlineLobby: onlineRoom.onlineLobby,
    connectionStatus: onlineRoom.connectionStatus,
    playerId: onlineRoom.playerId,
    pendingActionCount: onlineRoom.pendingActionCount,
    serverActivityText: onlineRoom.serverActivityText,
    sendRoomEvent: onlineRoom.sendRoomEvent,
    registerPendingAction: onlineRoom.registerPendingAction,
    resetToLocal: onlineRoom.resetToLocal,
    disconnectRoom: onlineRoom.disconnectRoom,
    showFeedback,
    onScreenChange: setScreen,
  })
  clearSelectionRef.current = session.clearActionSelection

  if (screen === 'landing') {
    return (
      <LandingScreen
        appVersion={APP_VERSION}
        nickname={onlineRoom.nickname}
        roomCode={onlineRoom.roomCode}
        isConnecting={session.isConnecting}
        onNicknameChange={onlineRoom.setNickname}
        onRoomCodeChange={onlineRoom.setRoomCodeInput}
        onJoinRoom={() => onlineRoom.connectRoom(onlineRoom.roomCode)}
        onCreateRoom={onlineRoom.createOnlineRoom}
        onStartLocal={session.startLocalGame}
        onOpenAbout={() => setScreen('about')}
      />
    )
  }

  if (screen === 'about') {
    return <AboutScreen appVersion={APP_VERSION} onBack={() => setScreen('landing')} />
  }

  if (screen === 'loading') {
    return <LoadingScreen message={session.serverIndicatorText} />
  }

  return (
    <GameScreen
      session={session}
      feedback={feedback}
      showFeedback={showFeedback}
      onResetLocal={session.resetLocalGame}
      room={{
        roomCode: onlineRoom.roomCode,
        nickname: onlineRoom.nickname,
        playerId: onlineRoom.playerId,
        roomMenuOpen: onlineRoom.roomMenuOpen,
        connectionStatus: onlineRoom.connectionStatus,
        setRoomCodeInput: onlineRoom.setRoomCodeInput,
        setNickname: onlineRoom.setNickname,
        setRoomMenuOpen: onlineRoom.setRoomMenuOpen,
        connectRoom: () => onlineRoom.connectRoom(),
        disconnectRoom: onlineRoom.disconnectRoom,
        sendRoomEvent: onlineRoom.sendRoomEvent,
      }}
    />
  )
}

export default App
