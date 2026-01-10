# 📋 Resumen de Configuración - Railway y Cloudinary

## 🎯 Objetivo

Configurar el backend en Railway y Cloudinary para probar el sistema completo.

---

## ⚡ Pasos Rápidos (15 minutos)

### 1️⃣ Railway Backend (10 min)

```
1. Crear cuenta en railway.app
2. Crear proyecto → New → Database → PostgreSQL
3. Copiar DATABASE_URL del servicio PostgreSQL
4. New → GitHub Repo → Seleccionar repositorio → Carpeta "backend"
5. En Variables, agregar:
   - DATABASE_URL (del paso 3)
   - JWT_SECRET (generar con: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
   - CORS_ORIGIN = *
   - SOCKET_IO_CORS_ORIGIN = *
   - NODE_ENV = production
6. Conectar PostgreSQL al servicio Node.js (Settings → Connect)
7. Generar dominio (Settings → Generate Domain)
8. Copiar URL del backend
9. Ejecutar migraciones: railway run npm run migrate
10. Crear admin: railway run npm run create-admin
```

### 2️⃣ Cloudinary (5 min)

```
1. Crear cuenta en cloudinary.com
2. Copiar credenciales del Dashboard:
   - Cloud Name
   - API Key
   - API Secret
3. En Railway → Variables, agregar:
   - CLOUDINARY_CLOUD_NAME
   - CLOUDINARY_API_KEY
   - CLOUDINARY_API_SECRET
```

### 3️⃣ Frontend (2 min)

```
1. Abrir Sistema HTML/index.html
2. Configuración → Sistema → Servidor Centralizado
3. Pegar URL de Railway
4. Click en "Probar y Guardar Conexión"
5. Iniciar sesión:
   - Username: admin
   - PIN: 1234
```

---

## 📝 Variables de Entorno Necesarias

### Railway Backend:

```env
DATABASE_URL=postgresql://... (de PostgreSQL service)
JWT_SECRET=... (generar uno seguro)
CORS_ORIGIN=*
SOCKET_IO_CORS_ORIGIN=*
NODE_ENV=production
CLOUDINARY_CLOUD_NAME=... (opcional)
CLOUDINARY_API_KEY=... (opcional)
CLOUDINARY_API_SECRET=... (opcional)
```

---

## 🔑 Credenciales por Defecto

Después de ejecutar `npm run create-admin`:

```
Username: admin
PIN: 1234
```

⚠️ **Cambia el PIN después del primer inicio de sesión**

---

## ✅ Verificación

1. **Backend funcionando**: `https://tu-url.railway.app/health`
2. **Frontend conectado**: Ver "Estado: Conectado" en Configuración
3. **Login exitoso**: Puedes iniciar sesión con admin/1234

---

## 📚 Guías Detalladas

- **Guía completa**: `GUIA_CONFIGURACION_RAILWAY_CLOUDINARY.md`
- **Pasos detallados**: `CONFIGURACION_PASO_A_PASO.md`
- **Comandos rápidos**: `COMANDOS_RAPIDOS_RAILWAY.md`

---

## 🐛 Problemas Comunes

### No se puede conectar
- Verifica URL (sin `/api`)
- Verifica que Railway esté corriendo
- Verifica CORS_ORIGIN = *

### Error 401
- Ejecuta: `railway run npm run create-admin`
- Verifica JWT_SECRET configurado

### Error PostgreSQL
- Verifica DATABASE_URL
- Ejecuta: `railway run npm run migrate`

---

**¡Listo para probar!** 🚀
