@echo off
chcp 65001 >nul
echo ========================================
echo  Actualizando GitHub con configuracion
echo ========================================
echo.

cd /d "%~dp0"
echo Directorio: %CD%
echo.

echo [1/4] Agregando archivos actualizados...
git add railway.json nixpacks.toml .gitignore
echo.

echo [2/4] Creando commit...
git commit -m "Fix: Configuracion Railway para Node.js"
if errorlevel 1 (
    echo Ya existe commit, continuando...
)
echo.

echo [3/4] Subiendo a GitHub...
git push origin main
if errorlevel 1 (
    echo ERROR al subir. Verifica credenciales.
    pause
    exit /b 1
)
echo.

echo [4/4] Verificando...
git status
echo.

echo ========================================
echo  ✅ Cambios subidos a GitHub
echo ========================================
echo.
echo Railway desplegará automáticamente en unos minutos.
echo Ve a Railway Dashboard → Backend → Deployments
echo para ver el progreso.
echo.
pause
