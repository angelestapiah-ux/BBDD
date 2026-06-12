import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { sincronizarAsistencias } from '@/lib/sincronizar-asistencias'

// Acciones masivas sobre clientes seleccionados.
// POST { ids: string[], accion: 'etapa' | 'tipo' | 'eliminar', etapa?, tipo? }
export async function POST(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { ids, accion, etapa, tipo } = await req.json()

  const bloqueo = await requirePermiso(accion === 'eliminar' ? 'eliminar' : 'masivas')
  if (bloqueo) return bloqueo

  if (!Array.isArray(ids) || ids.length === 0) {
    return NextResponse.json({ error: 'Sin clientes seleccionados' }, { status: 400 })
  }
  if (ids.length > 500) {
    return NextResponse.json({ error: 'Máximo 500 clientes por operación' }, { status: 400 })
  }

  if (accion === 'etapa') {
    if (!etapa) return NextResponse.json({ error: 'Etapa requerida' }, { status: 400 })

    // Registrar historial de quienes realmente cambian de etapa (best-effort)
    try {
      const { data: actuales } = await supabase.from('clientes').select('id, etapa').in('id', ids)
      const cambios = ((actuales ?? []) as Array<{ id: string; etapa: string | null }>)
        .filter(c => c.etapa !== etapa)
        .map(c => ({ cliente_id: c.id, etapa_anterior: c.etapa, etapa_nueva: etapa }))
      if (cambios.length > 0) await supabase.from('etapa_historial').insert(cambios)
    } catch { /* la tabla puede no existir aún */ }

    const { error } = await supabase.from('clientes').update({ etapa }).in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    auditar('masiva', 'clientes', null, `${ids.length} clientes → etapa "${etapa}"`)
    return NextResponse.json({ ok: true, afectados: ids.length })
  }

  if (accion === 'tipo') {
    if (!tipo) return NextResponse.json({ error: 'Tipo requerido' }, { status: 400 })
    // tipos_cliente es un array: hay que leer y agregar sin duplicar, cliente por cliente
    const { data: clientes, error } = await supabase
      .from('clientes')
      .select('id, tipos_cliente')
      .in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    let afectados = 0
    for (const c of (clientes ?? []) as Array<{ id: string; tipos_cliente: string[] | null }>) {
      const tipos = c.tipos_cliente ?? []
      if (tipos.includes(tipo)) continue
      const { error: upErr } = await supabase
        .from('clientes')
        .update({ tipos_cliente: [...tipos, tipo] })
        .eq('id', c.id)
      if (!upErr) {
        afectados++
        // El tipo es una actividad: registrar también la asistencia
        await sincronizarAsistencias(supabase, c.id, [tipo])
      }
    }
    auditar('masiva', 'clientes', null, `${afectados} clientes → tipo "${tipo}"`)
    return NextResponse.json({ ok: true, afectados })
  }

  if (accion === 'eliminar') {
    const { error } = await supabase.from('clientes').delete().in('id', ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    auditar('eliminar', 'clientes', null, `Eliminación masiva: ${ids.length} clientes`)
    return NextResponse.json({ ok: true, afectados: ids.length })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
