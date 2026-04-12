const consultasAba1Quad = useMemo(() => {
  const now = new Date();
  const quadKey = filtersTratamento.quadrimestre !== "todos"
    ? filtersTratamento.quadrimestre
    : (() => {
        const m = now.getMonth();
        const y = now.getFullYear();
        if (m <= 3) return `Q1-${y}`;
        if (m <= 7) return `Q2-${y}`;
        return `Q3-${y}`;
      })();
  const match = quadKey.match(/Q(\d)-(\d{4})/);
  if (!match) return 0;
  const q = parseInt(match[1]);
  const y = parseInt(match[2]);
  let startMonth = q === 1 ? 0 : q === 2 ? 4 : 8;
  const isCurrentQuad = quadKey === (() => {
    const m = now.getMonth(); const yr = now.getFullYear();
    if (m <= 3) return `Q1-${yr}`; if (m <= 7) return `Q2-${yr}`; return `Q3-${yr}`;
  })();
  const endMonth = isCurrentQuad ? now.getMonth() : startMonth + 3;
  const start = new Date(y, startMonth, 1);
  const end = new Date(y, endMonth + 1, 0);
  return (patients || []).filter(p => {
    if (filtersTratamento.equipe !== "all" && p.equipe !== filtersTratamento.equipe) return false;
    const d = p.primeiraConsulta;
    if (!d || d === "-") return false;
    const formats = ["dd/MM/yyyy", "d/MM/yyyy", "MM/yyyy", "yyyy-MM-dd"];
    for (const fmt of formats) {
      try {
        const { parse: parseFn, isValid: isValidFn } = require("date-fns");
        const parsed = parseFn(d.trim(), fmt, new Date());
        if (isValidFn(parsed)) return parsed >= start && parsed <= end;
      } catch { continue; }
    }
    return false;
  }).length;
}, [patients, filtersTratamento.quadrimestre, filtersTratamento.equipe]);
