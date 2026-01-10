# 🚀 Configuración Paso a Paso - Railway y Cloudinary

## ⚡ Guía Rápida (15 minutos)

Sigue estos pasos en orden para configurar todo el sistema.

---

## 📋 PARTE 1: Railway Backend (10 minutos)

### Paso 1: Crear Cuenta en Railway

1. Ve a **https://railway.app**
2. Click en **"Start a New Project"**
3. Inicia sesión con **GitHub** o **Email**
4. Completa el registro

### Paso 2: Crear Base de Datos PostgreSQL

1. En Railway, click en **"New Project"**
2. Click en **"New"** → **"Database"** → **"PostgreSQL"**
3. Espera 1-2 minutos a que se cree
4. Click en el servicio **PostgreSQL**
5. Ve a la pestaña **"Variables"**
6. **COPIA** el valor de `DATABASE_URL` (lo necesitarás después)

### Paso 3: Agregar Servicio Node.js

**Opción A: Si tienes el código en GitHub (Recomendado)**

1. En Railway, click en **"New"** → **"GitHub Repo"**
2. Selecciona tu repositorio
3. En **"Root Directory"**, selecciona: **`backend`**
4. Railway detectará automáticamente Node.js

**Opción B: Si NO tienes GitHub**

1. Instala Railway CLI:
   ```bash
   npm i -g @railway/cli
   ```

2. Inicia sesión:
   ```bash
   railway login
   ```

3. En la carpeta `backend`:
   ```bash
   cd backend
   railway init
   railway up
   ```

### Paso 4: Configurar Variables de Entorno

1. Click en el servicio **Node.js** que acabas de crear
2. Ve a la pestaña **"Variables"**
3. Click en **"New Variable"** y agrega estas variables:

#### Variable 1: DATABASE_URL
```
Nombre: DATABASE_URL
Valor: [Pega el DATABASE_URL que copiaste del servicio PostgreSQL]
```

#### Variable 2: JWT_SECRET
```
Nombre: JWT_SECRET
Valor: [Genera uno con el comando de abajo]
```

**Generar JWT_SECRET:**
Abre PowerShell o Terminal y ejecuta:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```
Copia el resultado y úsalo como valor.

#### Variable 3: CORS_ORIGIN
```
Nombre: CORS_ORIGIN
Valor: *
```

#### Variable 4: SOCKET_IO_CORS_ORIGIN
```
Nombre: SOCKET_IO_CORS_ORIGIN
Valor: *
```

#### Variable 5: NODE_ENV
```
Nombre: NODE_ENV
Valor: production
```

### Paso 5: Conectar PostgreSQL al Servicio Node.js

1. En el servicio **Node.js**, ve a **"Settings"**
2. Busca **"Service Connections"** o **"Connect"**
3. Click en **"Connect"** y selecciona el servicio **PostgreSQL**
4. Railway configurará automáticamente `DATABASE_URL`

### Paso 6: Obtener URL del Backend

1. En el servicio **Node.js**, ve a **"Settings"**
2. Busca **"Generate Domain"** o **"Domains"**
3. Click en **"Generate Domain"**
4. Railway generará una URL como: `https://tu-proyecto.up.railway.app`
5. **COPIA** esta URL (la necesitarás para el frontend)

### Paso 7: Ejecutar Migraciones

**Opción A: Usando Railway CLI (Recomendado)**

1. Instala Railway CLI si no lo tienes:
   ```bash
   npm i -g @railway/cli
   ```

2. Inicia sesión:
   ```bash
   railway login
   ```

3. Conecta a tu proyecto:
   ```bash
   cd backend
   railway link
   ```

4. Ejecuta migraciones:
   ```bash
   railway run npm run migrate
   ```

5. Crea usuario administrador:
   ```bash
   railway run npm run create-admin
   ```

**Opción B: Desde Railway Dashboard**

1. Ve al servicio Node.js
2. Click en **"Deployments"**
3. Espera a que termine el despliegue
4. Ve a **"Logs"** y verifica que no haya errores

### Paso 8: Verificar que Funciona

1. Abre tu navegador
2. Ve a: `https://tu-url-railway.app/health`
3. Deberías ver:
   ```json
   {
     "status": "OK",
     "timestamp": "...",
     "uptime": ...
   }
   ```

✅ **Si ves esto, Railway está funcionando!**

---

## ☁️ PARTE 2: Cloudinary (5 minutos)

### Paso 1: Crear Cuenta

1. Ve a **https://cloudinary.com**
2. Click en **"Sign Up for Free"**
3. Completa el formulario:
   - Email
   - Contraseña
   - Nombre
