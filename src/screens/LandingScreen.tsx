import { Gem, Info, LogIn, Plus, Settings } from 'lucide-react'

type LandingScreenProps = {
  appVersion: string
  nickname: string
  roomCode: string
  isConnecting: boolean
  onNicknameChange: (value: string) => void
  onRoomCodeChange: (value: string) => void
  onJoinRoom: () => void
  onCreateRoom: () => void
  onStartLocal: () => void
  onOpenAbout: () => void
}

export function LandingScreen({
  appVersion,
  nickname,
  roomCode,
  isConnecting,
  onNicknameChange,
  onRoomCodeChange,
  onJoinRoom,
  onCreateRoom,
  onStartLocal,
  onOpenAbout,
}: LandingScreenProps) {
  return (
    <main className="platform-shell">
      <section className="platform-hero" aria-label="Gem Merchant 平台首页">
        <div className="platform-header">
          <div className="platform-brand">
            <span className="brand-mark">
              <Gem size={24} />
            </span>
            <div>
              <h1>Gem Merchant</h1>
              <p>多人线上宝石商人平台</p>
            </div>
          </div>
          <span className="version-pill">{appVersion}</span>
        </div>

        <div className="platform-grid">
          <form
            className="join-panel"
            onSubmit={(event) => {
              event.preventDefault()
              onJoinRoom()
            }}
          >
            <div className="panel-title">
              <div>
                <h2>加入房间</h2>
                <p>输入朋友发来的房间码</p>
              </div>
              <LogIn size={20} />
            </div>
            <label className="field-row">
              <span>昵称</span>
              <input
                aria-label="昵称"
                maxLength={24}
                value={nickname}
                onChange={(event) => onNicknameChange(event.target.value)}
              />
            </label>
            <label className="field-row">
              <span>房间码</span>
              <input
                aria-label="房间码"
                maxLength={32}
                value={roomCode}
                onChange={(event) => onRoomCodeChange(event.target.value)}
              />
            </label>
            <button className="primary-button landing-button" type="submit" disabled={isConnecting}>
              <LogIn size={18} />
              {isConnecting ? '连接中' : '加入房间'}
            </button>
          </form>

          <section className="create-panel" aria-label="创建房间">
            <div className="panel-title">
              <div>
                <h2>创建房间</h2>
                <p>生成新房间并邀请朋友加入</p>
              </div>
              <Plus size={20} />
            </div>
            <button className="primary-button landing-button" type="button" disabled={isConnecting} onClick={onCreateRoom}>
              <Plus size={18} />
              创建房间
            </button>
            <p className="panel-note">创建后会进入在线大厅，可以在房间菜单复制房间码。</p>
          </section>

          <section className="options-panel" aria-label="选项">
            <div className="panel-title">
              <div>
                <h2>选项</h2>
                <p>当前偏好和本地调试入口</p>
              </div>
              <Settings size={20} />
            </div>
            <label className="field-row">
              <span>规则</span>
              <select aria-label="规则模式" value="classic" disabled>
                <option value="classic">经典 2-4 人</option>
              </select>
            </label>
            <button className="secondary-button landing-secondary" type="button" onClick={onStartLocal}>
              本地试玩
            </button>
          </section>

          <section className="about-panel" aria-label="About">
            <div className="panel-title">
              <div>
                <h2>About</h2>
                <p>线上对战、房间邀请、移动端优化</p>
              </div>
              <Info size={20} />
            </div>
            <button className="secondary-button landing-secondary" type="button" onClick={onOpenAbout}>
              查看 About
            </button>
          </section>
        </div>
      </section>
    </main>
  )
}
