# Paso 3: Frontend (React + Vite + Tailwind)

## 3.1 Instalar dependencias

```bash
cd frontend
npm install
```

## 3.2 Variables de entorno

```bash
cp .env.example .env
```

Edita `.env`:

```env
VITE_API_URL=http://localhost:4000
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu_anon_key_aqui
```

⚠️ Aquí solo va la `anon_key`, NUNCA la `service_role_key`.

## 3.3 Arrancar el frontend

```bash
npm run dev
```

Abre http://localhost:5173 en tu navegador.

## 3.4 Probar el sistema completo

**Asegúrate de que el backend esté corriendo en otra terminal** (`npm run dev` dentro de `/backend`).

1. **Login** con el usuario líder que creaste manualmente en Supabase (paso 1.5)
2. Verás la página principal con la lista de miembros (al inicio solo estarás tú)
3. Click en **"Panel Admin"** arriba a la derecha
4. Click en **"+ Registrar Shinobi"** y crea otro usuario de prueba
5. Cierra sesión y entra con ese nuevo usuario para verificar
6. Vuelve como líder y prueba cambiar roles desde el dropdown

## Estructura de archivos

```
frontend/src/
├── main.jsx              ← entry point
├── App.jsx               ← rutas
├── index.css             ← Tailwind + estilos personalizados
├── lib/
│   ├── api.js            ← cliente HTTP que habla con el backend
│   └── supabase.js       ← cliente para subir archivos a Storage
├── context/
│   └── AuthContext.jsx   ← estado global de autenticación
├── components/
│   ├── Header.jsx
│   ├── Logo.jsx          ← logo "R" en SVG
│   ├── RoleBadge.jsx
│   └── ProtectedRoute.jsx
└── pages/
    ├── LoginPage.jsx
    ├── HomePage.jsx      ← grid de miembros (la pantalla del screenshot)
    ├── ProfilePage.jsx   ← banner + avatar + stats + jutsus + items
    └── AdminPage.jsx     ← tabla de usuarios + crear/eliminar/asignar rol
```

## Estética implementada

Basado en tus capturas:

- **Paleta:** fondo `#0e0e0e` (ink-900), tarjetas `#E0E2C9` (bone-100), acentos blood/scroll/chakra
- **Tipografía:** Cinzel (display, vibe shinobi/épico) + Inter (body) + JetBrains Mono (datos/técnico)
- **Detalles:** banda decorativa horizontal (como el logo), textura de papel sutil, sombras internas que evocan grabado, scrollbars personalizados
- **Roles con color:** Líder rojo sangre, Sub-Líder marrón pergamino, Comandante azul chakra, Ayudante crema, Miembro gris

## Funcionalidades listas

✅ Login con username + password (sin opción de registro público)
✅ Sistema de 5 roles
✅ Solo el líder ve y accede al panel admin
✅ Crear, eliminar y cambiar rol de usuarios
✅ Página personal de cada perfil con banner + avatar editables
✅ Stats: nivel, prestigio, jutsus, items en venta
✅ Subida de imágenes a Supabase Storage
✅ Protección automática: no puedes eliminarte a ti mismo, no puedes quedar sin líderes

## Próximos pasos (futuro)

Cuando quieras avanzar con el contenido editable:
- CRUD de jutsus desde el perfil propio
- CRUD de items en venta
- Sistema para que líder/sub-líder editen nivel y prestigio de otros
- Notificaciones, mensajería interna
- Página de "tienda" agregando items de todos los miembros
