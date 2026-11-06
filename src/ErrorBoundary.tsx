import { Component, type ErrorInfo, type ReactNode } from "react";

export default class ErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Erro na interface:", error, info.componentStack);
  }
  render() {
    if (!this.state.failed) return this.props.children;
    return (
      <div style={{ padding: 24, textAlign: "center", fontFamily: "system-ui" }}>
        <h2>Ops! Algo deu errado 😕</h2>
        <p>Recarregue a página para tentar novamente.</p>
        <button onClick={() => location.reload()} style={{ padding: "12px 20px", fontSize: "1rem" }}>
          Recarregar
        </button>
      </div>
    );
  }
}
