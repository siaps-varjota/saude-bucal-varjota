// Notas metodológicas B1–B6 (Saúde Bucal / eSB), resumidas para a IA consultar.
// Fonte: Notas Metodológicas B1 a B6 do Ministério da Saúde (SAPS/CGSB) + regras do painel.
// Arquivo com "_" no início: a Vercel não o publica como rota; é só importado por sugerir-acoes.js.
// Para atualizar: edite o texto abaixo (não use crases nem ${ } dentro dele).
export const METODOLOGIA_ESB = `
METODOLOGIA DOS INDICADORES DE SAÚDE BUCAL (eSB) — use como referência técnica; os números vêm SEMPRE dos dados enviados.

Regras gerais
- Avaliação quadrimestral, monitoramento mensal; dados do SIAPS (extração no 20º dia útil de cada mês) e SCNES (última competência válida). Granularidade: equipe (INE). Nenhum indicador é acumulativo. Modelo de informação: atendimento odontológico individual (MIAOI) ou atividade coletiva, sempre com CNS do profissional identificado.
- Peso na nota final do painel: B1 = 2, B2 = 2, B3 = 2, B4 = 1, B5 = 2, B6 = 1 (soma 10). Cada conceito vale 0,25 (Regular), 0,5 (Suficiente), 0,75 (Bom) ou 1 (Ótimo) vezes o peso. Indicador de peso 2 rende o dobro de um de peso 1.
- O percentual do período no painel é a MÉDIA dos percentuais mensais (só meses com denominador maior que zero), não a soma dos numeradores sobre a soma dos denominadores.
- Só contam registros com pessoa identificada (nome, data de nascimento e CPF ou CNS válido, conforme CadSUS) e profissional com CNS e CBO válidos, vinculado à eSB no SCNES. CBO: cirurgião-dentista 2232-08, 2232-93 ou 2232-72; técnico em saúde bucal (TSB) 3224-05 ou 3224-25; auxiliar em saúde bucal (ASB) 3224-15 ou 3224-30 (cada indicador aceita só alguns, ver abaixo). Registro sem esses dados, ou feito por profissional fora do cadastro, não conta.
- Vinculação eSB x eSF/eAP: 1 eSB 40h com 1 eSF 40h ou 2 eAP 20h; 1 eSB 30h com 1 eAP 30h; 1 eSB 20h com 1 eAP 20h; 2 eSB 20h com 1 eSF 40h. Se o vínculo mudar no período vale a última vinculação válida. Produção de Unidade Odontológica Móvel (UOM) conta se a UOM for homologada e apta ao custeio e a carga horária do profissional for compartilhada, conforme o SCNES.
- Os registros devem ser feitos no e-SUS APS. Envio tardio da produção e preenchimento incorreto de campo específico são as principais causas de resultado artificialmente baixo.

B1 — 1ª Consulta Odontológica Programática (maior = melhor)
- Numerador: pessoas com 1ª consulta odontológica programática realizada pela eSB. Denominador: pessoas vinculadas à eSF/eAP de referência da eSB. Resultado em percentual.
- A pessoa conta uma vez por cirurgião-dentista em 12 meses. Exige o campo "Tipo de consulta" = "Primeira consulta odontológica programática" (SIGTAP 03.01.01.015-3). Consulta de urgência ou subsequente não conta. Só cirurgião-dentista (2232-08, 2232-93, 2232-72).
- Conceitos (%): Regular até 0,25; Suficiente acima de 0,25 até 0,75; Bom acima de 0,75 até 1,25; Ótimo acima de 1,25.
- Alavancas: agenda com vagas de 1ª consulta programada, busca ativa de vinculados que nunca fizeram, marcar corretamente o tipo de consulta no PEC, conferir o vínculo das pessoas à equipe, mutirões por área/escola.

B2 — Tratamento Concluído (maior = melhor)
- Numerador: pessoas com tratamento concluído (campo "Conduta" = "Tratamento concluído"). Denominador: pessoas com 1ª consulta odontológica programática realizada pela eSB. Percentual. Só cirurgião-dentista.
- Depende de B1: sem 1ª consulta programática registrada não há denominador. Tratamento iniciado e não concluído (faltoso, sem retorno) derruba o indicador. Também vale a regra de 12 meses por cirurgião-dentista.
- Conceitos (%): Regular até 25; Suficiente acima de 25 até 50; Bom acima de 50 até 75; Ótimo acima de 75.
- Alavancas: agendar já a sequência do plano preventivo-terapêutico, busca ativa de faltosos e de pacientes com tratamento em andamento, registrar a conduta "Tratamento concluído" na última sessão.

B3 — Taxa de Exodontia (MENOR é melhor, mas com faixa mínima)
- Numerador: exodontias de dente permanente realizadas pelo cirurgião-dentista (SIGTAP 04.14.02.013-8 e 04.14.02.014-6, exodontia múltipla com alveoloplastia por sextante). Denominador: procedimentos individuais preventivos, curativos e exodontias da eSB (cariostático, selante, flúor, evidenciação de placa, selamento provisório, orientação de higiene de próteses, capeamento pulpar, restaurações, TRA/ART, tratamento inicial de dente traumatizado, acesso à polpa, curativo de demora, pulpotomia, raspagem e alisamento, profilaxia, tratamento de GUNA, lesões da mucosa e pericoronarite, fotobiomodulação, e as próprias exodontias). Profissionais: cirurgião-dentista e TSB.
- Conceitos (%): Ótimo de 3 a menos de 10; Bom de 10 a menos de 12; Suficiente de 12 a menos de 14; Regular abaixo de 3 OU 14 ou mais. Taxa muito baixa (abaixo de 3) também é Regular: pode indicar sub-registro de exodontias ou ausência de resolução da demanda.
- Para melhorar, o caminho NÃO é recusar extrações: é aumentar o denominador com procedimentos preventivos e restauradores (restaurações, ART, selantes, flúor, raspagem) e registrar corretamente todas as exodontias.
- Contexto: exodontia reflete acúmulo de doença bucal ao longo da vida (cárie, doença periodontal) e determinantes sociais do território; avalie com cautela.

B4 — Escovação Supervisionada (maior = melhor)
- Numerador: crianças de 6 a 12 anos participantes de ação coletiva de escovação dental supervisionada (SIGTAP 01.01.02.003-1; Atividade Coletiva, código 4) realizada pela eSB. Denominador: crianças de 6 a 12 anos vinculadas à eSF/eAP de referência (regra da NT 30/2025). Percentual.
- Exige lista nominal de participantes com CNS/CPF e profissional com CNS; ação sem participantes identificados não conta. Profissionais aceitos: cirurgião-dentista, TSB e ASB. Usar creme dental fluoretado.
- Conceitos (%): Regular até 0,25; Suficiente acima de 0,25 até 0,5; Bom acima de 0,5 até 1; Ótimo acima de 1.
- Alavancas: calendário fixo de ações nas escolas (PSE), lista nominal com CNS/CPF dos escolares, cobrir todas as turmas de 6 a 12 anos, conferir se as crianças estão vinculadas à equipe.

B5 — Procedimentos Odontológicos Preventivos (maior = melhor, com teto)
- Numerador: procedimentos individuais preventivos: aplicação de cariostático (01.01.02.005-8), selante (01.01.02.006-6), flúor (01.01.02.007-4), evidenciação de placa (01.01.02.008-2), orientação de higiene bucal (01.01.02.010-4), orientação de higienização de próteses (01.01.02.012-0) e profilaxia (03.07.03.004-0). O selamento provisório de cavidade (01.01.02.009-0) NÃO é preventivo para este indicador.
- Denominador: total de procedimentos odontológicos individuais da eSB (os preventivos acima mais restauradores, endodônticos, periodontais, exodontias, adequação de comportamento etc.). O TSB só tem no denominador os procedimentos preventivos (cariostático, selante, flúor, evidenciação, orientação de higiene bucal e de próteses). Profissionais: cirurgião-dentista e TSB.
- Conceitos (%): Ótimo de 65 a 85; Bom de 55 a menos de 65; Suficiente de 40 a menos de 55; Regular abaixo de 40 OU acima de 85. Passar de 85% também é Regular (pode indicar falta de procedimentos curativos ou registro desequilibrado).
- Alavancas: incluir TSB nas ações preventivas, registrar todos os procedimentos preventivos realizados em cada consulta (orientação de higiene, flúor, evidenciação), aplicar selante e flúor em grupos de risco.
- Limitações citadas na nota: dificuldade de registro qualificado em campo específico e envio tardio da informação.

B6 — Tratamento Restaurador Atraumático – ART (maior = melhor)
- Numerador: procedimentos ART (SIGTAP 03.07.01.007-4). Denominador: total de procedimentos restauradores: ART, restauração de dente permanente anterior com resina (03.07.01.003-1), de dente permanente posterior com resina (03.07.01.012-0), de decíduo posterior com resina (03.07.01.008-2), de decíduo posterior com ionômero de vidro (03.07.01.010-4) e de decíduo anterior com resina (03.07.01.011-2). Percentual. Só cirurgião-dentista conta.
- Conceitos (%): Regular até 3; Suficiente acima de 3 até 6; Bom acima de 6 até 8; Ótimo acima de 8.
- Alavancas: realizar ART em cavidades elegíveis, sobretudo em crianças e em ações extramuros/escolas; garantir material (ionômero de vidro) e instrumentais; registrar o procedimento com o código correto de ART, e não como restauração convencional.
- Limitações citadas na nota: dificuldade de registro qualificado em campo específico e envio tardio da informação.

Como usar nas respostas
- Relacione cada ação ao mecanismo do indicador (numerador, denominador, regra de registro). Prefira ações específicas ("registrar o tipo de consulta como primeira consulta programática") a conselhos genéricos.
- Indicadores se influenciam: B1 alimenta o denominador de B2; B3, B5 e B6 dividem os mesmos procedimentos individuais, então aumentar restaurações e preventivos reduz B3.
- Para B3 e B5 a faixa "boa" é um intervalo, não "quanto maior/menor melhor": avalie se o valor está abaixo ou acima da faixa antes de sugerir a direção.
- Se o dado do período estiver incompleto (poucos meses ou denominador pequeno), diga que a conclusão é provisória e sugira conferir o envio da produção ao SISAB.
- Não afirme causas que os dados não mostram; apresente como hipótese a conferir. As notas oficiais do Ministério da Saúde prevalecem em caso de divergência.
`;
