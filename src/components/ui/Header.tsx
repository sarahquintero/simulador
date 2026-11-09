import React from 'react';
import { BookOpen, Clock, Layers, Scale } from 'lucide-react';
import { PulleySystemType, SimulationStatus } from '../../types/simulation';

interface HeaderProps {
  status: SimulationStatus;
  time: number;
  systemType: PulleySystemType;
}

const STATUS_LABELS: Record<SimulationStatus, string> = {
  idle: 'Listo para experimentar',
  running: 'Simulación activa',
  paused: 'Simulación en pausa',
  finished: 'Recorrido completado',
};

const SYSTEM_NAMES: Record<PulleySystemType, string> = {
  atwood: 'Máquina de Atwood (VM = 1)',
  movable_pulley: 'Polipasto Simple (VM = 2)',
};

export const Header: React.FC<HeaderProps> = ({ status, time, systemType }) => {
  return (
    <header className="app-header">
      <div className="brand-block">
        <div className="brand-icon" aria-hidden="true">
          <Scale size={24} />
        </div>
        <div className="brand-text">
          <div className="brand-eyebrow">
            <BookOpen size={13} />
            <span>Laboratorio Virtual de Física Mecánica</span>
          </div>
          <h1>Simulador Interactivo de Pesas y Poleas</h1>
        </div>
      </div>

      <div className="header-badges">
        <div className="badge badge-system" title="Sistema mecánico activo">
          <Layers size={15} />
          <span>{SYSTEM_NAMES[systemType]}</span>
        </div>

        <div className="badge badge-time" title="Tiempo transcurrido">
          <Clock size={15} />
          <span className="mono-text">t = {time.toFixed(2)} s</span>
        </div>

        <div className={`badge badge-status status-${status}`} role="status">
          <span className="status-dot" />
          <span>{STATUS_LABELS[status]}</span>
        </div>
      </div>
    </header>
  );
};
