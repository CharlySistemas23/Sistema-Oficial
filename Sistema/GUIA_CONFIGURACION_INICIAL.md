# 📘 Guía de Configuración Inicial - Sistema POS Opal & Co

## 🎯 Objetivo
Esta guía te ayudará a configurar el sistema completo desde cero, incluyendo backend en Railway, Cloudinary, PostgreSQL y frontend.

---

## 📋 Requisitos Previos

### Cuentas Necesarias:
- ✅ Cuenta de Railway (https://railway.app)
- ✅ Cuenta de Cloudinary (https://cloudinary.com) - Opcional pero recomendado
- ✅ Git instalado
- ✅ Node.js 18+ instalado (solo para desarrollo local)

---

## 🚀 Paso 1: Configurar PostgreSQL en Railway

### 1.1 Crear Servicio PostgreSQL
1. Inicia sesión en Railway
2. Crea un nuevo proyecto
3. Haz clic en "New" → "Database" → "PostgreSQL"
4. Railway creará automáticamente una base de datos PostgreSQL

### 1.2 Obtener DATABASE_URL
1. Haz clic en el servicio PostgreSQL
2. Ve a la pestaña "Variables"
3. Copia el valor de `DATABASE_URL` (se genera automáticamente)
4. **Guárdalo** - lo necesitarás más adelante

---

## 🔧 Paso 2: Configurar Backend en Railway

### 2.1 Preparar Repositorio
```bash
# Si aún no tienes el código en Git
cd backend
git init
git add .
git commit -m "Initial commit"
git remote add origin <tu-repositorio-git>
git push -u origin main
```

### 2.2 Crear Servicio Node.js en Railway
1. En Railway, haz clic en "New" → "GitHub Repo"
2. Selecciona tu repositorio
3. Railway detectará automáticamente que es un proyecto Node.js
4. Si no lo detecta, selecciona "Nixpacks" como builder

### 2.3 Configurar Variables de Entorno
En el servicio Node.js, ve a "Variables" y agrega:

```env
# Base de datos (conectar al servicio PostgreSQL)
DATABASE_URL=<valor-de-postgresql-service>

# JWT Secret (genera uno seguro)
JWT_SECRET=<genera-un-secreto-seguro-aqui>

# Puerto (Railway lo asigna automáticamente)
PORT=3000

# Entorno
NODE_ENV=production

# CORS (permite todas las conexiones)
CORS_ORIGIN=*
SOCKET_IO_CORS_ORIGIN=*

# Cloudinary (opcional pero recomendado)
CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
CLOUDINARY_API_KEY=<tu-api-key>
CLOUDINARY_API_SECRET=<tu-api-secret>
```

### 2.4 Conectar Servicios
1. En el servicio Node.js, ve a "Settings"
2. En "Service Connections", conecta el servicio PostgreSQL
3. Railway configurará automáticamente `DATABASE_URL`

### 2.5 Ejecutar Migraciones
1. En Railway, ve al servicio Node.js
2. Haz clic en "Deployments"
3. Espera a que el despliegue termine
4. Haz clic en el servicio y luego en "View Logs"
5. Ejecuta manualmente la migración:
   - Opción A: Usando Railway CLI
     ```bash
     railway run npm run migrate
     ```
   - Opción B: Desde la consola de Railway (si está disponible)

### 2.6 Verificar Despliegue
1. Haz clic en el servicio Node.js
2. Ve a "Settings" → "Generate Domain"
3. Copia la URL generada (ej: `https://tu-app.railway.app`)
4. Prueba el endpoint de salud:
   ```bash
   curl https://tu-app.railway.app/health
   ```
   Deberías ver: `{"status":"OK","timestamp":"...","uptime":...}`

---

## ☁️ Paso 3: Configurar Cloudinary (Opcional)

### 3.1 Crear Cuenta
1. Ve a https://cloudinary.com
2. Crea una cuenta gratuita
3. Confirma tu email

### 3.2 Obtener Credenciales
1. En el Dashboard de Cloudinary, verás:
   - **Cloud Name**: Nombre de tu cuenta
   - **API Key**: Tu clave API
   - **API Secret**: Tu secreto API

### 3.3 Configurar en Railway
1. Ve al servicio Node.js en Railway
2. Agrega las variables de entorno:
   ```
   CLOUDINARY_CLOUD_NAME=<tu-cloud-name>
   CLOUDINARY_API_KEY=<tu-api-key>
   CLOUDINARY_API_SECRET=<tu-api-secret>
   ```
3. Railway reiniciará automáticamente el servicio

### 3.4 Verificar Configuración
Puedes probar subiendo una imagen desde el frontend o usando el script de prueba:
```bash
railway run node scripts/test-connection.js
```

---

## 💻 Paso 4: Configurar Frontend

### 4.1 Distribuir Archivos HTML
1. Copia la carpeta `Sistema HTML/` a cada computadora/tienda
2. O despliega en un servidor web (Vercel, Netlify, etc.)

### 4.2 Configurar URL del Servidor
1. Abre `index.html` en un navegador
2. Inicia sesión en el sistema
3. Ve a **Configuración → Sistema**
4. En la sección "Servidor Centralizado":
   - Haz clic en "Configurar Servidor"
   - Ingresa la URL de Railway (ej: `https://tu-app.railway.app`)
   - Haz clic en "Probar Conexión"
   - Si todo está bien, haz clic en "Guardar"

### 4.3 Verificar Conexión
1. En Configuración → Sistema, deberías ver:
   - ✅ Servidor configurado
   - Estado de conexión: Conectado
   - Cola de sincronización: 0 pendientes

---

## 👤 Paso 5: Crear Usuario Maestro

### 5.1 Acceder a la Base de Datos
1. En Railway, ve al servicio PostgreSQL
2. Haz clic en "Query" o usa un cliente PostgreSQL
3. Conecta usando las credenciales de Railway

### 5.2 Crear Usuario Maestro
Ejecuta este SQL:

```sql
-- Crear empleado maestro
INSERT INTO employees (code, name, role, active)
VALUES ('MASTER001', 'Administrador Maestro', 'admin', true)
RETURNING id;

-- Crear usuario maestro (reemplaza <employee-id> con el ID anterior)
INSERT INTO users (username, password_hash, employee_id, role, active)
VALUES (
  'master_admin',
  '$2a$10$rK8...', -- Hash de 'admin123' (cambiar en producción)
  '<employee-id>',
  'master_admin',
  true
);
```

**⚠️ IMPORTANTE**: Cambia la contraseña en producción usando bcrypt.

### 5.3 Crear Sucursales
```sql
-- Crear sucursal ejemplo
INSERT INTO branches (code, name, address, phone, active)
VALUES ('SUC001', 'Sucursal Principal', 'Dirección', 'Teléfono', true)
RETURNING id;
```

---

## 📊 Paso 6: Migrar Datos Existentes (Si aplica)

### 6.1 Exportar Datos desde IndexedDB
Si tienes datos en el sistema anterior:

1. Abre el sistema en el navegador
2. Ve a Configuración → Sistema → Base de Datos
3. Haz clic en "Exportar DB"
4. Guarda el archivo JSON

### 6.2 Migrar a PostgreSQL
```bash
# Desde tu máquina local con acceso a Railway
railway run node scripts/migrate-from-indexeddb.js <archivo-json> <branch-id>
```

Ejemplo:
```bash
railway run node scripts/migrate-from-indexeddb.js export-vallarta.json <uuid-de-sucursal>
```

---

## ✅ Paso 7: Verificar Todo Funciona

### 7.1 Pruebas Básicas
1. **Health Check**:
   ```bash
   curl https://tu-app.railway.app/health
   ```

2. **Login**:
   - Abre el frontend
   - Inicia sesión con el usuario maestro
   - Verifica que puedas acceder

3. **Crear Producto**:
   - Ve a Inventario
   - Crea un producto nuevo
   - Sube una imagen
   - Verifica que se guarde correctamente

4. **Sincronización**:
   - Crea un producto en una tienda
   - Verifica que aparezca en otra tienda (si tienes múltiples)
   - Verifica que el admin maestro vea todos los datos

### 7.2 Script de Prueba
```bash
railway run node scripts/test-connection.js
```

Este script verificará:
- ✅ Conexión a PostgreSQL
- ✅ Conexión a Cloudinary
- ✅ Estructura de base de datos
- ✅ Variables de entorno

---

## 🔍 Solución de Problemas

### Problema: "No se puede conectar al servidor"
**Solución**:
1. Verifica que la URL del servidor sea correcta
2. Verifica que el servicio esté desplegado en Railway
3. Verifica que no haya errores en los logs de Railway
4. Verifica las variables de entorno

### Problema: "Error al subir imágenes"
**Solución**:
1. Verifica que Cloudinary esté configurado
2. Verifica las credenciales de Cloudinary
3. Verifica que el archivo no sea muy grande (máx 5MB)

### Problema: "No se sincronizan los datos"
**Solución**:
1. Verifica que el servidor esté configurado en el frontend
2. Verifica que haya conexión a internet
3. Revisa la cola de sincronización en Configuración → Sistema
4. Intenta sincronizar manualmente

### Problema: "Error de autenticación"
**Solución**:
1. Verifica que `JWT_SECRET` esté configurado
2. Cierra sesión y vuelve a iniciar sesión
3. Verifica que el usuario exista en la base de datos

---

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Railway
2. Revisa la consola del navegador (F12)
3. Ejecuta el script de prueba: `railway run node scripts/test-connection.js`
4. Consulta la documentación en `README.md`

---

## 🎉 ¡Listo!

Una vez completados todos los pasos, tu sistema debería estar funcionando completamente. 

**Próximos pasos**:
- Crear más usuarios y sucursales
- Migrar datos existentes
- Configurar backups automáticos
- Personalizar según tus necesidades

---

**Última actualización**: 2024-01-15
