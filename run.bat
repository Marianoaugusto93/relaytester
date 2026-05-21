@echo off
setlocal enabledelayedexpansion

REM ──────────────────────────────────────────────────────────────
REM RelaytTester - Quick Start Script
REM Abre o navegador e inicia o dev server automaticamente
REM ──────────────────────────────────────────────────────────────

echo.
echo  ╔═══════════════════════════════════════════════════════╗
echo  ║                                                       ║
echo  ║           RelaytTester - Dev Server                  ║
echo  ║                                                       ║
echo  ╚═══════════════════════════════════════════════════════╝
echo.
echo  Iniciando servidor de desenvolvimento...
echo.

REM Aguardar 2 segundos antes de abrir o navegador
timeout /t 2 /nobreak

REM Abrir navegador em http://localhost:5173
echo  Abrindo navegador em http://localhost:5173...
start http://localhost:5173

REM Aguardar 1 segundo para garantir que o navegador iniciou
timeout /t 1 /nobreak

REM Iniciar dev server
echo.
echo  ──────────────────────────────────────────────────────────
echo  Dev server rodando em http://localhost:5173
echo  Pressione CTRL+C para parar
echo  ──────────────────────────────────────────────────────────
echo.

npm run dev

pause
