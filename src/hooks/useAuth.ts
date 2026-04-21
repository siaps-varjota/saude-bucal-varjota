// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";

const TSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRmWTBTuo3l7yKebZuk-qJxQfpG_qvoKSHK6_DxSmaV0cT_iKHZQkZLAakrvYeDPh1oe20_vlOJJ7ex/pub?gid=1062454011&single=true&output=tsv";

const SESSION_KEY = "saude_bucal_auth";

export interface AuthUser {
  cpf: string;
  nome?: string;
}

interface SessionData {
  cpf: string;
  nome?: string;
  expiresAt: number; // timestamp ms
}

// Remove pontos e traço do CPF para normalizar
const normalizeCpf = (cpf: string) => cpf.replace(/\D/g, "").trim();

// Busca lista de CPFs autorizados no TSV
const fetchAuthorizedCpfs = async (): Promise<Map<string, string>> => {
  const res = await fetch(TSV_URL);
  if (!res.ok) throw new Error("Falha ao carregar lista de usuários");
  const text = await res.text();
  const lines = text.trim().split("\n");

  // Descobre índices das colunas pelo cabeçalho (case-insensitive)
  const headers = lines[0].split("\t").map((h) => h.trim().toLowerCase());
  const cpfIdx  = headers.findIndex((h) => h.includes("cpf"));
  const nomeIdx = headers.findIndex((h) => h.includes("nome"));

  if (cpfIdx === -1) throw new Error("Coluna CPF não encontrada no arquivo");

  const map = new Map<string, string>();
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    const cpf  = normalizeCpf(cols[cpfIdx] ?? "");
    const nome = nomeIdx !== -1 ? (cols[nomeIdx] ?? "").trim() : "";
    if (cpf.length === 11) map.set(cpf, nome);
  }
  return map;
};

export const useAuth = () => {
  const [user,      setUser]      = useState<AuthUser | null>(null);
  const [loading,   setLoading]   = useState(true);   // verificando sessão salva
  const [loginError, setLoginError] = useState<string | null>(null);
  const [loginLoading, setLoginLoading] = useState(false);

  // Restaura sessão salva no sessionStorage
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

    if (cpf.length !== 11) {
      setLoginError("CPF inválido. Digite os 11 dígitos sem pontos ou traço.");
      setLoginLoading(false);
      return;
    }

    try {
      const authorized = await fetchAuthorizedCpfs();

      if (!authorized.has(cpf)) {
        setLoginError("CPF não autorizado. Verifique com o administrador.");
        setLoginLoading(false);
        return;
      }

      const nome = authorized.get(cpf) ?? "";
      // Sessão válida por 8 horas
      const session: SessionData = {
        cpf,
        nome,
        expiresAt: Date.now() + 8 * 60 * 60 * 1000,
      };
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
      setUser({ cpf, nome });
    } catch (err) {
      setLoginError("Erro ao verificar acesso. Tente novamente.");
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
