import { useMemo, useState } from 'react';
import { useEmailHealth } from '../../../hooks/useEmailHealth';
import '../AdminShared.css';
import './SaludCorreo.css';

function describeField(key: string) {
    if (key.includes('status') || key.includes('health') || key.includes('state')) {
        return 'Estado reportado por el backend.';
    }
    if (key.includes('latency')) {
        return 'Tiempo de respuesta observado.';
    }
    if (key.includes('error')) {
        return 'Último error reportado para el servicio de correo.';
    }
    if (key.includes('checked') || key.includes('updated') || key.includes('timestamp')) {
        return 'Marca de tiempo entregada por el backend.';
    }
    if (key.includes('host') || key.includes('port') || key.includes('provider')) {
        return 'Configuración efectiva del servicio de correo.';
    }
    return 'Dato expuesto por el endpoint de salud de correo.';
}

export default function SaludCorreo() {
    const { items, statusLabel, loading, error, lastUpdated, reload } = useEmailHealth();
    const [searchTerm, setSearchTerm] = useState('');

    const filteredRows = useMemo(() => {
        const normalizedSearch = searchTerm.trim().toLowerCase();
        return items.filter((item) => {
            if (normalizedSearch.length === 0) return true;
            return (
                item.label.toLowerCase().includes(normalizedSearch) ||
                item.value.toLowerCase().includes(normalizedSearch) ||
                item.key.toLowerCase().includes(normalizedSearch)
            );
        });
    }, [items, searchTerm]);

    const statusClass = statusLabel
        ? statusLabel.toLowerCase().includes('ok') || statusLabel.toLowerCase().includes('healthy')
            ? 'ok'
            : 'neutral'
        : 'neutral';

    return (
        <div className="admin-page correo-page">
            <header className="admin-header">
                <div className="admin-title">
                    <h1>Salud de correo</h1>
                    <p>Consulta el estado operativo del servicio de correo sin abrir un dashboard nuevo.</p>
                    {lastUpdated ? <div className="admin-muted">Última actualización: {lastUpdated.toLocaleTimeString()}</div> : null}
                </div>
                <div className="admin-actions">
                    <button type="button" className="admin-btn ghost" onClick={() => void reload()}>
                        Actualizar
                    </button>
                </div>
            </header>

            <div className="admin-divider" aria-hidden="true" />

            {statusLabel ? (
                <div className="admin-alert info">
                    Estado actual:&nbsp;<span className={`admin-status-badge ${statusClass}`}>{statusLabel}</span>
                </div>
            ) : null}
            {error ? <div className="admin-alert error">{error}</div> : null}

            <section className="admin-controls" aria-label="Controles de salud de correo">
                <div className="admin-search">
                    <span className="admin-search-icon" aria-hidden="true">
                        <svg viewBox="0 0 24 24"><path d="M11 4a7 7 0 1 1-4.95 11.95l-3.5 3.5 1.4 1.4 3.5-3.5A7 7 0 0 1 11 4Zm0 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Z" /></svg>
                    </span>
                    <input
                        type="search"
                        placeholder="Buscar indicador..."
                        aria-label="Buscar indicador de correo"
                        value={searchTerm}
                        onChange={(event) => setSearchTerm(event.target.value)}
                    />
                </div>
            </section>

            <section className="admin-table" aria-label="Estado de correo">
                <div className="admin-table-head correo-grid">
                    <span>Indicador</span>
                    <span>Valor</span>
                    <span>Comentario</span>
                </div>

                {loading ? <div className="admin-loading">Cargando salud de correo...</div> : null}

                {!loading && filteredRows.length === 0 ? (
                    <div className="admin-empty" role="status">
                        <div className="admin-empty-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24"><path d="M3 5h18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Zm0 2v.51l9 5.4 9-5.4V7l-9 5.4L3 7.01Z" /></svg>
                        </div>
                        <h3>Sin información de correo</h3>
                        <p>No hay indicadores disponibles con el filtro actual.</p>
                    </div>
                ) : null}

                {!loading && filteredRows.length > 0 ? (
                    <div className="admin-table-body">
                        {filteredRows.map((item) => (
                            <div key={item.key} className="admin-row correo-grid">
                                <div className="correo-key">{item.label}</div>
                                <div className="correo-value">{item.value}</div>
                                <div className="correo-comment">{describeField(item.key)}</div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>
        </div>
    );
}
