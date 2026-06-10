// Manual práctico del CRM: cada entrada tiene keywords para el buscador de ayuda.
// El HelpPanel puntúa las entradas según coincidencia con la pregunta del usuario.

export interface EntradaManual {
  id: string
  titulo: string
  categoria: string
  keywords: string
  pasos: string[]
  tip?: string
}

export const MANUAL: EntradaManual[] = [
  {
    id: 'crear-cliente',
    titulo: 'Crear un cliente nuevo',
    categoria: 'Clientes',
    keywords: 'crear nuevo cliente agregar lead persona registrar ingresar contacto prospecto',
    pasos: [
      'Ve a "Clientes" en el menú lateral (o presiona Ctrl+K y escribe "nuevo cliente").',
      'Haz click en el botón naranjo "Nuevo cliente".',
      'Completa el modo rápido: solo Nombre, Teléfono y Canal de origen.',
      'Si necesitas más campos (correo, RUT, edad...), haz click en "Modo completo".',
      'Haz click en "Guardar". El cliente queda en etapa "Nuevo".',
    ],
    tip: 'No te detengas a llenar todos los campos: con nombre y teléfono basta para empezar. Puedes completar el resto después desde el perfil.',
  },
  {
    id: 'vista-hoy',
    titulo: 'Saber a quién contactar hoy',
    categoria: 'Seguimiento',
    keywords: 'hoy contactar quien llamar pendientes agenda dia atrasados enfriandose urgentes',
    pasos: [
      'Haz click en "Hoy" (primera opción del menú, ícono de sol ☀️).',
      'Verás tres listas: Atrasados (rojo), Agendados para hoy, y Enfriándose (clientes con 7+ días sin contacto en etapa activa).',
      'Trabaja la lista de arriba hacia abajo: cada fila tiene botones de WhatsApp, llamada y "Contactado".',
      'Al registrar el contacto, elige cuándo recontactar — así el cliente vuelve a aparecer en "Hoy" en la fecha correcta.',
    ],
    tip: 'Haz de "Hoy" tu rutina de la mañana: si la trabajas completa cada día, ningún lead se enfría.',
  },
  {
    id: 'registrar-seguimiento',
    titulo: 'Registrar un contacto / seguimiento',
    categoria: 'Seguimiento',
    keywords: 'registrar seguimiento contacto llamada whatsapp correo anotar conversacion nota',
    pasos: [
      'Opción rápida: en la lista de Clientes o en "Hoy", pasa el mouse sobre la fila y haz click en el botón "Contactado" (✓).',
      'Elige el tipo de contacto (llamada, whatsapp, correo, otro).',
      'Escribe una nota breve (opcional pero recomendado).',
      'Elige cuándo recontactar: Mañana, 3 días, 1 semana o Sin fecha.',
      'Haz click en "✓ Guardar contacto". Listo: seguimiento registrado y próximo contacto agendado.',
    ],
    tip: 'Si necesitas registrar un seguimiento más detallado (con fecha pasada o actividad asociada), usa "Seguimientos" → "Nuevo seguimiento".',
  },
  {
    id: 'whatsapp-plantilla',
    titulo: 'Enviar WhatsApp con plantilla',
    categoria: 'Seguimiento',
    keywords: 'whatsapp plantilla mensaje enviar template texto predeterminado',
    pasos: [
      'En la vista "Hoy", haz click en el botón verde "WhatsApp" de cualquier cliente.',
      'Se despliega el menú de plantillas con el mensaje ya personalizado (nombre y actividad del cliente).',
      'Haz click en la plantilla: se abre WhatsApp con el mensaje listo para enviar, y el seguimiento se registra solo.',
      'En WhatsApp solo revisa el texto y presiona enviar.',
    ],
    tip: 'Puedes crear o editar plantillas en Configuración → Plantillas de WhatsApp. Usa {nombre} y {actividad} como variables.',
  },
  {
    id: 'plantillas-editar',
    titulo: 'Crear o editar plantillas de WhatsApp',
    categoria: 'Configuración',
    keywords: 'plantilla crear editar eliminar mensaje predeterminado variable nombre actividad',
    pasos: [
      'Ve a "Configuración" en el menú lateral.',
      'Baja hasta la sección "Plantillas de WhatsApp".',
      'Para crear: escribe el nombre y el mensaje, y haz click en "Agregar".',
      'Usa {nombre} donde quieras que aparezca el primer nombre del cliente, y {actividad} para su última actividad.',
      'Para eliminar una plantilla, haz click en el ícono de basurero.',
    ],
  },
  {
    id: 'registrar-pago',
    titulo: 'Registrar un pago',
    categoria: 'Pagos',
    keywords: 'registrar pago nuevo cobro abono monto factura transferencia',
    pasos: [
      'Opción 1: en el perfil del cliente, haz click en el botón verde "Pago".',
      'Opción 2: en "Pagos" del menú, haz click en "Nuevo pago" y busca el cliente.',
      'Selecciona la actividad (aparecen las actividades del cliente) o escribe una nueva.',
      'Completa monto, fecha, método y estado (pagado / pendiente / parcial).',
      'Si el cliente necesita factura, marca el checkbox "Cliente requiere factura".',
      'Haz click en "Guardar".',
    ],
  },
  {
    id: 'marcar-pagado',
    titulo: 'Marcar un pago pendiente como pagado',
    categoria: 'Pagos',
    keywords: 'marcar pagado pendiente cambiar estado pago cobrar confirmar',
    pasos: [
      'Ve a "Pagos" en el menú lateral.',
      'Filtra por estado "Pendiente" si quieres ver solo los pendientes.',
      'En la fila del pago, haz click en el botón verde "Pagado" (aparece solo en pagos pendientes o parciales).',
      'Listo — el estado cambia y los totales se actualizan.',
    ],
    tip: 'También puedes editar el pago completo desde el perfil del cliente, pestaña "Pagos", con el ícono de lápiz.',
  },
  {
    id: 'cambiar-etapa',
    titulo: 'Mover un cliente de etapa (funnel)',
    categoria: 'Clientes',
    keywords: 'etapa funnel mover cambiar kanban avanzar negociando inscrito interesado pipeline embudo',
    pasos: [
      'Opción visual: en "Clientes", activa la "Vista Kanban" (ícono de cuadrícula) y arrastra la tarjeta del cliente a la columna nueva.',
      'Opción desde el perfil: haz click en la etiqueta de etapa junto al nombre del cliente y elige la nueva etapa.',
      'El cambio se guarda automáticamente.',
    ],
  },
  {
    id: 'buscar-cliente',
    titulo: 'Buscar un cliente rápido',
    categoria: 'Clientes',
    keywords: 'buscar encontrar cliente ctrl k busqueda rapida atajo teclado',
    pasos: [
      'Presiona Ctrl+K (o Cmd+K en Mac) desde cualquier pantalla.',
      'Escribe nombre, teléfono o correo del cliente.',
      'Usa las flechas ↑↓ y Enter para abrir su perfil, o haz click directo.',
      'Desde el resultado también puedes abrir WhatsApp sin entrar al perfil.',
    ],
  },
  {
    id: 'importar-excel',
    titulo: 'Importar clientes desde Excel',
    categoria: 'Datos',
    keywords: 'importar excel subir archivo carga masiva planilla',
    pasos: [
      'Ve a "Importar Excel" en el menú lateral.',
      'Arrastra tu archivo .xlsx o haz click para seleccionarlo.',
      'El sistema detecta las columnas automáticamente — revisa la vista previa.',
      'Confirma la importación. Los clientes quedan creados con sus datos.',
    ],
    tip: 'Puedes descargar la plantilla oficial desde la misma pantalla para asegurar el formato correcto.',
  },
  {
    id: 'exportar',
    titulo: 'Exportar clientes o la base completa',
    categoria: 'Datos',
    keywords: 'exportar descargar excel pdf base respaldo backup',
    pasos: [
      'Ve a "Clientes" y haz click en el botón "Exportar".',
      'Elige: Excel (filtrado), PDF (filtrado) o Base completa.',
      '"Filtrado" exporta lo que estás viendo (respeta búsqueda y filtros); "Base completa" incluye todo con seguimientos y pagos.',
      'El archivo se descarga automáticamente.',
    ],
  },
  {
    id: 'reportes',
    titulo: 'Ver reportes (por cobrar, cumpleaños, asistentes...)',
    categoria: 'Datos',
    keywords: 'reportes informes cumpleanos cobrar asistentes procedencia canal pendientes',
    pasos: [
      'Ve a "Reportes" en el menú lateral.',
      'Elige la pestaña: Por cobrar, Asistentes por actividad, Pagos por actividad, Cumpleaños del mes o Procedencias.',
      'Cada reporte permite contacto rápido (WhatsApp/llamada) y exportación a Excel.',
    ],
  },
  {
    id: 'crear-usuario',
    titulo: 'Crear un usuario nuevo del sistema',
    categoria: 'Configuración',
    keywords: 'usuario crear nuevo acceso cuenta contrasena password equipo',
    pasos: [
      'Ve a "Configuración" en el menú lateral.',
      'En la sección "Usuarios", haz click en "Nuevo usuario".',
      'Ingresa el correo y una contraseña (mínimo 6 caracteres).',
      'Comparte las credenciales con la persona — podrá cambiar su contraseña después.',
    ],
  },
  {
    id: 'cambiar-contrasena',
    titulo: 'Cambiar la contraseña de un usuario',
    categoria: 'Configuración',
    keywords: 'cambiar contrasena password clave olvide acceso recuperar',
    pasos: [
      'Ve a "Configuración" → sección "Usuarios".',
      'En la fila del usuario, haz click en el ícono de llave 🔑.',
      'Escribe la nueva contraseña y guarda.',
    ],
  },
  {
    id: 'tema-dorado',
    titulo: 'Cambiar entre tema Claro y Dorado',
    categoria: 'Configuración',
    keywords: 'tema dorado claro oscuro color apariencia modo',
    pasos: [
      'En la barra superior derecha, haz click en el botón "Dorado" (o "Claro" si ya estás en dorado).',
      'La preferencia se guarda en este navegador automáticamente.',
    ],
  },
  {
    id: 'editar-eliminar-cliente',
    titulo: 'Editar o eliminar un cliente',
    categoria: 'Clientes',
    keywords: 'editar eliminar borrar cliente modificar datos corregir',
    pasos: [
      'Abre el perfil del cliente (click en su nombre o Ctrl+K).',
      'Para editar: haz click en el ícono de lápiz junto al nombre y modifica los campos.',
      'Para eliminar: haz click en el botón "..." → "Eliminar cliente" y confirma.',
      'Ojo: eliminar un cliente borra también sus seguimientos, pagos y asistencias, y no se puede deshacer.',
    ],
  },
]
