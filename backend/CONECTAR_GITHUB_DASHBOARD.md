# 🔗 Conectar Railway con GitHub - Dashboard

## ⚠️ Esto DEBE hacerse desde Railway Dashboard (no desde CLI)

Railway CLI no tiene comando para conectar GitHub. Sigue estos pasos:

## 📋 Pasos (2 minutos):

1. **Abre Railway Dashboard:**
   - https://railway.app
   - Proyecto: **intelligent-luck**
   - Servicio: **Backend**

2. **Conecta GitHub:**
   - Ve a **Settings** → **Source**
   - Click en **"Connect GitHub Repo"**
   - Autoriza Railway si es necesario
   - Selecciona: **CharlySistemas23/Sistema-Oficial**
   - **Root Directory:** `backend`
   - **Branch:** `main`
   - Click **"Deploy"**

3. **Espera el despliegue** (5-10 minutos)

4. **Después ejecuta:**
   ```bash
   railway run npm run migrate
   railway run npm run create-admin
   ```
