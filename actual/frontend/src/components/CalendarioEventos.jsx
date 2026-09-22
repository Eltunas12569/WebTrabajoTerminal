import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

/**
 * Componente interactivo de Calendario de Eventos con:
 * - Cuadrícula compacta y responsiva.
 * - Lista lateral con los eventos del mes en curso y del mes siguiente.
 * - Filtro por día al hacer clic en las celdas del calendario.
 * - Modal emergente para ver detalles completos y registrar asistencia (RSVP).
 */
const CalendarioEventos = ({
    eventos = [],
    modo = 'usuario', // 'usuario' o 'admin'
    onAsistencia = null,
    clubes = [],
    cargando = false,
    onRefresh = null
}) => {
    const { user } = useAuth();
    // Roles permitidos para confirmar asistencia: Alumnos (2, 4) y Profesores (3)
    const esAlumnoOProfesor = user && [2, 3, 4].includes(Number(user.role_id));

    const hoy = new Date();
    const [fechaActual, setFechaActual] = useState(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const [eventoSeleccionado, setEventoSeleccionado] = useState(null);
    const [diaSeleccionado, setDiaSeleccionado] = useState(null);
    const [filtroClub, setFiltroClub] = useState('todos');
    const [guardandoAsistencia, setGuardandoAsistencia] = useState(false);

    const meses = [
        'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
        'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const diasSemana = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    const paletaColores = [
        '#003366', '#1b7a43', '#800020', '#b7791f',
        '#6b21a8', '#0f766e', '#9a3412', '#1d4ed8',
        '#475569', '#be185d'
    ];

    const getClubColor = (clubId) => {
        const idNum = Number(clubId) || 0;
        return paletaColores[idNum % paletaColores.length];
    };

    // Navegación de mes
    const mesAnterior = () => {
        setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() - 1, 1));
        setDiaSeleccionado(null);
    };

    const mesSiguiente = () => {
        setFechaActual(new Date(fechaActual.getFullYear(), fechaActual.getMonth() + 1, 1));
        setDiaSeleccionado(null);
    };

    const irAHoy = () => {
        setFechaActual(new Date(hoy.getFullYear(), hoy.getMonth(), 1));
        setDiaSeleccionado(new Date());
    };

    // Parseo seguro de fechas
    const parseFecha = (fechaStr) => {
        if (!fechaStr) return null;
        try {
            const normalizada = String(fechaStr).replace(' ', 'T');
            const d = new Date(normalizada);
            return isNaN(d.getTime()) ? null : d;
        } catch {
            return null;
        }
    };

    // Determina si un evento ya ha concluido cronológicamente
    const esEventoPasado = (fechaStr) => {
        const d = parseFecha(fechaStr);
        if (!d) return false;
        return d.getTime() < Date.now();
    };

    // Filtrar eventos por club seleccionado (si aplica)
    const eventosFiltrados = eventos.filter(ev => {
        if (filtroClub === 'todos') return true;
        return String(ev.club_id) === String(filtroClub);
    });

    // Agrupar eventos por fecha YYYY-MM-DD
    const mapaEventosPorFecha = {};
    eventosFiltrados.forEach(ev => {
        const d = parseFecha(ev.fecha_evento);
        if (d) {
            const clave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
            if (!mapaEventosPorFecha[clave]) {
                mapaEventosPorFecha[clave] = [];
            }
            mapaEventosPorFecha[clave].push({ ...ev, _fechaObj: d });
        }
    });

    // Cálculo del mes actual y del mes siguiente
    const anio = fechaActual.getFullYear();
    const mes = fechaActual.getMonth();
    const primerDiaSemana = new Date(anio, mes, 1).getDay();
    const totalDiasMes = new Date(anio, mes + 1, 0).getDate();
    const totalDiasMesAnterior = new Date(anio, mes, 0).getDate();

    const fechaSiguienteMes = new Date(anio, mes + 1, 1);
    const anioSiguiente = fechaSiguienteMes.getFullYear();
    const mesSiguienteIdx = fechaSiguienteMes.getMonth();

    // Eventos de este mes
    const todosEventosMesActual = eventosFiltrados.filter(ev => {
        const d = parseFecha(ev.fecha_evento);
        return d && d.getFullYear() === anio && d.getMonth() === mes;
    }).sort((a, b) => (parseFecha(a.fecha_evento)?.getTime() || 0) - (parseFecha(b.fecha_evento)?.getTime() || 0));

    // Eventos del mes siguiente
    const eventosMesSiguiente = eventosFiltrados.filter(ev => {
        const d = parseFecha(ev.fecha_evento);
        return d && d.getFullYear() === anioSiguiente && d.getMonth() === mesSiguienteIdx;
    }).sort((a, b) => (parseFecha(a.fecha_evento)?.getTime() || 0) - (parseFecha(b.fecha_evento)?.getTime() || 0));

    // Construcción de la matriz compacta del mes
    const celdas = [];
    for (let i = primerDiaSemana - 1; i >= 0; i--) {
        const diaNum = totalDiasMesAnterior - i;
        const fechaCelda = new Date(anio, mes - 1, diaNum);
        celdas.push({ dia: diaNum, fecha: fechaCelda, esMesActual: false });
    }

    for (let d = 1; d <= totalDiasMes; d++) {
        const fechaCelda = new Date(anio, mes, d);
        celdas.push({ dia: d, fecha: fechaCelda, esMesActual: true });
    }

    const celdasRestantes = (7 - (celdas.length % 7)) % 7;
    for (let d = 1; d <= celdasRestantes; d++) {
        const fechaCelda = new Date(anio, mes + 1, d);
        celdas.push({ dia: d, fecha: fechaCelda, esMesActual: false });
    }

    const esMismoDia = (d1, d2) => {
        if (!d1 || !d2) return false;
        return d1.getFullYear() === d2.getFullYear() &&
               d1.getMonth() === d2.getMonth() &&
               d1.getDate() === d2.getDate();
    };

    const getClaveFecha = (d) => {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    const handleConfirmarAsistencia = async (asistira) => {
        if (!onAsistencia || !eventoSeleccionado) return;
        if (!esAlumnoOProfesor) return;
        if (esEventoPasado(eventoSeleccionado.fecha_evento)) return;
        setGuardandoAsistencia(true);
        try {
            await onAsistencia(eventoSeleccionado, asistira);
            setEventoSeleccionado(prev => ({
                ...prev,
                mi_respuesta: asistira,
                total_asistentes: asistira === 1 
                    ? (prev.mi_respuesta === 1 ? prev.total_asistentes : (Number(prev.total_asistentes || 0) + 1))
                    : (prev.mi_respuesta === 1 ? Math.max(0, Number(prev.total_asistentes || 1) - 1) : prev.total_asistentes)
            }));
        } catch (err) {
            console.error("Error al registrar asistencia:", err);
        } finally {
            setGuardandoAsistencia(false);
        }
    };

    // Eventos a mostrar en la sección del mes actual (si hay un día seleccionado, filtrar por ese día)
    const eventosAMostrarMesActual = diaSeleccionado
        ? (mapaEventosPorFecha[getClaveFecha(diaSeleccionado)] || [])
        : todosEventosMesActual;

    // Render de tarjeta de evento para la lista lateral
    const renderCardEvento = (ev) => {
        const d = ev._fechaObj || parseFecha(ev.fecha_evento);
        const hora = d ? d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' }) : '';
        const fechaFormateada = d ? d.toLocaleDateString('es-MX', { weekday: 'short', day: 'numeric', month: 'short' }) : '';
        const colorClub = getClubColor(ev.club_id);

        return (
            <div
                key={ev.id}
                onClick={() => setEventoSeleccionado(ev)}
                style={{
                    border: '1px solid #e2e8f0',
                    borderLeft: `5px solid ${colorClub}`,
                    borderRadius: '8px',
                    padding: '12px 14px',
                    backgroundColor: '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-2px)';
                    e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = colorClub;
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                }}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '4px' }}>
                    <span style={{ fontSize: '0.78rem', fontWeight: 'bold', color: colorClub }}>
                        🏆 {ev.club_nombre}
                    </span>
                    <span style={{ fontSize: '0.78rem', fontWeight: '600', color: '#003366', background: '#eef2f7', padding: '2px 8px', borderRadius: '6px' }}>
                        📅 {fechaFormateada} · {hora} hrs
                    </span>
                </div>

                <h5 style={{ margin: 0, fontSize: '0.96rem', color: '#1e293b', fontWeight: '600' }}>
                    {ev.titulo}
                </h5>

                {ev.lugar && (
                    <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
                        📍 {ev.lugar}
                    </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', borderTop: '1px solid #f1f5f9', paddingTop: '6px', marginTop: '2px' }}>
                    <span style={{ color: '#64748b' }}>
                        👥 {ev.total_asistentes || 0} confirmados
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {ev.es_invitacion && (
                            <span style={{ fontSize: '0.72rem', background: '#fef3c7', color: '#92400e', padding: '1px 6px', borderRadius: '8px', fontWeight: 'bold' }}>
                                📩 Invitado
                            </span>
                        )}
                        {modo === 'usuario' && esAlumnoOProfesor ? (
                            esEventoPasado(ev.fecha_evento) ? (
                                ev.mi_respuesta === 1 ? (
                                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Asististe</span>
                                ) : ev.mi_respuesta === 0 ? (
                                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗ No asististe</span>
                                ) : (
                                    <span style={{ color: '#94a3b8', fontSize: '0.78rem', fontStyle: 'italic' }}>Finalizado</span>
                                )
                            ) : (
                                ev.mi_respuesta === 1 ? (
                                    <span style={{ color: '#16a34a', fontWeight: 'bold' }}>✓ Asistirás</span>
                                ) : ev.mi_respuesta === 0 ? (
                                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>✗ No asistirás</span>
                                ) : (
                                    <span style={{ color: '#1877f2', fontWeight: '600' }}>Confirmar →</span>
                                )
                            )
                        ) : (
                            <span style={{ color: '#1877f2', fontWeight: '600' }}>Ver detalles →</span>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {/* Barra superior de controles del Calendario */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: '12px',
                background: '#ffffff',
                padding: '14px 18px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                border: '1px solid #e1e5eb'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                        onClick={mesAnterior}
                        style={{
                            background: '#f0f2f5',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#003366',
                            transition: 'all 0.2s ease'
                        }}
                        title="Mes anterior"
                    >
                        ◀
                    </button>
                    <h3 style={{ margin: 0, color: '#003366', fontSize: '1.25rem', fontWeight: '700', minWidth: '190px', textAlign: 'center' }}>
                        📅 {meses[mes]} {anio}
                    </h3>
                    <button
                        onClick={mesSiguiente}
                        style={{
                            background: '#f0f2f5',
                            border: '1px solid #d1d5db',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: 'bold',
                            color: '#003366',
                            transition: 'all 0.2s ease'
                        }}
                        title="Mes siguiente"
                    >
                        ▶
                    </button>
                    <button
                        onClick={irAHoy}
                        style={{
                            background: '#e7f3ff',
                            border: '1px solid #1877f2',
                            borderRadius: '8px',
                            padding: '6px 12px',
                            cursor: 'pointer',
                            fontWeight: '600',
                            color: '#1877f2',
                            fontSize: '0.84rem'
                        }}
                    >
                        Hoy
                    </button>
                </div>

                {/* Filtro por club (para modo admin o multi-club) */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                    {clubes.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: '#444' }}>
                                Club:
                            </label>
                            <select
                                value={filtroClub}
                                onChange={(e) => setFiltroClub(e.target.value)}
                                style={{
                                    padding: '6px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid #ccc',
                                    fontSize: '0.85rem',
                                    color: '#333',
                                    background: '#fff',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="todos">🌟 Todos los clubes ({eventos.length})</option>
                                {clubes.map(c => (
                                    <option key={c.id} value={c.id}>
                                        🏆 {c.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {onRefresh && (
                        <button
                            onClick={onRefresh}
                            style={{
                                background: '#f8f9fa',
                                border: '1px solid #d1d5db',
                                borderRadius: '8px',
                                padding: '6px 10px',
                                cursor: 'pointer',
                                fontSize: '0.84rem',
                                color: '#555',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            title="Actualizar eventos"
                        >
                            🔄 Actualizar
                        </button>
                    )}
                </div>
            </div>

            {/* CONTENEDOR PRINCIPAL: Cuadrícula compacta a la izquierda + Lista de eventos a la derecha */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'minmax(320px, 1fr) minmax(360px, 1.15fr)',
                gap: '20px',
                alignItems: 'start'
            }}>
                {/* COLUMNA IZQUIERDA: Cuadrícula Compacta de Calendario */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{
                        background: '#ffffff',
                        borderRadius: '12px',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                        border: '1px solid #e1e5eb',
                        overflow: 'hidden'
                    }}>
                        {/* Cabecera de días de la semana */}
                        <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(7, 1fr)',
                            background: '#003366',
                            color: '#ffffff',
                            fontWeight: '700',
                            fontSize: '0.82rem',
                            textAlign: 'center',
                            padding: '8px 0'
                        }}>
                            {diasSemana.map((dia, idx) => (
                                <div key={idx}>
                                    {dia}
                                </div>
                            ))}
                        </div>

                        {/* Celdas de días compactas */}
                        {cargando ? (
                            <div style={{ padding: '40px', textAlign: 'center', color: '#666', fontSize: '0.9rem' }}>
                                ⏳ Cargando calendario...
                            </div>
                        ) : (
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(7, 1fr)',
                                backgroundColor: '#f0f2f5',
                                gap: '1px'
                            }}>
                                {celdas.map((celda, idx) => {
                                    const clave = getClaveFecha(celda.fecha);
                                    const eventosCelda = mapaEventosPorFecha[clave] || [];
                                    const esHoy = esMismoDia(celda.fecha, hoy);
                                    const esSeleccionado = esMismoDia(celda.fecha, diaSeleccionado);

                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setDiaSeleccionado(celda.fecha)}
                                            style={{
                                                minHeight: '52px',
                                                padding: '4px',
                                                backgroundColor: esSeleccionado 
                                                    ? '#e7f3ff' 
                                                    : celda.esMesActual ? '#ffffff' : '#f9fafb',
                                                opacity: celda.esMesActual ? 1 : 0.45,
                                                cursor: 'pointer',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                transition: 'all 0.15s ease',
                                                border: esSeleccionado ? '2px solid #1877f2' : 'none',
                                                boxSizing: 'border-box'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!esSeleccionado && celda.esMesActual) {
                                                    e.currentTarget.style.backgroundColor = '#f1f5f9';
                                                }
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!esSeleccionado && celda.esMesActual) {
                                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                                }
                                            }}
                                        >
                                            <span style={{
                                                fontSize: '0.82rem',
                                                fontWeight: esHoy || esSeleccionado ? '700' : '500',
                                                width: '24px',
                                                height: '24px',
                                                display: 'inline-flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                borderRadius: '50%',
                                                backgroundColor: esHoy ? '#003366' : 'transparent',
                                                color: esHoy ? '#ffffff' : (celda.esMesActual ? '#333' : '#999')
                                            }}>
                                                {celda.dia}
                                            </span>

                                            {/* Puntos de eventos (compactos) */}
                                            <div style={{ display: 'flex', gap: '3px', justifyContent: 'center', alignItems: 'center', minHeight: '10px' }}>
                                                {eventosCelda.slice(0, 3).map((ev, i) => (
                                                    <span
                                                        key={i}
                                                        style={{
                                                            width: '6px',
                                                            height: '6px',
                                                            borderRadius: '50%',
                                                            backgroundColor: getClubColor(ev.club_id)
                                                        }}
                                                        title={`${ev.club_nombre}: ${ev.titulo}`}
                                                    />
                                                ))}
                                                {eventosCelda.length > 3 && (
                                                    <span style={{ fontSize: '0.62rem', color: '#003366', fontWeight: 'bold' }}>
                                                        +
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Barra de estado de filtro por día */}
                    {diaSeleccionado && (
                        <div style={{
                            background: '#e7f3ff',
                            border: '1px solid #b9d9eb',
                            padding: '8px 14px',
                            borderRadius: '8px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            fontSize: '0.85rem',
                            color: '#003366'
                        }}>
                            <span>
                                📍 Filtrado por: <strong>{diaSeleccionado.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' })}</strong> ({eventosAMostrarMesActual.length} eventos)
                            </span>
                            <button
                                onClick={() => setDiaSeleccionado(null)}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    color: '#003366',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    textDecoration: 'underline',
                                    fontSize: '0.82rem',
                                    padding: 0
                                }}
                            >
                                Ver todos los del mes
                            </button>
                        </div>
                    )}
                </div>

                {/* COLUMNA DERECHA: Lista de Eventos del Mes Actual y del Mes que Sigue */}
                <div style={{
                    background: '#ffffff',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                    border: '1px solid #e1e5eb',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '22px',
                    maxHeight: '680px',
                    overflowY: 'auto'
                }}>
                    {/* SECCIÓN 1: Eventos de este mes */}
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            borderBottom: '2px solid #003366',
                            paddingBottom: '8px'
                        }}>
                            <h4 style={{ margin: 0, color: '#003366', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                📅 Eventos de {meses[mes]} {anio}
                            </h4>
                            <span style={{
                                fontSize: '0.8rem',
                                background: '#e7f3ff',
                                color: '#003366',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                            }}>
                                {eventosAMostrarMesActual.length} {eventosAMostrarMesActual.length === 1 ? 'evento' : 'eventos'}
                            </span>
                        </div>

                        {eventosAMostrarMesActual.length === 0 ? (
                            <p style={{ margin: 0, color: '#777', fontSize: '0.88rem', fontStyle: 'italic', padding: '8px 0' }}>
                                {diaSeleccionado 
                                    ? `No hay eventos programados para el ${diaSeleccionado.toLocaleDateString('es-MX')}.`
                                    : `No hay eventos programados en ${meses[mes]}.`}
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {eventosAMostrarMesActual.map(ev => renderCardEvento(ev))}
                            </div>
                        )}
                    </div>

                    {/* SECCIÓN 2: Eventos del mes que sigue */}
                    <div>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '12px',
                            borderBottom: '2px solid #64748b',
                            paddingBottom: '8px'
                        }}>
                            <h4 style={{ margin: 0, color: '#334155', fontSize: '1.1rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                🔜 Eventos de {meses[mesSiguienteIdx]} {anioSiguiente}
                            </h4>
                            <span style={{
                                fontSize: '0.8rem',
                                background: '#f1f5f9',
                                color: '#475569',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontWeight: 'bold'
                            }}>
                                {eventosMesSiguiente.length} {eventosMesSiguiente.length === 1 ? 'evento' : 'eventos'}
                            </span>
                        </div>

                        {eventosMesSiguiente.length === 0 ? (
                            <p style={{ margin: 0, color: '#777', fontSize: '0.88rem', fontStyle: 'italic', padding: '8px 0' }}>
                                No hay eventos programados en {meses[mesSiguienteIdx]}.
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                {eventosMesSiguiente.map(ev => renderCardEvento(ev))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de Detalle Completo del Evento */}
            {eventoSeleccionado && (
                <div
                    onClick={() => setEventoSeleccionado(null)}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.55)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '16px'
                    }}
                >
                    <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            background: '#ffffff',
                            borderRadius: '14px',
                            maxWidth: '560px',
                            width: '100%',
                            padding: '24px 28px',
                            boxShadow: '0 10px 30px rgba(0,0,0,0.25)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            position: 'relative',
                            maxHeight: '90vh',
                            overflowY: 'auto'
                        }}
                    >
                        {/* Botón cerrar */}
                        <button
                            onClick={() => setEventoSeleccionado(null)}
                            style={{
                                position: 'absolute',
                                top: '16px',
                                right: '16px',
                                background: '#f1f5f9',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontSize: '1.1rem',
                                color: '#475569',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            ✕
                        </button>

                        {/* Encabezado del Evento */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                                <span style={{
                                    background: `${getClubColor(eventoSeleccionado.club_id)}18`,
                                    color: getClubColor(eventoSeleccionado.club_id),
                                    padding: '4px 10px',
                                    borderRadius: '12px',
                                    fontSize: '0.82rem',
                                    fontWeight: 'bold'
                                }}>
                                    🏆 {eventoSeleccionado.club_nombre}
                                </span>
                                {eventoSeleccionado.es_invitacion && (
                                    <span style={{
                                        background: '#fef3c7',
                                        color: '#92400e',
                                        padding: '4px 10px',
                                        borderRadius: '12px',
                                        fontSize: '0.82rem',
                                        fontWeight: 'bold'
                                    }}>
                                        📩 Evento de Club con Invitación
                                    </span>
                                )}
                            </div>
                            <h3 style={{ margin: '0 0 6px 0', color: '#003366', fontSize: '1.4rem' }}>
                                {eventoSeleccionado.titulo}
                            </h3>
                        </div>

                        {/* Información Clave (Fecha, Hora, Lugar) */}
                        <div style={{
                            background: '#f8fafc',
                            borderRadius: '10px',
                            padding: '14px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '8px',
                            fontSize: '0.92rem',
                            border: '1px solid #e2e8f0'
                        }}>
                            <div>
                                📅 <strong>Fecha:</strong> {parseFecha(eventoSeleccionado.fecha_evento)?.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                            </div>
                            <div>
                                🕒 <strong>Hora:</strong> {parseFecha(eventoSeleccionado.fecha_evento)?.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })} hrs
                            </div>
                            {eventoSeleccionado.lugar && (
                                <div>
                                    📍 <strong>Lugar:</strong> {eventoSeleccionado.lugar}
                                </div>
                            )}
                            <div>
                                👥 <strong>Asistentes confirmados:</strong> {eventoSeleccionado.total_asistentes || 0} personas
                            </div>
                        </div>

                        {/* Descripción */}
                        {eventoSeleccionado.descripcion && (
                            <div>
                                <h4 style={{ margin: '0 0 6px 0', fontSize: '0.95rem', color: '#334155' }}>Descripción:</h4>
                                <p style={{ margin: 0, color: '#475569', lineHeight: '1.55', whiteSpace: 'pre-line', fontSize: '0.92rem' }}>
                                    {eventoSeleccionado.descripcion}
                                </p>
                            </div>
                        )}

                        {/* Confirmación de Asistencia: Exclusivo para alumnos y profesores en eventos no concluidos */}
                        {modo === 'usuario' && onAsistencia && esAlumnoOProfesor && (
                            <div style={{
                                borderTop: '1px solid #e2e8f0',
                                paddingTop: '16px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '10px'
                            }}>
                                {esEventoPasado(eventoSeleccionado.fecha_evento) ? (
                                    <div style={{
                                        background: '#f8fafc',
                                        borderLeft: '4px solid #64748b',
                                        padding: '12px 14px',
                                        borderRadius: '8px',
                                        fontSize: '0.88rem',
                                        color: '#475569',
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: '4px'
                                    }}>
                                        <div style={{ fontWeight: 'bold', color: '#1e293b' }}>
                                            🕒 Evento Concluido
                                        </div>
                                        <div>
                                            Este evento ya finalizó. La confirmación de asistencia no está disponible para eventos pasados.
                                        </div>
                                        {Number(eventoSeleccionado.mi_respuesta) === 1 && (
                                            <div style={{ marginTop: '4px', color: '#16a34a', fontWeight: 'bold' }}>
                                                ✓ Tu registro: Confirmaste asistencia a este evento.
                                            </div>
                                        )}
                                        {Number(eventoSeleccionado.mi_respuesta) === 0 && (
                                            <div style={{ marginTop: '4px', color: '#dc2626', fontWeight: 'bold' }}>
                                                ✗ Tu registro: Indicaste que no asistirías a este evento.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <>
                                        <div style={{ fontSize: '0.92rem', fontWeight: '600', color: '#1e293b' }}>
                                            ¿Asistirás a este evento?
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <button
                                                disabled={guardandoAsistencia}
                                                onClick={() => handleConfirmarAsistencia(1)}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 16px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: eventoSeleccionado.mi_respuesta === 1 ? '#16a34a' : '#e2e8f0',
                                                    color: eventoSeleccionado.mi_respuesta === 1 ? '#ffffff' : '#334155',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: eventoSeleccionado.mi_respuesta === 1 ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                                                }}
                                            >
                                                ✓ {eventoSeleccionado.mi_respuesta === 1 ? 'Asistencia confirmada' : 'Sí, asistiré'}
                                            </button>
                                            <button
                                                disabled={guardandoAsistencia}
                                                onClick={() => handleConfirmarAsistencia(0)}
                                                style={{
                                                    flex: 1,
                                                    padding: '10px 16px',
                                                    borderRadius: '8px',
                                                    border: 'none',
                                                    background: eventoSeleccionado.mi_respuesta === 0 ? '#dc2626' : '#e2e8f0',
                                                    color: eventoSeleccionado.mi_respuesta === 0 ? '#ffffff' : '#334155',
                                                    fontWeight: 'bold',
                                                    cursor: 'pointer',
                                                    fontSize: '0.9rem',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '6px',
                                                    boxShadow: eventoSeleccionado.mi_respuesta === 0 ? '0 2px 6px rgba(220, 38, 38, 0.3)' : 'none'
                                                }}
                                            >
                                                ✗ {eventoSeleccionado.mi_respuesta === 0 ? 'No asistirás' : 'No asistiré'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* Botón Cerrar Inferior */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '6px' }}>
                            <button
                                onClick={() => setEventoSeleccionado(null)}
                                style={{
                                    background: '#003366',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '8px',
                                    padding: '8px 20px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    fontSize: '0.9rem'
                                }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default CalendarioEventos;
