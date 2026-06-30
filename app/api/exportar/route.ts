import { NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'
import { requirePermiso } from '@/lib/permisos-server'
import { auditar } from '@/lib/auditoria'
import { traerTodo } from '@/lib/traer-todo'

export async function GET() {
  const bloqueo = await requirePermiso('exportar')
  if (bloqueo) return bloqueo
  auditar('exportar', 'clientes', null, 'Exportación de base completa (JSON)')
  const supabase = createSupabaseAdminClient()
  // 4 consultas en paralelo, cada una paginada con traerTodo para traer la base
  // COMPLETA sin el techo de 1.000 filas por pedido.
  const [clientesRes, asistenciasRes, pagosRes, seguimientosRes] = await Promise.all([
    traerTodo(() => supabase.from('clientes').select('*').order('nombre')),
    traerTodo(() => supabase.from('asistencias').select('*, clientes(nombre)').order('fecha_asistencia', { ascending: false })),
    traerTodo(() => supabase.from('pagos').select('*, clientes(nombre)').order('fecha_pago', { ascending: false })),
    traerTodo(() => supabase.from('seguimientos').select('*, clientes(nombre)').order('fecha', { ascending: false })),
  ])

  if (clientesRes.error) return NextResponse.json({ error: clientesRes.error }, { status: 500 })

  return NextResponse.json({
    clientes: clientesRes.data ?? [],
    asistencias: asistenciasRes.data ?? [],
    pagos: pagosRes.data ?? [],
    seguimientos: seguimientosRes.data ?? [],
  })
}
