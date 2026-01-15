@echo off
chcp 65001 >nul
echo ========================================
echo COMMIT Y PUSH A GITHUB
echo ========================================
echo.

cd /d "%~dp0"

echo Verificando si estamos en el directorio backend...
if not exist "server.js" (
    echo ERROR: No se encuentra server.js. Asegurate de estar en el directorio backend.
    pause
    exit /b 1
)

echo Directorio actual: %CD%
echo.

echo Inicializando git si no existe...
if not exist ".git" (
    echo Inicializando repositorio git...
    git init
    echo Agregando remote de GitHub...
    git remote add origin https://github.com/CharlySistemas23/Sistema-Oficial.git 2>nul
)

echo.
echo Verificando remote...
git remote -v
echo.

echo Agregando archivos modificados...
git add server.js routes/auth.js
echo.

echo Estado de git:
git status --short
echo.

echo Haciendo commit...
git commit -m "feat: Agregar creacion automatica de usuario admin al iniciar servidor y endpoint temporal /api/auth/ensure-admin"
echo.

if %errorlevel% equ 0 (
    echo.
    echo Commit exitoso! Haciendo push a GitHub...
    echo.
    git push -u origin main
    if %errorlevel% neq 0 (
        git push -u origin master
    )
    echo.
    echo ========================================
    echo COMPLETADO!
    echo ========================================
    echo.
    echo El codigo ha sido subido a GitHub.
    echo Railway desplegara automaticamente en unos minutos.
    echo.
) else (
    echo ERROR: No se pudo hacer commit. Verifica los cambios.
)

pause
