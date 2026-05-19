# Glossário Técnico — Domínio de Teste de Relés de Proteção

Este documento explica os termos do domínio para um desenvolvedor que não tem
familiaridade com testes de relés de proteção. Implementar este UI fica muito
mais simples entendendo o que cada coisa **significa** no mundo físico.

## Relé de Proteção
Dispositivo eletrônico (microprocessado) instalado em painéis de subestação
que monitora correntes e tensões do sistema elétrico e atua para isolar
falhas. Exemplos: SEL-487, Siemens SIPROTEC, ABB REF615. Tem entradas
analógicas (correntes e tensões secundárias) e entradas/saídas binárias
(contatos digitais).

## TC — Transformador de Corrente
Reduz a corrente primária do sistema (kA) para corrente secundária (1A ou 5A)
que o relé consegue medir. **Crítico:** o secundário de um TC NUNCA pode ficar
aberto — gera sobretensão destrutiva. Sempre tem que estar fechado em alguma
carga (relé ou curto).

## TP / TPC — Transformador de Potencial
Reduz a tensão primária (kV) para tensão secundária (115V típico) que o relé
mede. Diferente do TC, pode ser aberto sem perigo.

## Régua de Bornes
Bloco com vários terminais parafusados (tipicamente 16, 24 ou 32) onde os
cabos do campo (TC, TP, contatos auxiliares de disjuntor) chegam ao painel.
É o ponto de entrada de tudo no painel da subestação. Cada terminal é numerado
(TB1, TB2, ...).

## Chave de Aferição (modelo FT-1 / FT-14 / Westinghouse)
Chave faca instalada em série entre a régua de bornes e o relé. Permite
**isolar o relé** do circuito de campo durante manutenção/teste, sem
desconectar fios. Características críticas:

- **Lado esquerdo:** conecta ao TC/TP de campo (via régua de bornes)
- **Lado direito:** conecta ao relé de proteção
- **Faca/lâmina:** quando fechada, conduz; quando aberta, desconecta
- **Para chaves de corrente (TC):** ao abrir, **curto-circuita
  automaticamente** o lado esquerdo (para proteger o secundário do TC)
- **Para chaves de tensão (TP):** ao abrir, simplesmente desconecta — não
  precisa de curto
- **Test plug:** porta dianteira (front panel) onde se pluga a maleta de
  teste durante comissionamento. **Internamente conecta ao lado direito
  (relé) da chave**, permitindo injetar sinais simulados no relé enquanto
  o lado esquerdo está curto-circuitado.

Visualmente, na v4 representamos as alavancas como ícones verticais com:
- Tag amarela no topo
- Knife area com lâmina rotacionável
- Terminais (campo + relé)
- Plug ◇ MALETA na base

## Maleta de Teste / Test Set
Equipamento portátil que gera sinais elétricos calibrados (correntes e
tensões trifásicas em fase, amplitude e frequência configuráveis) para
testar relés. Marcas comuns: Omicron CMC, ISA DRTS, Megger SMRT, Doble F6.

A maleta tem:
- **Saídas analógicas** — banana plugs para correntes (3 fases × ±) e
  tensões (3 fases + neutro)
- **Saídas binárias (BO)** — contatos que a maleta fecha para acionar
  entradas do relé (simular contatos de proteção, comandos)
- **Entradas binárias (BI)** — leem contatos do relé (capturar trip, sinal
  de alarme)

Durante teste, a maleta substitui o sistema elétrico real:
- Conecta sinais analógicos no **TEST PLUG da chave de aferição** (que
  internamente alimenta o relé)
- Conecta sinais binários direto na **régua de bornes** (porque binários
  não passam pela chave de aferição)

## Fases A, B, C
As três fases do sistema elétrico trifásico. Convenção brasileira de cores:
- **Fase A:** amarelo (`#eab308`)
- **Fase B:** vermelho (`#ef4444`)
- **Fase C:** branco/cinza (`#cbd5e1`)

Esses devem ser preservados — são padrão IEC e ABNT, técnicos reconhecem
imediatamente.

## Sinais Binários (BO / BI)
- **BO** (Binary Output): saída da maleta = entrada do relé. Ex: simular
  "disjuntor abriu" fechando um contato.
- **BI** (Binary Input): entrada da maleta = saída do relé. Ex: capturar
  o sinal de trip que o relé gera.

Cor convencional: ciano (`#06b6d4`), tracejado.

## Curto-Circuito do TC (CURTO TC)
Quando a chave de aferição de corrente abre, internamente conecta os dois
terminais do **lado campo** com um curto. Isso impede que o secundário do
TC, que continua sendo magnetizado pela corrente primária, gere
sobretensão (poderia chegar a kV em situações de falta).

Na v4, representamos como uma **barra tracejada vertical** à esquerda da
knife area, visível apenas quando a chave aberta + tipo corrente.

## Test Plug / Plug de Teste
A porta dianteira da chave de aferição onde a maleta pluga durante teste.
Internamente, ao plugar (e a chave estar aberta), a maleta:
1. Substitui o sinal do campo (que está curto-circuitado e isolado)
2. Injeta sinal calibrado diretamente no lado relé da chave

Na v4, representamos como retângulo na base da alavanca com texto "◇ MALETA",
que vira laranja brilhante quando a chave abre.

## 52a / 52b
Contatos auxiliares do **disjuntor** (numerado 52 nas normas ANSI):
- **52a:** fecha quando o disjuntor está fechado (aberto = aberto)
- **52b:** abre quando o disjuntor está fechado (lógica invertida)

Usados pelo relé para saber a posição do disjuntor.

## TC (sinal binário) vs TC (transformador de corrente)
**Atenção à ambiguidade:** "TC" pode significar:
- Transformador de Corrente (equipamento)
- Trip Coil — bobina de abertura do disjuntor (sinal binário)

No contexto deste handoff:
- Borne 13 = **Trip Coil** (sinal binário para abrir disjuntor)
- TCa-S1, TCa-S2 = secundário do **Transformador de Corrente** fase A

## Operação vs Teste

- **Operação normal:** chave fechada, sistema funcionando, relé recebe
  sinais reais do TC/TP de campo.
- **Teste:** chave aberta, maleta plugada, relé recebe sinais simulados
  da maleta. Permite verificar ajustes, curvas de proteção, lógicas
  binárias, sem afetar o sistema real.
