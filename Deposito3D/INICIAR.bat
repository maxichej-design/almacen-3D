@echo off
REM Arranca Deposito3D: instala dependencias la primera vez y abre el navegador.
cd /d "%~dp0"
where npm >nul 2>nul || (echo Falta Node.js. Instalalo desde https://nodejs.org y volve a ejecutar este archivo. & pause & exit /b 1)
if not exist node_modules (
  echo Instalando dependencias, puede tardar unos minutos...
  call npm install || (pause & exit /b 1)
)
start "" http://localhost:5173
call npm run dev
pause
