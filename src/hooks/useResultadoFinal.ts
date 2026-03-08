export function useResultadoFinal(
  patients: Patient[],
  tratamento: TratamentoPatient[],
  tab3: Tab3Record[],
  tab4: Tab4Patient[],
  tab5: Tab5Record[],
  tab6: Tab6Record[],
  quad: Quadrimestre = "todos"
) {
  return useMemo(() => {
    // Dados filtrados pelo período (numerador)
    const fPatients   = filterPatientsByQuadrimestre(patients, quad);
    const fTratamento = filterTratamentoByQuadrimestre(tratamento, quad);
    const fTab3       = filterByQuadrimestre(tab3, quad);
    const fTab4       = filterTab4ByQuadrimestre(tab4, quad);
    const fTab5       = filterByQuadrimestre(tab5, quad);
    const fTab6       = filterByQuadrimestre(tab6, quad);

    const equipes = getAllEquipes(patients, tratamento, tab3, tab4, tab5, tab6);

    // Por equipe
    const porEquipe: EquipeResult[] = equipes.map((equipe) => {
      // B1: quem teve consulta no período / total cadastrado na equipe
      const eqPatientsTotal = patients.filter((p) => p.equipe === equipe);
      const eqPatientsFiltered = fPatients.filter((p) => p.equipe === equipe);
      const totalB1 = eqPatientsTotal.length; // denominador fixo
      const withB1 = eqPatientsFiltered.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
      const pctB1 = totalB1 > 0 ? (withB1 / totalB1) * 100 : 0;

      // B2: quem concluiu tratamento no período / total cadastrado na equipe (tratamento)
      const eqTratTotal = tratamento.filter((p) => p.equipe === equipe);
      const eqTratFiltered = fTratamento.filter((p) => p.equipe === equipe);
      const totalB2 = eqTratTotal.length; // denominador fixo
      const withTrat = eqTratFiltered.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
      const pctB2 = totalB2 > 0 ? (withTrat / totalB2) * 100 : 0;

      // B3, B4, B6: média mensal do período (já filtrado)
      const pctB3 = avgMonthlyPct(fTab3, equipe);
      const pctB4 = avgMonthlyPct(fTab5, equipe);
      const pctB6 = avgMonthlyPct(fTab6, equipe);

      // B5: quem fez escovação no período / total cadastrado na equipe (tab4)
      const eqTab4Total = tab4.filter((p) => p.equipe === equipe);
      const eqTab4Filtered = fTab4.filter((p) => p.equipe === equipe);
      const totalB5 = eqTab4Total.length; // denominador fixo
      const withB5 = eqTab4Filtered.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
      const pctB5 = totalB5 > 0 ? (withB5 / totalB5) * 100 : 0;

      const indicadores = [
        buildIndicador("B1", pctB1),
        buildIndicador("B2", pctB2),
        buildIndicador("B3", pctB3),
        buildIndicador("B4", pctB4),
        buildIndicador("B5", pctB5),
        buildIndicador("B6", pctB6),
      ];
      const notaFinal = indicadores.reduce((s, i) => s + i.notaFinal, 0);
      return { equipe, indicadores, notaFinal };
    });

    // Geral
    // B1: quem teve consulta no período / total geral cadastrado
    const totalPatients = patients.length; // denominador fixo
    const withConsulta = fPatients.filter((p) => !isConsultaPendente(p.primeiraConsulta)).length;
    const pctB1 = totalPatients > 0 ? (withConsulta / totalPatients) * 100 : 0;

    // B2: quem concluiu tratamento no período / total geral cadastrado (tratamento)
    const totalTrat = tratamento.length; // denominador fixo
    const withTrat = fTratamento.filter((p) => !isTratamentoPendente(p.tratamentoConcluido)).length;
    const pctB2 = totalTrat > 0 ? (withTrat / totalTrat) * 100 : 0;

    // B3, B4, B6: média mensal do período
    const pctB3 = avgMonthlyPct(fTab3);
    const pctB4 = avgMonthlyPct(fTab5);
    const pctB6 = avgMonthlyPct(fTab6);

    // B5: quem fez escovação no período / total geral cadastrado (tab4)
    const totalTab4 = tab4.length; // denominador fixo
    const withTab4 = fTab4.filter((p) => !isConsultaPendenteTab4(p.primeiraConsulta)).length;
    const pctB5 = totalTab4 > 0 ? (withTab4 / totalTab4) * 100 : 0;

    const geralIndicadores = [
      buildIndicador("B1", pctB1),
      buildIndicador("B2", pctB2),
      buildIndicador("B3", pctB3),
      buildIndicador("B4", pctB4),
      buildIndicador("B5", pctB5),
      buildIndicador("B6", pctB6),
    ];
    const geralNotaFinal = geralIndicadores.reduce((s, i) => s + i.notaFinal, 0);

    const geral: EquipeResult = {
      equipe: "Geral",
      indicadores: geralIndicadores,
      notaFinal: geralNotaFinal,
    };

    return { geral, porEquipe };
  }, [patients, tratamento, tab3, tab4, tab5, tab6, quad]);
}
