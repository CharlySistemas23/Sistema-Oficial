# ✅ Checklist de Despliegue - Sistema POS Opal & Co

Usa este checklist para asegurarte de que todo esté configurado correctamente antes del despliegue final.

---

## 📋 Pre-Despliegue

### Backend
- [ ] Código subido a Git
- [ ] Repositorio conectado a Railway
- [ ] Variables de entorno documentadas en `.env.example`
- [ ] Scripts de migración probados localmente
- [ ] Health check endpoint funcionando (`/health`)
- [ ] Tests básicos pasando

### Base de Datos
- [ ] PostgreSQL creado en Railway
- [ ] `DATABASE_URL` obtenida y guardada
- [ ] Migraciones ejecutadas exitosamente
- [ ] Tablas principales verificadas
- [ ] Índices creados correctamente
- [ ] Usuario maestro creado

### Cloudinary (Opcional)
- [ ] Cuenta de Cloudinary creada
- [ ] Credenciales obtenidas:
  - [ ] Cloud Name
  - [ ] API Key
  - [ ] API Secret
- [ ] Variables de entorno configuradas en Railway
- [ ] Conexión probada con script de prueba

### Frontend
- [ ] Archivos HTML actualizados
- [ ] Scripts nuevos incluidos (`sync_manager.js`, `settings_api.js`)
- [ ] `api.js` actualizado con métodos de upload
- [ ] Módulos actualizados para usar API
- [ ] Fallback a IndexedDB implementado

---

## 🚀 Despliegue en Railway

### Servicio PostgreSQL
- [ ] Servicio PostgreSQL creado
- [ ] `DATABASE_URL` disponible
- [ ] Backup configurado (recomendado)

### Servicio Node.js
- [ ] Servicio Node.js creado
- [ ] Repositorio Git conectado
- [ ] Builder configurado (Nixpacks)
- [ ] Puerto configurado (Railway lo asigna automáticamente)

### Variables de Entorno Configuradas
- [ ] `DATABASE_URL` (conectado automáticamente)
- [ ] `JWT_SECRET` (generado y guardado de forma segura)
- [ ] `PORT` (asignado automáticamente por Railway)
- [ ] `NODE_ENV=production`
- [ ] `CORS_ORIGIN=*` (o dominio específico)
- [ ] `SOCKET_IO_CORS_ORIGIN=*` (o dominio específico)
- [ ] `CLOUDINARY_CLOUD_NAME` (si aplica)
- [ ] `CLOUDINARY_API_KEY` (si aplica)
- [ ] `CLOUDINARY_API_SECRET` (si aplica)

### Conexión de Servicios
- [ ] PostgreSQL conectado al servicio Node.js
- [ ] `DATABASE_URL` configurada automáticamente

### Migraciones
- [ ] Migraciones ejecutadas:
  ```bash
  railway run npm run migrate
  ```
- [ ] Tablas verificadas en PostgreSQL
- [ ] Usuario maestro creado

### Verificación
- [ ] Despliegue completado sin errores
- [ ] Logs sin errores críticos
- [ ] Health check funcionando:
  ```bash
  curl https://tu-app.railway.app/health
  ```
- [ ] Script de prueba ejecutado:
  ```bash
  railway run node scripts/test-connection.js
  ```

---

## 💻 Configuración del Frontend

### Por Cada Tienda/Sucursal

- [ ] Archivos HTML copiados/desplegados
- [ ] URL del servidor configurada:
  - [ ] Configuración → Sistema → Servidor Centralizado
  - [ ] URL ingresada correctamente
  - [ ] Conexión probada exitosamente
  - [ ] Configuración guardada

### Verificación de Conexión
- [ ] Estado muestra "Conectado"
- [ ] WebSocket conectado (verificar en consola del navegador)
- [ ] Cola de sincronización en 0
- [ ] Puede crear/editar productos
- [ ] Puede crear ventas
- [ ] Las imágenes se suben correctamente (si Cloudinary está configurado)

---

## 👥 Usuarios y Sucursales

### Usuario Maestro
- [ ] Usuario maestro creado en PostgreSQL
- [ ] Credenciales guardadas de forma segura
- [ ] Puede iniciar sesión
- [ ] Puede ver todas las sucursales
- [ ] Puede ver todas las métricas

### Sucursales
- [ ] Sucursales creadas en PostgreSQL
- [ ] Códigos de sucursal únicos
- [ ] Nombres descriptivos
- [ ] Estado activo configurado

