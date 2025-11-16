import { storage } from "./storage";

function ymd(date = new Date()) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function yesterdayYMD() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return ymd(d);
}

function labelForDate(ymdDate: string) {
  // Etiqueta amigable: Hoy / Ayer / dd/MM/yyyy
  const tz = 'America/Bogota';
  const fmt = new Intl.DateTimeFormat('es-CO', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
  const today = new Date();
  const todayYmd = (() => {
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return f.format(today);
  })();
  const yesterdayYmd = (() => {
    const d = new Date(today);
    d.setDate(d.getDate() - 1);
    const f = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' });
    return f.format(d);
  })();
  if (ymdDate === todayYmd) return 'Hoy';
  if (ymdDate === yesterdayYmd) return 'Ayer';
  const [y, m, d] = ymdDate.split('-').map(Number);
  const asDate = new Date(y, (m ?? 1) - 1, d ?? 1);
  const parts = fmt.formatToParts(asDate);
  const day = parts.find(p => p.type === 'day')?.value ?? String(d).padStart(2,'0');
  const month = parts.find(p => p.type === 'month')?.value ?? String(m).padStart(2,'0');
  const year = parts.find(p => p.type === 'year')?.value ?? String(y);
  return `${day}/${month}/${year}`;
}

export async function evaluateAndCreateNotificationsForUserOnDate(
  id_usuario: number,
  ymdDate: string,
  context?: { sleepHours?: number; steps?: number; totalCalories?: number }
) {
  // Obtener rol del usuario - Los admin no reciben notificaciones de salud personal
  const user = await storage.getUsuario(id_usuario);
  const isAdmin = user?.role === 'Admin';
  
  // Si es admin, no evaluar ni crear notificaciones de salud personal
  if (isAdmin) {
    return;
  }
  
  const from = ymdDate;
  const to = ymdDate;

  // Datos de ayer
  const [acts, sleeps, foods] = await Promise.all([
    storage.getActividadesFisicas(id_usuario, from, to),
    storage.getSueno(id_usuario, from, to),
    storage.getAlimentacion(id_usuario, from, to),
  ]);

  // Reglas simples (asunciones de metas por defecto)
  const sleepGoal = 8; // horas
  const stepsGoal = 8000; // pasos
  const caloriesMax = 2500; // kcal

  const dayLabel = labelForDate(ymdDate);

  // Sueño
  if (sleeps.length === 0 && context?.sleepHours == null) {
    await storage.createNotification({
      id_usuario,
      tipo: 'sueno',
      titulo: `Sin registro de sueño (${dayLabel})`,
      mensaje: `${dayLabel} no registraste tus horas de sueño. Llevar un registro ayuda a mejorar tu descanso.`,
      dedupe_key: `sleep_missing_${ymdDate}`,
    });
  } else {
    const hrs = context?.sleepHours != null ? Number(context.sleepHours) : Number(sleeps[0]?.horas_dormidas || 0);
    if (hrs >= sleepGoal) {
      await storage.createNotification({
        id_usuario,
        tipo: 'sueno',
        titulo: '¡Buen descanso! 🎉',
        mensaje: `${dayLabel} dormiste ${hrs}h y alcanzaste tu meta de ${sleepGoal}h. ¡Sigue así!`,
        dedupe_key: `sleep_good_${ymdDate}`,
      });
      // Ocultar posibles mensajes negativos del mismo día
      try {
        await storage.markNotificationReadByDedupeKey(id_usuario, `sleep_low_${ymdDate}`);
        await storage.markNotificationReadByDedupeKey(id_usuario, `sleep_missing_${ymdDate}`);
      } catch {}
    } else if (hrs < Math.min(7, sleepGoal)) {
      await storage.createNotification({
        id_usuario,
        tipo: 'sueno',
        titulo: 'Dormiste menos de lo recomendado',
        mensaje: `${dayLabel} dormiste ${hrs}h. Intenta acercarte a tu meta de ${sleepGoal}h para un mejor rendimiento.`,
        dedupe_key: `sleep_low_${ymdDate}`,
      });
      // Si existía "sin registro" para este mismo día, marcarlo como leído para evitar confusión
      try {
        await storage.markNotificationReadByDedupeKey(id_usuario, `sleep_missing_${ymdDate}`);
      } catch {}
    }
  }

  // Actividad
  if (acts.length === 0 && context?.steps == null) {
    await storage.createNotification({
      id_usuario,
      tipo: 'actividad',
      titulo: `Sin actividad física (${dayLabel})`,
      mensaje: `No registraste pasos ni minutos de actividad ${dayLabel}. Una caminata corta puede marcar la diferencia.`,
      dedupe_key: `activity_missing_${ymdDate}`,
    });
  } else {
    const pasos = context?.steps != null ? Number(context.steps) : Number(acts[0]?.pasos || 0);
    if (pasos >= stepsGoal) {
      await storage.createNotification({
        id_usuario,
        tipo: 'actividad',
        titulo: '¡Meta de pasos alcanzada! 🎉',
        mensaje: `${dayLabel} registraste ${pasos} pasos y alcanzaste tu meta de ${stepsGoal}. ¡Excelente!`,
        dedupe_key: `activity_good_${ymdDate}`,
      });
      try {
        await storage.markNotificationReadByDedupeKey(id_usuario, `activity_low_${ymdDate}`);
        await storage.markNotificationReadByDedupeKey(id_usuario, `activity_missing_${ymdDate}`);
      } catch {}
    } else if (pasos < stepsGoal * 0.75) {
      await storage.createNotification({
        id_usuario,
        tipo: 'actividad',
        titulo: 'Actividad baja',
        mensaje: `${dayLabel} registraste ${pasos} pasos. Tu meta sugerida es ${stepsGoal}. ¡Intenta moverte un poco más hoy!`,
        dedupe_key: `activity_low_${ymdDate}`,
      });
      try {
        await storage.markNotificationReadByDedupeKey(id_usuario, `activity_missing_${ymdDate}`);
      } catch {}
    }
  }

  // Alimentación
  if (foods.length > 0) {
    const totalCal = context?.totalCalories != null
      ? Number(context.totalCalories)
      : foods.reduce((sum, f: any) => sum + Number(f.calorias || 0), 0);
    if (totalCal > caloriesMax) {
      await storage.createNotification({
        id_usuario,
        tipo: 'alimentacion',
        titulo: 'Calorías altas',
        mensaje: `${dayLabel} tu ingesta fue de ~${Math.round(totalCal)} kcal. Considera equilibrar porciones y snacks.`,
        dedupe_key: `food_highcal_${ymdDate}`,
      });
    } else if (totalCal >= 1200 && totalCal <= caloriesMax) {
      await storage.createNotification({
        id_usuario,
        tipo: 'alimentacion',
        titulo: 'Buen equilibrio calórico ✅',
        mensaje: `${dayLabel} tu ingesta fue de ~${Math.round(totalCal)} kcal, dentro del objetivo (≤ ${caloriesMax} kcal).`,
        dedupe_key: `food_good_${ymdDate}`,
      });
      try {
        await storage.markNotificationReadByDedupeKey(id_usuario, `food_highcal_${ymdDate}`);
      } catch {}
    }
  }
}

export async function evaluateAndCreateNotificationsForUser(id_usuario: number) {
  const yest = yesterdayYMD();
  return evaluateAndCreateNotificationsForUserOnDate(id_usuario, yest);
}

export async function runNotificationsSweep() {
  // Obtener todos los usuarios y evaluar reglas
  const users = await storage.listUsuarios();
  for (const u of users) {
    try {
      await evaluateAndCreateNotificationsForUser(u.id_usuario);
    } catch (e) {
      console.error('Error evaluando notifs para usuario', u.id_usuario, e);
    }
  }
}
