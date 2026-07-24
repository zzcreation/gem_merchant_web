type LoadingScreenProps = {
  message: string | null
}

export function LoadingScreen({ message }: LoadingScreenProps) {
  return (
    <main className="platform-shell">
      <section className="loading-page" aria-busy="true" aria-label="正在连接房间">
        <span className="loading-spinner" />
        <div>
          <h1>正在进入房间</h1>
          <p>{message ?? '正在与服务器通讯...'}</p>
        </div>
      </section>
    </main>
  )
}
