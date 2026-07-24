import { Gem } from 'lucide-react'

type AboutScreenProps = {
  appVersion: string
  onBack: () => void
}

export function AboutScreen({ appVersion, onBack }: AboutScreenProps) {
  return (
    <main className="platform-shell">
      <section className="about-page" aria-label="About 页面">
        <div className="platform-header">
          <div className="platform-brand">
            <span className="brand-mark">
              <Gem size={24} />
            </span>
            <div>
              <h1>Gem Merchant</h1>
              <p>About</p>
            </div>
          </div>
          <span className="version-pill">{appVersion}</span>
        </div>
        <div className="about-copy">
          <h2>多人线上宝石商人</h2>
          <p>这是一个面向朋友聚会和远程开局的网页桌游平台，核心体验是快速创建房间、分享房间码、在手机或桌面浏览器中同步游玩。</p>
          <p>当前版本已支持在线大厅、实时对局、断线重连、移动端两行动作栏、可购买卡高亮和基础后台统计。</p>
        </div>
        <button className="secondary-button landing-secondary" type="button" onClick={onBack}>
          返回首页
        </button>
      </section>
    </main>
  )
}
