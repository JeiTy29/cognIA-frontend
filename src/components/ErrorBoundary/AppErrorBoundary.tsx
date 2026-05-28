import { Component, type ErrorInfo, type ReactNode } from 'react';
import './AppErrorBoundary.css';

type AppErrorBoundaryProps = Readonly<{
    children: ReactNode;
}>;

type AppErrorBoundaryState = {
    hasError: boolean;
};

export default class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
    state: AppErrorBoundaryState = { hasError: false };

    static getDerivedStateFromError(): AppErrorBoundaryState {
        return { hasError: true };
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        if (import.meta.env.DEV) {
            console.error('[CognIA UI] Error boundary', error, info);
        }
    }

    render() {
        if (!this.state.hasError) {
            return this.props.children;
        }

        return (
            <main className="app-error-boundary" role="alert">
                <section>
                    <span>CognIA</span>
                    <h1>No pudimos mostrar esta vista</h1>
                    <p>
                        La aplicación se recuperó de un error de interfaz. Puedes reintentar la carga o volver al inicio
                        sin quedar atrapado en una pantalla congelada.
                    </p>
                    <div>
                        <button type="button" onClick={() => this.setState({ hasError: false })}>
                            Reintentar
                        </button>
                        <button type="button" className="secondary" onClick={() => { window.location.href = '/'; }}>
                            Volver al inicio
                        </button>
                    </div>
                </section>
            </main>
        );
    }
}
