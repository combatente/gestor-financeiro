import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from './ui/Button'

interface ErrorBoundaryProps {
  children: ReactNode
}

interface ErrorBoundaryState {
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Erro não tratado na aplicação:', error, info.componentStack)
  }

  handleReset = () => {
    this.setState({ error: null })
  }

  render() {
    if (this.state.error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'rgb(var(--bg))' }}>
          <div className="card p-8 w-full max-w-md text-center">
            <AlertTriangle className="mx-auto mb-4 text-[rgb(var(--danger))]" size={40} />
            <h1 className="text-xl font-bold text-[rgb(var(--text))]">Ocorreu um erro inesperado</h1>
            <p className="text-sm text-[rgb(var(--text-muted))] mt-2 mb-6">
              Algo correu mal ao apresentar esta página. Podes tentar recarregar a aplicação.
            </p>
            <Button variant="primary" fullWidth onClick={() => window.location.reload()}>
              Recarregar aplicação
            </Button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
