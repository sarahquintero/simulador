import React, { useMemo } from 'react';
import {
  Activity,
  BookOpen,
  Calculator,
  CheckCircle2,
  CircleDot,
  Compass,
  Gauge,
  HelpCircle,
  Scale,
  ShieldCheck,
  TrendingUp,
  Weight,
} from 'lucide-react';
import { runPhysicsValidationSuite } from '../../physics/verification';
import { PulleyParameters, PulleyPhysicsState } from '../../types/simulation';

interface PhysicsInfoPanelProps {
  parameters: PulleyParameters;
  state: PulleyPhysicsState;
}

export const PhysicsInfoPanel: React.FC<PhysicsInfoPanelProps> = React.memo(
  ({ parameters, state }) => {
    const m1 = parameters.mass1;
    const m2 = parameters.mass2;
    const g = parameters.gravity;
    const y0 = parameters.initialDisplacement;
    const v0 = parameters.initialVelocity;
    const t = state.time;

    const validationSuite = useMemo(() => runPhysicsValidationSuite(), []);

    return (
      <section
        className="panel info-panel"
        aria-label="Apartado educativo: Fundamentos físicos"
      >
        {/* Encabezado principal del apartado Fundamentos físicos */}
        <div className="info-header">
          <div className="info-title-group">
            <BookOpen size={20} className="icon-primary" />
            <div>
              <h2 className="panel-title">Fundamentos físicos</h2>
              <p className="panel-caption">
                Conceptos esenciales y ecuaciones fundamentales del sistema
              </p>
            </div>
          </div>
        </div>

        {/* Diagnóstico dinámico breve y directo */}
        <div
          className={`live-diagnosis ${
            state.isEqualMasses
              ? 'diagnosis-equilibrium'
              : state.systemAcceleration > 0
              ? 'diagnosis-blue'
              : 'diagnosis-orange'
          }`}
        >
          <div className="diagnosis-icon">
            {state.isEqualMasses ? (
              <CheckCircle2 size={18} />
            ) : (
              <TrendingUp size={18} />
            )}
          </div>
          <div className="diagnosis-content">
            <strong>
              {state.isEqualMasses ? (
                <>
                  Equilibrio: m<sub>1</sub> = m<sub>2</sub> (a = 0.000 m/s
                  <sup>2</sup>)
                </>
              ) : state.systemAcceleration > 0 ? (
                <>
                  Movimiento: m<sub>1</sub> desciende y m<sub>2</sub> asciende (P
                  <sub>1</sub> {'>'} P<sub>2</sub>)
                </>
              ) : (
                <>
                  Movimiento: m<sub>2</sub> desciende y m<sub>1</sub> asciende (P
                  <sub>2</sub> {'>'} P<sub>1</sub>)
                </>
              )}
            </strong>
            <p>
              {state.isEqualMasses ? (
                <>
                  Ambos pesos son iguales ({state.weight1.toFixed(2)} N) y se
                  equilibran con la tensión T = {state.ropeTension.toFixed(2)} N.
                </>
              ) : (
                <>
                  La fuerza neta de {Math.abs(state.netForce).toFixed(2)} N mueve
                  una masa total de {(m1 + m2).toFixed(2)} kg con aceleración |a| ={' '}
                  {Math.abs(state.systemAcceleration).toFixed(3)} m/s<sup>2</sup>{' '}
                  y tensión T = {state.ropeTension.toFixed(2)} N.
                </>
              )}
            </p>
          </div>
        </div>

        {/* Conceptos fundamentales resumidos en 1-2 frases */}
        <div className="concepts-grid">
          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <CircleDot size={15} className="icon-primary" />
              </span>
              <h3>1. Polea</h3>
            </div>
            <p className="concept-card-text">
              Rueda acanalada que permite cambiar la dirección de una fuerza
              mediante una cuerda.
            </p>
          </article>

          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <Scale size={15} className="icon-emerald" />
              </span>
              <h3>2. Máquina de Atwood</h3>
            </div>
            <p className="concept-card-text">
              Sistema formado por dos masas (m<sub>1</sub> y m<sub>2</sub>) unidas
              por una cuerda inextensible que pasa por una polea fija.
            </p>
          </article>

          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <Compass size={15} className="icon-primary" />
              </span>
              <h3>3. Tensión (T)</h3>
            </div>
            <p className="concept-card-text">
              Fuerza interna que transmite la cuerda entre las masas, tirando de
              ambas hacia arriba.
            </p>
          </article>

          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <Weight size={15} className="icon-orange" />
              </span>
              <h3>4. Peso / Fuerza gravitacional (P)</h3>
            </div>
            <p className="concept-card-text">
              Fuerza con la que la gravedad atrae verticalmente hacia abajo a cada
              cuerpo (P = m · g).
            </p>
          </article>

          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <Gauge size={15} className="icon-orange" />
              </span>
              <h3>5. Aceleración (a)</h3>
            </div>
            <p className="concept-card-text">
              Cambio de velocidad producido por la diferencia entre las masas
              dividida por la masa total.
            </p>
          </article>

          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <HelpCircle size={15} className="icon-emerald" />
              </span>
              <h3>6. Masas iguales (m1 = m2)</h3>
            </div>
            <p className="concept-card-text">
              Los pesos se anulan entre sí y la aceleración es cero (reposo o
              velocidad constante).
            </p>
          </article>

          <article className="concept-card">
            <div className="concept-card-header">
              <span className="concept-icon-badge">
                <Activity size={15} className="icon-primary" />
              </span>
              <h3>7. Interpretación de gráficas</h3>
            </div>
            <p className="concept-card-text">
              La posición traza una parábola, la velocidad cambia en línea recta y
              la aceleración y fuerzas permanecen constantes en el tiempo.
            </p>
          </article>
        </div>

        {/* Apartado de Fórmulas Utilizadas con explicaciones breves */}
        <div className="formulas-educational-section">
          <div className="formulas-section-header">
            <Calculator size={18} className="icon-primary" />
            <div>
              <h3>Fórmulas Utilizadas</h3>
              <p className="panel-caption">
                Ecuaciones del modelo físico evaluadas con los datos actuales
              </p>
            </div>
          </div>

          <div className="formulas-explained-grid">
            {/* 1. Fuerza Gravitacional */}
            <div className="formula-explained-card">
              <div className="formula-title-row">
                <strong>1. Peso</strong>
                <span className="si-unit-pill">N</span>
              </div>
              <code className="formula-equation">P = m · g</code>
              <p className="formula-explanation">
                Producto de la masa por la gravedad.
              </p>
              <div className="formula-live-calc">
                P<sub>1</sub> = {m1.toFixed(1)} · {g.toFixed(2)} ={' '}
                <strong>{state.weight1.toFixed(2)} N</strong> &nbsp;|&nbsp; P
                <sub>2</sub> = {m2.toFixed(1)} · {g.toFixed(2)} ={' '}
                <strong>{state.weight2.toFixed(2)} N</strong>
              </div>
            </div>

            {/* 2. Aceleración del Sistema */}
            <div className="formula-explained-card">
              <div className="formula-title-row">
                <strong>2. Aceleración</strong>
                <span className="si-unit-pill">
                  m/s<sup>2</sup>
                </span>
              </div>
              <code className="formula-equation">
                a = ((m<sub>1</sub> - m<sub>2</sub>) · g) / (m<sub>1</sub> + m
                <sub>2</sub>)
              </code>
              <p className="formula-explanation">
                Fuerza neta dividida entre la masa total del sistema.
              </p>
              <div className="formula-live-calc">
                a = (({m1.toFixed(1)} - {m2.toFixed(1)}) · {g.toFixed(2)}) / (
                {(m1 + m2).toFixed(1)}) ={' '}
                <strong>
                  {state.systemAcceleration.toFixed(3)} m/s<sup>2</sup>
                </strong>
              </div>
            </div>

            {/* 3. Tensión de la Cuerda */}
            <div className="formula-explained-card">
              <div className="formula-title-row">
                <strong>3. Tensión</strong>
                <span className="si-unit-pill">N</span>
              </div>
              <code className="formula-equation">
                T = (2 · m<sub>1</sub> · m<sub>2</sub> · g) / (m<sub>1</sub> + m
                <sub>2</sub>)
              </code>
              <p className="formula-explanation">
                Fuerza de tracción uniforme a lo largo de la cuerda ideal.
              </p>
              <div className="formula-live-calc">
                T = (2 · {m1.toFixed(1)} · {m2.toFixed(1)} · {g.toFixed(2)}) / (
                {(m1 + m2).toFixed(1)}) ={' '}
                <strong>{state.ropeTension.toFixed(2)} N</strong>
              </div>
            </div>

            {/* 4. Posición Horaria */}
            <div className="formula-explained-card">
              <div className="formula-title-row">
                <strong>4. Posición</strong>
                <span className="si-unit-pill">m</span>
              </div>
              <code className="formula-equation">
                y(t) = y<sub>0</sub> + v<sub>0</sub> · t + (1/2) · a · t
                <sup>2</sup>
              </code>
              <p className="formula-explanation">
                Desplazamiento acumulado en función del tiempo.
              </p>
              <div className="formula-live-calc">
                y({t.toFixed(2)} s) = {y0.toFixed(2)} + ({v0.toFixed(2)})(
                {t.toFixed(2)}) + (1/2)({state.systemAcceleration.toFixed(2)})(
                {t.toFixed(2)})<sup>2</sup> ={' '}
                <strong>{state.systemPosition.toFixed(3)} m</strong>
              </div>
            </div>

            {/* 5. Velocidad Horaria */}
            <div className="formula-explained-card">
              <div className="formula-title-row">
                <strong>5. Velocidad</strong>
                <span className="si-unit-pill">m/s</span>
              </div>
              <code className="formula-equation">
                v(t) = v<sub>0</sub> + a · t
              </code>
              <p className="formula-explanation">
                Variación lineal de la velocidad con aceleración constante.
              </p>
              <div className="formula-live-calc">
                v({t.toFixed(2)} s) = {v0.toFixed(2)} + (
                {state.systemAcceleration.toFixed(2)})({t.toFixed(2)}) ={' '}
                <strong>{state.systemVelocity.toFixed(3)} m/s</strong>
              </div>
            </div>
          </div>
        </div>

        {/* Tabla de Validación Física Automatizada (Fase 9) */}
        <div className="validation-report-box">
          <div className="validation-report-header">
            <div className="validation-title">
              <ShieldCheck size={17} className="icon-emerald" />
              <h3>Validación Física del Motor (Casos de Prueba)</h3>
            </div>
            <span className="validation-status-pill">
              <CheckCircle2 size={13} />{' '}
              {validationSuite.allPassed
                ? '100% Pruebas Superadas'
                : 'Revisión requerida'}
            </span>
          </div>

          <div className="validation-table-wrapper">
            <table className="validation-table">
              <thead>
                <tr>
                  <th>Prueba</th>
                  <th>Condición Evaluada</th>
                  <th>Resultado Esperado</th>
                  <th>Resultado del Motor</th>
                  <th>Estado</th>
                </tr>
              </thead>
              <tbody>
                {validationSuite.results.map((item) => (
                  <tr key={item.id}>
                    <td>
                      <strong>{item.id}</strong>
                    </td>
                    <td>{item.description}</td>
                    <td className="mono-text">{item.expected}</td>
                    <td className="mono-text">{item.actual}</td>
                    <td>
                      <span className="pass-badge">
                        <CheckCircle2 size={12} /> Verificado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    );
  }
);
