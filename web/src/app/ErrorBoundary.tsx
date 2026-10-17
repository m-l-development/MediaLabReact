import { Component, type ComponentType, type ErrorInfo, type ReactNode } from 'react'

export interface FallbackProps {
  error: Error
  reset: () => void
}

interface Props {
  /** Ny nøkkel nullstiller feilen (f.eks. ved verktøybytte eller ny adresse). */
  resetKey?: string
  fallback: ComponentType<FallbackProps>
  children: ReactNode
}

interface State {
  error: Error | null
  resetKey: string | undefined
}

/** Fanger feil i en del av appen, så resten (og arbeidet i andre verktøy) fortsetter. */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { error: null, resetKey: this.props.resetKey }

  static getDerivedStateFromError(error: unknown): Partial<State> {
    return { error: error instanceof Error ? error : new Error(String(error)) }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey !== state.resetKey ? { error: null, resetKey: props.resetKey } : null
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Media Lab]', error, info.componentStack)
  }

  reset = () => this.setState({ error: null })

  override render() {
    const { error } = this.state
    const Fallback = this.props.fallback
    return error ? <Fallback error={error} reset={this.reset} /> : this.props.children
  }
}
