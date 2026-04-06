import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { dealsAPI, contactsAPI, companiesAPI } from '../services/api';
import { Deal, DealStage, Contact, Company } from '../types';
import { Plus, Edit2, Trash2, DollarSign, TrendingUp } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STAGES: { key: DealStage; label: string; color: string; bg: string }[] = [
  { key: 'lead', label: 'Lead', color: 'text-gray-600', bg: 'bg-gray-100' },
  { key: 'qualified', label: 'Calificado', color: 'text-blue-600', bg: 'bg-blue-50' },
  { key: 'proposal', label: 'Propuesta', color: 'text-purple-600', bg: 'bg-purple-50' },
  { key: 'negotiation', label: 'Negociación', color: 'text-orange-600', bg: 'bg-orange-50' },
  { key: 'closed_won', label: 'Ganado', color: 'text-green-600', bg: 'bg-green-50' },
  { key: 'closed_lost', label: 'Perdido', color: 'text-red-600', bg: 'bg-red-50' },
];

function formatCurrency(v: number) {
  if (v >= 1000000) return `$${(v / 1000000).toFixed(1)}M`;
  if (v >= 1000) return `$${(v / 1000).toFixed(0)}K`;
  return `$${v}`;
}

function DealForm({ deal, onClose, contacts, companies }: {
  deal?: Deal; onClose: () => void; contacts: Contact[]; companies: Company[];
}) {
  const qc = useQueryClient();
  const isEdit = !!deal;
  const [form, setForm] = useState({
    title: deal?.title || '',
    value: String(deal?.value || ''),
    currency: deal?.currency || 'COP',
    stage: deal?.stage || 'lead',
    probability: String(deal?.probability || '20'),
    expected_close_date: deal?.expected_close_date?.split('T')[0] || '',
    contact_id: deal?.contact_id || '',
    company_id: deal?.company_id || '',
    notes: deal?.notes || '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) => {
      const payload = { ...data, value: parseFloat(data.value) || 0, probability: parseInt(data.probability) || 0 };
      return isEdit ? dealsAPI.update(deal!.id, payload) : dealsAPI.create(payload);
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); onClose(); },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div>
        <label className="label">Título del Negocio *</label>
        <input className="input" value={form.title} onChange={(e) => set('title', e.target.value)} required />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Valor</label>
          <input className="input" type="number" min="0" value={form.value} onChange={(e) => set('value', e.target.value)} />
        </div>
        <div>
          <label className="label">Moneda</label>
          <select className="input" value={form.currency} onChange={(e) => set('currency', e.target.value)}>
            <option value="COP">COP</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Etapa</label>
          <select className="input" value={form.stage} onChange={(e) => set('stage', e.target.value)}>
            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Probabilidad (%)</label>
          <input className="input" type="number" min="0" max="100" value={form.probability} onChange={(e) => set('probability', e.target.value)} />
        </div>
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
          <label className="label">Empresa</label>
          <select className="input" value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
            <option value="">Sin empresa</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Fecha Cierre Esperada</label>
        <input className="input" type="date" value={form.expected_close_date} onChange={(e) => set('expected_close_date', e.target.value)} />
      </div>
      <div>
        <label className="label">Notas</label>
        <textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      {mutation.isError && <p className="text-red-600 text-sm">Error al guardar</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Negocio'}
        </button>
      </div>
    </form>
  );
}

