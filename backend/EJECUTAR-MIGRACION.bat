@echo off
chcp 65001 >nul
echo ========================================
echo  Migracion de Base de Datos y Admin
echo ========================================
echo.

echo [1/3] Verificando autenticacion Railway...
railway whoami
if errorlevel 1 (
    echo.
    echo ERROR: No estas autenticado en Railway
    echo Ejecuta primero: railway login
    echo.
    pause
    exit /b 1
)
echo.

echo [2/3] Migrando base de datos...
railway run npm run migrate
if errorlevel 1 (
    echo.
    echo ERROR en la migracion. Revisa los logs arriba.
    pause
    exit /b 1
)
echo.

echo [3/3] Creando usuario admin maestro...
railway run npm run create-admin
if errorlevel 1 (
    echo.
    echo ERROR al crear admin. Revisa los logs arriba.
    pause
    exit /b 1
)
echo.

echo ========================================
echo  ✅ Migracion completada exitosamente
echo ========================================
echo.
echo Usuario admin creado:
echo - Username: admin
echo - PIN: 1234
echo.
pause
