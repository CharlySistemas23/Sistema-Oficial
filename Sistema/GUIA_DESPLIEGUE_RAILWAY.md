# 🚂 Guía Completa de Despliegue en Railway

Esta guía te llevará paso a paso para desplegar el backend del Sistema POS Opal & Co en Railway.

## 📋 Requisitos Previos

1. Cuenta en [Railway](https://railway.app) (gratis)
2. Cuenta en GitHub (opcional, para despliegue automático)
3. Node.js instalado localmente (para pruebas)

## 🚀 Paso 1: Preparar el Proyecto

### 1.1 Estructura del Proyecto

Asegúrate de tener esta estructura:

```
backend/
├── config/
│   └── database.js
├── database/
│   └── schema.sql
├── middleware/
│   ├── auth.js
│   └── errorHandler.js
├── routes/
│   ├── auth.js
│   ├── branches.js
│   ├── dashboard.js
│   ├── employees.js
│   ├── inventory.js
│   ├── sales.js
│   ├── customers.js
│   └── reports.js
├── socket/
│   └── socketHandler.js
├── scripts/
│   └── migrate.js
├── .env.example
├── .gitignore
├── package.json
├── railway.json
├── README.md
└── server.js
```

### 1.2 Verificar package.json

Asegúrate de que `package.json` tenga:

```json
{
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js",
    "migrate": "node scripts/migrate.js"
  }
}
```

## 🚂 Paso 2: Crear Proyecto en Railway

### 2.1 Iniciar Sesión

1. Ve a [railway.app](https://railway.app)
2. Inicia sesión con GitHub o Email

### 2.2 Crear Nuevo Proyecto

1. Click en **"New Project"**
2. Selecciona una de estas opciones:
   - **"Deploy from GitHub repo"** (recomendado) - Conecta tu repositorio
   - **"Empty Project"** - Sube el código manualmente

### 2.3 Si usas GitHub

1. Autoriza Railway para acceder a tu repositorio
2. Selecciona el repositorio que contiene el backend
3. Railway detectará automáticamente Node.js

### 2.4 Si usas Empty Project

1. Instala Railway CLI:
```bash
npm i -g @railway/cli
```

2. Inicia sesión:
```bash
railway login
```

3. Inicializa proyecto:
```bash
cd backend
railway init
```

4. Sube el código:
```bash
railway up
```

## 🗄️ Paso 3: Configurar Base de Datos PostgreSQL

### 3.1 Agregar Servicio PostgreSQL

1. En tu proyecto Railway, click en **"+ New"**
2. Selecciona **"Database"** → **"Add PostgreSQL"**
3. Railway creará automáticamente una base de datos PostgreSQL

### 3.2 Obtener DATABASE_URL

1. Click en el servicio PostgreSQL
2. Ve a la pestaña **"Variables"**
3. Copia el valor de `DATABASE_URL` (Railway lo genera automáticamente)

## ⚙️ Paso 4: Configurar Variables de Entorno

### 4.1 En el Servicio de Aplicación

1. Click en tu servicio de aplicación (no la base de datos)
2. Ve a la pestaña **"Variables"**
3. Agrega estas variables:

```
PORT=3000
NODE_ENV=production
DATABASE_URL=<pegar-el-valor-de-postgresql>
JWT_SECRET=<generar-un-secret-seguro>
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
SOCKET_IO_CORS_ORIGIN=*
```

### 4.2 Generar JWT_SECRET Seguro

En tu terminal local:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copia el resultado y úsalo como `JWT_SECRET`.

### 4.3 Configurar DATABASE_URL

Railway genera automáticamente `DATABASE_URL` en el servicio PostgreSQL. 

**Opción 1:** Railway puede compartir variables automáticamente
- En el servicio de aplicación, ve a **"Variables"**
- Click en **"Reference Variable"**
- Selecciona `DATABASE_URL` del servicio PostgreSQL

**Opción 2:** Copiar manualmente
- Copia `DATABASE_URL` del servicio PostgreSQL
- Pégalo en las variables del servicio de aplicación

## 🔄 Paso 5: Ejecutar Migraciones

### 5.1 Usando Railway CLI

```bash
# Conectar al proyecto
railway link

# Ejecutar migración
railway run npm run migrate
```

### 5.2 Usando la Consola de Railway

1. En el servicio de aplicación, ve a **"Deployments"**
2. Click en el deployment más reciente
3. Click en **"View Logs"**
4. En la pestaña **"Shell"**, ejecuta:

```bash
npm run migrate
```

### 5.3 Verificar Migración

Después de ejecutar la migración, deberías ver:

```
✅ Migración completada exitosamente
📊 Tablas creadas:
  - audit_logs
  - branches
  - catalog_agencies
  - catalog_guides
  - catalog_sellers
  - customers
  - daily_profit_reports
  - employees
  - exchange_rates_daily
  - inventory_items
  - inventory_logs
  - inventory_transfer_items
  - inventory_transfers
  - payments
  - sale_items
  - sales
  - users

👤 Usuario maestro creado:
  - Username: master_admin
  - Password: admin123 (⚠️ CAMBIAR EN PRODUCCIÓN)
```

## 🌐 Paso 6: Obtener URL Pública

### 6.1 Generar Dominio

1. En el servicio de aplicación, ve a **"Settings"**
2. Scroll hasta **"Networking"**
3. Click en **"Generate Domain"**
4. Railway generará una URL como: `tu-app.railway.app`

### 6.2 Verificar que Funciona

Abre en tu navegador:

```
https://tu-app.railway.app/health
```

Deberías ver:

```json
{
  "status": "ok",
  "timestamp": "2024-...",
  "uptime": ...
}
```

## 🔐 Paso 7: Cambiar Contraseña del Usuario Maestro

### 7.1 Usando Railway CLI

```bash
railway run node -e "
const bcrypt = require('bcryptjs');
bcrypt.hash('tu-nueva-contraseña-segura', 10).then(hash => {
  console.log('Hash:', hash);
});
"
```

### 7.2 Actualizar en Base de Datos

```bash
railway run psql $DATABASE_URL -c "
UPDATE users 
SET password_hash = '<pegar-el-hash-generado>' 
WHERE username = 'master_admin';
"
```

## 📱 Paso 8: Configurar Frontend

### 8.1 En el Sistema POS

1. Abre el sistema POS en el navegador
2. Ve a **Configuración → Sistema → API**
3. Ingresa la URL de Railway: `https://tu-app.railway.app`
4. Guarda la configuración

### 8.2 Probar Conexión

1. Intenta iniciar sesión con:
   - Username: `master_admin`
   - Password: `admin123` (o la que hayas configurado)

## 🔍 Paso 9: Verificar Funcionamiento

### 9.1 Probar Endpoints

```bash
# Health check
curl https://tu-app.railway.app/health

# Login (reemplazar con tus credenciales)
curl -X POST https://tu-app.railway.app/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"master_admin","password":"admin123"}'
```

### 9.2 Ver Logs

En Railway:
1. Ve a tu servicio de aplicación
2. Click en **"Deployments"**
3. Click en el deployment más reciente
4. Ve a **"View Logs"**

Deberías ver:

```
🚀 Servidor iniciado en puerto 3000
📡 Socket.IO habilitado para tiempo real
🌍 Entorno: production
```

## 🐛 Solución de Problemas

### Error: "Cannot connect to database"

**Solución:**
1. Verifica que `DATABASE_URL` esté correctamente configurada
2. Asegúrate de que el servicio PostgreSQL esté corriendo
3. Verifica que las variables estén en el servicio correcto

### Error: "JWT_SECRET is not defined"

**Solución:**
1. Verifica que `JWT_SECRET` esté en las variables de entorno
2. Asegúrate de haber generado un secret seguro
3. Reinicia el servicio después de agregar la variable

### Error: "Port already in use"

**Solución:**
Railway asigna automáticamente el puerto. Asegúrate de usar:

```javascript
const PORT = process.env.PORT || 3000;
```

### WebSockets no funcionan

**Solución:**
1. Verifica que `SOCKET_IO_CORS_ORIGIN` esté configurado
2. Asegúrate de usar `https://` en la URL del frontend
3. Verifica que el cliente esté usando la misma URL

### Migración falla

**Solución:**
1. Verifica que el archivo `schema.sql` exista
2. Asegúrate de tener permisos en la base de datos
3. Revisa los logs para ver el error específico

## 📊 Monitoreo

### Ver Métricas

En Railway:
1. Ve a tu servicio
2. Click en **"Metrics"**
3. Verás CPU, Memoria, Red, etc.

### Ver Logs en Tiempo Real

1. Ve a **"Deployments"**
2. Click en el deployment activo
3. Click en **"View Logs"**
4. Los logs se actualizan en tiempo real

## 🔄 Actualizaciones

### Desplegar Cambios

Si usas GitHub:
- Push a tu repositorio
- Railway detectará los cambios automáticamente
- Desplegará la nueva versión

Si usas Railway CLI:
```bash
railway up
```

## 💰 Costos

Railway ofrece:
- **$5 de crédito gratis** mensual
- PostgreSQL incluido
- Sin costo adicional por WebSockets
- Escalado automático

Para producción con mucho tráfico, considera el plan Pro ($20/mes).

## ✅ Checklist Final

- [ ] Proyecto creado en Railway
- [ ] Base de datos PostgreSQL agregada
- [ ] Variables de entorno configuradas
- [ ] Migraciones ejecutadas
- [ ] Dominio público generado
- [ ] Health check funciona
- [ ] Login funciona
- [ ] Frontend configurado con URL de Railway
- [ ] Contraseña del usuario maestro cambiada
- [ ] WebSockets funcionando

## 🎉 ¡Listo!

Tu backend está desplegado y funcionando en Railway. El sistema ahora funciona en tiempo real con múltiples sucursales.

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Verifica las variables de entorno
3. Consulta la documentación de Railway: https://docs.railway.app
