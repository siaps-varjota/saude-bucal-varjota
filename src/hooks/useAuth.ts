// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";

const TSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=1062454011&single=true&output=tsv";

// Proxy público para contornar CORS
const CORS_PROXY = "https://corsproxy.io/?url=";

const SESSION_KEY = "saude_bucal_auth";

export interface AuthUser {
  cpf: string;
  nome?: string;
}

interface SessionData {
  cpf: string;
  nome?: string;
  expiresAt: number;
}

const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "").trim();

const fetchAuthorizedCpfs = async (): Promise<Map<string, string>> => {
  let text = "";

  // Tenta buscar direto primeiro
  try {
    const res = await fetch(TSV_URL, { cache: "no-store" });
    if (res.ok) {
      text = await res.text();
      console.log("[Auth] Busca direta OK");
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (err) {
    console.warn("[Auth] Busca direta falhou, tentando proxy CORS...", err);
    // Fallback: tenta via proxy CORS
    try {
      const res = await fetch(CORS_PROXY + encodeURIComponent(TSV_URL), { cache: "no-store" });
      if (!res.ok) throw new Error(`Proxy retornou status ${res.status}`);
      text = await res.text();
      console.log("[Auth] Busca via proxy OK");
    } catch (err2) {
      console.error("[Auth] Proxy também falhou:", err2);
      throw new Error("Não foi possível carregar a lista de usuários. Verifique sua conexão.");
    }
  }

  console.log("[Auth] Primeiros 300 chars do TSV:", text.slice(0, 300));

  const lines = text.trim().split("\n");
  if (lines.length < 2) {
    console.error("[Auth] TSV veio vazio ou com apenas cabeçalho. Linhas:", lines);
    throw new Error("Lista de usuários está vazia.");
  }

  const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase().replace(/\r/g, ""));
  console.log("[Auth] Cabeçalhos encontrados:", headers);

  // Tenta encontrar coluna CPF por nome exato ou parcial
  let cpfIdx = headers.findIndex((h) => h === "cpf");
  if (cpfIdx === -1) cpfIdx = headers.findIndex((h) => h.includes("cpf"));

  // Se ainda não achou, usa coluna 0 como fallback
  if (cpfIdx === -1) {
    console.warn("[Auth] Coluna 'cpf' não encontrada. Cabeçalhos:", headers, "— usando coluna 0 como fallback");
    cpfIdx = 0;
  }

  const nomeIdx = headers.findIndex((h) => h.includes("nome") || h.includes("name"));

  console.log(`[Auth] Usando coluna CPF no índice ${cpfIdx}, Nome no índice ${nomeIdx}`);

  const map = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const cpfRaw = (cols[cpfIdx] ?? "").replace(/\r/g, "").trim();
    const cpf = normalizeCpf(cpfRaw);
    const nome = nomeIdx !== -1 ? (cols[nomeIdx] ?? "").replace(/\r/g, "").trim() : "";
    if (cpf.length === 11) {
      map.set(cpf, nome);
    } else if (cpfRaw) {
      console.warn(`[Auth] Linha ${i + 1}: CPF ignorado (não tem 11 dígitos): "${cpfRaw}" → "${cpf}"`);
    }
  }

  console.log(`[Auth] Total de CPFs válidos carregados: ${map.size}`);
  return map;
};

export const useAuth = () => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        const session: SessionData = JSON.parse(raw);
        if (session.expiresAt > Date.now()) {
          setUser({ cpf: session.cpf, nome: session.nome });
        } else {
          sessionStorage.removeItem(SESSION_KEY);
        }
      }
    } catch {
      sessionStorage.removeItem(SESSION_KEY);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (cpfRaw: string) => {
    setLoginError(null);
    setLoginLoading(true);

    const cpf = normalizeCpf(cpfRaw);
    console.log(`[Auth] Tentando login com CPF: "${cpf}" (${cpf.length} dígitos)`);

    if (cpf.length !== 11) {
      setLoginError("CPF inválido. Digite os 11 dígitos sem pontos ou traço.");
      setLoginLoading(false);
      return;
    }

    try {
      const authorized = await fetchAuthorizedCpfs();
      console.log("[Auth] CPFs carregados:", authorized.size);
      console.log("[Auth] CPF está na lista?", authorized.has(cpf));

      if (!authorized.has(cpf)) {
        const sample = Array.from(authorized.keys()).slice(0, 3);
        console.warn("[Auth] CPF não encontrado. Amostra:", sample);
        setLoginError("CPF não autorizado. Verifique com o administrador.");
        setLoginLoading(false);
        return;
      }

      const nome = authorized.get(cpf) ?? "";
      const session: SessionData = {
        cpf,
        nome,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser({ cpf, nome });
      console.log("[Auth] Login OK:", nome || cpf);
    } catch (err) {
      console.error("[Auth] Erro:", err);
      setLoginError(err instanceof Error ? err.message : "Erro ao verificar acesso. Tente novamente.");
    } finally {
      setLoginLoading(false);
    }
  }, []);

  const logout = useCallback(() => {
    sessionStorage.removeItem(SESSION_KEY);
    setUser(null);
  }, []);

  return { user, loading, login, logout, loginError, loginLoading };
};
