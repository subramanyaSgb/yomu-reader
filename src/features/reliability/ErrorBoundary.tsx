// App-level error boundary (FR-36/37): catches render crashes, logs, shows a recoverable UI.
import { Component, type ReactNode } from 'react'
import { reportError } from './errorReporter'

interface Props {
  children: ReactNode
}
interface State {
  hasError: boolean
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown) {
    reportError(error, 'ErrorBoundary')
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-screen flex-col items-center justify-center gap-3 bg-black p-6 text-center">
          <p className="text-neutral-300">Something went wrong.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false })
              location.reload()
            }}
            className="rounded-lg bg-violet-600 px-4 py-2 text-white"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
