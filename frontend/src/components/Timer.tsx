import { useEffect, useState } from 'react'

function getRemainingMilliseconds(deadlineAt: string) {
  return new Date(deadlineAt).getTime() - Date.now()
}

function formatTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.ceil(milliseconds / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  const time = [minutes, seconds]
    .map((part) => String(part).padStart(2, '0'))
    .join(':')

  return hours > 0 ? `${String(hours).padStart(2, '0')}:${time}` : time
}

export function Timer({ deadlineAt }: { deadlineAt: string }) {
  const [remaining, setRemaining] = useState(() =>
    getRemainingMilliseconds(deadlineAt),
  )

  useEffect(() => {
    const updateRemaining = () => {
      setRemaining(getRemainingMilliseconds(deadlineAt))
    }
    updateRemaining()
    const intervalId = window.setInterval(updateRemaining, 1000)
    return () => window.clearInterval(intervalId)
  }, [deadlineAt])

  if (!Number.isFinite(remaining)) {
    return <div className="timer timer-invalid">Timer unavailable</div>
  }

  const expired = remaining <= 0
  return (
    <div
      className={`timer${expired ? ' timer-expired' : ''}`}
      aria-live="polite"
      aria-label={expired ? 'Time limit reached' : `Time remaining ${formatTime(remaining)}`}
    >
      <span className="timer-icon" aria-hidden="true">◷</span>
      <span>
        <small>{expired ? 'Time limit reached' : 'Time remaining'}</small>
        <strong>{formatTime(remaining)}</strong>
      </span>
    </div>
  )
}
