// src/components/LoginPage.tsx
import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2 } from "lucide-react";

// SVG de dente odontológico desenhado à mão
const ToothIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M22 6C16 6 10 11 10 18C10 22 11.5 25.5 12 28C13 33 13 38 14 44C14.8 49 16 58 20 58C23 58 24 53 25 48C26 43 27 40 32 40C37 40 38 43 39 48C40 53 41 58 44 58C48 58 49.2 49 50 44C51 38 51 33 52 28C52.5 25.5 54 22 54 18C54 11 48 6 42 6C39 6 37 7.5 35 9C33.5 10.2 32 11 32 11C32 11 30.5 10.2 29 9C27 7.5 25 6 22 6Z"
      fill="currentColor"
      fillOpacity="0.15"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinejoin="round"
    />
    <path
      d="M22 6C25 6 28 9 32 9C36 9 39 6 42 6"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

const formatCpfDisplay = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
};

export const LoginPage = () => {
  const { login, loginError, loginLoading } = useAuth();
  const [cpfDisplay, setCpfDisplay] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCpfDisplay(formatCpfDisplay(e.target.value));
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    login(cpfDisplay.replace(/\D/g, ""));
  };

  const digits = cpfDisplay.replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <ToothIcon className="h-7 w-7 text-primary" />
            <div>
              <h1 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                Indicadores de Saúde Bucal de Varjota
              </h1>
              <p className="text-sm text-muted-foreground">
                Painel de Monitoramento da Saúde Bucal
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm">
          <div className="rounded-xl border border-border/60 bg-card p-8 shadow-md">
            <div className="mb-6 text-center">
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <ToothIcon className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold text-foreground">Acesso ao Painel</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Digite seu CPF para continuar
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  type="text"
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={cpfDisplay}
                  onChange={handleChange}
                  disabled={loginLoading}
                  autoComplete="off"
                  className="text-center tracking-widest text-lg font-mono"
                  maxLength={14}
                />
                <p className="text-xs text-muted-foreground text-center">
                  Pode digitar com ou sem pontuação
                </p>
              </div>

              {loginError && (
                <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{loginError}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full"
                disabled={loginLoading || digits.length !== 11}
              >
                {loginLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Verificando...
                  </>
                ) : (
                  "Entrar"
                )}
              </Button>
            </form>
          </div>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            Problemas de acesso? Fale com o administrador do sistema.
          </p>
        </div>
      </main>

      <footer className="border-t border-border/50 bg-card py-4">
        <div className="container mx-auto px-4 text-center text-xs text-muted-foreground">
          Secretaria Municipal de Saúde de Varjota - 2026 • Desenvolvido por Alidemberg Araújo
        </div>
      </footer>
    </div>
  );
};
