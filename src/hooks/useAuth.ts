// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";

const CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=1062454011&single=true&output=csv";

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

// Remove tudo que não é dígito
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "").trim();

// Parser CSV simples — lida com campos entre aspas e vírgulas internas
const parseCSVLine = (line: string): string[] => {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      // Aspas duplas dentro de campo com aspas → literal "
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
};

const fetchAuthorizedCpfs = async (): Promise<Map<string, string>> => {
  let text = "";

  // 1ª tentativa: direto
  try {
    const res = await fetch(CSV_URL, { cache: "no-store" });
    if (res.ok) {
      text = await res.text();
      console.log("[Auth] Busca direta OK");
    } else {
      throw new Error(`Status ${res.status}`);
    }
  } catch (err) {
    console.warn("[Auth] Busca direta falhou, tentando proxy...", err);
    // 2ª tentativa: via proxy CORS
    const res = await fetch(CORS_PROXY + encodeURIComponent(CSV_URL), { cache: "no-store" });
    if (!res.ok) throw new Error(`Proxy retornou status ${res.status}`);
    text = await res.text();
    console.log("[Auth] Busca via proxy OK");
  }

  console.log("[Auth] Primeiros 300 chars:", text.slice(0, 300));

  // Remove BOM UTF-8 se presente
  text = text.replace(/^\uFEFF/, "");

  const lines = text.trim().split("\n").filter(l => l.trim() !== "");

  if (lines.length < 2) {
    throw new Error("Lista de usuários está vazia.");
  }

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\r/g, ""));
  console.log("[Auth] Cabeçalhos:", headers);

  // Detecta índice da coluna CPF
  let cpfIdx = headers.findIndex(h => h === "cpf");
  if (cpfIdx === -1) cpfIdx = headers.findIndex(h => h.includes("cpf"));
  if (cpfIdx === -1) cpfIdx = 0; // fallback: primeira coluna

  // Detecta índice da coluna Nome
  const nomeIdx = headers.findIndex(h => h.includes("nome") || h.includes("name"));

  console.log(`[Auth] Coluna CPF: índice ${cpfIdx} | Coluna Nome: índice ${nomeIdx}`);

  const map = new Map<string, string>();

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]).map(c => c.replace(/\r/g, "").trim());
    const cpfRaw = cols[cpfIdx] ?? "";
    const cpf = normalizeCpf(cpfRaw);
    const nome = nomeIdx !== -1 ? (cols[nomeIdx] ?? "") : "";

    if (cpf.length === 11) {
      map.set(cpf, nome);
    } else if (cpfRaw) {
      console.warn(`[Auth] Linha ${i + 1} ignorada — CPF inválido: "${cpfRaw}" → "${cpf}"`);
    }
  }

  console.log(`[Auth] CPFs válidos carregados: ${map.size}`);
  return map;
};

export const useAuth = () => {
  const [user,         setUser]         = useState<AuthUser | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [loginError,   setLoginError]   = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Restaura sessão salva
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
    console.log(`[Auth] Login com CPF: "${cpf}" (${cpf.length} dígitos)`);

    if (cpf.length !== 11) {
      setLoginError("CPF inválido. Digite os 11 dígitos sem pontos ou traço.");
      setLoginLoading(false);
      return;
    }

    try {
      const authorized = await fetchAuthorizedCpfs();
      console.log("[Auth] Total carregados:", authorized.size);
      console.log("[Auth] CPF autorizado?", authorized.has(cpf));

      if (!authorized.has(cpf)) {
        console.warn("[Auth] Amostra da lista:", Array.from(authorized.keys()).slice(0, 5));
        setLoginError("CPF não autorizado. Verifique com o administrador.");
        setLoginLoading(false);
        return;
      }

      const nome = authorized.get(cpf) ?? "";
      const session: SessionData = {
        cpf,
        nome,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000, // 8 horas
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser({ cpf, nome });
      console.log("[Auth] Login OK:", nome || cpf);
    } catch (err) {
      console.error("[Auth] Erro:", err);
      setLoginError(
        err instanceof Error
          ? err.message
          : "Erro ao verificar acesso. Tente novamente."
      );
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