### Empleados
- [ ] Empleados creados para cada sucursal
- [ ] Usuarios asociados a empleados
- [ ] Permisos configurados correctamente
- [ ] Pueden iniciar sesión
- [ ] Solo ven su sucursal (excepto admin maestro)

---

## 📊 Migración de Datos (Si aplica)

### Preparación
- [ ] Datos exportados desde sistema anterior
- [ ] Archivos JSON guardados de forma segura
- [ ] Backup de datos actuales realizado

### Migración
- [ ] Script de migración ejecutado por sucursal
- [ ] Datos verificados después de migración
- [ ] Conteos comparados (antes vs después)
- [ ] Relaciones verificadas
- [ ] Sin duplicados

### Verificación Post-Migración
- [ ] Admin maestro ve todos los datos
- [ ] Cada tienda solo ve sus datos
- [ ] Puede crear/editar/eliminar en cada módulo
- [ ] WebSockets funcionan correctamente
- [ ] Sincronización funciona

---

## 🧪 Testing Final

### Funcionalidades Básicas
- [ ] Login funciona
- [ ] Crear producto funciona
- [ ] Editar producto funciona
- [ ] Eliminar producto funciona
- [ ] Crear venta funciona
- [ ] Stock se actualiza correctamente
- [ ] Crear cliente funciona
- [ ] Crear reparación funciona
- [ ] Subir imágenes funciona

### Modo Offline
- [ ] Desconectar internet
- [ ] Crear producto (debe guardar en IndexedDB)
- [ ] Crear venta (debe guardar en IndexedDB)
- [ ] Reconectar internet
- [ ] Verificar sincronización automática
- [ ] Verificar que no hay duplicados

### Multi-Sucursal
- [ ] Crear datos en Tienda A
- [ ] Verificar que Tienda B NO ve datos de Tienda A
- [ ] Verificar que Admin maestro SÍ ve datos de ambas
- [ ] Probar transferencia entre tiendas
- [ ] Verificar que solo afecta a tiendas involucradas

### Imágenes
- [ ] Subir imagen de producto funciona
- [ ] Imagen se guarda en Cloudinary (si configurado)
- [ ] URL se guarda en PostgreSQL
- [ ] Imagen se muestra correctamente
- [ ] Eliminar producto elimina imagen (si aplica)

### Rendimiento
- [ ] Carga rápida de productos (<2 segundos)
- [ ] Carga rápida de ventas (<2 segundos)
- [ ] Búsqueda funciona correctamente
- [ ] Filtros funcionan correctamente

---

## 📝 Documentación

- [ ] README.md actualizado
- [ ] GUIA_CONFIGURACION_INICIAL.md creada
- [ ] GUIA_SOLUCION_PROBLEMAS.md creada
- [ ] Variables de entorno documentadas
- [ ] Endpoints API documentados
- [ ] Guías de usuario creadas (si aplica)

---

## 🔒 Seguridad

- [ ] `JWT_SECRET` es seguro y único
- [ ] Contraseñas de usuarios maestros cambiadas
- [ ] CORS configurado correctamente
- [ ] Rate limiting activo
- [ ] Validación de entrada en todos los endpoints
- [ ] Logs de auditoría funcionando

---

## 📊 Monitoreo

- [ ] Logs configurados en Railway
- [ ] Health check endpoint funcionando
- [ ] Alertas configuradas (si aplica)
- [ ] Backup de base de datos configurado

---

## ✅ Post-Despliegue

### Primera Semana
- [ ] Monitorear logs diariamente
- [ ] Verificar que no hay errores
- [ ] Verificar que WebSockets funcionan
- [ ] Verificar que sincronización funciona
- [ ] Recopilar feedback de usuarios

### Mantenimiento
- [ ] Backup de base de datos programado
- [ ] Actualizaciones planificadas
- [ ] Monitoreo de rendimiento
- [ ] Revisión de seguridad periódica

---

## 🆘 Plan de Rollback

Si algo sale mal:

1. [ ] Documentar el problema
2. [ ] Revisar logs en Railway
3. [ ] Verificar variables de entorno
4. [ ] Probar script de conexión
5. [ ] Si es necesario, revertir a versión anterior:
   ```bash
   railway rollback
   ```

---

## 📞 Contacto de Emergencia

- [ ] Contacto técnico disponible
- [ ] Acceso a Railway disponible
- [ ] Acceso a PostgreSQL disponible
- [ ] Acceso a Cloudinary disponible (si aplica)

---

**Fecha de Despliegue**: _______________
**Responsable**: _______________
**Estado Final**: ☐ Exitoso  ☐ Con Problemas  ☐ Cancelado

---

**Última actualización**: 2024-01-15
