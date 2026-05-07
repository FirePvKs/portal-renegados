# 🥷 Shinobi App

Sistema de perfiles para grupo personal/de amigos con roles jerárquicos, estética inspirada en shinobis (oscuro + crema).

## Stack

- **Frontend:** React 18 + Vite + Tailwind CSS + React Router
- **Backend:** Node.js + Express
- **Base de datos + Auth + Storage:** Supabase

## Arquitectura

```
┌──────────────┐         ┌──────────────┐         ┌──────────────┐
│   React      │◄───────►│   Express    │◄───────►│   Supabase   │
│  (port 5173) │  HTTP   │  (port 4000) │  SDK    │  (Postgres + │
│              │         │              │         │  Auth + S3)  │
└──────────────┘         └──────────────┘         └──────────────┘
       │                                                  ▲
       │                                                  │
       └─── upload directo de imágenes a Storage ─────────┘
```

**¿Por qué Node intermedio si Supabase ya hace todo?**
Para tener un punto donde agregar lógica futura: validaciones complejas, integraciones con otros servicios, webhooks, jobs, etc. Las operaciones admin (crear/borrar usuarios) usan la `service_role_key` que **debe** vivir en el backend, jamás en React.

## Setup en 3 pasos

Lee las guías **en orden**, están en `docs/`:

1. 📘 **[docs/01-SETUP-SUPABASE.md](docs/01-SETUP-SUPABASE.md)** — Crear proyecto, ejecutar SQL, crear primer líder
2. 📗 **[docs/02-BACKEND.md](docs/02-BACKEND.md)** — Instalar y arrancar el servidor Node
3. 📕 **[docs/03-FRONTEND.md](docs/03-FRONTEND.md)** — Instalar y arrancar React

## Estructura del proyecto

```
shinobi-app/
├── database/
│   └── schema.sql              ← Pegar en Supabase SQL Editor
├── backend/
│   ├── src/
│   │   ├── server.js           ← Express principal
│   │   ├── lib/supabase.js     ← Clientes Supabase
│   │   ├── middleware/auth.js  ← requireAuth, requireLider
│   │   └── routes/
│   │       ├── auth.js         ← login, me, logout
│   │       ├── admin.js        ← gestión de usuarios (solo líder)
│   │       └── profiles.js     ← perfiles públicos
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── App.jsx
│   │   ├── pages/              ← Login, Home, Profile, Admin
│   │   ├── components/         ← Header, Logo, RoleBadge, etc.
│   │   ├── context/AuthContext ← Estado de auth global
│   │   └── lib/                ← api.js, supabase.js
│   ├── tailwind.config.js
│   └── package.json
└── docs/                       ← Guías paso a paso
```

## Roles (de mayor a menor jerarquía)

| Rol         | Permisos                                              |
|-------------|-------------------------------------------------------|
| Líder       | Todo: crear/eliminar usuarios, asignar cualquier rol  |
| Sub-Líder   | Acceso a panel admin (solo lectura por ahora)         |
| Comandante  | Usuario regular                                       |
| Ayudante    | Usuario regular                                       |
| Miembro     | Usuario regular                                       |

## Decisiones de diseño importantes

**Login con username (no email).** Tu requisito era que la gente entre con nombre y contraseña. Como Supabase Auth requiere email, el backend convierte `username → username@shinobi.local` internamente. El usuario nunca ve esto.

**Sin registro público.** No existe ruta `/register`. La única forma de crear cuentas es desde el panel admin (`POST /api/admin/users`), protegido por `requireLider`.

**Doble capa de seguridad.**
1. Express valida con `requireAuth` y `requireLider` antes de tocar la DB
2. Las políticas RLS en Postgres son la red de seguridad (incluso si alguien evade el backend)

**El primer líder es manual.** No hay forma de bootstrappear un líder desde la UI (sería un agujero de seguridad). Se crea a mano en Supabase Auth + un UPDATE en SQL. Está documentado en el paso 1.5.

## Ejecutar todo en local

Necesitas 2 terminales abiertas:

```bash
# Terminal 1 - Backend
cd backend
npm install     # solo la primera vez
npm run dev

# Terminal 2 - Frontend
cd frontend
npm install     # solo la primera vez
npm run dev
```

Frontend: http://localhost:5173
Backend: http://localhost:4000

## Roadmap (lo que pediste para "más adelante")

- [ ] CRUD de jutsus desde el perfil
- [ ] CRUD de items_venta
- [ ] Sistema de subida/edición de nivel y prestigio (líder/sub-líder)
- [ ] Tienda global con items de todos los miembros
- [ ] Edición de bio y datos del perfil
- [ ] Vista de "logs" de acciones del líder
- [ ] Notificaciones internas
