# Cloudflare Pages Setup Guide

## ✅ Pré-requisitos

- Conta no Cloudflare (https://dash.cloudflare.com)
- Repositório GitHub: Marianoaugusto93/relaytester
- Permissão para conectar GitHub no Cloudflare

## 🚀 Setup Passo a Passo

### 1. Acesse Cloudflare Pages

1. Vá para: https://dash.cloudflare.com
2. Clique em **Pages** (menu esquerdo)
3. Clique em **Create a project**
4. Selecione **Connect to Git**

### 2. Conecte seu GitHub

1. Clique em **Connect GitHub**
2. Autorize Cloudflare a acessar seu GitHub
3. Selecione a organização **Marianoaugusto93**
4. Selecione o repositório **relaytester**

### 3. Configure o Build

Na tela "Create a new project", preencha:

**Project name:** `relaytester` (ou similar)

**Production branch:** `master`

**Framework:** `Vite`

**Build command:** `npm run build`

**Build output directory:** `dist`

**Root directory (advanced):** `/` (deixe em branco/padrão)

### 4. Environment Variables (Opcional)

Se precisar adicionar variáveis de ambiente:
1. Clique em **Settings** → **Environment variables**
2. Clique **Add variable**
3. Configure conforme necessário

### 5. Deploy

1. Clique em **Save and Deploy**
2. Aguarde o build completar
3. Você receberá uma URL como: `https://relaytester.pages.dev`

## ✅ Verificar Deploy

Após configurado, cada push para `master` vai:
- ✅ Triggerar um novo build no Cloudflare
- ✅ Fazer deploy automático
- ✅ Atualizar seu site em produção

Acompanhe em: https://dash.cloudflare.com → Pages → relaytester → Deployments

## 🔄 Re-deploy Manual

Se precisar fazer re-deploy manual:
1. Vá para Deployments
2. Clique no deployment mais recente
3. Clique **Retry deployment**

## 🐛 Troubleshooting

### Build falha no Cloudflare mas passa localmente?

```bash
# Limpe o cache local e teste
rm -rf dist node_modules/.vite
npm run build
```

### URL mostra versão antiga?

1. Limpe cache do navegador (Ctrl+Shift+Delete)
2. Espere 5 minutos pelo cache do Cloudflare
3. Ou use `npm run deploy` localmente para forçar re-deploy

### Variáveis de ambiente não funcionam?

1. Verifique em Settings → Environment variables
2. Redeploy após adicionar
3. Limpe cookies do navegador

## 📝 Build Details

- **Framework:** Vite + React 18
- **Output:** Static HTML + JavaScript (dist/)
- **Size Target:** ~120 kB gzipped (atualmente: 118.34 kB ✅)
- **Build time:** ~2-3 segundos

## 🔐 Segurança

- Nenhuma credencial commitada no Git
- Wrangler usa arquivo `.wrangler/` (gitignored)
- Cloudflare Pages integração é OAuth (segura)

---

**Status:** ✅ Pronto para produção
**Last Updated:** 2026-06-10
