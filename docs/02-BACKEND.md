# Paso 2: Backend (Node.js + Express)

## 2.1 Instalar dependencias

```bash
cd backend
npm install
```

## 2.2 Configurar variables de entorno

```bash
cp .env.example .env
```

Abre el archivo `.env` y rellénalo con los valores que copiaste de Supabase en el paso 1.2:

```env
PORT=4000
SUPABASE_URL=https://abcdefgh.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
FRONTEND_URL=http://localhost:5173
```

⚠️ **NUNCA subas `.env` a GitHub.** Asegúrate de que esté en `.gitignore`.

## 2.3 Iniciar el servidor

```bash
npm run dev
```

Deberías ver: `🥷 Backend corriendo en http://localhost:4000`

## 2.4 Verificar que funciona

Abre en tu navegador o con curl:

```bash
curl http://localhost:4000/api/health
# → {"ok":true,"timestamp":"..."}
```

## Endpoints disponibles

### Auth (públicos / login)
- `POST /api/auth/login` — body `{ username, password }` → devuelve `{ user, session }`
- `GET /api/auth/me` — requiere token → devuelve perfil propio
- `POST /api/auth/logout`

### Admin (solo líder)
- `GET /api/admin/users` — lista todos los usuarios
- `POST /api/admin/users` — body `{ username, password, role }` → crea usuario
- `PATCH /api/admin/users/:id/role` — body `{ role }` → cambia rol
- `DELETE /api/admin/users/:id` — elimina usuario

### Perfiles (cualquier autenticado)
- `GET /api/profiles` — lista todos los perfiles públicos
- `GET /api/profiles/:username` — perfil completo + jutsus + items
- `PATCH /api/profiles/me` — body `{ bio?, avatar_url?, banner_url? }`

## Notas importantes

**Sobre el "username" vs "email":**
Tú quieres login con username, pero Supabase Auth usa email. Solución: el backend convierte automáticamente `username` → `username@shinobi.local` internamente. El usuario nunca ve esto.

**Seguridad:**
- El backend usa `service_role_key` (privilegios totales) solo para operaciones admin
- Para login y verificación de tokens usa `anon_key`
- Las políticas RLS de Supabase son la segunda capa de defensa

---

✅ **Siguiente paso:** Frontend (`docs/03-FRONTEND.md`)
