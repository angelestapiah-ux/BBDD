import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activitiesAPI, contactsAPI, dealsAPI } from '../services/api';
import { Activity, ActivityType, Contact, Deal } from '../types';
import { Plus, Edit2, Trash2, CheckCircle, Clock, Phone, Mail, Video, FileText, StickyNote } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const ACTIVITY_TYPES: { key: ActivityType; label: string; icon: React.ReactNode }[] = [
  { key: 'call', label: 'Llamada', icon: <Phone size={14} className="text-blue-500" /> },
  { key: 'email', label: 'Email', icon: <Mail size={14} className="text-green-500" /> },
  { key: 'meeting', label: 'Reunión', icon: <Video size={14} className="text-purple-500" /> },
  { key: 'task', label: 'Tarea', icon: <FileText size={14} className="text-orange-500" /> },
  { key: 'note', label: 'Nota', icon: <StickyNote size={14} className="text-yellow-500" /> },
];

const TYPE_ICONS: Record<string, React.ReactNode> = {
  call: <Phone size={15} className="text-blue-500" />,
  email: <Mail size={15} className="text-green-500" />,
  meeting: <Video size={15} className="text-purple-500" />,
  task: <FileText size={15} className="text-orange-500" />,
  note: <StickyNote size={15} className="text-yellow-500" />,
};

function ActivityForm({ activity, onClose, contacts, deals }: {
  activity?: Activity; onClose: () => void; contacts: Contact[]; deals: Deal[];
}) {
  const qc = useQueryClient();
  const isEdit = !!activity;
  const [form, setForm] = useState({
    type: activity?.type || 'call',
    title: activity?.title || '',
    description: activity?.description || '',
    status: activity?.status || 'pending',
    due_date: activity?.due_date?.split('T')[0] || '',
    contact_id: activity?.contact_id || '',
    deal_id: activity?.deal_id || '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit ? activitiesAPI.update(activity!.id, data) : activitiesAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); onClose(); },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Tipo *</label>
          <select className="input" value={form.type} onChange={(e) => set('type', e.target.value)}>
            {ACTIVITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="pending">Pendiente</option>
            <option value="completed">Completado</option>
            <option value="cancelled">Cancelado</option>
          </select>
        </div>
      </div>
      <div>
        <label className="label">Título *</label>
        <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
      </div>
      <div>
        <label className="label">Descripción</label>
        <textarea className="input" rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} />
      </div>
      <div>
        <label className="label">Fecha límite</label>
        <input className="input" type="date" value={form.due_date} onChange={(e) => set('due_date', e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Contacto</label>
          <select className="input" value={form.contact_id} onChange={(e) => set('contact_id', e.target.value)}>
            <option value="">Sin contacto</option>
            {contacts.map((c) => <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Negocio</label>
          <select className="input" value={form.deal_id} onChange={(e) => set('deal_id', e.target.value)}>
            <option value="">Sin negocio</option>
            {deals.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
          </select>
        </div>
      </div>
      {mutation.isError && <p className="text-red-600 text-sm">Error al guardar</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Actividad'}
        </button>
      </div>
    </form>
  );
}

export default function ActivitiesPage() {
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editActivity, setEditActivity] = useState<Activity | undefined>();
  const [deleteActivity, setDeleteActivity] = useState<Activity | undefined>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['activities', typeFilter, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (typeFilter) params.type = typeFilter;
      if (statusFilter) params.status = statusFilter;
      return activitiesAPI.getAll(params).then((r) => r.data);
    },
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => contactsAPI.getAll({ limit: '200' }).then((r) => r.data.data as Contact[]),
  });

  const { data: dealsData } = useQuery({
    queryKey: ['deals-all'],
    queryFn: () => dealsAPI.getAll({ limit: '200' }).then((r) => r.data.data as Deal[]),
  });

  const completeMutation = useMutation({
    mutationFn: (id: string) => activitiesAPI.update(id, { status: 'completed' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['activities'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => activitiesAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['activities'] }); setDeleteActivity(undefined); },
  });

  const activities: Activity[] = data?.data || [];
  const pending = activities.filter(a => a.status === 'pending').length;
  const completed = activities.filter(a => a.status === 'completed').length;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Actividades</h1>
          <p className="text-gray-500 text-sm">{pending} pendientes · {completed} completadas</p>
        </div>
        <button onClick={() => { setEditActivity(undefined); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva Actividad
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <select className="input sm:w-44" value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {ACTIVITY_TYPES.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
        </select>
        <select className="input sm:w-44" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pending">Pendiente</option>
          <option value="completed">Completado</option>
          <option value="cancelled">Cancelado</option>
        </select>
      </div>

      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-renova-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : activities.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="font-medium">Sin actividades</p>
            <p className="text-sm">Registra tu primera actividad</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {activities.map((a) => (
              <div key={a.id} className={`flex items-start gap-4 px-4 py-4 hover:bg-gray-50 transition-colors ${a.status === 'completed' ? 'opacity-60' : ''}`}>
                <div className="mt-0.5 shrink-0">{TYPE_ICONS[a.type]}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${a.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>{a.title}</p>
                    <StatusBadge status={a.status} type="activity" />
                  </div>
                  {a.description && <p className="text-xs text-gray-500 mt-0.5">{a.description}</p>}
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs text-gray-400">
                    {a.contact_name && <span>👤 {a.contact_name}</span>}
                    {a.deal_title && <span>💼 {a.deal_title}</span>}
                    {a.due_date && (
                      <span className={`flex items-center gap-1 ${new Date(a.due_date) < new Date() && a.status === 'pending' ? 'text-red-500' : ''}`}>
                        <Clock size={11} /> {new Date(a.due_date).toLocaleDateString('es-CO')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {a.status === 'pending' && (
                    <button onClick={() => completeMutation.mutate(a.id)} title="Marcar completado" className="p-1.5 rounded text-gray-400 hover:bg-green-50 hover:text-green-600">
                      <CheckCircle size={15} />
                    </button>
                  )}
                  <button onClick={() => { setEditActivity(a); setShowModal(true); }} className="p-1.5 rounded text-gray-400 hover:bg-renova-50 hover:text-renova-600">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => setDeleteActivity(a)} className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditActivity(undefined); }} title={editActivity ? 'Editar Actividad' : 'Nueva Actividad'} size="md">
        <ActivityForm activity={editActivity} onClose={() => { setShowModal(false); setEditActivity(undefined); }} contacts={contactsData || []} deals={dealsData || []} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteActivity} onClose={() => setDeleteActivity(undefined)} onConfirm={() => deleteActivity && deleteMutation.mutate(deleteActivity.id)} title="Eliminar Actividad" message={`¿Seguro que deseas eliminar "${deleteActivity?.title}"?`} isLoading={deleteMutation.isPending} />
    </div>
  );
}
