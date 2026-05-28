import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { generarEmailBriefing, BriefingData, EtapaFunnelItem } from '@/lib/email-briefing'

// ─── Constantes ───────────────────────────────────────────────────────────────

const ETAPAS_ORDEN = [
  { etapa: 'nuevo', label: 'Nuevo' },
  { etapa: 'contactado', label: 'Contactado' },
  { etapa: 'con_interes', label: 'Con interés' },
  { etapa: 'cotizacion_enviada', label: 'Cotización enviada' },
  { etapa: 'negociando', label: 'Negociando' },
  { etapa: 'inscrito', label: 'Inscrito' },
]

// Normaliza actividad_nombre para agrupar ingresos por programa
function normalizarPrograma(nombre: string): string {
  const n = nombre.toLowerCase()
  if (n.includes('practitioner')) return 'Diplomado Practitioner'
  if (n.includes('máster') || n.includes('master')) return 'Diplomado Máster'
  if (n.includes('fabiola')) return 'Sesión Fabiola'
  if (n.includes('rodolfo')) return 'Sesión Rodolfo'
  if (n.includes('ximena')) return 'Sesión Ximena'
  if (n.includes('taller')) return 'Taller'
  if (n.includes('workshop')) return 'Workshop'
  return nombre
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  // Verificar token de seguridad (Vercel lo envía automáticamente, también protege pruebas manuales)
  const authHeader = req.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createSupabaseAdminClient()
  const ahora = new Date()

  // ── Fecha inicio del mes actual ──
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString().slice(0, 10)

  // ── Fecha inicio del mes anterior ──
  const inicioMesAnt = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1).toISOString().slice(0, 10)
  const finMesAnt = new Date(ahora.getFullYear(), ahora.getMonth(), 0).toISOString().slice(0, 10)

  // ── Fecha hace 7 días ──
  const hace7dias = new Date(ahora.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

  // ── Fecha hace 48h ──
  const hace48h = new Date(ahora.getTime() - 48 * 60 * 60 * 1000).toISOString()

  // Ejecutar todas las queries en paralelo
  const [
    clientesRes,
    nuevosMesRes,
    ingresosMesRes,
    ingresosMesAntRes,
    pendientesRes,
    seguimientosRes,
    prospectosSinContactoRes,
    ingresosProgramaRes,
  ] = await Promise.all([
    // Total clientes
    supabase.from('clientes').select('id, etapa', { count: 'exact', head: false }),

    // Nuevos contactos del mes
    supabase.from('clientes')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', inicioMes),

    // Ingresos mes actual (pagados)
    supabase.from('pagos')
      .select('monto')
      .eq('estado', 'pagado')
      .gte('fecha_pago', inicioMes),

    // Ingresos mes anterior (pagados)
    supabase.from('pagos')
      .select('monto')
      .eq('estado', 'pagado')
      .gte('fecha_pago', inicioMesAnt)
      .lte('fecha_pago', finMesAnt),

    // Pagos pendientes (total)
    supabase.from('pagos')
      .select('monto')
      .eq('estado', 'pendiente'),

    // Seguimientos esta semana
    supabase.from('seguimientos')
      .select('id', { count: 'exact', head: true })
      .gte('created_at', hace7dias),

    // Prospectos sin contacto +48h (creados en últimos 7 días)
    supabase.from('clientes')
      .select('id, nombre, correo, telefono, procedencia, created_at')
      .gte('created_at', hace7dias),

    // Ingresos por programa
    supabase.from('pagos')
      .select('actividad_nombre, monto')
      .eq('estado', 'pagado'),
  ])

  // ── Calcular métricas ─────────────────────────────────────────────────────

  const totalClientes = clientesRes.data?.length ?? 0
  const nuevosContactosMes = nuevosMesRes.count ?? 0

  const ingresosMes = (ingresosMesRes.data ?? [])
    .reduce((sum: number, p: { monto?: number | null }) => sum + (p.monto ?? 0), 0)

  const ingresosMesAnterior = (ingresosMesAntRes.data ?? [])
    .reduce((sum: number, p: { monto?: number | null }) => sum + (p.monto ?? 0), 0)

  const pagosPendientesTotal = (pendientesRes.data ?? [])
    .reduce((sum: number, p: { monto?: number | null }) => sum + (p.monto ?? 0), 0)

  const seguimientosSemana = seguimientosRes.count ?? 0

  // ── Funnel de avance ─────────────────────────────────────────────────────

  const conteoEtapas: Record<string, number> = {}
  for (const c of clientesRes.data ?? []) {
    const etapa = c.etapa ?? 'nuevo'
    conteoEtapas[etapa] = (conteoEtapas[etapa] ?? 0) + 1
  }

  const funnel: EtapaFunnelItem[] = ETAPAS_ORDEN.map(({ etapa, label }) => {
    const cantidad = conteoEtapas[etapa] ?? 0
    const porcentaje = totalClientes > 0 ? Math.round((cantidad / totalClientes) * 100) : 0
    return { etapa, label, cantidad, porcentaje }
  }).filter(f => f.cantidad > 0)

  // ── Ingresos por programa ─────────────────────────────────────────────────

  const mapaPrograma: Record<string, number> = {}
  for (const p of ingresosProgramaRes.data ?? []) {
    const prog = normalizarPrograma(p.actividad_nombre ?? 'Otro')
    mapaPrograma[prog] = (mapaPrograma[prog] ?? 0) + (p.monto ?? 0)
  }
  const ingresosPorPrograma = Object.entries(mapaPrograma)
    .map(([programa, total]) => ({ programa, total }))
    .sort((a, b) => b.total - a.total)

  // ── Prospectos sin contacto ───────────────────────────────────────────────

  // Obtener ids con seguimiento reciente (post-48h)
  type ProspectoRow = {
    id: string
    nombre?: string | null
    correo?: string | null
    telefono?: string | null
    procedencia?: string | null
    created_at: string
  }
  const idsConSeguimiento = new Set<string>()
  if ((prospectosSinContactoRes.data ?? []).length > 0) {
    const ids = prospectosSinContactoRes.data!.map((c: ProspectoRow) => c.id)
    const { data: segsRecientes } = await supabase
      .from('seguimientos')
      .select('cliente_id')
      .in('cliente_id', ids)
      .gte('fecha', hace48h)
    for (const s of segsRecientes ?? []) {
      idsConSeguimiento.add(s.cliente_id)
    }
  }

  const prospectosSinContacto = (prospectosSinContactoRes.data ?? [])
    .filter((c: ProspectoRow) => !idsConSeguimiento.has(c.id))
    .map((c: ProspectoRow) => {
      const horasSinContacto = Math.floor(
        (ahora.getTime() - new Date(c.created_at).getTime()) / (1000 * 60 * 60)
      )
      return {
        nombre: c.nombre,
        correo: c.correo,
        telefono: c.telefono,
        procedencia: c.procedencia,
        horasSinContacto,
      }
    })
    .sort((a: { horasSinContacto: number }, b: { horasSinContacto: number }) => b.horasSinContacto - a.horasSinContacto)

  // ── Armar BriefingData ────────────────────────────────────────────────────

  const briefingData: BriefingData = {
    fecha: ahora,
    nuevosContactosMes,
    nuevosContactosMeta: 50,
    ingresosMes,
    ingresosMesAnterior,
    pagosPendientesTotal,
    seguimientosSemana,
    seguimientosMeta: 20,
    totalClientes,
    prospectosSinContacto,
    funnel,
    ingresosPorPrograma,
  }

  // ── Generar HTML y enviar correo ──────────────────────────────────────────

  const htmlEmail = generarEmailBriefing(briefingData)

  const resendApiKey = process.env.RESEND_API_KEY
  if (!resendApiKey) {
    // En desarrollo: devolver el HTML para previsualización
    return new NextResponse(htmlEmail, {
      headers: { 'Content-Type': 'text/html' },
    })
  }

  const emailRes = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${resendApiKey}`,
    },
    body: JSON.stringify({
      from: 'Renovapp CRM <onboarding@resend.dev>',
      to: ['angeles.tapiah@gmail.com'],
      subject: `☀️ Briefing Renova — ${ahora.toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}`,
      html: htmlEmail,
    }),
  })

  if (!emailRes.ok) {
    const err = await emailRes.text()
    console.error('[cron/briefing] Error Resend:', err)
    return NextResponse.json({ error: 'Error enviando correo', details: err }, { status: 500 })
  }

  const emailJson = await emailRes.json()

  return NextResponse.json({
    ok: true,
    emailId: emailJson.id,
    metrics: {
      totalClientes,
      nuevosContactosMes,
      ingresosMes,
      prospectosSinContacto: prospectosSinContacto.length,
    },
  })
}
 