import { useState, useEffect } from "react";
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
    } catch (e) {
      toast({ title: 'Error', description: 'No se pudo registrar la comida.', variant: 'destructive' });
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Nutrition Tracking</h1>
        <p className="text-muted-foreground">Monitor your daily food intake</p>
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
                  <p className="text-3xl font-bold">1,847</p>
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
          title="Meals Logged"
          value="3"
          icon={Apple}
          subtitle="Today"
          color="success"
        />
        <StatCard
          title="Target Met"
          value="92%"
          icon={Target}
          subtitle="This week"
          color="primary"
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card data-testid="card-log-meal">
          <CardHeader>
            <CardTitle>Log Meal</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="mealType">Meal Type</Label>
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger id="mealType" data-testid="select-meal-type">
                  <SelectValue placeholder="Select meal type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="calories">Calories</Label>
              <Input
                id="calories"
                type="number"
                placeholder="Enter calories"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                data-testid="input-calories"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input id="date" type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
            </div>
            <Button onClick={handleLogMeal} className="w-full" data-testid="button-log-meal">
              Log Meal
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Today's Meals</h3>
          {todaysMeals.map((meal, idx) => (
            <MealCard key={idx} {...meal} />
          ))}
        </div>
      </div>
    </div>
  );
}
