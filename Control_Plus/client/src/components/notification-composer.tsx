import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Bell, Mail, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface NotificationComposerProps {
  onSend?: (data: any) => void;
  users?: Array<{ id_usuario: number; nombre: string; email: string }>;
  selectedUserIds?: number[];
}

export function NotificationComposer({ onSend, users = [], selectedUserIds = [] }: NotificationComposerProps) {
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");
  const [recipient, setRecipient] = useState("");
  const [priority, setPriority] = useState("normal");
  const [sendEmail, setSendEmail] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSend = async () => {
    if (!message) return;

    // Si hay usuarios seleccionados específicamente, usarlos
    // Si no, usar el filtro de recipient
    let userIds: number[] = [];
    if (selectedUserIds && selectedUserIds.length > 0) {
      userIds = selectedUserIds;
    } else if (recipient === "all") {
      userIds = users.map(u => u.id_usuario);
    } else {
      // Por ahora solo implementamos "all", pero se puede extender
      userIds = users.map(u => u.id_usuario);
    }

    if (userIds.length === 0) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Debes seleccionar al menos un usuario",
      });
      return;
    }

    setLoading(true);
    try {
      if (sendEmail) {
        // Enviar por correo
        const response = await fetch('/api/admin/send-email-notification', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            userIds,
            message,
            subject: subject || '📩 Notificación de Control+'
          })
        });

        const data = await response.json();
        
        if (data.success) {
          toast({
            title: "✅ Notificaciones enviadas",
            description: `Se enviaron ${data.sentCount} correo(s) y notificaciones en la app`,
          });
          setMessage("");
          setSubject("");
          onSend?.({ message, recipient, priority, sendEmail });
        } else {
          throw new Error(data.message || 'Error al enviar');
        }
      } else {
        // Solo notificación en la app (lógica existente)
        console.log("Sending notification:", { message, recipient, priority });
        onSend?.({ message, recipient, priority });
        setMessage("");
        setSubject("");
        toast({
          title: "✅ Notificación enviada",
          description: "La notificación se ha enviado correctamente",
        });
      }
    } catch (error) {
      console.error('Error enviando notificación:', error);
      toast({
        variant: "destructive",
        title: "❌ Error",
        description: error instanceof Error ? error.message : "Error al enviar la notificación",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card data-testid="card-notification-composer">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <div>
            <CardTitle>Enviar Notificación</CardTitle>
            <CardDescription>Enviar mensajes motivacionales a los usuarios</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Solo mostrar selector de destinatarios si no hay usuarios pre-seleccionados */}
        {(!selectedUserIds || selectedUserIds.length === 0) && (
          <div className="space-y-2">
            <Label htmlFor="recipient">Destinatarios</Label>
            <Select value={recipient} onValueChange={setRecipient}>
              <SelectTrigger id="recipient" data-testid="select-recipient">
                <SelectValue placeholder="Seleccionar destinatarios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los Usuarios</SelectItem>
                <SelectItem value="inactive">Usuarios Inactivos</SelectItem>
                <SelectItem value="active">Usuarios Activos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Mostrar info de usuarios seleccionados */}
        {selectedUserIds && selectedUserIds.length > 0 && (
          <div className="p-3 bg-accent rounded-lg">
            <p className="text-sm font-medium">
              {selectedUserIds.length} usuario{selectedUserIds.length !== 1 ? 's' : ''} seleccionado{selectedUserIds.length !== 1 ? 's' : ''}
            </p>
            <p className="text-xs text-muted-foreground">
              La notificación se enviará a los usuarios que seleccionaste
            </p>
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="priority">Prioridad</Label>
          <Select value={priority} onValueChange={setPriority}>
            <SelectTrigger id="priority" data-testid="select-priority">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="low">Baja</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox 
            id="sendEmail" 
            checked={sendEmail} 
            onCheckedChange={(checked) => setSendEmail(checked as boolean)}
          />
          <Label htmlFor="sendEmail" className="flex items-center gap-2 cursor-pointer">
            <Mail className="h-4 w-4" />
            Enviar también por correo electrónico
          </Label>
        </div>

        {sendEmail && (
          <div className="space-y-2">
            <Label htmlFor="subject">Asunto del correo</Label>
            <Input
              id="subject"
              placeholder="Asunto del mensaje..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        )}
        
        <div className="space-y-2">
          <Label htmlFor="message">Mensaje</Label>
          <Textarea
            id="message"
            placeholder="Escribe tu mensaje aquí..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={4}
            data-testid="textarea-message"
          />
        </div>
        
        <Button
          onClick={handleSend}
          className="w-full"
          disabled={!message || loading || (selectedUserIds && selectedUserIds.length === 0 && !recipient)}
          data-testid="button-send-notification"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Enviando...
            </>
          ) : (
            <>
              {sendEmail ? <Mail className="mr-2 h-4 w-4" /> : <Bell className="mr-2 h-4 w-4" />}
              Enviar Notificación
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
