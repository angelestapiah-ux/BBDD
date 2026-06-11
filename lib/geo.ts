// Países y ciudades para autocompletar en el formulario de cliente.
// Son sugerencias (datalist): siempre se puede escribir un valor libre.

export const PAISES = [
  'Chile', 'Argentina', 'Perú', 'Bolivia', 'México', 'Colombia', 'Ecuador',
  'España', 'Uruguay', 'Paraguay', 'Venezuela', 'Brasil', 'Estados Unidos',
  'Canadá', 'Costa Rica', 'Panamá', 'República Dominicana', 'Guatemala',
  'Honduras', 'El Salvador', 'Nicaragua', 'Cuba', 'Puerto Rico', 'Alemania',
  'Francia', 'Italia', 'Reino Unido', 'Portugal', 'Suiza', 'Australia',
]

export const CIUDADES: Record<string, string[]> = {
  Chile: [
    'Santiago', 'Providencia', 'Las Condes', 'Ñuñoa', 'Vitacura', 'La Reina', 'Maipú', 'La Florida', 'Puente Alto',
    'Viña del Mar', 'Valparaíso', 'Concón', 'Quilpué', 'Villa Alemana', 'San Antonio',
    'Concepción', 'Talcahuano', 'San Pedro de la Paz', 'Chillán', 'Los Ángeles',
    'Antofagasta', 'Calama', 'Iquique', 'Arica', 'Copiapó', 'La Serena', 'Coquimbo', 'Ovalle',
    'Rancagua', 'Machalí', 'San Fernando', 'Curicó', 'Talca', 'Linares',
    'Temuco', 'Villarrica', 'Pucón', 'Valdivia', 'Osorno', 'Puerto Varas', 'Puerto Montt',
    'Castro', 'Coyhaique', 'Punta Arenas',
  ],
  Argentina: ['Buenos Aires', 'Córdoba', 'Rosario', 'Mendoza', 'San Miguel de Tucumán', 'La Plata', 'Mar del Plata', 'Salta', 'Neuquén', 'Bariloche'],
  Perú: ['Lima', 'Arequipa', 'Trujillo', 'Cusco', 'Chiclayo', 'Piura', 'Tacna', 'Iquitos'],
  Bolivia: ['La Paz', 'Santa Cruz de la Sierra', 'Cochabamba', 'Sucre', 'Oruro', 'Tarija'],
  México: ['Ciudad de México', 'Guadalajara', 'Monterrey', 'Puebla', 'Cancún', 'Mérida', 'Tijuana', 'Querétaro'],
  Colombia: ['Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Cartagena', 'Bucaramanga', 'Pereira'],
  Ecuador: ['Quito', 'Guayaquil', 'Cuenca', 'Ambato', 'Manta', 'Loja'],
  España: ['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao', 'Málaga', 'Zaragoza', 'Alicante', 'Palma de Mallorca'],
  Uruguay: ['Montevideo', 'Punta del Este', 'Salto', 'Paysandú', 'Maldonado'],
  Paraguay: ['Asunción', 'Ciudad del Este', 'Encarnación', 'Luque'],
  Venezuela: ['Caracas', 'Maracaibo', 'Valencia', 'Barquisimeto', 'Maracay'],
  Brasil: ['São Paulo', 'Río de Janeiro', 'Brasilia', 'Salvador', 'Curitiba', 'Porto Alegre', 'Florianópolis'],
  'Estados Unidos': ['Miami', 'Nueva York', 'Los Ángeles', 'Houston', 'Chicago', 'Orlando', 'San Francisco', 'Washington DC'],
  Canadá: ['Toronto', 'Vancouver', 'Montreal', 'Calgary', 'Ottawa'],
  'Costa Rica': ['San José', 'Alajuela', 'Cartago', 'Heredia'],
  Panamá: ['Ciudad de Panamá', 'Colón', 'David'],
  'República Dominicana': ['Santo Domingo', 'Santiago de los Caballeros', 'Punta Cana'],
  Guatemala: ['Ciudad de Guatemala', 'Antigua Guatemala', 'Quetzaltenango'],
  Alemania: ['Berlín', 'Múnich', 'Hamburgo', 'Fráncfort', 'Colonia'],
  Francia: ['París', 'Lyon', 'Marsella', 'Toulouse', 'Niza'],
  Italia: ['Roma', 'Milán', 'Nápoles', 'Turín', 'Florencia'],
  'Reino Unido': ['Londres', 'Mánchester', 'Birmingham', 'Edimburgo', 'Liverpool'],
  Portugal: ['Lisboa', 'Oporto', 'Braga', 'Coímbra'],
  Suiza: ['Zúrich', 'Ginebra', 'Berna', 'Basilea', 'Lausana'],
  Australia: ['Sídney', 'Melbourne', 'Brisbane', 'Perth', 'Adelaida'],
}
