// app/error.tsx
'use client'

export default function Error({ reset }: { reset: () => void }) {
  return (
    <div className="p-6 text-center">
      <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
      <p className="text-sm text-gray-400 mb-4">
        Please try again. If the problem persists, refresh the page.
      </p>
      <button className="btn btn-primary" onClick={() => reset()}>
        Try again
      </button>
    </div>
  )
}
