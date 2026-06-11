// Cálculo de boletas de honorarios según legislación chilena (Ley 21.133).
// La retención sube gradualmente: 2024: 13,75% · 2025: 14,5% · 2026: 15,25% · 2027: 16% · 2028: 17%

export const RETENCION_VIGENTE = 0.1525 // año 2026
export const RETENCION_LABEL = '15,25%'

// Desde el monto líquido (lo que recibe el prestador) calcula el bruto a boletear.
// bruto = líquido / (1 - retención); retención = bruto - líquido
export function calcularBoleta(liquido: number) {
  const bruto = Math.round(liquido / (1 - RETENCION_VIGENTE))
  const retencion = bruto - Math.round(liquido)
  return { liquido: Math.round(liquido), bruto, retencion }
}

export function formatoCLP(n: number | null | undefined) {
  if (n == null) return '—'
  return `$${Math.round(n).toLocaleString('es-CL')}`
}
