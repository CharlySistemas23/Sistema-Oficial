# ⚡ Comandos Rápidos para Railway

## 🚀 Configuración Inicial

### 1. Instalar Railway CLI
```bash
npm i -g @railway/cli
```

### 2. Iniciar Sesión
```bash
railway login
```

### 3. Conectar a tu Proyecto
```bash
cd backend
railway link
```

---

## 📊 Comandos Útiles

### Ver Logs en Tiempo Real
```bash
railway logs
```

### Ejecutar Migraciones
```bash
railway run npm run migrate
```

### Crear Usuario Administrador
```bash
railway run npm run create-admin
```

### Probar Conexión
```bash
railway run npm run test:connection
```

### Abrir Shell en Railway
```bash
railway shell
```

### Ver Variables de Entorno
```bash
railway variables
```

### Agregar Variable de Entorno
```bash
railway variables set NOMBRE_VARIABLE=valor
```

---

## 🔧 Configuración Rápida

### 1. Agregar Todas las Variables Necesarias

```bash
# DATABASE_URL (obtenerlo del servicio PostgreSQL en Railway)
railway variables set DATABASE_URL="postgresql://..."

# JWT_SECRET (generar uno nuevo)
railway variables set JWT_SECRET="$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")"

# CORS
railway variables set CORS_ORIGIN="*"
railway variables set SOCKET_IO_CORS_ORIGIN="*"

# Cloudinary (opcional)
railway variables set CLOUDINARY_CLOUD_NAME="tu-cloud-name"
railway variables set CLOUDINARY_API_KEY="tu-api-key"
railway variables set CLOUDINARY_API_SECRET="tu-api-secret"
```

### 2. Ejecutar Migraciones y Crear Admin

```bash
# Ejecutar migraciones
railway run npm run migrate

# Crear usuario administrador
railway run npm run create-admin
```

---

## 📝 Verificar Estado

### Verificar que el Backend Está Corriendo
```bash
# Obtener URL del servicio
railway domain

# Probar health check
curl https://tu-url-railway.app/health
```

### Ver Logs del Servicio
```bash
railway logs --tail
```

---

## 🐛 Solución de Problemas

### Reiniciar el Servicio
```bash
railway restart
```

### Ver Variables Actuales
```bash
railway variables
```

### Ver Último Deployment
```bash
railway status
```

---

## 📋 Checklist Rápido

```bash
# 1. Conectar a Railway
railway link

# 2. Verificar variables
railway variables

# 3. Ejecutar migraciones
railway run npm run migrate

# 4. Crear admin
railway run npm run create-admin

# 5. Ver logs
railway logs

# 6. Obtener URL
railway domain
```

---

## 🎯 URLs Importantes

- **Railway Dashboard**: https://railway.app/dashboard
- **Railway Docs**: https://docs.railway.app
- **Cloudinary Dashboard**: https://cloudinary.com/console
