import { useState, useEffect, useMemo } from "react";
import { Apple, Flame, Target, Edit2, Check, X } from "lucide-react";
import { StatCard } from "@/components/stat-card";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MealCard } from "@/components/meal-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Nutrition() {
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id_usuario ?? (user as any)?.id;
  const [mealType, setMealType] = useState("");
  const [calories, setCalories] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [estimating, setEstimating] = useState(false);
  const [predictions, setPredictions] = useState<Array<{food: string | null; calories: number | null; confidence: number | null}>>([]);
  const [selectedPredictionIndex, setSelectedPredictionIndex] = useState<number | null>(null);
  const [selectedDate, setSelectedDate] = useState(() => {
    const today = new Date();
    const y = today.getFullYear();
    const m = String(today.getMonth()+1).padStart(2,'0');
    const d = String(today.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  });

  // Estado para la meta de calorías (se guarda en localStorage)
  const [caloriesGoal, setCaloriesGoal] = useState<number>(() => {
    const saved = localStorage.getItem(`calories-goal-${userId}`);
    return saved ? parseInt(saved) : 2000;
  });
  const [isEditingGoal, setIsEditingGoal] = useState(false);
  const [tempGoal, setTempGoal] = useState(caloriesGoal.toString());

  // Guardar meta de calorías cuando cambie
  useEffect(() => {
    if (userId) {
      localStorage.setItem(`calories-goal-${userId}`, caloriesGoal.toString());
    }
  }, [caloriesGoal, userId]);

  const handleSaveGoal = () => {
    const newGoal = parseInt(tempGoal);
    if (!isNaN(newGoal) && newGoal > 0) {
      setCaloriesGoal(newGoal);
      setIsEditingGoal(false);
      // Disparar evento para que el dashboard se actualice
      window.dispatchEvent(new Event('calories-goal-updated'));
      toast({
        title: "Meta actualizada",
        description: `Tu nueva meta es de ${newGoal.toLocaleString()} calorías diarias.`,
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
    setTempGoal(caloriesGoal.toString());
    setIsEditingGoal(false);
  };

  const mapMeal = (v: string): 'Desayuno'|'Almuerzo'|'Cena'|'Snack'|null => {
    switch (v) {
      case 'breakfast': return 'Desayuno';
      case 'lunch': return 'Almuerzo';
      case 'dinner': return 'Cena';
      case 'snack': return 'Snack';
      default: return null;
    }
  };

  const handleLogMeal = async () => {
    const comida = mapMeal(mealType);
    const calNum = parseFloat(calories);
    if (!userId || !selectedDate || !comida || isNaN(calNum) || calNum <= 0) {
      toast({ title: 'Error', description: 'Completa los campos válidos.', variant: 'destructive' });
      return;
    }
    try {
      await fetch('/api/nutrition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id_usuario: userId, fecha: selectedDate, comida, calorias: calNum }),
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
      toast({ title: 'Comida registrada', description: '¡Tu registro fue guardado!' });
      setMealType('');
      setCalories('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setPredictions([]);
      setSelectedPredictionIndex(null);
      // Refrescar lista semanal para reflejar el nuevo registro
      try {
        await fetchWeekMeals(weekStart);
      } catch (e) {
        console.warn('No se pudo refrescar comidas tras crear:', e);
      }
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar la comida.', variant: 'destructive' });
    }
  };

  const handleFileChange = (f?: File) => {
    if (!f) {
      setSelectedFile(null);
      setPreviewUrl(null);
      return;
    }
    setSelectedFile(f);
    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const estimateFromImage = async () => {
    if (!selectedFile) {
      toast({ title: 'Error', description: 'Selecciona una imagen primero.', variant: 'destructive' });
      return;
    }
    setEstimating(true);
    try {
      const fd = new FormData();
      fd.append('image', selectedFile);
      const res = await fetch('/api/estimate-calories', { method: 'POST', body: fd });
      if (!res.ok) {
        const txt = await res.text().catch(() => '');
        toast({ title: 'Error', description: 'No se pudo estimar la imagen.' });
        setEstimating(false);
        return;
      }
      const body = await res.json();
      const preds = (body.predictions || []).map((p: any) => ({ food: p.food ?? null, calories: p.calories ?? null, confidence: p.confidence ?? null }));
      setPredictions(preds);
      if (preds.length === 1 && preds[0].calories != null) {
        setCalories(String(Math.round(preds[0].calories)));
      }
    } catch (e) {
      console.error('Estimate error', e);
      toast({ title: 'Error', description: 'Error al estimar la imagen.' });
    } finally {
      setEstimating(false);
    }
  };

  const todaysMeals = [
    {
      type: "Breakfast",
      time: "8:30 AM",
      calories: 450,
      items: ["Oatmeal with berries", "Greek yogurt", "Orange juice"],
    },
    {
      type: "Lunch",
      time: "12:45 PM",
      calories: 620,
      items: ["Grilled chicken salad", "Whole grain bread", "Apple"],
    },
    {
      type: "Snack",
      time: "3:30 PM",
      calories: 180,
      items: ["Protein bar", "Almonds"],
    },
  ];
  // Estado y helpers para vista semanal / por día
  const [weekStart, setWeekStart] = useState<Date>(() => {
    // semana que contiene selectedDate (lunes como inicio)
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = (day + 6) % 7; // días desde lunes
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0,0,0,0);
    return monday;
  });
  const [mealsByDate, setMealsByDate] = useState<Record<string, any[]>>({});
  const [loadingWeek, setLoadingWeek] = useState(false);

  const formatISODate = (d: Date) => {
    return d.toISOString().slice(0,10);
  };

  const formatDayLabel = (d: Date) => {
    return d.toLocaleDateString(undefined, { weekday: 'short', day: '2-digit', month: 'short' });
  };

  const formatWeekRange = (start: Date) => {
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    const fmt = (dt: Date) => {
      // day + short month without trailing dot and capitalized
      const s = dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short' });
      return s.replace('.', '').replace(/^(.)/, (m) => m.toUpperCase());
    };
    return `${fmt(start)} - ${fmt(end)}`;
  };

  const fetchWeekMeals = async (start: Date) => {
    if (!userId) return;
    setLoadingWeek(true);
    try {
      const from = formatISODate(start);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      const to = formatISODate(end);
      const res = await fetch(`/api/nutrition/${userId}?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
      const body = await res.json();
      const items = (body?.alimentacion) || [];
      const grouped: Record<string, any[]> = {};
      for (let i = 0; i < 7; i++) {
        const dt = new Date(start);
        dt.setDate(start.getDate() + i);
        grouped[formatISODate(dt)] = [];
      }
      for (const it of items) {
        // esperar que `it.fecha` esté en ISO date o similar
        const key = (it.fecha || '').slice(0,10) || formatISODate(new Date());
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(it);
      }
      setMealsByDate(grouped);
    } catch (e) {
      console.error('Error cargando comidas semana:', e);
      setMealsByDate({});
    } finally {
      setLoadingWeek(false);
    }
  };

  useEffect(() => {
    // volver a calcular weekStart cuando cambie selectedDate
    const d = new Date(selectedDate);
    const day = d.getDay();
    const diff = (day + 6) % 7;
    const monday = new Date(d);
    monday.setDate(d.getDate() - diff);
    monday.setHours(0,0,0,0);
    setWeekStart(monday);
  }, [selectedDate]);

  useEffect(() => {
    fetchWeekMeals(weekStart);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekStart, userId]);

  const goPrevWeek = () => {
    const prev = new Date(weekStart);
    prev.setDate(weekStart.getDate() - 7);
    setWeekStart(prev);
  };
  const goNextWeek = () => {
    const next = new Date(weekStart);
    next.setDate(weekStart.getDate() + 7);
    setWeekStart(next);
  };

  // Meals section ahora organizado por semana y día seleccionado
  const weekDays = Array.from({length:7}).map((_,i) => {
    const d = new Date(weekStart);
    d.setDate(weekStart.getDate() + i);
    return d;
  });

  const totalMealsLogged = useMemo(() => {
    try {
      return weekDays.reduce((acc, d) => {
        const k = formatISODate(d);
        return acc + ((mealsByDate[k] || []).length);
      }, 0);
    } catch {
      return 0;
    }
  }, [mealsByDate, weekStart]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Seguimiento Nutricional</h1>
        <p className="text-muted-foreground">Monitorea tu ingesta diaria de alimentos</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Calorías Hoy</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-2 rounded-lg bg-orange-100 dark:bg-orange-900/20">
                  <Flame className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <div>
                  <p className="text-3xl font-bold">{(useMemo(() => {
                    try {
                      const list = mealsByDate[selectedDate] || [];
                      const total = list.reduce((s, m) => s + (Number(m.calorias) || 0), 0);
                      return total.toLocaleString();
                    } catch {
                      return '0';
                    }
                  }, [mealsByDate, selectedDate]))}</p>
                  <div className="flex items-center gap-2 mt-1">
                    {!isEditingGoal ? (
                      <>
                        <p className="text-sm text-muted-foreground">Meta: {caloriesGoal.toLocaleString()}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 w-6 p-0"
                          onClick={() => {
                            setIsEditingGoal(true);
                            setTempGoal(caloriesGoal.toString());
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
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        <StatCard
          title="Comidas registradas"
          value={String(totalMealsLogged)}
          icon={Apple}
          subtitle="Esta semana"
          color="success"
        />
        {/* Meta alcanzada: calcular % basado en la meta diaria x 7 y las calorías registradas */}
        <StatCard
          title="Meta alcanzada"
          value={(() => {
            try {
              const totalCaloriesWeek = weekDays.reduce((acc, d) => {
                const k = formatISODate(d);
                const dayMeals = mealsByDate[k] || [];
                return acc + dayMeals.reduce((s, m) => s + (Number(m.calorias) || 0), 0);
              }, 0);
              const weeklyGoal = (Number(caloriesGoal) || 0) * 7;
              const pct = weeklyGoal > 0 ? Math.round((totalCaloriesWeek / weeklyGoal) * 100) : 0;
              return `${pct}%`;
            } catch {
              return `0%`;
            }
          })()}
          icon={Target}
          subtitle="Esta semana"
          color="primary"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-log-meal">
          <CardHeader>
            <CardTitle>Registrar comida</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mealType">Tipo de comida</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger id="mealType" data-testid="select-meal-type">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Desayuno">Desayuno</SelectItem>
                  <SelectItem value="Almuerzo">Almuerzo</SelectItem>
                  <SelectItem value="Cena">Cena</SelectItem>
                  <SelectItem value="Merienda">Merienda</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Foto (opcional)</Label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleFileChange(e.target.files ? e.target.files[0] : undefined)}
                />
                <Button size="sm" onClick={estimateFromImage} disabled={estimating || !selectedFile}>
                  {estimating ? 'Estimando...' : 'Estimar calorías'}
                </Button>
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="preview" className="mt-2 max-h-32 rounded-md" />
              )}

              <Label htmlFor="calories">Calorias</Label>
              <Input
                id="calories"
                type="number"
                placeholder="Ingrese calorías"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                data-testid="input-calories"
              />

              {predictions.length > 0 && (
                <div className="mt-2 space-y-1">
                  <p className="text-sm text-muted-foreground">Predicciones:</p>
                  {predictions.map((p, idx) => (
                    <div key={idx} className={`flex items-center justify-between p-2 border rounded ${selectedPredictionIndex===idx? 'bg-gray-100':''}`}>
                      <div>
                        <div className="text-sm font-medium">{p.food ?? 'Alimento desconocido'}</div>
                        <div className="text-xs text-muted-foreground">{p.calories != null ? `${Math.round(p.calories)} cal` : 'Calorías no estimadas'} • Conf: {p.confidence != null ? (Math.round((p.confidence as number)*100)) + '%' : '—'}</div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant={selectedPredictionIndex===idx? 'secondary':'ghost'} onClick={() => {
                          setSelectedPredictionIndex(idx);
                          if (p.calories != null) setCalories(String(Math.round(p.calories)));
                        }}>Usar</Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Fecha</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <Button onClick={handleLogMeal} className="w-full" data-testid="button-log-meal">
              Registrar comida
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Comidas</h3>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="ghost" onClick={goPrevWeek}>&lt; Anterior</Button>
              <div className="text-sm text-muted-foreground">{formatWeekRange(weekStart)}</div>
              <Button size="sm" variant="ghost" onClick={goNextWeek}>Siguiente &gt;</Button>
            </div>
          </div>

          <div className="flex gap-2 overflow-auto">
            {weekDays.map((d) => {
              const key = formatISODate(d);
              const count = (mealsByDate[key] || []).length;
              const selected = key === selectedDate;
              return (
                <button key={key} onClick={() => setSelectedDate(key)} className={`p-2 rounded border ${selected ? 'bg-gray-100' : ''}`}>
                  <div className="text-xs">{formatDayLabel(d)}</div>
                  <div className="text-sm font-medium">{count} {count===1? 'meal':'meals'}</div>
                </button>
              );
            })}
          </div>

          <div className="mt-2">
            <div className="text-sm text-muted-foreground">Comidas del día seleccionado: {selectedDate}</div>
            {loadingWeek ? (
              <div className="text-sm">Cargando...</div>
            ) : (
              (mealsByDate[selectedDate] || []).length ? (
                (mealsByDate[selectedDate] || []).map((meal, idx) => (
                  <MealCard
                    key={idx}
                    type={meal.comida || 'Meal'}
                    time={meal.hora || ''}
                    calories={meal.calorias || 0}
                    items={meal.descripcion ? [meal.descripcion] : (meal.items || [])}
                  />
                ))
              ) : (
                <div className="text-sm text-muted-foreground">No hay comidas registradas para este día.</div>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
