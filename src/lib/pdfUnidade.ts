/** Ajuda a identificar a(s) unidade(s)/equipe(s) selecionada(s) nos PDFs. */
export type UnidadesSel = string[] | string | null | undefined;

export function listaUnidades(sel: UnidadesSel): string[] {
  if (!sel) return [];
  const arr = Array.isArray(sel) ? sel : [sel];
  return arr.map(s => s.trim()).filter(s => s && s !== "all");
}

/** Texto para o PDF ("Unidade: X" / "Unidades: X, Y"). null quando nenhuma foi selecionada. */
export function rotuloUnidade(sel: UnidadesSel): string | null {
  const l = listaUnidades(sel);
  if (l.length === 0) return null;
  return `${l.length > 1 ? "Unidades" : "Unidade"}: ${l.join(", ")}`;
}

/** Sufixo seguro para nome de arquivo. Vazio quando nenhuma unidade foi selecionada. */
export function slugUnidade(sel: UnidadesSel): string {
  const l = listaUnidades(sel);
  if (l.length === 0) return "";
  const slug = l.join("-").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60).replace(/-$/, "");
  return slug ? `-${slug}` : "";
}
