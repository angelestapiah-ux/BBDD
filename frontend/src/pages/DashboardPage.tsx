import { useQuery } from '@tanstack/react-query';
import { dashboardAPI } from '../services/api';
import { DashboardData } from '../types';
import {
  Users, Building2, TrendingUp, Calendar,
  DollarSign, Award, UserPlus, CheckCircle,
  Phone, Mail, Video, FileText, StickyNote
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';

const STAGE_LABELS: Record<string, string> = {
  lead: 'Lead', qualified: 'Calificado', proposal: 'Propuesta',
  negotiation: 'Negociación', closed_won: 'Ganado', closed_lost: 'Perdido',
};
const STAGE_COLORS: Record<string, string> = {
  lead: '#94a3b8', qualified: '#60a5fa', proposal: '#a78bfa',
  negotiation: '#fb923c', closed_won: '#34d399', closed_lost: '#f87171',
};
const ACTIVITY_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={14} className="text-blue-500" />,
  email: <Mail size={14} className="text-green-500" />,
  meeting: <Video size={14} className="text-purple-500" />,
  task: <FileText size={14} className="text-orange-500" />,
  note: <StickyNote size={14} className="text-yellow-500" />,
};

function formatCurrency(value: number) {
  if (value >= 1000000) return `$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
  return `$${value}`;
}

export default function DashboardPage() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ['dashboard'],
    queryFn: () => dashboardAPI.getStats().then((r) => r.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-renova-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const stats = data?.stats;

  const statCards = [
    { label: 'Total Contactos', value: stats?.totalContacts || 0, icon: Users, color: 'bg-blue-500', sub: `+${stats?.newContactsMonth || 0} este mes` },
    { label: 'Empresas', value: stats?.totalCompanies || 0, icon: Building2, color: 'bg-violet-500', sub: 'Activas en el sistema' },
    { label: 'Negocios Activos', value: stats?.totalDeals || 0, icon: TrendingUp, color: 'bg-orange-500', sub: formatCurrency(stats?.pipelineValue || 0) + ' en pipeline' },
    { label: 'Actividades', value: stats?.pendingActivities || 0, icon: Calendar, color: 'bg-red-500', sub: 'Pendientes hoy' },
    { label: 'Negocios Ganados', value: stats?.wonDeals || 0, icon: Award, color: 'bg-green-500', sub: formatCurrency(stats?.wonValue || 0) + ' ganados' },
    { label: 'Valor Pipeline', value: formatCurrency(stats?.pipelineValue || 0), icon: DollarSign, color: 'bg-teal-500', sub: 'En oportunidades activas', isText: true },
  ];

  const chartData = (data?.dealsByStage || []).map((d) => ({
    name: STAGE_LABELS[d.stage] || d.stage,
    value: d.count,
    amount: d.total_value,
    color: STAGE_COLORS[d.stage] || '#94a3b8',
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-0.5">Resumen general del CRM Renova</p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, sub, isText }) => (
          <div key={label} className="card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className={`w-9 h-9 ${color} rounded-lg flex items-center justify-center`}>
                <Icon size={18} className="text-white" />
              </div>
            </div>
            <div className={`font-bold text-gray-900 ${isText ? 'text-lg' : 'text-2xl'}`}>{value}</div>
            <div className="text-xs font-medium text-gray-600 mt-0.5">{label}</div>
            <div className="text-xs text-gray-400 mt-1">{sub}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pipeline chart */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Negocios por Etapa</h3>
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: number, name: string) =>
                    name === 'value' ? [value, 'Negocios'] : [formatCurrency(value), 'Valor']}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-gray-400 text-sm">Sin datos</div>
          )}
        </div>

        {/* Top deals */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Top Negocios Activos</h3>
          <div className="space-y-3">
            {(data?.topDeals || []).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin negocios activos</p>
            ) : (
              (data?.topDeals || []).map((deal) => (
                <div key={deal.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{deal.title}</p>
                    <p className="text-xs text-gray-500">{deal.company_name || deal.contact_name || '—'}</p>
                  </div>
                  <div className="text-right ml-3 shrink-0">
                    <p className="text-sm font-semibold text-gray-900">{formatCurrency(deal.value)}</p>
                    <p className="text-xs text-gray-500">{deal.probability}%</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming activities */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Calendar size={16} className="text-renova-600" /> Próximas Actividades
          </h3>
          <div className="space-y-3">
            {(data?.upcomingActivities || []).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin actividades próximas</p>
            ) : (
              (data?.upcomingActivities || []).map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-0.5">{ACTIVITY_ICONS[a.type]}</div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.contact_name || '—'}</p>
                  </div>
                  {a.due_date && (
                    <p className="text-xs text-gray-400 shrink-0">
                      {new Date(a.due_date).toLocaleDateString('es-CO')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent activities */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <CheckCircle size={16} className="text-green-600" /> Actividad Reciente
          </h3>
          <div className="space-y-3">
            {(data?.recentActivities || []).length === 0 ? (
              <p className="text-gray-400 text-sm text-center py-8">Sin actividad reciente</p>
            ) : (
              (data?.recentActivities || []).map((a) => (
                <div key={a.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="mt-0.5">{ACTIVITY_ICONS[a.type]}</div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-800 truncate">{a.title}</p>
                    <p className="text-xs text-gray-500">{a.contact_name || a.deal_title || '—'}</p>
                  </div>
                  <span className={`badge shrink-0 ${a.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {a.status === 'completed' ? 'Hecho' : 'Pendiente'}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
