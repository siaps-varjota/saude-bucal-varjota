import { parse, isValid, getMonth, getYear } from "date-fns";

export type Quadrimestre =
  | "todos"
  | `Q1-${number}`
  | `Q2-${number}`
  | `Q3-${number}`;

export interface QuadrimestreOption {
  value: Quadrimestre;
  label: string;
}

/**
 * Retorna o quadrimestre correspondente ao mês informado.
 *
 * Q1: Janeiro a Abril
 * Q2: Maio a Agosto
 * Q3: Setembro a Dezembro
 */
export function getQuadrimestreAtual(data = new Date()): Quadrimestre {
  const mes = data.getMonth();
  const ano = data.getFullYear();

  if (mes <= 3) {
    return `Q1-${ano}`;
  }

  if (mes <= 7) {
    return `Q2-${ano}`;
  }

  return `Q3-${ano}`;
}

/**
 * Retorna o quadrimestre anterior.
 */
export function getQuadrimestreAnterior(
  quadrimestre: Quadrimestre,
): Quadrimestre {
  if (quadrimestre === "todos") {
    return "todos";
  }

  const resultado = quadrimestre.match(/^Q([1-3])-(\d{4})$/);

  if (!resultado) {
    return quadrimestre;
  }

  const quadrimestreNumero = Number(resultado[1]);
  const ano = Number(resultado[2]);

  if (quadrimestreNumero === 1) {
    return `Q3-${ano - 1}`;
  }

  return `Q${quadrimestreNumero - 1}-${ano}`;
}

/**
 * Regra solicitada:
 *
 * - Do dia 01 ao dia 15: mostrar o quadrimestre anterior
 * - A partir do dia 16: mostrar o quadrimestre atual
 */
export function getQuadrimestreInicial(
  data = new Date(),
): Quadrimestre {
  const dia = data.getDate();
  const quadrimestreAtual = getQuadrimestreAtual(data);

  if (dia <= 15) {
    return getQuadrimestreAnterior(quadrimestreAtual);
  }

  return quadrimestreAtual;
}

/**
 * Gera as opções disponíveis no filtro.
 *
 * Mantém os anos de 2025 até o ano seguinte ao atual.
 * O ano seguinte é incluído para evitar que o filtro fique sem opção
 * quando houver mudança de ano.
 */
function gerarOpcoesQuadrimestre(): QuadrimestreOption[] {
  const anoAtual = new Date().getFullYear();
  const primeiroAno = 2025;
  const ultimoAno = Math.max(anoAtual + 1, 2026);

  const opcoes: QuadrimestreOption[] = [];

  for (let ano = primeiroAno; ano <= ultimoAno; ano += 1) {
    opcoes.push(
      {
        value: `Q1-${ano}`,
        label: `1º Quadrimestre ${ano} (Jan–Abr)`,
      },
      {
        value: `Q2-${ano}`,
        label: `2º Quadrimestre ${ano} (Mai–Ago)`,
      },
      {
        value: `Q3-${ano}`,
        label: `3º Quadrimestre ${ano} (Set–Dez)`,
      },
    );
  }

  return opcoes;
}

export const QUADRIMESTRE_OPTIONS: QuadrimestreOption[] = [
  {
    value: "todos",
    label: "Todos os períodos",
  },
  ...gerarOpcoesQuadrimestre(),
];

export const QUADRIMESTRE_OPTIONS_SEM_TODOS =
  QUADRIMESTRE_OPTIONS.filter(
    (option) => option.value !== "todos",
  );

const QUAD_MONTHS: Record<string, number[]> = {
  Q1: [0, 1, 2, 3],
  Q2: [4, 5, 6, 7],
  Q3: [8, 9, 10, 11],
};

const MONTH_NAME_TO_NUM: Record<string, number> = {
  janeiro: 0,
  fevereiro: 1,
  março: 2,
  abril: 3,
  maio: 4,
  junho: 5,
  julho: 6,
  agosto: 7,
  setembro: 8,
  outubro: 9,
  novembro: 10,
  dezembro: 11,
};

