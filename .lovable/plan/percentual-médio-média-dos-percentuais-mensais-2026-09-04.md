# Percentual médio = média dos percentuais mensais

Hoje o percentual do período (quadrimestre, bimestre ou mês) é calculado somando todos os numeradores e dividindo pela soma dos denominadores. A mudança: calcular o percentual de cada mês e depois tirar a média simples desses percentuais.

## Regra nova

- Para cada mês do período selecionado: percentual do mês = numerador do mês / denominador do mês.
- Percentual do período = soma dos percentuais mensais / quantidade de meses considerados.
- Só entram na média os meses que têm dado (denominador maior que zero). Meses futuros ou sem dado continuam fora.
- Com um único mês selecionado, o resultado é exatamente o percentual daquele mês (nada muda).
- Numeradores e denominadores totais continuam sendo exibidos como hoje, apenas o percentual passa a ser a média mensal.

## Onde aplicar

1. Cálculo dos indicadores B1 a B6 (arquivo de cálculo do Resultado Final): substituir o percentual agregado pela média dos percentuais mensais já disponíveis em cada indicador.
2. Cartões do quadrimestre/período de cada aba (Abas 1, 2, 3, 4, 5 e 6): o percentual do card passa a ser a média dos meses do período.
3. Resultado Final: conceito, nota, pontuação de desempate e cartões de meta passam a usar esse percentual médio, em vez de recalcular numerador/denominador.
4. PDF de resultado e PDF de pendências (incluindo o resumo de simulação): usar o mesmo percentual médio, para não divergir da tela.

## Detalhes técnicos

- `src/hooks/useResultadoFinal.ts`: em `calcB1`…`calcB6`, trocar `porcentagem: sum(num)/sum(den)` por média de `mesesDetalhe[].porcentagem` (considerando apenas meses com denominador > 0). Manter `numerador`/`denominador` somados para exibição e para as simulações de "faltam".
- Consumidores que hoje recalculam `pct = ind.numerador / ind.denominador` (`ResultadoFinalTab.tsx` nas linhas de conceito/metas, `PendenciasReportButton.tsx`) passam a ler `ind.porcentagem`.
- Cartões de período das abas (`QuadrimesterCards`, `TratamentoQuadrimesterCards`, `Tab3/Tab4/Tab5/Tab6QuadrimesterCards`, `Tab5MetaCard`, `TratamentoMetaCard`) passam a agregar por mês e tirar a média, reaproveitando a mesma lógica dos cards mensais.
- Cards mensais e tabelas mensais não mudam.
- Nas simulações ("+ adicionar"), o mês simulado é somado ao último mês do período e a média é recalculada com a nova regra.
