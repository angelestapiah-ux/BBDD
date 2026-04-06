interface StatusBadgeProps {
  status: string;
  type?: 'contact' | 'company' | 'deal' | 'activity';
}

const contactColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-700',
  prospect: 'bg-yellow-100 text-yellow-700',
  customer: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  inactive: 'bg-gray-100 text-gray-600',
};

const dealColors: Record<string, string> = {
  lead: 'bg-gray-100 text-gray-700',
  qualified: 'bg-blue-100 text-blue-700',
  proposal: 'bg-purple-100 text-purple-700',
  negotiation: 'bg-orange-100 text-orange-700',
  closed_won: 'bg-green-100 text-green-700',
  closed_lost: 'bg-red-100 text-red-700',
};

const activityColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-700',
  completed: 'bg-green-100 text-green-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const dealLabels: Record<string, string> = {
  lead: 'Lead',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  closed_won: 'Ganado',
  closed_lost: 'Perdido',
};

const contactLabels: Record<string, string> = {
  lead: 'Lead',
  prospect: 'Prospecto',
  customer: 'Cliente',
  active: 'Activo',
  inactive: 'Inactivo',
};

const activityLabels: Record<string, string> = {
  pending: 'Pendiente',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

export default function StatusBadge({ status, type = 'contact' }: StatusBadgeProps) {
  const colors = type === 'deal' ? dealColors : type === 'activity' ? activityColors : contactColors;
  const labels = type === 'deal' ? dealLabels : type === 'activity' ? activityLabels : contactLabels;

  return (
    <span className={`badge ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
      {labels[status] || status}
    </span>
  );
}
