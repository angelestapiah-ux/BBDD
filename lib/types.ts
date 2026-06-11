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

export type EtapaFunnel = 'nuevo' | 'contactado' | 'con_interes' | 'cotizacion_enviada' | 'negociando' | 'inscrito'

export const ETAPAS_FUNNEL: { value: EtapaFunnel; label: string }[] = [
  { value: 'nuevo',              label: 'Nuevo' },
  { value: 'contactado',         label: 'Contactado' },
  { value: 'con_interes',        label: 'Con interés' },
  { value: 'cotizacion_enviada', label: 'Cotización enviada' },
  { value: 'negociando',         label: 'Negociando' },
  { value: 'inscrito',           label: 'Inscrito' },
]

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
  etapa: EtapaFunnel | null
  proximo_contacto: string | null
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
  fecha_actividad: string | null
  metodo_pago: string | null
  estado: 'pagado' | 'pendiente' | 'parcial'
  notas: string | null
  requiere_factura: boolean
  numero_factura: string | null
  factura_interna: string | null
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

export interface EtapaHistorial {
  id: string
  cliente_id: string
  etapa_anterior: EtapaFunnel | null
  etapa_nueva: EtapaFunnel
  created_at: string
}

export interface BoletaHonorario {
  id: string
  prestador: string
  prestador_cliente_id: string | null
  origen: 'terapia' | 'clases' | 'manual'
  glosa: string
  paciente_nombre: string | null
  pago_id: string | null
  monto_liquido: number | null
  retencion: number | null
  monto_bruto: number | null
  numero_boleta: string | null
  fecha: string | null
  estado: 'pendiente' | 'emitida'
  notas: string | null
  created_at: string
}

export interface Gasto {
  id: string
  fecha: string
  categoria: string | null
  descripcion: string
  tienda: string | null
  tipo_pago: string | null
  documento: 'boleta' | 'factura' | 'otro'
  numero_documento: string | null
  monto: number
  notas: string | null
  created_at: string
}

export interface ArriendoSala {
  id: string
  profesional: string
  motivo: string | null
  fecha_sesion: string | null
  forma_pago: string | null
  fecha_pago: string | null
  monto: number
  numero_factura: string | null
  notas: string | null
  created_at: string
}

export interface PlantillaWhatsapp {
  id: string
  nombre: string
  cuerpo: string
  orden: number
  created_at: string
}

// Con joins
export interface ClienteConDetalle extends Cliente {
  asistencias?: Asistencia[]
  pagos?: Pago[]
  seguimientos?: Seguimiento[]
  etapa_historial?: EtapaHistorial[]
  boletas_prestador?: BoletaHonorario[]
}