export default function DealsPage() {
  const [view, setView] = useState<'kanban' | 'list'>('kanban');
  const [showModal, setShowModal] = useState(false);
  const [editDeal, setEditDeal] = useState<Deal | undefined>();
  const [deleteDeal, setDeleteDeal] = useState<Deal | undefined>();
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['deals'],
    queryFn: () => dealsAPI.getAll({ limit: '200' }).then((r) => r.data),
  });

  const { data: contactsData } = useQuery({
    queryKey: ['contacts-all'],
    queryFn: () => contactsAPI.getAll({ limit: '200' }).then((r) => r.data.data as Contact[]),
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companiesAPI.getAll({ limit: '200' }).then((r) => r.data.data as Company[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => dealsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['deals'] }); setDeleteDeal(undefined); },
  });

  const deals: Deal[] = data?.data || [];
  const totalPipeline = deals.filter(d => !['closed_won','closed_lost'].includes(d.stage)).reduce((s, d) => s + d.value, 0);
  const totalWon = deals.filter(d => d.stage === 'closed_won').reduce((s, d) => s + d.value, 0);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Negocios</h1>
          <p className="text-gray-500 text-sm">
            Pipeline: {formatCurrency(totalPipeline)} · Ganado: {formatCurrency(totalWon)}
          </p>
        </div>
        <div className="flex gap-2">
          <div className="flex bg-gray-100 rounded-lg p-1">
            <button onClick={() => setView('kanban')} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${view === 'kanban' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Kanban</button>
            <button onClick={() => setView('list')} className={`px-3 py-1.5 text-xs rounded-md font-medium transition-all ${view === 'list' ? 'bg-white shadow text-gray-800' : 'text-gray-500'}`}>Lista</button>
          </div>
          <button onClick={() => { setEditDeal(undefined); setShowModal(true); }} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Nuevo Negocio
          </button>
        </div>
      </div>

      {view === 'kanban' ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {STAGES.map((stage) => {
            const stageDeals = deals.filter((d) => d.stage === stage.key);
            const stageValue = stageDeals.reduce((s, d) => s + d.value, 0);
            return (
              <div key={stage.key} className="flex-shrink-0 w-72">
                <div className={`flex items-center justify-between px-3 py-2 rounded-t-lg ${stage.bg}`}>
                  <div>
                    <span className={`text-sm font-semibold ${stage.color}`}>{stage.label}</span>
                    <span className="text-xs text-gray-500 ml-2">{stageDeals.length}</span>
                  </div>
                  <span className="text-xs text-gray-500 font-medium">{formatCurrency(stageValue)}</span>
                </div>
                <div className="bg-gray-100 rounded-b-lg p-2 space-y-2 min-h-[200px]">
                  {stageDeals.map((deal) => (
                    <div key={deal.id} className="bg-white rounded-lg p-3 shadow-sm border border-gray-100">
                      <div className="flex items-start justify-between mb-2">
                        <p className="text-sm font-medium text-gray-900 leading-tight">{deal.title}</p>
                        <div className="flex gap-0.5 ml-2 shrink-0">
                          <button onClick={() => { setEditDeal(deal); setShowModal(true); }} className="p-1 rounded text-gray-400 hover:text-renova-600">
                            <Edit2 size={12} />
                          </button>
                          <button onClick={() => setDeleteDeal(deal)} className="p-1 rounded text-gray-400 hover:text-red-600">
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 mb-2">
                        <DollarSign size={12} className="text-green-500" />
                        <span className="text-sm font-semibold text-gray-800">{formatCurrency(deal.value)} {deal.currency}</span>
                      </div>
                      {(deal.contact_name || deal.company_name) && (
                        <p className="text-xs text-gray-500 truncate">{deal.company_name || deal.contact_name}</p>
                      )}
                      <div className="mt-2 flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                          <div className="bg-renova-500 h-1.5 rounded-full" style={{ width: `${deal.probability}%` }} />
                        </div>
                        <span className="text-xs text-gray-500">{deal.probability}%</span>
                      </div>
                    </div>
                  ))}
                  {stageDeals.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-6">Sin negocios</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card p-0 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Título</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Empresa / Contacto</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Valor</th>
                <th className="text-left px-4 py-3 font-medium text-gray-600">Etapa</th>
                <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {deals.length === 0 ? (
                <tr><td colSpan={5} className="text-center py-12 text-gray-400">Sin negocios registrados</td></tr>
              ) : deals.map((deal) => (
                <tr key={deal.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                        <TrendingUp size={13} className="text-orange-600" />
                      </div>
                      <span className="font-medium text-gray-900">{deal.title}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 hidden md:table-cell">{deal.company_name || deal.contact_name || '—'}</td>
                  <td className="px-4 py-3 font-semibold text-gray-800">{formatCurrency(deal.value)}</td>
                  <td className="px-4 py-3"><StatusBadge status={deal.stage} type="deal" /></td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => { setEditDeal(deal); setShowModal(true); }} className="p-1.5 rounded text-gray-400 hover:bg-renova-50 hover:text-renova-600"><Edit2 size={14} /></button>
                      <button onClick={() => setDeleteDeal(deal)} className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditDeal(undefined); }} title={editDeal ? 'Editar Negocio' : 'Nuevo Negocio'} size="lg">
        <DealForm deal={editDeal} onClose={() => { setShowModal(false); setEditDeal(undefined); }} contacts={contactsData || []} companies={companiesData || []} />
      </Modal>

      <ConfirmDialog isOpen={!!deleteDeal} onClose={() => setDeleteDeal(undefined)} onConfirm={() => deleteDeal && deleteMutation.mutate(deleteDeal.id)} title="Eliminar Negocio" message={`¿Seguro que deseas eliminar "${deleteDeal?.title}"?`} isLoading={deleteMutation.isPending} />
    </div>
  );
}
