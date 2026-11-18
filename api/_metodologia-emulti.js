// Notas metodológicas M1 e M2 (eMulti), resumidas para a IA consultar.
// Fonte: Notas Técnicas nº 43/2026 (M1) e nº 44/2026 (M2) - CGIAD/DEAPS/SAPS/MS + regras do painel eMulti.
// Arquivo com "_" no início: a Vercel não o publica como rota; é só importado por sugerir-acoes.js.
// Para atualizar: edite o texto abaixo (não use crases nem ${ } dentro dele).
export const METODOLOGIA_EMULTI = `
METODOLOGIA DOS INDICADORES DA eMulti (M1 e M2) — use como referência técnica; os números vêm SEMPRE dos dados enviados.

Regras gerais
- Avaliação quadrimestral, monitoramento mensal; dados do SIAPS (extração no 20º dia útil) e SCNES (última competência válida). Granularidade: equipe (INE). Nenhum indicador é acumulativo. Cada indicador olha os últimos 4 meses (janela móvel).
- Só valem eMulti homologadas pelo Ministério da Saúde, tipo de equipe 72 (Ampliada, Complementar ou Estratégica), válidas no quadrimestre. Contam registros dos profissionais da eMulti feitos em QUALQUER estabelecimento da APS, mesmo que a pessoa não seja da equipe vinculada (eSF/eAP) da eMulti.
- Só contam registros com pessoa identificada (nome, data de nascimento e CPF ou CNS válido, conforme CadSUS) e profissional com CNS e CBO válidos. CBO elegíveis da eMulti: assistente social, arte educador, farmacêutico, fisioterapeuta, fonoaudiólogo, nutricionista, psicólogo, terapeuta ocupacional, sanitarista, profissional de educação física na saúde, veterinário, enfermeiro (inclui estomaterapeuta, obstétrico e puericultor/pediátrico, desde a competência dez/2025) e médicos especialistas (acupunturista, cardiologista, paliativista, dermatologista, endocrinologista, geriatra, ginecologista/obstetra, hansenologista, homeopata, infectologista, pediatra, psiquiatra). Profissional fora desse cadastro não conta como eMulti.
- Modelos de informação do e-SUS APS: MIAI (atendimento individual, presencial, domiciliar ou remoto), MIAC (atividade coletiva), MIAOI (odontológico individual, aparece no M2) e o módulo Compartilhamento do Cuidado do PEC.
- Principais limitações citadas: registro qualificado em campo específico, envio tardio da produção e lapso na identificação de óbitos no CadSUS.

M1 — Média de atendimentos por pessoa pela eMulti (maior = melhor)
- Numerador: atendimentos individuais + participações em atividades coletivas realizados pela eMulti. Denominador: pessoas distintas (CPF ou CNS válido) atendidas pela eMulti, com pelo menos um atendimento individual ou participação em atividade coletiva no período. Resultado é uma média (não percentual).
- Atividades coletivas contam pelos códigos 04 (educação em saúde), 05 (atendimento em grupo), 06 (avaliação/procedimento coletivo) e 07 (mobilização social), de forma específica ou compartilhada, com CNS do profissional e do cidadão participante identificados. Reunião de equipe não entra no M1.
- Conceitos: Regular até 1; Suficiente acima de 1 até 2; Bom acima de 2 até 3; Ótimo acima de 3. Para subir de classe o valor precisa SUPERAR o limite (exatamente 3 ainda é Bom).
- Como subir: aumentar o numerador (mais atendimentos e atividades coletivas por pessoa, retornos agendados, atividades em grupo com lista nominal) sem aumentar na mesma proporção o número de pessoas distintas; ou seja, priorizar a continuidade do cuidado de quem já é atendido (retorno) em vez de só atender pessoas novas.
- Atenção ao registro: atendimento ou participação sem CPF/CNS válido do usuário, ou registrado por profissional fora do cadastro eMulti, não conta. Participante sem identificação nominal na atividade coletiva não conta.

M2 — Ações interprofissionais (percentual; polaridade neutra na nota, mas a classificação de desempenho premia valores maiores)
- Numerador: ações COMPARTILHADAS da eMulti = atendimentos individuais compartilhados + atividades coletivas compartilhadas + solicitações respondidas de Compartilhamento do Cuidado no PEC. Denominador: TODAS as ações da eMulti = atendimentos individuais (específicos e compartilhados) + atividades coletivas (específicas e compartilhadas, incluindo reuniões) + compartilhamentos do cuidado no PEC. Resultado em percentual.
- Compartilhado = realizado simultaneamente por 2 ou mais profissionais com CNS diferentes (CBO iguais ou diferentes), com pelo menos 1 CNS de profissional eMulti, como principal ou secundário. Pode ser entre profissionais da mesma eMulti, ou com eSF, eSFR, eCR, eAP, UBSF, eSB ou outro profissional da APS com CNS/CPF identificado. Específico = registrado por um único profissional.
- Atendimento individual compartilhado: 2 ou mais profissionais de nível superior, ao menos 1 da eMulti. Atividade coletiva compartilhada (códigos 04 a 07): 2 ou mais profissionais de nível superior e/ou médio com CNS diferentes, ao menos 1 da eMulti.
- Reuniões (códigos 01 reunião de equipe, 02 com outras equipes de saúde, 03 intersetorial) só contam quando registradas com o tema "Discussão de caso / Projeto Terapêutico Singular", com 2 ou mais profissionais e ao menos 1 CNS eMulti. Reunião com outro tema entra no denominador, mas não no numerador.
- Duplicidades: se a mesma pessoa/grupo tem no mesmo dia uma ação registrada como específica e como compartilhada, a específica é desconsiderada. Profissional eMulti principal já contado em ação compartilhada não é contado de novo como específica.
- Compartilhamento do Cuidado no PEC: conta toda solicitação respondida pela eMulti, independentemente do tempo de resposta, no módulo Compartilhamento do Cuidado do PEC.
- Conceitos (%): Regular até 1; Suficiente acima de 1 até 2,5; Bom acima de 2,5 até 5; Ótimo acima de 5. Também é preciso SUPERAR o limite para mudar de classe.
- Como subir: planejar atendimentos e atividades coletivas em conjunto (2 ou mais profissionais), registrando TODOS os participantes (profissional principal e secundários) no PEC; fazer reuniões de discussão de caso/PTS com o tema correto; responder as solicitações de Compartilhamento do Cuidado no PEC; evitar registrar a mesma ação duas vezes (uma como específica e outra como compartilhada).

Limites do painel (aproximações; diga isto quando relevante)
- O painel calcula M1 e M2 a partir das planilhas e usa o valor oficial do SIAPS quando existe; o oficial prevalece. O valor calculado pode ficar abaixo do oficial.
- Não é possível rastrear no painel o Compartilhamento do Cuidado do PEC nem atendimentos individuais compartilhados: no painel todo atendimento individual conta como específico (zero compartilhados). Isso tende a deixar o M2 calculado abaixo do oficial; não conclua que a equipe não faz atendimento compartilhado.
- Se o nome da equipe vier no formato "Equipe — Nome do profissional", os dados são só daquele profissional: reuniões e o total consolidado de atividades coletivas da equipe ficam de fora e valores oficiais não se aplicam. Não conclua que o profissional "não fez reuniões" e trate o resultado como parcial.
- Se o período tiver poucos meses (quadrimestre em andamento), a conclusão é provisória.

Como usar nas respostas
- Relacione cada ação ao mecanismo do indicador (numerador, denominador, regra de registro). Prefira ações específicas ("registrar o profissional secundário e o tema Discussão de caso/PTS na reunião") a conselhos genéricos.
- M1 pesa 6 e M2 pesa 4 na nota final (0 a 10): o M1 rende mais pontos por classe subida.
- Não afirme causas que os dados não mostram; apresente como hipótese a conferir. As notas técnicas oficiais do Ministério da Saúde prevalecem em caso de divergência.
`;
