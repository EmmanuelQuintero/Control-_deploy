import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

interface RegisterFormProps {
  onLoginClick?: () => void;
}

export function RegisterForm({ onLoginClick }: RegisterFormProps) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    age: "",
    sex: "",
    weight: "",
    height: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          nombre: formData.firstName,
          apellido: formData.lastName,
          email: formData.email,
          contraseña: formData.password,
          edad: formData.age ? parseInt(formData.age) : null,
          sexo: formData.sex || null,
          peso: formData.weight ? parseFloat(formData.weight) : null,
          altura: formData.height ? parseFloat(formData.height) : null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Registro exitoso",
          description: "Usuario creado correctamente. Ahora puedes iniciar sesión.",
        });
        // Cambiar automáticamente al formulario de login
        onLoginClick?.();
      } else {
        toast({
          title: "Error de registro",
          description: data.message || "Error al crear el usuario",
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
    <Card className="w-full max-w-md animate-in fade-in-0 zoom-in-95 duration-500" data-testid="card-register">
  <CardHeader className="space-y-1 animate-in slide-in-from-top-4 fade-in-0 duration-700 [animation-delay:150ms]">
        <CardTitle className="text-2xl font-bold">Crear Cuenta</CardTitle>
        <CardDescription>Ingresa tu información para comenzar</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left-4 fade-in-0 duration-700 [animation-delay:300ms]">
            <div className="space-y-2">
              <Label htmlFor="firstName">Nombre</Label>
              <Input
                id="firstName"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
                data-testid="input-firstname"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Apellido</Label>
              <Input
                id="lastName"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
                data-testid="input-lastname"
              />
            </div>
          </div>
          <div className="space-y-2 animate-in slide-in-from-right-4 fade-in-0 duration-700 [animation-delay:400ms]">
            <Label htmlFor="email">Correo</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              data-testid="input-email"
            />
          </div>
          <div className="space-y-2 animate-in slide-in-from-right-4 fade-in-0 duration-700 [animation-delay:500ms]">
            <Label htmlFor="password">Contraseña</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              required
              data-testid="input-password"
            />
          </div>
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-left-4 fade-in-0 duration-700 [animation-delay:600ms]">
            <div className="space-y-2">
              <Label htmlFor="age">Edad</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                required
                data-testid="input-age"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sex">Sexo</Label>
              <Select value={formData.sex} onValueChange={(value) => setFormData({ ...formData, sex: value })}>
                <SelectTrigger id="sex" data-testid="select-sex">
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Hombre">Hombre</SelectItem>
                  <SelectItem value="Mujer">Mujer</SelectItem>
                  <SelectItem value="Otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-right-4 fade-in-0 duration-700 [animation-delay:700ms]">
            <div className="space-y-2">
              <Label htmlFor="weight">Peso (kg)</Label>
              <Input
                id="weight"
                placeholder="70.5"
                type="number"
                value={formData.weight}
                onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                data-testid="input-weight"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">Altura (cm)</Label>
              <Input
                id="height"
                placeholder="170"
                type="number"
                value={formData.height}
                onChange={(e) => setFormData({ ...formData, height: e.target.value })}
                data-testid="input-height"
              />
            </div>
          </div>
          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white animate-in slide-in-from-bottom-4 fade-in-0 duration-700 [animation-delay:800ms]" data-testid="button-register" disabled={isLoading}>
            {isLoading ? "Creando cuenta..." : "Crear Cuenta"}
          </Button>
          <div className="text-center text-sm animate-in fade-in-0 duration-700 [animation-delay:950ms]">
            ¿Ya tienes una cuenta?{" "}
            <Button
              variant="ghost"
              className="px-0 font-normal h-auto"
              onClick={onLoginClick}
              type="button"
              data-testid="button-login-link"
            >
              Iniciar Sesión
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
