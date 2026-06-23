// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface ProspectoSinContacto {
  nombre: string
  correo: string | null
  telefono: string | null
  procedencia: string | null
  horasSinContacto: number
}

export interface EtapaFunnelItem {
  etapa: string
  label: string
  cantidad: number
  porcentaje: number
}

export interface RecordatorioBriefing {
  titulo: string
  cuando: string
  cliente: string | null
  prioridad: 'normal' | 'alta'
  vencido: boolean
}

export interface BriefingData {
  fecha: Date
  nuevosContactosMes: number
  nuevosContactosMeta: number // meta = 50
  ingresosMes: number
  ingresosMesAnterior: number
  pagosPendientesTotal: number
  seguimientosSemana: number
  seguimientosMeta: number // meta = 20
  totalClientes: number
  prospectosSinContacto: ProspectoSinContacto[]
  funnel: EtapaFunnelItem[]
  ingresosPorPrograma: { programa: string; total: number }[]
  recordatoriosHoy?: RecordatorioBriefing[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatCLP(n: number): string {
  return '$' + Math.round(n).toLocaleString('es-CL')
}

function formatFecha(d: Date): string {
  return d.toLocaleDateString('es-CL', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  })
}

function semaforo(horas: number): { color: string; texto: string } {
  if (horas >= 72) return { color: '#dc2626', texto: '🔴 Urgente' }
  if (horas >= 48) return { color: '#d97706', texto: '🟡 Atención' }
  return { color: '#16a34a', texto: '🟢 Al día' }
}

function variacion(actual: number, anterior: number): string {
  if (anterior === 0) return ''
  const pct = ((actual - anterior) / anterior) * 100
  const signo = pct >= 0 ? '▲' : '▼'
  const color = pct >= 0 ? '#16a34a' : '#dc2626'
  return `<span style="color:${color};font-size:12px;margin-left:6px">${signo} ${Math.abs(pct).toFixed(0)}% vs mes ant.</span>`
}

function etapaLabel(etapa: string): string {
  const labels: Record<string, string> = {
    nuevo: 'Nuevo',
    contactado: 'Contactado',
    con_interes: 'Con interés',
    cotizacion_enviada: 'Cotización enviada',
    negociando: 'Negociando',
    inscrito: 'Inscrito',
  }
  return labels[etapa] ?? etapa
}

// ─── Template HTML del correo ─────────────────────────────────────────────────

export function generarEmailBriefing(data: BriefingData): string {
  const mesActual = data.fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' })
  const pctNuevos = Math.min(100, Math.round((data.nuevosContactosMes / data.nuevosContactosMeta) * 100))
  const pctSeguimientos = Math.min(100, Math.round((data.seguimientosSemana / data.seguimientosMeta) * 100))

  // Generar filas de prospecto sin contacto
  const filasProspectos = data.prospectosSinContacto.length === 0
    ? `<tr><td colspan="4" style="padding:12px;text-align:center;color:#16a34a;font-size:14px">
        ✅ Ningún prospecto sin contacto en las últimas 48 horas
       </td></tr>`
    : data.prospectosSinContacto.slice(0, 10).map(p => {
        const s = semaforo(p.horasSinContacto)
        return `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#111827">${p.nombre}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280">${p.procedencia ?? '—'}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280">${p.telefono ?? p.correo ?? '—'}</td>
          <td style="padding:10px 12px;font-size:12px;font-weight:600;color:${s.color}">${s.texto} (${p.horasSinContacto}h)</td>
        </tr>`
      }).join('')

  // Generar filas del funnel
  const filasFunnel = data.funnel.map(f => {
    const barWidth = Math.max(4, f.porcentaje)
    return `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 12px;font-size:13px;color:#374151;width:160px">${etapaLabel(f.etapa)}</td>
      <td style="padding:10px 12px">
        <div style="background:#f3f4f6;border-radius:4px;height:12px;width:100%">
          <div style="background:#ea580c;border-radius:4px;height:12px;width:${barWidth}%"></div>
        </div>
      </td>
      <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#111827;width:60px;text-align:right">${f.cantidad}</td>
      <td style="padding:10px 12px;font-size:12px;color:#6b7280;width:50px;text-align:right">${f.porcentaje}%</td>
    </tr>`
  }).join('')

  // Generar filas de ingresos por programa
  const filasPrograma = data.ingresosPorPrograma.slice(0, 6).map(p =>
    `<tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:10px 12px;font-size:13px;color:#374151">${p.programa}</td>
      <td style="padding:10px 12px;font-size:13px;font-weight:700;color:#111827;text-align:right">${formatCLP(p.total)}</td>
    </tr>`
  ).join('')

  // Acciones del día
  const acciones: string[] = []
  if (data.prospectosSinContacto.length > 0) {
    acciones.push(`📞 Contactar a <strong>${data.prospectosSinContacto.length}</strong> prospecto${data.prospectosSinContacto.length > 1 ? 's' : ''} sin seguimiento`)
  }
  if (data.pagosPendientesTotal > 0) {
    acciones.push(`💰 Gestionar cobros pendientes por <strong>${formatCLP(data.pagosPendientesTotal)}</strong>`)
  }
  if (data.nuevosContactosMes < data.nuevosContactosMeta * 0.5 && data.fecha.getDate() > 15) {
    acciones.push(`🎯 Activar captación: ${data.nuevosContactosMes}/${data.nuevosContactosMeta} contactos nuevos este mes`)
  }
  if (data.seguimientosSemana < data.seguimientosMeta * 0.5) {
    acciones.push(`📝 Aumentar seguimientos esta semana (${data.seguimientosSemana}/${data.seguimientosMeta} realizados)`)
  }
  if (acciones.length === 0) {
    acciones.push('✨ ¡Todo al día! Mantén el ritmo de seguimiento.')
  }

  const filasAcciones = acciones.map(a =>
    `<li style="margin-bottom:8px;font-size:14px;color:#374151;line-height:1.5">${a}</li>`
  ).join('')

  // Recordatorios del día (pendientes con fecha de hoy o atrasados)
  const recordatorios = data.recordatoriosHoy ?? []
  const filasRecordatorios = recordatorios.length === 0
    ? `<tr><td colspan="3" style="padding:12px;text-align:center;color:#16a34a;font-size:14px">
        ✅ Sin recordatorios para hoy
       </td></tr>`
    : recordatorios.slice(0, 12).map(r => {
        const color = r.vencido ? '#dc2626' : '#374151'
        const flag = r.prioridad === 'alta' ? '🔺 ' : ''
        return `<tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:10px 12px;font-size:13px;font-weight:600;color:#111827">${flag}${r.titulo}</td>
          <td style="padding:10px 12px;font-size:12px;color:${color};font-weight:${r.vencido ? '700' : '400'}">${r.cuando}${r.vencido ? ' · atrasado' : ''}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280">${r.cliente ?? '—'}</td>
        </tr>`
      }).join('')

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>Briefing Diario — Renovapp CRM</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif">

  <!-- Wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:24px 0">
    <tr><td align="center">
      <table width="620" cellpadding="0" cellspacing="0" style="max-width:620px;width:100%">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#ea580c 0%,#c2410c 100%);border-radius:12px 12px 0 0;padding:28px 32px">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px">☀️ Briefing Diario</div>
                  <div style="color:#fed7aa;font-size:13px;margin-top:4px;text-transform:capitalize">${formatFecha(data.fecha)}</div>
                </td>
                <td align="right">
                  <div style="color:#fff;font-size:26px;font-weight:900;opacity:0.25">RENOVA</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- KPIs -->
        <tr>
          <td style="background:#fff;padding:24px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.5px;color:#9ca3af;font-weight:600;margin-bottom:16px">Indicadores del mes — ${mesActual}</div>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <!-- Nuevos contactos -->
                <td width="48%" style="background:#fff7ed;border:1px solid #fed7aa;border-radius:10px;padding:16px;vertical-align:top">
                  <div style="font-size:11px;color:#9a3412;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Nuevos contactos</div>
                  <div style="font-size:28px;font-weight:800;color:#ea580c;margin:6px 0">${data.nuevosContactosMes}</div>
                  <div style="background:#fed7aa;border-radius:4px;height:6px;width:100%;margin-bottom:6px">
                    <div style="background:#ea580c;border-radius:4px;height:6px;width:${pctNuevos}%"></div>
                  </div>
                  <div style="font-size:11px;color:#9a3412">${pctNuevos}% de meta (${data.nuevosContactosMeta})</div>
                </td>
                <td width="4%"></td>
                <!-- Ingresos mes -->
                <td width="48%" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:16px;vertical-align:top">
                  <div style="font-size:11px;color:#14532d;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Ingresos del mes</div>
                  <div style="font-size:22px;font-weight:800;color:#16a34a;margin:6px 0">${formatCLP(data.ingresosMes)}</div>
                  <div style="font-size:11px;color:#14532d">${variacion(data.ingresosMes, data.ingresosMesAnterior)} mes anterior: ${formatCLP(data.ingresosMesAnterior)}</div>
                </td>
              </tr>
              <tr><td colspan="3" style="height:12px"></td></tr>
              <tr>
                <!-- Pagos pendientes -->
                <td width="48%" style="background:#fefce8;border:1px solid #fde68a;border-radius:10px;padding:16px;vertical-align:top">
                  <div style="font-size:11px;color:#713f12;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Por cobrar</div>
                  <div style="font-size:22px;font-weight:800;color:#d97706;margin:6px 0">${formatCLP(data.pagosPendientesTotal)}</div>
                  <div style="font-size:11px;color:#713f12">pagos pendientes</div>
                </td>
                <td width="4%"></td>
                <!-- Seguimientos semana -->
                <td width="48%" style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:16px;vertical-align:top">
                  <div style="font-size:11px;color:#0c4a6e;font-weight:600;text-transform:uppercase;letter-spacing:0.4px">Seguimientos semana</div>
                  <div style="font-size:28px;font-weight:800;color:#0284c7;margin:6px 0">${data.seguimientosSemana}</div>
                  <div style="background:#bae6fd;border-radius:4px;height:6px;width:100%;margin-bottom:6px">
                    <div style="background:#0284c7;border-radius:4px;height:6px;width:${pctSeguimientos}%"></div>
                  </div>
                  <div style="font-size:11px;color:#0c4a6e">${pctSeguimientos}% de meta (${data.seguimientosMeta})</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Acciones del día -->
        <tr>
          <td style="background:#fff;padding:20px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:2px solid #f3f4f6">
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:12px">🎯 Acciones para hoy</div>
            <ul style="margin:0;padding-left:20px">
              ${filasAcciones}
            </ul>
          </td>
        </tr>

        <!-- Recordatorios de hoy -->
        <tr>
          <td style="background:#fff;padding:20px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:2px solid #f3f4f6">
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:4px">🔔 Recordatorios de hoy</div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:14px">Pendientes con fecha de hoy o atrasados</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Recordatorio</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Cuándo</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Cliente</th>
              </tr>
              ${filasRecordatorios}
            </table>
          </td>
        </tr>

        <!-- Alertas: prospectos sin contacto -->
        <tr>
          <td style="background:#fff;padding:20px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:2px solid #f3f4f6">
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:4px">⚡ Prospectos sin seguimiento</div>
            <div style="font-size:12px;color:#9ca3af;margin-bottom:14px">Contactos nuevos (últimos 7 días) sin seguimiento en 48h+</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Nombre</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Canal</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Contacto</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Estado</th>
              </tr>
              ${filasProspectos}
            </table>
          </td>
        </tr>

        <!-- Funnel de avance -->
        <tr>
          <td style="background:#fff;padding:20px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:2px solid #f3f4f6">
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:14px">🔄 Funnel de avance — ${data.totalClientes} clientes</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              ${filasFunnel}
            </table>
          </td>
        </tr>

        <!-- Ingresos por programa -->
        <tr>
          <td style="background:#fff;padding:20px 32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:2px solid #f3f4f6">
            <div style="font-size:14px;font-weight:700;color:#111827;margin-bottom:14px">💼 Ingresos por programa</div>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
              <tr style="background:#f9fafb">
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:left;font-weight:600">Programa</th>
                <th style="padding:8px 12px;font-size:11px;color:#6b7280;text-align:right;font-weight:600">Total cobrado</th>
              </tr>
              ${filasPrograma}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="background:#fff;padding:20px 32px 28px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;border-top:2px solid #f3f4f6;text-align:center">
            <a href="https://renovapp-crm.vercel.app/dashboard"
               style="display:inline-block;background:#ea580c;color:#fff;font-size:14px;font-weight:700;padding:14px 32px;border-radius:8px;text-decoration:none;letter-spacing:0.2px">
              Abrir Renovapp CRM →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f3f4f6;border-radius:0 0 12px 12px;padding:16px 32px;text-align:center;border:1px solid #e5e7eb;border-top:none">
            <div style="font-size:11px;color:#9ca3af">
              Renovapp CRM · Renova PNL · Fabiola Escobar<br>
              Briefing automático generado a las 7:00 AM · Chile
            </div>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>`
}
