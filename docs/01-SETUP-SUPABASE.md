# Paso 1: Configurar Supabase

Sigue estos pasos en orden. Te tomará unos 10-15 minutos.

## 1.1 Crear el proyecto

1. Entra a https://supabase.com y haz login
2. Click en **"New Project"**
3. Llénalo así:
   - **Name**: `shinobi-app` (o el nombre que quieras)
   - **Database Password**: genera una segura y **GUÁRDALA** (la vas a necesitar)
   - **Region**: elige la más cercana a Chile → `South America (São Paulo)`
   - **Pricing Plan**: Free está bien para empezar
4. Click en **"Create new project"** y espera ~2 minutos a que se aprovisione

## 1.2 Obtener las credenciales

Una vez creado el proyecto, ve a **Settings** (engranaje abajo a la izquierda) → **API**.

Vas a necesitar copiar 3 valores:

| Valor | Dónde está | Para qué sirve |
|---|---|---|
| `Project URL` | Arriba de todo | URL base de tu API |
| `anon public key` | Sección "Project API keys" | Clave pública para el frontend |
| `service_role key` | Sección "Project API keys" (click "Reveal") | Clave SECRETA para el backend — NUNCA la pongas en el frontend |

⚠️ **IMPORTANTE**: La `service_role` key salta toda la seguridad de Supabase. Solo va en el backend, jamás en React.

## 1.3 Ejecutar el schema SQL

1. En el menú lateral de Supabase, ve a **SQL Editor**
2. Click en **"New query"**
3. Abre el archivo `database/schema.sql` de este proyecto
4. **Copia TODO el contenido y pégalo en el editor**
5. Click en **"Run"** (o Ctrl+Enter)
6. Deberías ver "Success. No rows returned"

Esto crea:
- Tipo enum `user_role` con los 5 roles (lider, sub_lider, comandante, ayudante, miembro)
- Tabla `profiles` con toda la info del perfil
- Tabla `jutsus` para los jutsus de cada usuario
- Tabla `items_venta` para items que se venden
- Políticas de seguridad (RLS) para que solo el líder pueda crear/borrar usuarios
- Trigger que crea automáticamente un perfil cuando se registra un usuario

## 1.4 Crear el bucket de Storage para banners y avatares

1. En el menú lateral, ve a **Storage**
2. Click en **"New bucket"**
3. Nombre: `avatars` → marca **"Public bucket"** → Create
4. Repite con otro bucket llamado `banners` → marca **"Public bucket"** → Create

Después, en cada bucket, ve a **Policies** y agrega esta política para permitir que los usuarios autenticados suban archivos:

```sql
-- Política para INSERT (subir)
CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id IN ('avatars', 'banners'));

-- Política para UPDATE (reemplazar)
CREATE POLICY "Users can update own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (auth.uid()::text = (storage.foldername(name))[1]);

-- Política para SELECT (leer) - público
CREATE POLICY "Public read access"
ON storage.objects FOR SELECT
TO public
USING (bucket_id IN ('avatars', 'banners'));
```

Pega esto en el SQL Editor y ejecútalo.

## 1.5 Crear el primer usuario LÍDER (manualmente)

Esto es importante porque después solo el líder puede crear usuarios. Necesitas crear el primero a mano.

1. En Supabase, ve a **Authentication** → **Users** → **"Add user"** → **"Create new user"**
2. Email: usa un email tuyo (ej: `lider@shinobi.com` — no necesita ser real)
3. Password: la que quieras (mínimo 6 caracteres)
4. Marca **"Auto Confirm User"** ✅
5. Click **Create user**

Ahora ve al **SQL Editor** y ejecuta esto, **reemplazando el email**:

```sql
UPDATE profiles
SET role = 'lider', username = 'TuNombreLider'
WHERE id = (SELECT id FROM auth.users WHERE email = 'lider@shinobi.com');
```

¡Listo! Ya tienes tu primer líder.

## 1.6 Verificación

Ve a **Table Editor** → tabla `profiles` y deberías ver tu usuario con role = `lider`.

---

✅ **Ya puedes pasar al paso 2:** Configurar el backend (`docs/02-BACKEND.md`)
