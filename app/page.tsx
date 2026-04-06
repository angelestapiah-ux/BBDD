import { Users, Calendar, DollarSign, Upload } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const accesos = [
  { href: '/clientes', label: 'Gestionar Clientes', desc: 'Ver, crear y editar clientes', icon: Users, color: 'text-emerald-600' },
  { href: '/seguimientos', label: 'Seguimientos', desc: 'Registro de contactos y llamadas', icon: Calendar, color: 'text-blue-600' },
  { href: '/pagos', label: 'Pagos', desc: 'Registrar y consultar pagos', icon: DollarSign, color: 'text-amber-600' },
  { href: '/importar', label: 'Importar Excel', desc: 'Migrar base de datos actual', icon: Upload, color: 'text-purple-600' },
]

export default function HomePage() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Bienvenido a RENOVA CRM</h2>
        <p className="text-gray-500 mt-1">Gestiona tus clientes, actividades y pagos desde un solo lugar.</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl">
        {accesos.map(({ href, label, desc, icon: Icon, color }) => (
          <Link key={href} href={href}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer h-full">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className={`h-5 w-5 ${color}`} />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-500">{desc}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
