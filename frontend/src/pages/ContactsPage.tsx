import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { contactsAPI, companiesAPI } from '../services/api';
import { Contact, Company } from '../types';
import { Plus, Search, Edit2, Trash2, Phone, Mail, Building2 } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import Modal from '../components/ui/Modal';
import ConfirmDialog from '../components/ui/ConfirmDialog';

const STATUS_OPTIONS = ['lead', 'prospect', 'customer', 'active', 'inactive'];

function ContactForm({ contact, onClose, companies }: {
  contact?: Contact; onClose: () => void; companies: Company[];
}) {
  const qc = useQueryClient();
  const isEdit = !!contact;

  const [form, setForm] = useState({
    first_name: contact?.first_name || '',
    last_name: contact?.last_name || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    mobile: contact?.mobile || '',
    company_id: contact?.company_id || '',
    position: contact?.position || '',
    status: contact?.status || 'lead',
    source: contact?.source || '',
    notes: contact?.notes || '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      isEdit ? contactsAPI.update(contact!.id, data) : contactsAPI.create(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); onClose(); },
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form onSubmit={(e) => { e.preventDefault(); mutation.mutate(form); }} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Nombre *</label>
          <input className="input" value={form.first_name} onChange={(e) => set('first_name', e.target.value)} required />
        </div>
        <div>
          <label className="label">Apellido *</label>
          <input className="input" value={form.last_name} onChange={(e) => set('last_name', e.target.value)} required />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Email</label>
          <input className="input" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </div>
        <div>
          <label className="label">Teléfono</label>
          <input className="input" value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Móvil</label>
          <input className="input" value={form.mobile} onChange={(e) => set('mobile', e.target.value)} />
        </div>
        <div>
          <label className="label">Cargo</label>
          <input className="input" value={form.position} onChange={(e) => set('position', e.target.value)} />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Empresa</label>
          <select className="input" value={form.company_id} onChange={(e) => set('company_id', e.target.value)}>
            <option value="">Sin empresa</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="label">Estado</label>
          <select className="input" value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label className="label">Fuente</label>
        <input className="input" value={form.source} onChange={(e) => set('source', e.target.value)} placeholder="Web, referido, feria..." />
      </div>
      <div>
        <label className="label">Notas</label>
        <textarea className="input" rows={3} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>
      {mutation.isError && (
        <p className="text-red-600 text-sm">Error al guardar el contacto</p>
      )}
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancelar</button>
        <button type="submit" className="btn-primary flex-1" disabled={mutation.isPending}>
          {mutation.isPending ? 'Guardando...' : isEdit ? 'Actualizar' : 'Crear Contacto'}
        </button>
      </div>
    </form>
  );
}

export default function ContactsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editContact, setEditContact] = useState<Contact | undefined>();
  const [deleteContact, setDeleteContact] = useState<Contact | undefined>();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contacts', search, statusFilter],
    queryFn: () => {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      return contactsAPI.getAll(params).then((r) => r.data);
    },
  });

  const { data: companiesData } = useQuery({
    queryKey: ['companies-all'],
    queryFn: () => companiesAPI.getAll({ limit: '200' }).then((r) => r.data.data as Company[]),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => contactsAPI.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['contacts'] }); setDeleteContact(undefined); },
  });

  const contacts: Contact[] = data?.data || [];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
          <p className="text-gray-500 text-sm">{data?.total || 0} contactos en total</p>
        </div>
        <button onClick={() => { setEditContact(undefined); setShowModal(true); }} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nuevo Contacto
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            className="input pl-9"
            placeholder="Buscar por nombre o email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select className="input sm:w-40" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
          <option value="">Todos los estados</option>
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-6 h-6 border-2 border-renova-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contacts.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="mx-auto mb-3 text-gray-300" size={40} />
            <p className="font-medium">Sin contactos</p>
            <p className="text-sm">Crea tu primer contacto</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Nombre</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden md:table-cell">Empresa</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600 hidden lg:table-cell">Contacto</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-600">Estado</th>
                  <th className="text-right px-4 py-3 font-medium text-gray-600">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contacts.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-renova-100 rounded-full flex items-center justify-center text-renova-700 font-medium text-xs shrink-0">
                          {c.first_name[0]}{c.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{c.first_name} {c.last_name}</p>
                          {c.position && <p className="text-xs text-gray-500">{c.position}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      {c.company_name ? (
                        <span className="flex items-center gap-1.5 text-gray-600">
                          <Building2 size={13} /> {c.company_name}
                        </span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <div className="space-y-0.5">
                        {c.email && <p className="flex items-center gap-1.5 text-gray-600"><Mail size={12} /> {c.email}</p>}
                        {c.phone && <p className="flex items-center gap-1.5 text-gray-600"><Phone size={12} /> {c.phone}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => { setEditContact(c); setShowModal(true); }} className="p-1.5 rounded-lg text-gray-400 hover:bg-renova-50 hover:text-renova-600">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteContact(c)} className="p-1.5 rounded-lg text-gray-400 hover:bg-red-50 hover:text-red-600">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Modal
        isOpen={showModal}
        onClose={() => { setShowModal(false); setEditContact(undefined); }}
        title={editContact ? 'Editar Contacto' : 'Nuevo Contacto'}
        size="lg"
      >
        <ContactForm
          contact={editContact}
          onClose={() => { setShowModal(false); setEditContact(undefined); }}
          companies={companiesData || []}
        />
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteContact}
        onClose={() => setDeleteContact(undefined)}
        onConfirm={() => deleteContact && deleteMutation.mutate(deleteContact.id)}
        title="Eliminar Contacto"
        message={`¿Seguro que deseas eliminar a ${deleteContact?.first_name} ${deleteContact?.last_name}?`}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

function Users(props: React.SVGProps<SVGSVGElement> & { size?: number }) {
  return (
    <svg {...props} width={props.size || 24} height={props.size || 24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
