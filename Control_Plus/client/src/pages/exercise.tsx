function formatDate(iso: string) {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}
import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Footprints, Flame, Clock, Edit2, Check, X } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type Activity = {
  date: string;
  steps: number;
  duration: string;
};

export default function Exercise() {
  // Estado para mostrar detalles de rutina seleccionada
  const [selectedRoutine, setSelectedRoutine] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  const userId = user?.id_usuario ?? (user as any)?.id;
  const [steps, setSteps] = useState("");
  const [duration, setDuration] = useState("");
  const [activities, setActivities] = useState<Activity[]>([]);
  
  // Estado para la meta de pasos (se guarda en localStorage)
  const [stepsGoal, setStepsGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`steps-goal-${userId}`);
    return saved ? parseInt(saved) : 10000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(stepsGoal.toString());


  // Al cargar, obtener historial desde la base de datos
  useEffect(() => {
    const fetchActivities = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/activity/${userId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.actividades)) {
          // Adaptar formato para el frontend
          const mapped = data.actividades.map((a: any) => ({
            date: a.fecha?.slice(0, 10),
            steps: a.pasos,
            duration: a.duracion_minutos ? `${a.duracion_minutos} min` : "0 min",
          }));
          setActivities(mapped);
        }
      } catch (err) {
        console.error("Error obteniendo historial de actividad física", err);
      }
    };
    fetchActivities();
  }, [userId]);

  // Ya no se calcula calorías

  // Helper para obtener fecha actual en formato YYYY-MM-DD
  function getTodayISO() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayISO());

  // Guardar meta de pasos cuando cambie
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`steps-goal-${userId}`, stepsGoal.toString());
    }
  }, [stepsGoal, userId]);

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal);
    if (!isNaN(newGoal) && newGoal > 0) {
      setStepsGoal(newGoal);
      setIsEditingGoal(false);
      // Disparar evento para que el dashboard se actualice
      window.dispatchEvent(new Event('steps-goal-updated'));
      toast({
        title: "Meta actualizada",
        description: `Tu nueva meta es de ${newGoal.toLocaleString()} pasos diarios.`,
        duration: 3000,
      });
    } else {
      toast({
        title: "Error",
        description: "Por favor ingresa un número válido.",
        duration: 3000,
        variant: "destructive",
      });
    }
  };

  const handleCancelGoal = () => {
    setTempGoal(stepsGoal.toString());
    setIsEditingGoal(false);
  };

  const handleLogActivity = async () => {
  if (!steps || !duration || !selectedDate || !userId) return;
    const stepsNum = parseInt(steps);
    const durationNum = parseInt(duration);
    if (isNaN(stepsNum) || isNaN(durationNum)) return;
    setSteps("");
    setDuration("");

    // Enviar a backend
    try {
      await fetch("/api/activity", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_usuario: userId,
          fecha: selectedDate,
          pasos: stepsNum,
          duracion_minutos: durationNum,
        }),
      });
      // Disparar notificaciones inmediatas
      try { window.dispatchEvent(new Event('notifications:tick')); } catch {}
      try {
        const sinceIso = new Date(Date.now() - 2 * 60_000).toISOString();
        const resNotif = await fetch(`/api/notifications/${userId}?since=${encodeURIComponent(sinceIso)}`);
        const notifData = await resNotif.json();
        if (notifData?.success && Array.isArray(notifData.notifications) && notifData.notifications.length) {
          const ids: number[] = [];
          for (const n of notifData.notifications) {
            ids.push(n.id_notificacion);
            toast({ title: n.titulo, description: n.mensaje });
          }
          await fetch(`/api/notifications/${userId}/read`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ids }),
          });
        }
      } catch {}
      // Refrescar historial desde la base de datos
      const res = await fetch(`/api/activity/${userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.actividades)) {
        const mapped = data.actividades.map((a: any) => ({
          date: a.fecha?.slice(0, 10),
          steps: a.pasos,
          duration: a.duracion_minutos ? `${a.duracion_minutos} min` : "0 min",
        }));
        setActivities(mapped);
      }
      // Notificar al dashboard que hay datos nuevos
      try { window.dispatchEvent(new Event('health-data-updated')); } catch {}
      toast({
        title: "Actividad registrada",
        description: "¡Tu actividad fue guardada exitosamente!",
        duration: 3000,
        variant: "default",
      });
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo registrar la actividad.",
        duration: 3000,
        variant: "destructive",
      });
      console.error("Error enviando actividad física al backend", err);
    }
  };

  // Calcular el trendValue dinámicamente
  let trendValue = "";
  let trend: "up" | "down" | undefined = undefined;
  if (activities.length > 1) {
    const hoy = activities[0].steps;
    const ayer = activities[1].steps;
    if (ayer > 0) {
      const cambio = ((hoy - ayer) / ayer) * 100;
      trendValue = `${Math.abs(cambio).toFixed(1)}%`;
      trend = cambio >= 0 ? "up" : "down";
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Actividad Física</h1>
        <p className="text-muted-foreground">Monitorea tu actividad física diaria</p>
      </div>
      <Tabs defaultValue="steps" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="steps">Registrar pasos</TabsTrigger>
          <TabsTrigger value="routine">Rutina de ejercicio</TabsTrigger>
          <TabsTrigger value="hydration">Hidratación</TabsTrigger>
        </TabsList>
        <TabsContent value="steps">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Pasos diarios</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-2 rounded-lg bg-success/10">
                      <Footprints className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{activities[0]?.steps?.toLocaleString() || "0"}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {!isEditingGoal ? (
                          <>
                            <p className="text-sm text-muted-foreground">Meta: {stepsGoal.toLocaleString()}</p>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={() => {
                                setIsEditingGoal(true);
                                setTempGoal(stepsGoal.toString());
                              }}
                            >
                              <Edit2 className="h-3 w-3" />
                            </Button>
                          </>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Input
                              type="number"
                              value={tempGoal}
                              onChange={(e) => setTempGoal(e.target.value)}
                              className="h-7 w-24 text-xs"
                              placeholder="Meta"
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={handleSaveGoal}
                            >
                              <Check className="h-4 w-4 text-green-600" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 w-6 p-0"
                              onClick={handleCancelGoal}
                            >
                              <X className="h-4 w-4 text-red-600" />
                            </Button>
                          </div>
                        )}
                      </div>
                      {trend && trendValue && (
                        <Badge variant={trend === "up" ? "default" : "secondary"} className="mt-1">
                          {trend === "up" ? "↑" : "↓"} {trendValue}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            <StatCard
              title="Tiempo activo"
              value={activities[0]?.duration || "0 min"}
              icon={Clock}
              subtitle={selectedDate ? formatDate(selectedDate) : ""}
              color="primary"
            />
          </div>
          <div className="grid gap-6 md:grid-cols-2 mt-4">
            <Card data-testid="card-log-activity">
              <CardHeader>
                <CardTitle>Registro de Actividad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="steps">Pasos</Label>
                  <Input
                    id="steps"
                    type="number"
                    placeholder="Ingresa los pasos"
                    value={steps}
                    onChange={(e) => setSteps(e.target.value)}
                    data-testid="input-steps"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duración (minutos)</Label>
                  <Input
                    id="duration"
                    type="number"
                    placeholder="Ingresa la duración"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    data-testid="input-duration"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="date">Día</Label>
                  <Input
                    id="date"
                    type="date"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    data-testid="input-date"
                  />
                </div>
                <Button onClick={handleLogActivity} className="w-full" data-testid="button-log-activity">
                  Registrar actividad
                </Button>
              </CardContent>
            </Card>
            <Card data-testid="card-activity-history">
              <CardHeader>
                <CardTitle>Historial de Actividad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {activities.map((activity: Activity, idx: number) => (
                  <div key={idx} className="flex items-center justify-between p-3 rounded-lg border">
                    <div className="flex-1">
                      <p className="font-medium">{activity.date}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.steps.toLocaleString()} steps · {activity.duration}
                      </p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="routine">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Rutinas de ejercicio</CardTitle>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setSelectedRoutine("fullbody")}>Full Body</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedRoutine("leg")}>Pierna y Glúteo</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedRoutine("cardio")}>Cardio</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedRoutine("back")}>Espalda</Button>
                  <Button size="sm" variant="outline" onClick={() => setSelectedRoutine("abs")}>Abdomen</Button>
                </div>
              </CardHeader>
              <CardContent>
                {selectedRoutine === "fullbody" ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <h3 className="font-semibold text-lg mb-2">Full Body Express</h3>
                    <p className="text-sm text-muted-foreground mb-4">Ideal para todo el cuerpo, nivel principiante/intermedio. Duración: 45 min</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Sentadillas con peso corporal – 3x15</li>
                      <li>Flexiones de brazos – 3x12</li>
                      <li>Remo con banda elástica – 3x15</li>
                      <li>Plancha – 3x30 segundos</li>
                      <li>Zancadas alternas – 3x12 por pierna</li>
                    </ol>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setSelectedRoutine(null)}>
                      Cerrar rutina
                    </Button>
                  </div>
                ) : selectedRoutine === "leg" ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <h3 className="font-semibold text-lg mb-2">Pierna y Glúteo Power</h3>
                    <p className="text-sm text-muted-foreground mb-4">Enfocada en tren inferior, fuerza y tonificación. Duración: 30 min</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Sentadillas sumo – 4x12</li>
                      <li>Zancadas caminando – 3x15 por pierna</li>
                      <li>Puente de glúteo – 4x20</li>
                      <li>Peso muerto a una pierna – 3x10 por pierna</li>
                    </ol>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setSelectedRoutine(null)}>
                      Cerrar rutina
                    </Button>
                  </div>
                ) : selectedRoutine === "cardio" ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <h3 className="font-semibold text-lg mb-2">Cardio HIIT</h3>
                    <p className="text-sm text-muted-foreground mb-4">Alta intensidad, quema grasa, sin equipo. Duración: 20 min</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Jumping Jacks – 45 segundos</li>
                      <li>Burpees – 30 segundos</li>
                      <li>Mountain Climbers – 45 segundos</li>
                      <li>High Knees – 30 segundos</li>
                      <li>Skaters – 45 segundos</li>
                      <li>Descanso – 1 minuto</li>
                    </ol>
                    <p className="text-xs text-muted-foreground mt-3">Repetir circuito 3-4 veces</p>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setSelectedRoutine(null)}>
                      Cerrar rutina
                    </Button>
                  </div>
                ) : selectedRoutine === "back" ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <h3 className="font-semibold text-lg mb-2">Espalda Saludable</h3>
                    <p className="text-sm text-muted-foreground mb-4">Movilidad y fuerza para la espalda. Duración: 25 min</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Remo con mancuernas – 3x12</li>
                      <li>Superman – 3x15</li>
                      <li>Pull-ups o dominadas asistidas – 3x8</li>
                      <li>Estiramiento del gato-vaca – 2x10 respiraciones</li>
                    </ol>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setSelectedRoutine(null)}>
                      Cerrar rutina
                    </Button>
                  </div>
                ) : selectedRoutine === "abs" ? (
                  <div className="p-4 border rounded-lg bg-muted">
                    <h3 className="font-semibold text-lg mb-2">Core y Abdomen</h3>
                    <p className="text-sm text-muted-foreground mb-4">Rutina para fortalecer el centro del cuerpo. Duración: 15 min</p>
                    <ol className="list-decimal list-inside space-y-1 text-sm">
                      <li>Plancha frontal – 3x45 segundos</li>
                      <li>Crunches – 3x20</li>
                      <li>Bicicleta abdominal – 3x20 por lado</li>
                      <li>Plancha lateral – 3x30 segundos por lado</li>
                      <li>Russian Twist – 3x15 por lado</li>
                    </ol>
                    <Button className="mt-4" size="sm" variant="outline" onClick={() => setSelectedRoutine(null)}>
                      Cerrar rutina
                    </Button>
                  </div>
                ) : (
                  <>
                    <ul className="space-y-2">
                      <li className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">Full Body Express</span>
                          <p className="text-xs text-muted-foreground">Ideal para todo el cuerpo, nivel principiante/intermedio.</p>
                        </div>
                        <span className="text-sm text-muted-foreground">45 min · 5 ejercicios</span>
                      </li>
                      <li className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">Pierna y Glúteo Power</span>
                          <p className="text-xs text-muted-foreground">Enfocada en tren inferior, fuerza y tonificación.</p>
                        </div>
                        <span className="text-sm text-muted-foreground">30 min · 4 ejercicios</span>
                      </li>
                      <li className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">Cardio HIIT</span>
                          <p className="text-xs text-muted-foreground">Alta intensidad, quema grasa, sin equipo.</p>
                        </div>
                        <span className="text-sm text-muted-foreground">20 min · 6 ejercicios</span>
                      </li>
                      <li className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">Espalda Saludable</span>
                          <p className="text-xs text-muted-foreground">Movilidad y fuerza para la espalda.</p>
                        </div>
                        <span className="text-sm text-muted-foreground">25 min · 4 ejercicios</span>
                      </li>
                      <li className="flex flex-col md:flex-row md:items-center justify-between p-3 border rounded-lg">
                        <div>
                          <span className="font-medium">Core y Abdomen</span>
                          <p className="text-xs text-muted-foreground">Rutina para fortalecer el centro del cuerpo.</p>
                        </div>
                        <span className="text-sm text-muted-foreground">15 min · 5 ejercicios</span>
                      </li>
                    </ul>
                    <div className="mt-4 text-xs text-muted-foreground text-center">Selecciona una categoría para filtrar rutinas de tu interés.</div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="hydration">
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>La importancia de la hidratación</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-blue-50 border-l-4 border-blue-400 rounded">
                  <p className="font-medium">El agua es esencial para el funcionamiento óptimo de tu cuerpo.</p>
                  <ul className="list-disc list-inside text-sm mt-2 text-blue-900">
                    <li>Regula la temperatura corporal.</li>
                    <li>Transporta nutrientes y oxígeno a las células.</li>
                    <li>Ayuda a eliminar toxinas y desechos.</li>
                    <li>Lubrica articulaciones y protege órganos.</li>
                  </ul>
                </div>
                <div className="p-4 bg-green-50 border-l-4 border-green-400 rounded">
                  <p className="font-medium">¿Cuánta agua debo tomar?</p>
                  <ul className="list-disc list-inside text-sm mt-2 text-green-900">
                    <li>La recomendación general es de 2 a 2.5 litros al día para adultos.</li>
                    <li>Escucha a tu cuerpo: la sed es una señal importante.</li>
                    <li>Incrementa el consumo si haces ejercicio o hace calor.</li>
                  </ul>
                </div>
                <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded">
                  <p className="font-medium">Tips para mantenerte hidratado:</p>
                  <ul className="list-disc list-inside text-sm mt-2 text-yellow-900">
                    <li>Lleva siempre una botella de agua contigo.</li>
                    <li>Bebe agua antes, durante y después de hacer ejercicio.</li>
                    <li>Prefiere agua sobre bebidas azucaradas.</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
