'use client'

import { useEffect, useState } from 'react'
import { Permiso, Rol } from '@/lib/permisos'

interface PerfilUI {
  rol: Rol
  permisos: Set<Permiso>
  cargado: boolean
}

// Perfil del usuario logueado para mostrar/ocultar secciones de la UI.
// Mientras carga (o si falla), se asume acceso total: la protección real
// está en el servidor — esto es solo presentación.
export function usePerfil(): PerfilUI {
  const [perfil, setPerfil] = useState<PerfilUI>({
    rol: 'admin',
    permisos: new Set(['dashboard', 'reportes', 'totales_pagos', 'exportar', 'importar', 'eliminar', 'masivas', 'configuracion'] as Permiso[]),
    cargado: false,
  })

  useEffect(() => {
    fetch('/api/me')
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d?.rol) {
          setPerfil({ rol: d.rol, permisos: new Set(d.permisos || []), cargado: true })
        }
      })
      .catch(() => {})
  }, [])

  return perfil
}
