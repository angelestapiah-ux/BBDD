# Renova CRM

Sistema de Administración y Gestión de Bases de Datos para Renova.

## Tecnologías

- **Frontend:** React 18 + TypeScript + Vite + Tailwind CSS + TanStack Query
- **Backend:** Node.js + Express + TypeScript
- **Base de datos:** SQLite (better-sqlite3)
- **Autenticación:** JWT

## Módulos

| Módulo | Descripción |
|--------|-------------|
| Dashboard | KPIs, pipeline visual, actividades recientes |
| Contactos | CRUD completo, búsqueda, filtros |
| Empresas | CRUD con cards, conteo de contactos/negocios |
| Negocios | Vista Kanban y lista, pipeline de ventas |
| Actividades | Llamadas, emails, reuniones, tareas, notas |

## Instalación

```bash
# Instalar dependencias
npm run install:all

# Copiar variables de entorno
cp backend/.env.example backend/.env

# Iniciar en modo desarrollo
npm run dev
```

## Acceso

- **Frontend:** http://localhost:5173
- **API:** http://localhost:3001/api

## Credenciales por defecto

- **Email:** admin@renova.com
- **Contraseña:** Renova2024!

## Estructura del proyecto

```
renova-crm/
├── backend/
│   ├── src/
│   │   ├── database/     # Inicialización SQLite + seed
│   │   ├── middleware/   # Autenticación JWT
│   │   ├── routes/       # API REST endpoints
│   │   └── types/        # TypeScript types
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/   # Layout + UI components
│   │   ├── pages/        # Páginas principales
│   │   ├── services/     # API client (axios)
│   │   ├── store/        # Estado global (Zustand)
│   │   └── types/        # TypeScript types
│   └── package.json
└── package.json
```
