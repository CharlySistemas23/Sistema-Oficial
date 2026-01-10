# 🔧 Guía de Solución de Problemas - Sistema POS Opal & Co

## 🚨 Problemas Comunes y Soluciones

---

## 🔴 Problemas de Conexión

### Error: "No se puede conectar al servidor"
**Síntomas**:
- El frontend muestra "Offline" o "Error de conexión"
- No se pueden guardar datos
- La sincronización no funciona

**Soluciones**:
1. **Verificar URL del servidor**:
   - Ve a Configuración → Sistema → Servidor Centralizado
   - Verifica que la URL sea correcta (ej: `https://tu-app.railway.app`)
   - No debe tener `/api` al final
   - Debe empezar con `https://` o `http://`

2. **Verificar que el servidor esté activo**:
   ```bash
   curl https://tu-app.railway.app/health
   ```
   Deberías ver: `{"status":"OK",...}`

3. **Verificar logs en Railway**:
   - Ve a Railway → Tu servicio → View Logs
   - Busca errores de inicio
   - Verifica que el puerto esté configurado

4. **Verificar CORS**:
   - En Railway, verifica que `CORS_ORIGIN=*` esté configurado
   - O configura el origen específico de tu frontend

---

### Error: "CORS policy blocked"
**Síntomas**:
- Error en consola del navegador sobre CORS
- Las peticiones fallan con error de CORS

**Soluciones**:
1. **Configurar CORS en Railway**:
   - Ve a Variables de Entorno
   - Agrega: `CORS_ORIGIN=*` (para desarrollo)
   - O: `CORS_ORIGIN=https://tu-dominio.com` (para producción)

2. **Verificar configuración en server.js**:
   - Asegúrate de que `cors` esté configurado correctamente
   - Verifica que `SOCKET_IO_CORS_ORIGIN` también esté configurado

---

## 🔴 Problemas de Autenticación

### Error: "Token inválido" o "No autorizado"
**Síntomas**:
- No puedes iniciar sesión
- Las peticiones devuelven 401
- Se cierra la sesión automáticamente

**Soluciones**:
1. **Verificar JWT_SECRET**:
   - En Railway, verifica que `JWT_SECRET` esté configurado
   - Debe ser un string largo y seguro
   - Si cambias `JWT_SECRET`, todos los usuarios deben volver a iniciar sesión

2. **Limpiar token local**:
   - Abre la consola del navegador (F12)
   - Ejecuta: `localStorage.removeItem('api_token')`
   - Recarga la página e inicia sesión de nuevo

3. **Verificar que el usuario exista**:
   - Conecta a PostgreSQL
   - Verifica que el usuario exista en la tabla `users`
   - Verifica que `active = true`

---

### Error: "Usuario o contraseña incorrectos"
**Soluciones**:
1. **Verificar credenciales**:
   - Asegúrate de usar el usuario y contraseña correctos
   - Verifica que no haya espacios extra

2. **Verificar hash de contraseña**:
   - Las contraseñas se almacenan con bcrypt
   - Si creaste el usuario manualmente, asegúrate de hashear la contraseña

3. **Crear nuevo usuario**:
   ```sql
   -- En PostgreSQL
   INSERT INTO users (username, password_hash, role, active)
   VALUES ('nuevo_usuario', '$2a$10$...', 'employee', true);
   ```

---

## 🔴 Problemas con Imágenes

### Error: "Error al subir imagen"
**Síntomas**:
- No se pueden subir imágenes
- Las imágenes no se muestran
- Error en consola sobre Cloudinary

**Soluciones**:
1. **Verificar configuración de Cloudinary**:
   - En Railway, verifica que estas variables estén configuradas:
     - `CLOUDINARY_CLOUD_NAME`
     - `CLOUDINARY_API_KEY`
     - `CLOUDINARY_API_SECRET`
   - Verifica que los valores sean correctos

2. **Verificar límites de Cloudinary**:
   - Plan gratuito: 25GB de almacenamiento
   - Tamaño máximo de archivo: 10MB (configurado a 5MB en el sistema)
   - Formatos soportados: JPEG, PNG, WebP, GIF

3. **Modo offline**:
   - Si Cloudinary no está configurado, las imágenes se guardan localmente
   - Se sincronizarán cuando Cloudinary esté disponible

4. **Probar conexión a Cloudinary**:
   ```bash
   railway run node scripts/test-connection.js
   ```

---

### Las imágenes no se muestran
**Soluciones**:
1. **Verificar URLs**:
   - Las URLs deben empezar con `https://res.cloudinary.com/`
   - Verifica que la URL esté guardada correctamente en la base de datos

2. **Verificar permisos de Cloudinary**:
   - En Cloudinary Dashboard, verifica que las imágenes sean públicas
   - O configura signed URLs si es necesario

