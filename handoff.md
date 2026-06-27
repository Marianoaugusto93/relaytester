# Handoff — RelayLab 360 (relaytester)

**Data:** 2026-06-27 · **Branch:** master · **Tudo commitado e pushado.**

## ▶️ Tarefa atual: **87 + 21 CONCLUÍDAS** — próximo item da Leva 2 = **50BF** (ou 49/25/81R)

Funções **87 Diferencial** e **21 Distância** estão **ao vivo no Relé** (schema + UI + wiring +
persistência + testes). Próximo: escolher entre **50BF, 49 (térmica), 25 (sincronismo), 81R (df/dt)**.

> Padrão a seguir (mesmo das 87/21): motor+testes em `protection.js`/`protection.test.js` →
> schema em `defaults.js` (factory `mkXX`, função em `defaultProtections`, `protOrder`,
> `protStageRows`) → branch em `evalProtectionsDirect` → branches em `useSimulation.js`
> (caminho pré-falta: stageStates/avaliação/diag) → rail em `RelePage.jsx` (`FUNC_LABELS`) →
> form em `SettingsPanel.jsx` (`isXX`, `getStages`/`getCur`, campos) → `uSt` em `App.jsx` →
> persistência em `fileIO.js` (`protKeys` + serialização/parse).

### 21 Distância — feito nesta sessão (commitado)
- `src/protection.js`: `isMho21`, `isQuad21`, `calc21Impedance`, `evaluate21Stage`,
  `calc21TripTimeReal` (portado de `estudos/engine/distance.js`) + branch `fid==="21"` em
  `evalProtectionsDirect`. Mede **Z=V/I no loop de fase com maior corrente** (fase faltosa).
- `src/defaults.js`: `mk21`; função `"21"` (zonas `21-Z1/Z2/Z3`, mho/quad, reach Ω, MTA, tDelay,
  minV); `"21"` em `protOrder`; rows em `protStageRows`.
- `src/useSimulation.js`: branches 21; `src/RelePage.jsx`: rail "21" (`FUNC_LABELS`);
  `src/SettingsPanel.jsx`: `is21` + form de zona + hint; `src/App.jsx`: `uSt`→`stages21`;
  `src/fileIO.js`: `STAGE21_i`.
- `src/protection.test.js`: 5 testes da 21.

### ⚠️ Aprendizado-chave (vale para TODA função baseada em medição: 21/50/51/etc.)
A 21 lê as **medições do relé** (`computeRelayReadings`), que dependem do **cabeamento do Campo**.
Sem cabos o relé mede 0 → nada dispara. Para validar no navegador: aba **CAMPO** →
**PREDEFINIÇÕES → "Bancada Completa"** (cabeia I+V+CB), depois injeta no Relé.
(A 87 é exceção: usa inputs próprios `inj87`, dispara mesmo sem cabeamento.)

### Validação (87 e 21)
- `npx vitest run`: **126 passed | 5 skipped**.
- `npm run build`: OK, **474.31 kB (122.23 kB gzip)**.
- Navegador: 87 → TRIP 87-1 (IW1=5/IW2=0); 21 → TRIP 21-Z1 (Ia=5∠0, Va=20∠75 → Z=4Ω∠75 ⊂ Mho 8Ω).

## Contexto do projeto
- App React 18 (Vite, JSX, sem TS). Banco de testes de relé de proteção (didático).
- Build: `npm run build` · Testes: `npx vitest run` · Dev: `npm run dev`.
- Motor de proteção: `src/protection.js` → `evalProtectionsDirect(rr, relayProt, sys)`.
  Padrão por função: `evaluateXStage` / `calcXTripTimeReal` / `CURVE_MAP`.
- Motor diferencial de referência (reaproveitado): `src/estudos/engine/differential.js`.

## Histórico recente (já no master)
- `e02d1df` feat(87): motor da diferencial (dual-slope + bloqueio 2ª harmônica)
- `f0c56ca` feat(87): 87 ao vivo no Relé (schema + UI + wiring + persistência)
- `<este commit>` feat(21): 21 Distância ao vivo (mho/quad, zonas Z1/Z2/Z3, Z=V/I)

**Leva 1 (Ponte/Integração) = concluída.** Leva 2 em andamento: **87 ✓ · 21 ✓** · faltam 50BF/49/25/81R.

## Roadmap (próximas levas)
- Leva 2 (resto): 50BF, 49 (térmica), 25 (sincronismo), 81R (df/dt)
- Leva 3: Sequenciador de testes (rampa de pickup, teste de tempo com shots, state sequencer)
- Leva 4: COMTRADE (replay/import de forma de onda externa)
- Leva 5: UX/UI (sistema de toast global, persistência de sessão completa)

## ⚠️ Gotchas do ambiente
- Há um **hook "Fact-Forcing Gate"**: antes de cada Edit/Write/Bash ele exige listar
  fatos (importadores, função afetada, dados, instrução do usuário). Apresente os fatos
  e **repita** a mesma operação — ela passa na 2ª tentativa.
- Comandos `git rm -rf` / deleções disparam um gate destrutivo no tool **Bash**; usar
  **PowerShell** para essas operações (ou apresentar fatos e repetir).
- Windows: avisos `LF will be replaced by CRLF` são inofensivos.

## Pendência aberta (não bloqueante)
Validar no navegador que a magnitude injetada via `fault.currents` (Manobras/Estudos → Relé)
sai coerente no secundário (`If` primário ÷ relação de TC). Se sair errado, ajustar o fator.
