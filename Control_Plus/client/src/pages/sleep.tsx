import { useState, useEffect } from "react";
import { Moon, Clock, TrendingUp, Lightbulb, Edit2, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { SleepChart } from "@/components/sleep-chart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// Helper para obtener fecha actual en formato YYYY-MM-DD
function getTodayISO() {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatDate(iso: string) {
  if (!iso) return "";
  const [yyyy, mm, dd] = iso.split("-");
  return `${dd}/${mm}/${yyyy}`;
}

type SleepRecord = {
  fecha: string;
  horas_dormidas: number;
};

export default function Sleep() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id_usuario ?? (user as any)?.id;
  const [hours, setHours] = useState("");
  const [selectedDate, setSelectedDate] = useState<string>(() => getTodayISO());
  const [sleepRecords, setSleepRecords] = useState<SleepRecord[]>([]);
  
  // Estado para controlar la semana mostrada (offset en semanas desde hoy)
  const [weekOffset, setWeekOffset] = useState(0);

  // Estado para la meta de horas de sueño (se guarda en localStorage)
  const [sleepGoal, setSleepGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`sleep-goal-${userId}`);
    return saved ? parseFloat(saved) : 8;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(sleepGoal.toString());

  // Zona horaria objetivo (Bogotá)
  const TZ = 'America/Bogota';
  const ymdInTZ = (date: Date): string => {
    const f = new Intl.DateTimeFormat('en-CA', {
      timeZone: TZ,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return f.format(date); // YYYY-MM-DD
  };
  const prevYMD = (ymd: string): string => {
    const [y, m, d] = ymd.split('-').map(Number);
    const dt = new Date(y, (m ?? 1) - 1, d ?? 1);
    dt.setDate(dt.getDate() - 1);
    return ymdInTZ(dt);
  };

  // Guardar meta de sueño cuando cambie
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`sleep-goal-${userId}`, sleepGoal.toString());
    }
  }, [sleepGoal, userId]);

  // Cargar historial de sueño desde el backend
  useEffect(() => {
    const fetchSleepRecords = async () => {
      if (!userId) return;
      try {
        const res = await fetch(`/api/sleep/${userId}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.sueno)) {
          const records = data.sueno.map((s: any) => ({
            fecha: s.fecha?.slice(0, 10),
            horas_dormidas: parseFloat(s.horas_dormidas) || 0,
          }));
          setSleepRecords(records);
        }
      } catch (err) {
        console.error("Error obteniendo historial de sueño", err);
      }
    };
    fetchSleepRecords();
  }, [userId]);

  const handleSaveGoal = () => {
    const newGoal = parseFloat(tempGoal);
    if (!isNaN(newGoal) && newGoal > 0) {
      setSleepGoal(newGoal);
      setIsEditingGoal(false);
      // Disparar evento para que el dashboard se actualice
      window.dispatchEvent(new Event('sleep-goal-updated'));
      toast({
        title: "Meta actualizada",
        description: `Tu nueva meta es de ${newGoal} horas de sueño.`,
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
    setTempGoal(sleepGoal.toString());
    setIsEditingGoal(false);
  };

  const handleLogSleep = async () => {
    if (!hours || !selectedDate || !userId) return;
    const hoursNum = parseFloat(hours);
    if (isNaN(hoursNum) || hoursNum <= 0) return;

    try {
      await fetch("/api/sleep", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id_usuario: userId,
          fecha: selectedDate,
          horas_dormidas: hoursNum,
          calidad_sueno: "Buena", // Valor por defecto
        }),
      });

      // Refrescar historial desde el backend
      const res = await fetch(`/api/sleep/${userId}`);
      const data = await res.json();
      if (data.success && Array.isArray(data.sueno)) {
        setSleepRecords(data.sueno.map((s: any) => ({
          fecha: s.fecha?.slice(0, 10),
          horas_dormidas: parseFloat(s.horas_dormidas) || 0,
        })));
      }

      // Notificar al dashboard que hay datos nuevos
      try { window.dispatchEvent(new Event('health-data-updated')); } catch {}

      toast({
        title: "Sueño registrado",
        description: "¡Tu registro de sueño fue guardado exitosamente!",
        duration: 3000,
        variant: "default",
      });

      // Disparar tick para notificaciones inmediatas
      try { window.dispatchEvent(new Event('notifications:tick')); } catch {}

      // Fetch inmediato de notificaciones recientes (fallback si el poller tarda)
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
          // Marcar como leídas
          try {
            await fetch(`/api/notifications/${userId}/read`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ids }),
            });
          } catch {}
        }
      } catch {}

      setHours("");
    } catch (err) {
      toast({
        title: "Error",
        description: "No se pudo registrar el sueño.",
        duration: 3000,
        variant: "destructive",
      });
      console.error("Error enviando datos de sueño al backend", err);
    }
  };

  // Preparar datos para el gráfico basado en weekOffset
  const sleepData = (() => {
    const days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    
    // Calcular la semana a mostrar basada en weekOffset
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const referenceDate = new Date(today);
    referenceDate.setDate(referenceDate.getDate() + (weekOffset * 7));
    
    // Encontrar el lunes de la semana de referencia
    const dayOfWeek = (referenceDate.getDay() + 6) % 7; // 0 = Lun, 6 = Dom
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    const chartDays = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + i);
      // YMD en zona Bogota para empatar registros
      const dateStr = ymdInTZ(date);
      const dayIndex = i; // Ya está en orden Lun=0, Dom=6
      
      const record = sleepRecords.find(r => r.fecha === dateStr);
      
      // Calcular calidad basada en las horas dormidas vs meta
      let quality: "Poor" | "Fair" | "Good" | "Excellent" = "Poor";
      if (record) {
        const hours = record.horas_dormidas;
        const goal = sleepGoal;
        
        if (hours >= goal) {
          quality = "Excellent"; // Cumplió o superó la meta
        } else if (hours >= goal * 0.85) {
          quality = "Good"; // 85% o más de la meta (ej: 6.8h de 8h)
        } else if (hours >= goal * 0.65) {
          quality = "Fair"; // 65% o más de la meta (ej: 5.2h de 8h)
        } else {
          quality = "Poor"; // Menos del 65% de la meta
        }
      }
      
      chartDays.push({
        day: days[dayIndex],
        hours: record?.horas_dormidas || 0,
        quality: quality,
      });
    }
    
    return chartDays;
  })();

  // Calcular el rango de fechas para mostrar
  const dateRange = (() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const referenceDate = new Date(today);
    referenceDate.setDate(referenceDate.getDate() + (weekOffset * 7));
    
    const dayOfWeek = (referenceDate.getDay() + 6) % 7;
    const startDate = new Date(referenceDate);
    startDate.setDate(startDate.getDate() - dayOfWeek);
    
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    
    const formatDateShort = (date: Date) => {
      const day = date.getDate();
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[date.getMonth()];
      return `${day} ${month}`;
    };
    
    return `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`;
  })();

  // Calcular promedio semanal
  const weeklyAverage = (() => {
    const validRecords = sleepData.filter(d => d.hours > 0);
    if (validRecords.length === 0) return 0;
    const sum = validRecords.reduce((acc, d) => acc + d.hours, 0);
    return sum / validRecords.length;
  })();

  const sleepTips = [
    "Mantén un horario de sueño consistente",
    "Crea una rutina relajante antes de dormir",
    "Mantén tu habitación fresca y oscura",
    "Limita el uso de pantallas antes de dormir",
    "Evita la cafeína en las tardes",
  ];

  // Obtener el registro de ayer (día anterior a hoy) en TZ Bogotá
  const lastNightSleep = (() => {
    const todayStr = ymdInTZ(new Date());
    const yesterdayStr = prevYMD(todayStr);
    const record = sleepRecords.find(r => r.fecha === yesterdayStr);
    return record?.horas_dormidas || 0;
  })();

  // Calcular puntaje de sueño basado en promedio semanal vs meta
  const sleepScore = (() => {
    if (weeklyAverage === 0) return 0;
    const percentage = (weeklyAverage / sleepGoal) * 100;
    return Math.min(100, Math.round(percentage));
  })();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Monitoreo de Sueño</h1>
        <p className="text-muted-foreground">Registra y analiza tus patrones de sueño</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Última Noche</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/20">
                  <Moon className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">
                    {lastNightSleep > 0 ? `${lastNightSleep}h` : '0h'}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    {!isEditingGoal ? (
                      <>
                        <p className="text-sm text-muted-foreground">Meta: {sleepGoal}h</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setIsEditingGoal(true);
                            setTempGoal(sleepGoal.toString());
                          }}
                        >
                          <Edit2 className="h-3 w-3" />
                        </Button>
                      </>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          step="0.5"
                          value={tempGoal}
                          onChange={(e) => setTempGoal(e.target.value)}
                          className="h-7 w-20 text-xs"
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard
          title="Promedio Semanal"
          value={weeklyAverage > 0 ? `${weeklyAverage.toFixed(1)}h` : "0h"}
          icon={Clock}
          subtitle="Esta semana"
          color="primary"
        />
        <StatCard
          title="Puntaje de Sueño"
          value={sleepScore.toString()}
          icon={TrendingUp}
          subtitle="De 100"
          color="success"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <Card data-testid="card-log-sleep">
            <CardHeader>
              <CardTitle>Registrar Sueño</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="hours">Horas de Sueño</Label>
                <Input
                  id="hours"
                  type="number"
                  step="0.5"
                  placeholder="Ej: 7.5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  data-testid="input-sleep-hours"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  data-testid="input-date"
                />
              </div>
              <Button onClick={handleLogSleep} className="w-full" data-testid="button-log-sleep">
                Registrar Sueño
              </Button>
            </CardContent>
          </Card>

          <Card data-testid="card-sleep-tips">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-chart-3" />
                <CardTitle>Recomendaciones de Sueño</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {sleepTips.map((tip, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm">
                    <span className="text-primary mt-0.5">•</span>
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <SleepChart 
          data={sleepData} 
          weekOffset={weekOffset}
          onWeekChange={setWeekOffset}
          dateRange={dateRange}
        />
      </div>
    </div>
  );
}