3. **Limpiar caché**:
   - Limpia la caché del navegador
   - O usa modo incógnito para probar

---

## 🔴 Problemas de Sincronización

### Los datos no se sincronizan
**Síntomas**:
- Los cambios no aparecen en otras tiendas
- La cola de sincronización tiene elementos pendientes
- No hay actualizaciones en tiempo real

**Soluciones**:
1. **Verificar conexión**:
   - Verifica que el servidor esté configurado
   - Verifica que haya conexión a internet
   - Prueba el endpoint `/health`

2. **Verificar WebSockets**:
   - Abre la consola del navegador (F12)
   - Ve a la pestaña "Network" → "WS"
   - Deberías ver una conexión WebSocket activa
   - Si no hay conexión, verifica `SOCKET_IO_CORS_ORIGIN`

3. **Sincronizar manualmente**:
   - Ve a Configuración → Sistema → Servidor Centralizado
   - Haz clic en "Sincronizar Ahora"
   - Verifica la cola de sincronización

4. **Verificar logs**:
   - En Railway, revisa los logs del servidor
   - Busca errores relacionados con WebSockets o sincronización

---

### La cola de sincronización no se vacía
**Soluciones**:
1. **Verificar errores**:
   - Revisa la consola del navegador para errores
   - Revisa los logs de Railway

2. **Limpiar cola manualmente**:
   - Abre la consola del navegador (F12)
   - Ejecuta: `window.SyncManager.clearQueue()`
   - O espera a que se sincronicen automáticamente

3. **Verificar permisos**:
   - Asegúrate de tener permisos para crear/editar los elementos
   - Verifica que el `branch_id` sea correcto

---

## 🔴 Problemas de Base de Datos

### Error: "relation does not exist"
**Síntomas**:
- Error al acceder a datos
- Las tablas no existen

**Soluciones**:
1. **Ejecutar migraciones**:
   ```bash
   railway run npm run migrate
   ```

2. **Verificar conexión**:
   - Verifica que `DATABASE_URL` esté configurado correctamente
   - Verifica que el servicio PostgreSQL esté conectado

3. **Verificar tablas**:
   ```sql
   -- En PostgreSQL
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public';
   ```

---

### Error: "duplicate key value"
**Síntomas**:
- No se pueden crear elementos duplicados
- Error al guardar

**Soluciones**:
1. **Verificar campos únicos**:
   - SKU debe ser único
   - Código de barras debe ser único
   - Username debe ser único

2. **Usar valores diferentes**:
   - Cambia el SKU o código de barras
   - O elimina el elemento duplicado primero

---

## 🔴 Problemas de Rendimiento

### El sistema va lento
**Soluciones**:
1. **Verificar índices**:
   - Las tablas principales tienen índices
   - Si agregas nuevos campos, considera agregar índices

2. **Limitar resultados**:
   - Las consultas tienen límites (500 registros por defecto)
   - Usa paginación si es necesario

3. **Optimizar imágenes**:
   - Las imágenes se optimizan automáticamente en Cloudinary
   - No subas imágenes muy grandes (>5MB)

4. **Limpiar datos antiguos**:
   - Elimina datos que ya no necesites
   - O archiva datos antiguos

---

## 🔴 Problemas Específicos de Railway

### El servicio no inicia
**Soluciones**:
1. **Verificar logs**:
   - Ve a Railway → Tu servicio → View Logs
   - Busca errores de inicio

2. **Verificar variables de entorno**:
   - Todas las variables requeridas deben estar configuradas
   - Verifica que no haya errores de sintaxis

3. **Verificar package.json**:
   - Asegúrate de que `"start": "node server.js"` esté configurado
   - Verifica que todas las dependencias estén en `dependencies`

---

### El servicio se reinicia constantemente
**Soluciones**:
1. **Verificar errores**:
   - Revisa los logs para encontrar el error
   - Busca errores de conexión a la base de datos

2. **Verificar recursos**:
   - Railway tiene límites de recursos
   - Verifica que no estés excediendo los límites

3. **Verificar health checks**:
   - El endpoint `/health` debe responder correctamente
   - Railway usa esto para verificar que el servicio esté activo

---

## 📞 Obtener Ayuda

Si ninguna de estas soluciones funciona:

1. **Revisa los logs**:
   - Railway: View Logs
   - Navegador: Consola (F12)

2. **Ejecuta el script de prueba**:
   ```bash
   railway run node scripts/test-connection.js
   ```

3. **Verifica la documentación**:
   - `README.md`
   - `GUIA_CONFIGURACION_INICIAL.md`
   - `GUIA_DESPLIEGUE_RAILWAY.md`

4. **Información del sistema**:
   - Versión de Node.js
   - Versión de PostgreSQL
   - Variables de entorno (sin valores sensibles)
   - Mensajes de error completos

---

**Última actualización**: 2024-01-15
