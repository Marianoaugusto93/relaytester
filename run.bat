@echo off
setlocal enabledelayedexpansion

npm run dev

REM Aguardar 2 segundos antes de abrir o navegador
timeout /t 2 /nobreak

start http://localhost:5173


