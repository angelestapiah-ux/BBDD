import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesAPI } from '../services/api';
import { Company } from '../types';
import { Plus, Search, Edit2, Trash2, Globe, Phone, MapPin } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STATUS_OPTIONS = ['prospect', 'active', 'customer', 'inactive'];
const SIZE_OPTIONS = ['small', 'medium', 'large', 'enterprise'];
const SIZE_LABELS: Record<string, string> = { small: 'Pequeña', medium: 'Mediana', large: 'Grande', enterprise: 'Corporativa' };

function CompanyForm({ company, onClose }: { company?: Company; onClose: () => void }) {
  const qc = useQueryClient();
  const isEdit = !!company;
  const [form, setForm] = useState({
    name: company?.name || '',
    industry: company?.industry || '',
    website: company?.website || '',
    email: company?.email || '',
    phone: company?.phone || '',
    address: company?.address || '',
    city: company?.city || '',
    country: company?.country || 'Colombia',
    size: company?.size || '',
    status: company?.status || 'prospect',
    notes: company?.notes || '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit ? companiesAPI.update(company!.id, data) : companiesAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); onClose(); },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2">
          <label className="label">Nombre de la Empresa *</label>
          <input className="input" value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Industria</label>
          <input className="input" value={form.industry} onChange={(e) => set('industry', e.target.value)} placeholder="Construcción, Tech..." />
        </div>
        <div>
          <label className="label">Tamaño</label>
          <select className="input" value={form.size} onChange={(e) => set('size', e.target.value)}>
            <option value="">No especificado</option>
            {SIZE_OPTIONS.map((s) => <option key={s} value={s}>{SIZE_LABELS[s]}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
        <div>
          <label className="label">Sitio Web</label>
          <input className="input" value={form.website} onChange={(e) => set('website', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Ciudad</label>
          <input className="input" value={form.city} onChange={(e) => set('city', e.target.value)} />
        </div>
        <div>
          <label className="label">País</label>
          <input className="input" value={form.country} onChange={(e) => set('country', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Dirección</label>
          <input className="input" value={form.address} onChange={(e) => set('address', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="label">Notas</label>
          <textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </div>
      </div>
      {mutation.isError && <p className="text-red-600 text-sm">Error al guardar</p>}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Empresa'}
        </button>
      </div>
    </form>
  );
}

export default function CompaniesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | undefined>();
  const [deleteCompany, setDeleteCompany] = useState<Company | undefined>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['companies', search, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      return companiesAPI.getAll(params).then((r) => r.data);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => companiesAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies'] }); setDeleteCompany(undefined); },
  });

  const companies: Company[] = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Empresas</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} empresas registradas</p>
        </div>
        <button onClick={() => { setEditCompany(undefined); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nueva Empresa
        </button>
      </div>

      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9" placeholder="Buscar empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {isLoading ? (
          <div className="col-span-full flex justify-center py-16">
            <div className="w-6 h-6 border-2 border-renova-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : companies.length === 0 ? (
          <div className="col-span-full text-center py-16 text-gray-400">
            <p className="font-medium">Sin empresas</p>
            <p className="text-sm">Registra tu primera empresa</p>
          </div>
        ) : (
          companies.map((c) => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-violet-100 rounded-lg flex items-center justify-center text-violet-700 font-bold text-sm">
                    {c.name[0]}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{c.name}</h3>
                    {c.industry && <p className="text-xs text-gray-500">{c.industry}</p>}
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditCompany(c); setShowModal(true); }} className="p-1.5 rounded text-gray-400 hover:bg-renova-50 hover:text-renova-600">
                    <Edit2 size={13} />
                  </button>
                  <button onClick={() => setDeleteCompany(c)} className="p-1.5 rounded text-gray-400 hover:bg-red-50 hover:text-red-600">
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>

              <div className="space-y-1.5 mb-3">
                {c.city && <p className="text-xs text-gray-500 flex items-center gap-1.5"><MapPin size={11} /> {c.city}, {c.country}</p>}
                {c.phone && <p className="text-xs text-gray-500 flex items-center gap-1.5"><Phone size={11} /> {c.phone}</p>}
                {c.website && (
                  <a href={c.website} target="_blank" rel="noreferrer" className="text-xs text-renova-600 flex items-center gap-1.5 hover:underline">
                    <Globe size={11} /> {c.website}
                  </a>
                )}
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <StatusBadge status={c.status} />
                <div className="flex gap-3 text-xs text-gray-500">
                  <span>{c.contacts_count || 0} contactos</span>
                  <span>{c.deals_count || 0} negocios</span>
                </div>
              </div>
              {c.size && (
                <p className="text-xs text-gray-400 mt-1">{SIZE_LABELS[c.size]}</p>
              )}
            </div>
          ))
        )}
      </div>

      <Modal isOpen={showModal} onClose={() => { setShowModal(false); setEditCompany(undefined); }} title={editCompany ? 'Editar Empresa' : 'Nueva Empresa'} size="lg">
        <CompanyForm company={editCompany} onClose={() => { setShowModal(false); setEditCompany(undefined); }} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCompany}
        onClose={() => setDeleteCompany(undefined)}
        onConfirm={() => deleteCompany && deleteMutation.mutate(deleteCompany.id)}
        title="Eliminar Empresa"
        message={`¿Seguro que deseas eliminar "${deleteCompany?.name}"?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}
