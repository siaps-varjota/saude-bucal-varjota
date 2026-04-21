// src/components/LoginPage.tsx
import { useState, FormEvent } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Loader2, Stethoscope } from "lucide-react";

const formatCpfDisplay = (value: string) => {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3)  return digits;
  if (digits.length <= 6)  return `${digits.slice(0,3)}.${digits.slice(3)}`;
  if (digits.length <= 9)  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6)}`;
  return `${digits.slice(0,3)}.${digits.slice(3,6)}.${digits.slice(6,9)}-${digits.slice(9)}`;
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
            <Stethoscope className="h-7 w-7 text-primary" />
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
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Stethoscope className="h-6 w-6 text-primary" />
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
