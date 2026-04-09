export type Database = {
  public: {
    Tables: {
      clientes: {
        Row: Cliente
        Insert: ClienteInsert
        Update: Partial<ClienteInsert>
      }
      actividades: {
        Row: Actividad
        Insert: ActividadInsert
        Update: Partial<ActividadInsert>
      }
      asistencias: {
        Row: Asistencia
        Insert: AsistenciaInsert
        Update: Partial<AsistenciaInsert>
      }
      pagos: {
        Row: Pago
        Insert: PagoInsert
        Update: Partial<PagoInsert>
      }
      seguimientos: {
        Row: Seguimiento
        Insert: SeguimientoInsert
        Update: Partial<SeguimientoInsert>
      }
    }
  }
}

export interface Cliente {
  id: string
  nombre: string
  correo: string | null
  correo2: string | null
  telefono: string | null
  telefono2: string | null
  comentario: string | null
  procedencia: string | null
  cumpleanos: string | null
  fecha_incorporacion: string | null
  genero: 'femenino' | 'masculino' | 'otro' | null
  tipos_cliente: string[] | null
  modalidad_paciente: 'online' | 'presencial' | null
  terapeuta: string | null
  edad: number | null
  documento_identidad: string | null
  estado_civil: 'Soltero/a' | 'Casado/a' | 'Separado/a' | 'Divorciado/a' | 'Acuerdo Unión Civil' | 'Viudo/a' | null
  profesion: string | null
  ciudad: string | null
  pais: string | null
  created_at: string
  updated_at: string
}

export type ClienteInsert = Omit<Cliente, 'id' | 'created_at' | 'updated_at'>

export interface Actividad {
  id: string
  nombre: string
  tipo: 'diplomado_presencial' | 'diplomado_online' | 'taller' | 'coaching' | 'asesoria' | 'otro'
  descripcion: string | null
  fecha_inicio: string | null
  fecha_fin: string | null
  created_at: string
}

export type ActividadInsert = Omit<Actividad, 'id' | 'created_at'>

export interface Asistencia {
  id: string
  cliente_id: string
  actividad_nombre: string
  fecha_asistencia: string | null
  created_at: string
}

export type AsistenciaInsert = Omit<Asistencia, 'id' | 'created_at'>

export interface Pago {
  id: string
  cliente_id: string
  actividad_nombre: string
  monto: number | null
  fecha_pago: string | null
  metodo_pago: string | null
  estado: 'pagado' | 'pendiente' | 'parcial'
  notas: string | null
  requiere_factura: boolean
  created_at: string
}

export type PagoInsert = Omit<Pago, 'id' | 'created_at'>

export interface Seguimiento {
  id: string
  cliente_id: string
  fecha: string
  tipo: 'llamada' | 'whatsapp' | 'correo' | 'visita' | 'otro'
  notas: string
  usuario: string | null
  actividad_nombre: string | null
  created_at: string
}

export type SeguimientoInsert = Omit<Seguimiento, 'id' | 'created_at'>

// Con joins
export interface ClienteConDetalle extends Cliente {
  asistencias?: Asistencia[]
  pagos?: Pago[]
  seguimientos?: Seguimiento[]
}
