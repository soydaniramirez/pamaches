import Link from 'next/link';

/**
 * Placeholder para pantallas aún no migradas desde el index.html.
 * Mantiene la navegación funcional y deja claro qué falta (ver PLAN.md).
 */
export default function Stub({
  titulo,
  nota,
}: {
  titulo: string;
  nota?: string;
}) {
  return (
    <div className="screen active">
      <div className="app-content">
        <div className="section-header">
          <Link href="/" className="back-btn" aria-label="volver">
            ←
          </Link>
          <div className="section-title">{titulo}</div>
        </div>
        <div className="resumen-card" style={{ textAlign: 'center' }}>
          <div className="resumen-label">pantalla en migración</div>
          <p className="hint" style={{ marginTop: 12 }}>
            {nota ??
              'Esta pantalla se está portando desde el index.html original. Consulta PLAN.md para el detalle de la migración.'}
          </p>
        </div>
      </div>
    </div>
  );
}
