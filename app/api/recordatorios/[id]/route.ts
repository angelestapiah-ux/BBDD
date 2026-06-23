// app/api/recordatorios/[id]/route.ts
// Edita (incl. marcar hecho / posponer) y elimina un recordatorio.
// Al marcar HECHO uno recurrente, genera automáticamente la próxima ocurrencia.
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

const CAMPOS_PATCH = [
  'titulo', 'fecha_hora', 'cliente_id', 'notas',
  'categoria', 'prioridad', 'estado', 'recurrencia',
] as const

// Avanza una fecha ISO según la recurrencia y devuelve el nuevo ISO.
function siguienteFecha(iso: string, recurrencia: string): string | null {
  const d = new Date(iso)
  if (isNaN(d.getTime())) return null
  if (recurrencia === 'diaria') d.setDate(d.getDate() + 1)
  else if (recurrencia === 'semanal') d.setDate(d.getDate() + 7)
  else if (recurrencia === 'mensual') d.setMonth(d.getMonth() + 1)
  else return null
  return d.toISOString()
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await ctx.params
  const body = await req.json()

  const payload: Record<string, unknown> = { updated_at: new Date().toISOString() }
  for (const k of CAMPOS_PATCH) {
    if (body[k] !== undefined) payload[k] = body[k]
  }
  if ('cliente_id' in payload && !payload.cliente_id) payload.cliente_id = null
  if (payload.estado === 'hecho') payload.completado_at = new Date().toISOString()
  if (payload.estado === 'pendiente') payload.completado_at = null

  const { data, error } = await supabase
    .from('recordatorios')
    .update(payload)
    .eq('id', id)
    .select('*')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Si se completó un recordatorio recurrente, crear la próxima ocurrencia.
  if (data && data.estado === 'hecho' && data.recurrencia && data.recurrencia !== 'ninguna') {
    const proxima = siguienteFecha(data.fecha_hora as string, data.recurrencia as string)
    if (proxima) {
      try {
        await supabase.from('recordatorios').insert({
          titulo: data.titulo,
          fecha_hora: proxima,
          cliente_id: data.cliente_id,
          notas: data.notas,
          categoria: data.categoria,
          prioridad: data.prioridad,
          recurrencia: data.recurrencia,
          creado_por: data.creado_por,
          estado: 'pendiente',
        })
      } catch {
        // best-effort: si fallara la próxima ocurrencia, el recordatorio actual
        // ya quedó completado y no se interrumpe la respuesta.
      }
    }
  }

  return NextResponse.json(data)
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const supabase = createSupabaseAdminClient()
  const { id } = await ctx.params
  const { error } = await supabase.from('recordatorios').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