4. Confirma tu email

### Paso 2: Obtener Credenciales

1. Una vez dentro, verás el **Dashboard**
2. En la parte superior verás un panel con información
3. **COPIA** estos 3 valores:

```
Cloud Name: [ejemplo: dq8hx8h8x]
API Key: [ejemplo: 123456789012345]
API Secret: [ejemplo: abcdefghijklmnopqrstuvwxyz123456]
```

### Paso 3: Configurar en Railway

1. Vuelve a Railway
2. Ve al servicio **Node.js**
3. Ve a la pestaña **"Variables"**
4. Agrega estas 3 variables:

```
Nombre: CLOUDINARY_CLOUD_NAME
Valor: [Pega el Cloud Name]
```

```
Nombre: CLOUDINARY_API_KEY
Valor: [Pega el API Key]
```

```
Nombre: CLOUDINARY_API_SECRET
Valor: [Pega el API Secret]
```

5. Railway reiniciará automáticamente el servicio

✅ **Cloudinary configurado!**

---

## 💻 PARTE 3: Configurar Frontend (2 minutos)

### Paso 1: Abrir el Sistema

1. Abre `Sistema HTML/index.html` en tu navegador
2. O si está desplegado, abre la URL del frontend

### Paso 2: Configurar URL del Backend

1. En el sistema, ve a **Configuración** (ícono ⚙️)
2. Busca la pestaña **"Sistema"**
3. En **"Servidor Centralizado"**, verás:
   - Campo: **"URL del Backend (Railway)"**
4. Pega la URL de Railway:
   ```
   https://tu-proyecto.up.railway.app
   ```
   **IMPORTANTE**: Sin `/api` al final

### Paso 3: Probar Conexión

1. Click en **"Probar y Guardar Conexión"**
2. Si todo está bien, verás:
   - ✅ **"Estado: Conectado"**
   - ✅ Notificación de éxito

### Paso 4: Iniciar Sesión

**Credenciales por defecto** (después de ejecutar `npm run create-admin`):
- Username: `admin`
- PIN: `1234`

⚠️ **IMPORTANTE**: Cambia el PIN después del primer inicio de sesión

---

## ✅ Verificación Final

### Checklist:

- [ ] Railway backend está corriendo (`/health` responde)
- [ ] PostgreSQL está conectado (revisar logs)
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas
- [ ] Usuario administrador creado
- [ ] Cloudinary configurado (opcional)
- [ ] Frontend configurado con URL de Railway
- [ ] Conexión probada exitosamente
- [ ] Puedes iniciar sesión

### Pruebas Rápidas:

1. **Crear un Producto**:
   - Ve a Inventario → Agregar Producto
   - Completa el formulario
   - Sube una foto (si Cloudinary está configurado)
   - Guarda
   - Verifica que aparece en la lista

2. **Crear una Venta**:
   - Ve a POS
   - Agrega productos al carrito
   - Completa la venta
   - Verifica que se guardó correctamente

---

## 🐛 Solución de Problemas

### Error: "No se puede conectar al servidor"

**Soluciones:**
1. Verifica que la URL sea correcta (sin `/api`)
2. Verifica que Railway esté corriendo (revisa logs)
3. Verifica que CORS_ORIGIN esté como `*`

### Error: "Error 401 Unauthorized"

**Soluciones:**
1. Verifica que JWT_SECRET esté configurado
2. Ejecuta: `railway run npm run create-admin`
3. Intenta iniciar sesión de nuevo

### Error: "Error conectando a PostgreSQL"

**Soluciones:**
1. Verifica que DATABASE_URL esté correcto
2. Verifica que PostgreSQL esté corriendo en Railway
3. Ejecuta migraciones: `railway run npm run migrate`

### Error: "Las tablas no existen"

**Soluciones:**
1. Ejecuta migraciones:
   ```bash
   railway run npm run migrate
   ```

---

## 📝 Resumen de URLs y Credenciales

Guarda esta información:

```
RAILWAY:
- URL Backend: https://tu-proyecto.up.railway.app
- DATABASE_URL: [Del servicio PostgreSQL]

CLOUDINARY:
- Cloud Name: [De tu cuenta]
- API Key: [De tu cuenta]
- API Secret: [De tu cuenta]

USUARIO INICIAL:
- Username: admin
- PIN: 1234
```

---

## 🎯 Siguiente Paso

Una vez configurado:

1. ✅ Prueba crear una venta
2. ✅ Prueba agregar un producto con foto
3. ✅ Prueba el modo offline
4. ✅ Verifica que los datos se sincronizan

**¡El sistema está listo para usar!** 🚀
