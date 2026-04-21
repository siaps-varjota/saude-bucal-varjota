// Adicione estas importações no topo do seu Index.tsx existente:
import { useAuth } from "@/hooks/useAuth";
import { LoginPage } from "@/components/LoginPage";
import { LogOut } from "lucide-react";

// ─────────────────────────────────────────────────────────────────────────────
// No componente Index, logo no início da função, adicione:
// ─────────────────────────────────────────────────────────────────────────────

const Index = () => {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const { user, loading: authLoading, logout } = useAuth();

  // Enquanto verifica sessão salva, mostra tela em branco (evita flash)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Se não autenticado, exibe tela de login
  if (!user) return <LoginPage />;

  // ── restante do estado (activeTab, quadrimestre, etc.) ────────────────────
  // ... (todo o seu código existente continua daqui para baixo sem alteração)

  // ─────────────────────────────────────────────────────────────────────────
  // No <header>, substitua o bloco do Button "Atualizar dados" por este trecho
  // para adicionar o botão de logout e o nome do usuário:
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-card shadow-sm">
        <div className="container mx-auto px-[14px] py-[14px]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl ml-0 mt-0 mr-0">
                Indicadores de Saúde Bucal de Varjota
              </h1>
              <p className="mt-1 text-muted-foreground">Painel de Monitoramento da Saúde Bucal</p>
            </div>

            {/* Botões do header */}
            <div className="flex items-center gap-2">
              {/* Nome do usuário logado */}
              {user.nome && (
                <span className="hidden sm:inline text-sm text-muted-foreground">
                  Olá, <strong>{user.nome}</strong>
                </span>
              )}

              <Button variant="outline" onClick={refetchAll} disabled={isFetching} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
                Atualizar dados
              </Button>

              <Button variant="ghost" size="icon" onClick={logout} title="Sair">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* ... todo o restante do JSX existente sem alteração ... */}
    </div>
  );
};

export default Index;
