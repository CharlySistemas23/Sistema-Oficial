# 🚀 Guía Paso a Paso: Configurar Railway y Cloudinary

Esta guía te llevará paso a paso para configurar Railway (backend) y Cloudinary (imágenes) para probar el sistema.

---

## 📋 Requisitos Previos

- ✅ Cuenta de email (para Railway y Cloudinary)
- ✅ Navegador web moderno
- ✅ Código del proyecto descargado

---

## 🚂 PARTE 1: Configurar Railway (Backend)

### Paso 1: Crear Cuenta en Railway

1. Ve a [railway.app](https://railway.app)
2. Click en **"Start a New Project"** o **"Login"**
3. Elige una opción para iniciar sesión:
   - **GitHub** (recomendado si tienes cuenta)
   - **Email** (si prefieres usar email)
4. Completa el registro

### Paso 2: Crear Proyecto en Railway

1. Una vez dentro de Railway, click en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"** (si tienes el código en GitHub)
   - O selecciona **"Empty Project"** si vas a subir manualmente

### Paso 3: Agregar Base de Datos PostgreSQL

1. En tu proyecto de Railway, click en **"New"**
2. Selecciona **"Database"**
3. Selecciona **"PostgreSQL"**
4. Railway creará automáticamente una base de datos PostgreSQL
5. **IMPORTANTE**: Espera a que se cree completamente (puede tardar 1-2 minutos)

### Paso 4: Obtener DATABASE_URL

1. Click en el servicio **PostgreSQL** que acabas de crear
2. Ve a la pestaña **"Variables"**
3. Busca la variable **`DATABASE_URL`**
4. **COPIA** el valor completo (se ve algo como: `postgresql://postgres:password@host:port/railway`)
5. **GUÁRDALO** en un archivo de texto temporal (lo necesitarás después)

### Paso 5: Agregar Servicio Node.js (Backend)

1. En tu proyecto de Railway, click en **"New"** de nuevo
2. Selecciona **"GitHub Repo"** (si tienes el código en GitHub)
   - O **"Empty Service"** si vas a subir manualmente
3. Si usas GitHub:
   - Selecciona tu repositorio
   - Selecciona la carpeta **`backend`** como raíz del proyecto
   - Railway detectará automáticamente que es Node.js
4. Si usas Empty Service:
   - Necesitarás usar Railway CLI (ver instrucciones más abajo)

### Paso 6: Configurar Variables de Entorno en Railway

1. Click en el servicio **Node.js** que acabas de crear
2. Ve a la pestaña **"Variables"**
3. Click en **"New Variable"** para agregar cada una:

#### Variables Requeridas:

```
Nombre: DATABASE_URL
Valor: [Pega el DATABASE_URL que copiaste del servicio PostgreSQL]
```

```
Nombre: JWT_SECRET
Valor: [Genera una clave secreta aleatoria - ver abajo cómo generarla]
```

```
Nombre: CORS_ORIGIN
Valor: *
```

```
Nombre: SOCKET_IO_CORS_ORIGIN
Valor: *
```

#### Variables Opcionales (para Cloudinary):

```
Nombre: CLOUDINARY_CLOUD_NAME
Valor: [Lo obtendrás de Cloudinary - ver PARTE 2]
```

```
Nombre: CLOUDINARY_API_KEY
Valor: [Lo obtendrás de Cloudinary - ver PARTE 2]
```

```
Nombre: CLOUDINARY_API_SECRET
Valor: [Lo obtendrás de Cloudinary - ver PARTE 2]
```

#### Cómo Generar JWT_SECRET:

**Opción 1: Usando Node.js (recomendado)**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Opción 2: Usando un generador online**
- Ve a: https://www.random.org/strings/
- Genera una cadena de 64 caracteres
- Cópiala como JWT_SECRET

**Opción 3: Usar este valor de ejemplo** (solo para pruebas):
```
jwt_secret_opal_co_2024_secure_key_64_chars_long_random_string_here
```

### Paso 7: Configurar Railway para Ejecutar Migraciones

1. En el servicio Node.js, ve a la pestaña **"Settings"**
2. Busca **"Build Command"** y déjalo vacío (Railway lo detecta automáticamente)
3. Busca **"Start Command"** y asegúrate que diga:
   ```
   npm start
   ```
4. Railway ejecutará automáticamente `npm start` que ejecuta `node server.js`

### Paso 8: Ejecutar Migraciones de Base de Datos

**Opción A: Desde Railway (Recomendado)**

1. En el servicio Node.js, ve a la pestaña **"Deployments"**
2. Click en el deployment más reciente
3. Ve a la pestaña **"Logs"**
4. Busca si hay errores relacionados con la base de datos

**Opción B: Desde Railway CLI (Si necesitas ejecutar migraciones manualmente)**

1. Instala Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Inicia sesión:
   ```bash
   railway login
   ```

3. Conecta a tu proyecto:
   ```bash
   railway link
   ```

4. Ejecuta migraciones:
   ```bash
   railway run npm run migrate
   ```

**Opción C: Desde el código (Automático)**

El servidor intentará crear las tablas automáticamente al iniciar si no existen. Revisa los logs para verificar.

### Paso 9: Obtener URL del Backend

1. En el servicio Node.js, ve a la pestaña **"Settings"**
2. Busca **"Generate Domain"** o **"Custom Domain"**
3. Click en **"Generate Domain"**
4. Railway generará una URL como: `https://tu-proyecto.up.railway.app`
5. **COPIA** esta URL (la necesitarás para configurar el frontend)

### Paso 10: Verificar que el Backend Funciona

1. Abre tu navegador
2. Ve a: `https://tu-url-railway.app/health`
3. Deberías ver algo como:
   ```json
   {
     "status": "OK",
     "timestamp": "2024-01-15T...",
     "uptime": 123.45
   }
   ```

✅ **Si ves esto, tu backend está funcionando correctamente!**

---

## ☁️ PARTE 2: Configurar Cloudinary (Opcional pero Recomendado)

### Paso 1: Crear Cuenta en Cloudinary

1. Ve a [cloudinary.com](https://cloudinary.com)
2. Click en **"Sign Up for Free"**
3. Completa el formulario:
   - Email
   - Contraseña
   - Nombre
4. Confirma tu email

### Paso 2: Obtener Credenciales de Cloudinary

1. Una vez dentro de Cloudinary, verás el **Dashboard**
2. En la parte superior verás un panel con información de tu cuenta
3. **COPIA** estos valores:

```
Cloud Name: [ejemplo: dq8hx8h8x]
API Key: [ejemplo: 123456789012345]
API Secret: [ejemplo: abcdefghijklmnopqrstuvwxyz123456]
```

### Paso 3: Configurar Cloudinary en Railway

1. Vuelve a Railway
2. Ve al servicio Node.js
3. Ve a la pestaña **"Variables"**
4. Agrega estas variables:

```
Nombre: CLOUDINARY_CLOUD_NAME
Valor: [Pega el Cloud Name que copiaste]
```

```
Nombre: CLOUDINARY_API_KEY
Valor: [Pega el API Key que copiaste]
```

```
Nombre: CLOUDINARY_API_SECRET
Valor: [Pega el API Secret que copiaste]
```

### Paso 4: Verificar Configuración de Cloudinary

1. Railway reiniciará automáticamente el servicio cuando agregues variables
2. Ve a los **Logs** del servicio Node.js
3. Busca si hay errores relacionados con Cloudinary
4. Si no hay errores, Cloudinary está configurado correctamente

---

## 🔧 PARTE 3: Configurar el Frontend

### Paso 1: Abrir el Sistema Frontend

1. Abre `Sistema HTML/index.html` en tu navegador
2. O si está desplegado, abre la URL del frontend

### Paso 2: Configurar URL del Backend

1. En el sistema, ve a **Configuración** (ícono ⚙️)
2. Busca la pestaña **"Sistema"**
3. En la sección **"Servidor Centralizado"**, verás:
   - Campo: **"URL del Backend (Railway)"**
4. Pega la URL de Railway que copiaste:
   ```
   https://tu-proyecto.up.railway.app
   ```
   **IMPORTANTE**: No incluyas `/api` al final, solo la URL base

### Paso 3: Probar Conexión

1. Click en el botón **"Probar y Guardar Conexión"**
2. El sistema intentará conectar con Railway
3. Si todo está bien, verás:
   - ✅ **"Estado: Conectado"**
   - ✅ Notificación: "Conexión exitosa y URL guardada"

### Paso 4: Iniciar Sesión

1. Ingresa el código de empresa
2. Ingresa username y PIN
3. El sistema intentará autenticarse con Railway
4. Si es la primera vez, necesitarás crear un usuario (ver siguiente sección)

---

## 👤 PARTE 4: Crear Usuario Inicial

### Opción A: Crear Usuario desde el Backend (Recomendado)

1. Usa Railway CLI o accede a la base de datos directamente
2. Ejecuta este SQL en PostgreSQL:

```sql
-- Crear sucursal maestra (si no existe)
INSERT INTO branches (id, name, code, address, phone, email, is_active)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Sucursal Principal',
  'MAIN',
  'Dirección principal',
  '1234567890',
  'admin@opalco.com',
  true
)
ON CONFLICT (id) DO NOTHING;

-- Crear usuario maestro
INSERT INTO users (id, username, password_hash, role, branch_id, is_active, is_master_admin)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'admin',
  -- PIN: 1234 (hasheado con SHA-256)
  '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4',
  'admin',
  '00000000-0000-0000-0000-000000000001',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;
```

**Credenciales de ejemplo:**
- Username: `admin`
- PIN: `1234`

### Opción B: Crear Usuario desde el Frontend (Si tienes acceso)

1. Si ya tienes un usuario creado, puedes crear más desde el módulo de Usuarios
2. Ve a **Empleados** → **Usuarios**
3. Click en **"Agregar Usuario"**
4. Completa el formulario
5. El sistema guardará en Railway automáticamente

---

## ✅ PARTE 5: Verificar que Todo Funciona

### Checklist de Verificación:

- [ ] Railway backend está corriendo (verificar `/health`)
- [ ] PostgreSQL está conectado (revisar logs de Railway)
- [ ] Variables de entorno configuradas en Railway
- [ ] Cloudinary configurado (opcional)
- [ ] Frontend configurado con URL de Railway
- [ ] Conexión probada exitosamente
- [ ] Usuario creado y puede iniciar sesión
- [ ] Puedes crear una venta de prueba
- [ ] Puedes agregar un producto de prueba
- [ ] WebSockets funcionan (ver actualizaciones en tiempo real)

### Pruebas Recomendadas:

1. **Crear un Producto**:
   - Ve a Inventario → Agregar Producto
   - Completa el formulario
   - Sube una foto (si Cloudinary está configurado)
   - Guarda
   - Verifica que se guardó en Railway

2. **Crear una Venta**:
   - Ve a POS
   - Agrega productos al carrito
   - Completa la venta
   - Verifica que se guardó en Railway

3. **Probar Modo Offline**:
   - Desconecta internet
   - Crea una venta
   - Verifica que se guarda localmente
   - Reconecta internet
   - Verifica que se sincroniza automáticamente

4. **Probar Tiempo Real**:
   - Abre el sistema en dos navegadores diferentes
   - Crea una venta en uno
   - Verifica que aparece inmediatamente en el otro

---

## 🐛 Solución de Problemas Comunes

### Problema: "No se puede conectar al servidor"

**Soluciones:**
1. Verifica que la URL de Railway sea correcta (sin `/api` al final)
2. Verifica que Railway esté corriendo (revisa logs)
3. Verifica que no haya errores en los logs de Railway
4. Verifica que CORS_ORIGIN esté configurado como `*` o tu dominio

### Problema: "Error 401 Unauthorized"

**Soluciones:**
1. Verifica que JWT_SECRET esté configurado en Railway
2. Intenta iniciar sesión de nuevo
3. Verifica que el usuario exista en la base de datos

### Problema: "Error conectando a PostgreSQL"

**Soluciones:**
1. Verifica que DATABASE_URL esté correctamente configurado
2. Verifica que PostgreSQL esté corriendo en Railway
3. Revisa los logs de Railway para ver el error específico

### Problema: "Error subiendo imagen a Cloudinary"

**Soluciones:**
1. Verifica que las credenciales de Cloudinary estén correctas
2. Verifica que Cloudinary esté activo (cuenta gratuita tiene límites)
3. El sistema usará IndexedDB como fallback si Cloudinary falla

### Problema: "Las tablas no existen"

**Soluciones:**
1. Ejecuta las migraciones manualmente:
   ```bash
   railway run npm run migrate
   ```
2. O verifica que el servidor esté creando las tablas automáticamente (revisa logs)

---

## 📝 Resumen de URLs y Credenciales

Guarda esta información en un lugar seguro:

```
RAILWAY:
- URL del Backend: https://tu-proyecto.up.railway.app
- DATABASE_URL: [Del servicio PostgreSQL]
- JWT_SECRET: [El que generaste]

CLOUDINARY (Opcional):
- Cloud Name: [De tu cuenta]
- API Key: [De tu cuenta]
- API Secret: [De tu cuenta]

USUARIO INICIAL:
- Username: admin
- PIN: 1234
```

---

## 🎯 Siguiente Paso

Una vez configurado todo:

1. ✅ Prueba crear una venta
2. ✅ Prueba agregar un producto con foto
3. ✅ Prueba el modo offline
4. ✅ Prueba con múltiples usuarios
5. ✅ Verifica que los datos se sincronizan correctamente

**¡El sistema está listo para usar!** 🚀
