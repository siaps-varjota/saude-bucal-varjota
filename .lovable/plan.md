

## Plano: Atualizar link e parser da Aba 5

O novo link usa formato **CSV** (não mais TSV) e tem uma estrutura ligeiramente diferente:
- 5 colunas (a 5ª coluna tem o mês abreviado como "jan.-2026")
- Pontuação usa vírgula como separador decimal e símbolo `%`
- Linhas vazias entre meses

### Alterações necessárias

**`src/hooks/useTab5Data.ts`:**
1. Atualizar a URL para o novo link CSV
2. Mudar o parser de TSV (split por `\t`) para CSV (split por `,`, respeitando aspas)
3. Ajustar a detecção de linhas de cabeçalho de mês (ex: `janeiro/2026,,,,`)
4. Ajustar parsing da porcentagem que vem entre aspas com vírgula decimal (ex: `"34,49%"`)
5. Remover dependência de campos separados por tab

O parser CSV precisa tratar campos entre aspas (a pontuação vem como `"34,49%"`), então usarei um split que respeita aspas ou um regex simples para extrair os campos corretamente.

