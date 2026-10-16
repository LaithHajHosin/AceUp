export function ApiErrorNotice({
  message,
  title = 'Something went wrong',
}: {
  message: string
  title?: string
}) {
  return (
    <div className="api-error" role="alert">
      <span className="api-error-icon" aria-hidden="true">!</span>
      <div>
        <strong>{title}</strong>
        <p>{message}</p>
      </div>
    </div>
  )
}