const parseDate = (value: string): Date | null => {
  if (!value || value === "-" || value.trim() === "") {
    return null;
  }

  const formats = [
    "dd/MM/yyyy",
    "d/MM/yyyy",
    "dd/M/yyyy",
    "d/M/yyyy",
    "MM/yyyy",
    "yyyy-MM-dd",
  ];

  for (const format of formats) {
    try {
      const parsed = parse(format, value.trim(), new Date());

      if (isValid(parsed)) {
        return parsed;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const parseMesAno = (
  mesAno: string,
): { mes: number; ano: number } | null => {
  const partes = mesAno.split("/");

  const nomeMes = partes[0]?.toLowerCase().trim();
  const ano = Number.parseInt(partes[1], 10);
  const mes = MONTH_NAME_TO_NUM[nomeMes];

  if (mes === undefined || Number.isNaN(ano)) {
    return null;
  }

  return {
    mes,
    ano,
  };
};

/**
 * Verifica se um mês/ano pertence a algum quadrimestre selecionado.
 */
const matchesAnyQuad = (
  mes: number,
  ano: number,
  quadrimestres: Quadrimestre[],
): boolean => {
  if (quadrimestres.length === 0) {
    return true;
  }

  return quadrimestres.some((quadrimestre) => {
    if (quadrimestre === "todos") {
      return true;
    }

    const [quadrimestreNome, anoTexto] = quadrimestre.split("-");
    const anoQuadrimestre = Number.parseInt(anoTexto, 10);
    const meses = QUAD_MONTHS[quadrimestreNome] ?? [];

    return (
      ano === anoQuadrimestre &&
      meses.includes(mes)
    );
  });
};

/**
 * Aba 1 — filtra por primeiraConsulta.
 */
export function filterPatientsByQuadrimestre<
  T extends { primeiraConsulta: string },
>(
  patients: T[],
  quadrimestres: Quadrimestre[],
): T[] {
  if (quadrimestres.length === 0) {
    return patients;
  }

  return patients.filter((patient) => {
    const data = parseDate(patient.primeiraConsulta);

    if (!data) {
      return true;
    }

    return matchesAnyQuad(
      getMonth(data),
      getYear(data),
      quadrimestres,
    );
  });
}

/**
 * Filtra tratamentos pelo quadrimestre da primeira consulta.
 */
export function filterTratamentoByQuadrimestre<
  T extends {
    primeiraConsulta: string;
    tratamentoConcluido: string;
  },
>(
  patients: T[],
  quadrimestres: Quadrimestre[],
): T[] {
  if (quadrimestres.length === 0) {
    return patients;
  }

  return patients.filter((patient) => {
    const data = parseDate(patient.primeiraConsulta);

    if (!data) {
      return false;
    }

    return matchesAnyQuad(
      getMonth(data),
      getYear(data),
      quadrimestres,
    );
  });
}

/**
 * Filtra registros que possuem o campo mesAno.
 */
export function filterByQuadrimestre<
  T extends { mesAno: string },
>(
  records: T[],
  quadrimestres: Quadrimestre[],
): T[] {
  if (quadrimestres.length === 0) {
    return records;
  }

  return records.filter((record) => {
    const parsed = parseMesAno(record.mesAno);

    if (!parsed) {
      return true;
    }

    return matchesAnyQuad(
      parsed.mes,
      parsed.ano,
      quadrimestres,
    );
  });
}

/**
 * Filtro utilizado pela Aba 4.
 */
export function filterTab4ByQuadrimestre<
  T extends { primeiraConsulta: string },
>(
  patients: T[],
  quadrimestres: Quadrimestre[],
): T[] {
  return filterPatientsByQuadrimestre(
    patients,
    quadrimestres,
  );
}
