import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Lock } from "lucide-react";

const STORED_KEY = "saude-bucal-auth";
const VALID_PASSWORD = "varjota2025";

interface LoginGateProps {
  children: React.ReactNode;
}

export const LoginGate = ({ children }: LoginGateProps) => {
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (sessionStorage.getItem(STORED_KEY) === "true") {
      setAuthenticated(true);
    }
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === VALID_PASSWORD) {
      sessionStorage.setItem(STORED_KEY, "true");
      setAuthenticated(true);
      setError("");
    } else {
      setError("Senha incorreta");
    }
  };

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-sky-100 p-4">
      <Card className="w-full max-w-sm shadow-xl border-0">
        <CardHeader className="text-center pb-2">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Lock className="h-7 w-7 text-blue-600" />
          </div>
          <CardTitle className="text-xl">Saúde Bucal - Varjota</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">Digite a senha para acessar</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setError(""); }}
              autoFocus
            />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full">Entrar</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
