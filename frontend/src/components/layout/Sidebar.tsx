import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Users, Building2, TrendingUp, Calendar, X, ChevronRight
} from 'lucide-react';

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/contacts', icon: Users, label: 'Contactos' },
  { to: '/companies', icon: Building2, label: 'Empresas' },
  { to: '/deals', icon: TrendingUp, label: 'Negocios' },
  { to: '/activities', icon: Calendar, label: 'Actividades' },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ isOpen, onClose }: SidebarProps) {
  return (
    <aside
      className={`fixed lg:static inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-renova-500 rounded-lg flex items-center justify-center font-bold text-sm">
            R
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">Renova</div>
            <div className="text-xs text-slate-400 leading-tight">CRM Sistema</div>
          </div>
        </div>
        <button onClick={onClose} className="lg:hidden text-slate-400 hover:text-white">
          <X size={20} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group ${
                isActive
                  ? 'bg-renova-600 text-white'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
                <span className="flex-1">{label}</span>
                {isActive && <ChevronRight size={14} />}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-6 py-4 border-t border-slate-700">
        <div className="text-xs text-slate-500 text-center">Renova CRM v1.0</div>
      </div>
    </aside>
  );
}
