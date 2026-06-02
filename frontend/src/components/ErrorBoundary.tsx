import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'var(--bg)' }}>
          <div className="max-w-md w-full text-center space-y-6">
            <div className="flex justify-center">
              <div className="p-4 rounded-full" style={{ background: 'rgba(239,68,68,.1)' }}>
                <AlertTriangle size={48} style={{ color: '#ef4444' }} />
              </div>
            </div>
            
            <h1 className="text-2xl font-bold" style={{ color: 'var(--text)' }}>
              Có lỗi xảy ra
            </h1>
            
            <p className="text-sm" style={{ color: 'var(--text2)' }}>
              Đã có lỗi không mong muốn. Bạn có thể thử tải lại trang hoặc quay lại.
            </p>

            {this.state.error && (
              <details className="text-left p-4 rounded-xl border" style={{ background: 'var(--bg2)', borderColor: 'var(--border)' }}>
                <summary className="cursor-pointer text-xs font-medium mb-2" style={{ color: 'var(--text3)' }}>
                  Chi tiết lỗi
                </summary>
                <pre className="text-xs overflow-auto max-h-40" style={{ color: 'var(--text3)' }}>
                  {this.state.error.toString()}
                </pre>
              </details>
            )}

            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="px-6 py-3 rounded-xl text-sm font-medium flex items-center gap-2"
                style={{ background: '#6366f1', color: '#fff' }}
              >
                <RefreshCw size={16} />
                Thử lại
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-6 py-3 rounded-xl text-sm font-medium border"
                style={{ background: 'var(--bg2)', borderColor: 'var(--border)', color: 'var(--text2)' }}
              >
                Về trang chủ
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

// Functional wrapper for easier use in functional components
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WrappedComponent(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
