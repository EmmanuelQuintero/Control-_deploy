import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface LoginFormProps {
  onRegisterClick?: () => void;
}

export function LoginForm({ onRegisterClick }: LoginFormProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login, /* isAdmin */ user } = useAuth();
  const [, navigate] = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const success = await login(email, password);
      
      if (success) {
        toast({
          title: "Login exitoso",
          description: "Bienvenid@ a Control+",
        });
        // Esperar un tick para que AuthContext tenga user actualizado
        setTimeout(() => {
          const role = (user as any)?.role; // user se actualizará tras setUser en login
          if (role === 'Admin') {
            navigate('/admin', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        }, 0);
      } else {
        toast({
          title: "Error de login",
          description: "Email o contraseña incorrectos",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error de conexión. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500" data-testid="card-login">
  <CardHeader className="space-y-1 animate-in slide-in-from-top-4 fade-in-0 duration-700 [animation-delay:150ms]">
        <CardTitle className="text-2xl font-bold">Control +</CardTitle>
        <CardDescription>Ingresa tus credenciales para acceder a tu cuenta</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2 animate-in slide-in-from-left-4 fade-in-0 duration-700 [animation-delay:300ms]">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2 animate-in slide-in-from-left-4 fade-in-0 duration-700 [animation-delay:450ms]">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              data-testid="input-password"
            />
          </div>
          <div className="flex items-center justify-between animate-in slide-in-from-left-4 fade-in-0 duration-700 [animation-delay:600ms]">
            <div className="flex items-center space-x-2">
              <Checkbox id="remember" className="border-blue-600 data-[state=checked]:bg-blue-600 data-[state=checked]:border-blue-600" />
              <label
                htmlFor="remember"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                Recuerdame
              </label>
            </div>
            <Button variant="ghost" className="px-0 font-normal h-auto" type="button">
              ¿Olvidaste tu contraseña?
            </Button>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white animate-in slide-in-from-bottom-4 fade-in-0 duration-700 [animation-delay:750ms]" data-testid="button-login" disabled={isLoading}>
            {isLoading ? "Iniciando sesión..." : "Iniciar sesión"}
          </Button>
          <div className="text-center text-sm animate-in fade-in-0 duration-700 [animation-delay:900ms]">
            ¿No tienes cuenta?{" "}
            <Button
              variant="ghost"
              className="px-0 font-normal h-auto"
              onClick={onRegisterClick}
              type="button"
              data-testid="button-register-link"
            >
              Registrate
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
