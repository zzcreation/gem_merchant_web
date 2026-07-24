export type FeedbackTone = 'info' | 'success' | 'error' | 'pending'

export type FeedbackState = {
  tone: FeedbackTone
  text: string
}

type StatusBannerProps = {
  feedback: FeedbackState
}

export function StatusBanner({ feedback }: StatusBannerProps) {
  return (
    <div
      aria-busy={feedback.tone === 'pending'}
      aria-live="polite"
      className={`status-banner ${feedback.tone}`}
      data-status-tone={feedback.tone}
      data-testid="status-message"
      role="status"
    >
      {feedback.text}
    </div>
  )
}
