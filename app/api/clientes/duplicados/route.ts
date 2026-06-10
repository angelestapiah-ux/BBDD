import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseAdminClient } from '@/lib/supabase-server'

// Detección de duplicados al crear/editar un cliente.
// Compara teléfono (solo dígitos, últimos 8 — ignora +56, espacios y guiones),
// correo (sin mayúsculas) y nombre (sin tildes ni mayúsculas).
// La normalización se hace en JS porque los teléfonos están guardados con formatos distintos.

function soloDigitos(s: string | null) {
  return (s || '').replace(/\D/g, '')
}

function claveTelefono(s: string | null) {
  const d = soloDigitos(s)
  return d.length >= 8 ? d.slice(-8) : d
}

function normalizar(s: string | null) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()
}

export async function GET(req: NextRequest) {
  const supabase = createSupabaseAdminClient()
  const { searchParams } = new URL(req.url)
  const telefono = searchParams.get('telefono') || ''
  const correo = searchParams.get('correo') || ''
  const nombre = searchParams.get('nombre') || ''
  const excluir = searchParams.get('excluir') || ''

  const telKey = claveTelefono(telefono)
  const correoKey = normalizar(correo)
  const nombreKey = normalizar(nombre)

  if (!telKey && !correoKey && nombreKey.length < 5) {
    return NextResponse.json({ duplicados: [] })
  }

  const { data, error } = await supabase
    .from('clientes')
    .select('id, nombre, telefono, telefono2, correo, correo2, etapa')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const duplicados: Array<{ id: string; nombre: string; telefono: string | null; correo: string | null; etapa: string | null; motivo: string }> = []

  for (const c of data ?? []) {
    if (c.id === excluir) continue
    const motivos: string[] = []

    if (telKey && telKey.length >= 8 && (claveTelefono(c.telefono) === telKey || claveTelefono(c.telefono2) === telKey)) {
      motivos.push('mismo teléfono')
    }
    if (correoKey && (normalizar(c.correo) === correoKey || normalizar(c.correo2) === correoKey)) {
      motivos.push('mismo correo')
    }
    if (nombreKey.length >= 5 && normalizar(c.nombre) === nombreKey) {
      motivos.push('mismo nombre')
    }

    if (motivos.length > 0) {
      duplicados.push({
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        correo: c.correo,
        etapa: c.etapa,
        motivo: motivos.join(' y '),
      })
    }
    if (duplicados.length >= 5) break
  }

  return NextResponse.json({ duplicados })
}
