import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error("ErrorBoundary capturó un error:", error, errorInfo);
    }

    handleReload = () => {
        this.setState({ hasError: false, error: null });
        window.location.reload();
    };

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    minHeight: '100vh',
                    width: '100vw',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f0f2f5',
                    fontFamily: 'system-ui, -apple-system, sans-serif',
                    padding: '20px',
                    boxSizing: 'border-box'
                }}>
                    <div style={{
                        maxWidth: '520px',
                        width: '100%',
                        backgroundColor: '#ffffff',
                        borderRadius: '12px',
                        padding: '35px 30px',
                        textAlign: 'center',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                        border: '1px solid #e2e8f0'
                    }}>
                        <div style={{ fontSize: '3rem', marginBottom: '15px' }}>⚠️</div>
                        <h2 style={{ color: '#003366', margin: '0 0 12px 0', fontSize: '1.4rem', fontWeight: '800' }}>
                            Ocurrió un inconveniente al cargar la vista
                        </h2>
                        <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.5', margin: '0 0 25px 0' }}>
                            Se presentó un error inesperado al procesar los datos de esta pantalla. Puedes recargar la página o volver al panel de navegación.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <button
                                onClick={this.handleReload}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#003366',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.9rem'
                                }}
                            >
                                🔄 Recargar
                            </button>
                            <button
                                onClick={() => { window.location.href = '/admin'; }}
                                style={{
                                    padding: '10px 20px',
                                    backgroundColor: '#e2e8f0',
                                    color: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    fontWeight: '700',
                                    fontSize: '0.9rem'
                                }}
                            >
                                🛡️ Ir al Panel Admin
                            </button>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;

