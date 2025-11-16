import { useState, useEffect } from "react";
import { NotificationComposer } from "@/components/notification-composer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Bell, Users, Mail } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

interface User {
  id_usuario: number;
  nombre: string;
  apellido: string;
  email: string;
  role: string;
}

export default function AdminNotifications() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/users');
      const data = await response.json();
      if (data.success) {
        // Filtrar solo usuarios normales (no admins)
        const regularUsers = data.users.filter((u: User) => u.role !== 'Admin');
        setUsers(regularUsers);
      } else {
        toast({
          variant: "destructive",
          title: "Error",
          description: "No se pudieron cargar los usuarios",
        });
      }
    } catch (error) {
      console.error('Error cargando usuarios:', error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Error al conectar con el servidor",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleUser = (userId: number) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  const toggleAll = () => {
    if (selectedUsers.length === users.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(users.map(u => u.id_usuario));
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold">Gestión de Notificaciones</h1>
        <p className="text-muted-foreground">Envía notificaciones y correos a los usuarios</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Lista de usuarios */}
        <Card className="md:col-span-1">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              <div>
                <CardTitle>Seleccionar Usuarios</CardTitle>
                <CardDescription>
                  {selectedUsers.length} de {users.length} seleccionados
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2 pb-2 border-b">
              <Checkbox
                id="select-all"
                checked={selectedUsers.length === users.length && users.length > 0}
                onCheckedChange={toggleAll}
              />
              <Label htmlFor="select-all" className="font-semibold cursor-pointer">
                Seleccionar todos
              </Label>
            </div>

            <ScrollArea className="h-[500px]">
              <div className="space-y-2">
                {loading ? (
                  <p className="text-sm text-muted-foreground text-center py-4">Cargando...</p>
                ) : users.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No hay usuarios</p>
                ) : (
                  users.map(user => (
                    <div
                      key={user.id_usuario}
                      className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-colors hover:bg-accent/50 ${
                        selectedUsers.includes(user.id_usuario) ? 'bg-accent border-primary' : ''
                      }`}
                      onClick={() => toggleUser(user.id_usuario)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(user.id_usuario)}
                        onCheckedChange={() => toggleUser(user.id_usuario)}
                        onClick={(e) => e.stopPropagation()}
                      />
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {user.nombre[0]}{user.apellido[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user.nombre} {user.apellido}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user.email}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Compositor de notificaciones */}
        <div className="md:col-span-2">
          <NotificationComposer
            users={users}
            selectedUserIds={selectedUsers}
            onSend={() => {
              // Limpiar selección después de enviar
              setSelectedUsers([]);
            }}
          />
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.length}</div>
            <p className="text-xs text-muted-foreground">Usuarios activos en el sistema</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Seleccionados</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{selectedUsers.length}</div>
            <p className="text-xs text-muted-foreground">Recibirán la notificación</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Correos Disponibles</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{users.filter(u => u.email).length}</div>
            <p className="text-xs text-muted-foreground">Usuarios con email válido</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
