import React from 'react';
import ClubDetailsPage from './ClubDetailsPage';

/**
 * ClubPanelPage ahora delega a la vista unificada ClubDetailsPage con la pestaña 'avisos' activa por defecto.
 * Esto garantiza compatibilidad total con URLs existentes (/club/:id/panel)
 * manteniendo todas las funcionalidades (avisos, eventos, miembros y detalles generales) en un solo lugar.
 */
const ClubPanelPage = () => {
    return <ClubDetailsPage defaultTab="avisos" />;
};

export default ClubPanelPage;
