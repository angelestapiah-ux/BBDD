// Modelo de roles y permisos del CRM.
// El ROL define los permisos base; permisos_extra agrega permisos puntuales
// a un usuario específico (personalización desde Configuración).

export type Rol = 'admin' | 'operacion' | 'visor'

export type Permiso =
  | 'dashboard'      // Dashboard e indicadores
  | 'reportes'       // Reportes (ingresos, por cobrar, etc.)
  | 'totales_pagos'  // KPIs de totales en la página Pagos
  | 'exportar'       // Exportar base de datos (Excel/PDF)
  | 'importar'       // Importar Excel
  | 'eliminar'       // Eliminar clientes (individual o masivo)
  | 'masivas'        // Acciones masivas (cambiar etapa/tipo en lote)
  | 'configuracion'  // Usuarios, plantillas, tipos de cliente

export const ROLES: { value: Rol; label: string; descripcion: string }[] = [
  { value: 'admin',     label: 'Administradora', descripcion: 'Acceso total al sistema' },
  { value: 'operacion', label: 'Operación',      descripcion: 'Trabajo diario: clientes, seguimientos y pagos. Sin indicadores ni exportación' },
  { value: 'visor',     label: 'Visor',          descripcion: 'Solo lectura de Dashboard y Reportes' },
]

export const PERMISOS: { key: Permiso; label: string }[] = [
  { key: 'dashboard',     label: 'Dashboard e indicadores' },
  { key: 'reportes',      label: 'Reportes' },
  { key: 'totales_pagos', label: 'Totales de pagos (KPIs)' },
  { key: 'exportar',      label: 'Exportar base de datos' },
  { key: 'importar',      label: 'Importar Excel' },
  { key: 'eliminar',      label: 'Eliminar clientes' },
  { key: 'masivas',       label: 'Acciones masivas' },
  { key: 'configuracion', label: 'Configuración y usuarios' },
]

const TODOS: Permiso[] = PERMISOS.map(p => p.key)

export function permisosDeRol(rol: Rol): Set<Permiso> {
  if (rol === 'admin') return new Set(TODOS)
  if (rol === 'visor') return new Set<Permiso>(['dashboard', 'reportes', 'totales_pagos'])
  return new Set() // operacion: solo lo operativo (que no requiere permiso)
}

export function permisosEfectivos(rol: Rol, extra: Permiso[]): Set<Permiso> {
  return new Set([...permisosDeRol(rol), ...extra])
}
