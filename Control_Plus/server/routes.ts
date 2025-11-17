import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUsuarioSchema, loginUsuarioSchema, updateUsuarioSchema } from "@shared/schema";
import { evaluateAndCreateNotificationsForUserOnDate } from "./notifications";
import { sendEmailNotification } from "./email";
import fhirRouter from './fhir/routes';
import multer from 'multer';
import sharp from 'sharp';

export async function registerRoutes(app: Express): Promise<Server> {
  // Multer para recibir imágenes en memoria
  const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 8 * 1024 * 1024 } });

  // Función auxiliar: mapea distintos formatos de predicción a una forma uniforme
  const mapPredictions = (preds: any): Array<{ food: string | null; calories: number | null; calories_raw?: number | null; confidence: number | null; note?: string | null }> => {
    if (!preds) return [];
    const arr = Array.isArray(preds) ? preds : [preds];
    return arr.map((p: any) => {
      if (typeof p === 'string') {
        return { food: p, calories: null, confidence: null };
      }

      const food = p.label || p.name || p.food || p.prediction || p.class || p.title || p.group || null;

      // Intentar encontrar calorías en varias rutas posibles del objeto
      const calories_raw = ((): number | null => {
        if (p.calories != null) return Number(p.calories);
        if (p.kcal != null) return Number(p.kcal);
        if (p.calorie != null) return Number(p.calorie);
        if (p.energy_kcal != null) return Number(p.energy_kcal);
        if (p.nutrition && (p.nutrition.calories != null || p.nutrition.kcal != null)) {
          return Number(p.nutrition.calories ?? p.nutrition.kcal);
        }
        if (p.nutrients) {
          if (p.nutrients.calories != null) return Number(p.nutrients.calories);
          if (p.nutrients.kcal != null) return Number(p.nutrients.kcal);
        }
        // Si el objeto tiene items (p.pattern de CalorieMama), intentar extraer de items[0]
        if (p.items && Array.isArray(p.items) && p.items.length) {
          const it = p.items[0];
          if (typeof it === 'string') {
            // nada que extraer
          } else {
            if (it.calories != null) return Number(it.calories);
            if (it.kcal != null) return Number(it.kcal);
            if (it.nutrition && (it.nutrition.calories != null || it.nutrition.kcal != null)) return Number(it.nutrition.calories ?? it.nutrition.kcal);
            if (it.nutrients && (it.nutrients.calories != null || it.nutrients.kcal != null)) return Number(it.nutrients.calories ?? it.nutrients.kcal);
            if (it.energy_kcal != null) return Number(it.energy_kcal);
          }
        }
        return null;
      })();

      // Heurística simple: si calories_raw aparece y es razonable, usarla; dejamos el valor sin modificar
      const calories = typeof calories_raw === 'number' ? calories_raw : null;

      const confidence = ((): number | null => {
        let val: number | null = null;
        if (p.confidence != null) val = Number(p.confidence);
        else if (p.score != null) val = Number(p.score);
        else if (p.probability != null) val = Number(p.probability);
        else if (p.prob != null) val = Number(p.prob);
        else if (p.conf != null) val = Number(p.conf);

        // Si hay items, obtener el mejor score/confidence entre ellos
        if ((val == null || val === 0) && p.items && Array.isArray(p.items) && p.items.length) {
          const best = p.items.reduce((acc: number|null, it: any) => {
            if (!it) return acc;
            const v = it.confidence ?? it.score ?? it.probability ?? it.prob ?? it.conf ?? null;
            const num = v != null ? Number(v) : null;
            if (num == null) return acc;
            if (acc == null) return num;
            return Math.max(acc, num);
          }, null as number | null);
          if (best != null) val = best;
        }

        if (val == null) return null;
        // Normalizar: si el proveedor devuelve porcentajes (ej. 40 o 4000), convertir a 0..1
        // Aplicar división por 100 repetida hasta que val <= 1 (o hasta 1 iteración límite)
        let normalized = val;
        let iterations = 0;
        while (normalized > 1 && iterations < 5) {
          normalized = normalized / 100;
          iterations++;
        }
        // Asegurar rango 0..1
        if (normalized > 1) normalized = 1;
        if (normalized < 0) normalized = 0;
        return normalized;
      })();

      // Señalar notas útiles: valores demasiado altos o inconsistentes
      let note: string | null = null;
      if (calories != null && calories > 5000) {
        note = 'Estimated calories are unusually high; please review (possible per-recipe total or units mismatch)';
      }

      return { food: food ?? null, calories: calories != null ? Math.round(calories) : null, calories_raw: calories_raw ?? null, confidence, note };
    });
  };

  // Registrar o actualizar actividad física
  app.post("/api/activity", async (req, res) => {
    try {
      const { id_usuario, fecha, pasos, duracion_minutos } = req.body;
      if (!id_usuario || !fecha || pasos == null || duracion_minutos == null) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
      }
  await storage.insertOrUpdateActividadFisica({ id_usuario, fecha, pasos, duracion_minutos });
  // Evaluar notificaciones para la fecha registrada (en background) con contexto de pasos
  evaluateAndCreateNotificationsForUserOnDate(id_usuario, fecha, { steps: Number(pasos) }).catch(() => {});
      res.status(201).json({ success: true, message: "Actividad registrada o actualizada" });
    } catch (error) {
      console.error("Error registrando actividad física:", error);
      res.status(500).json({ success: false, message: "Error al registrar actividad" });
    }
  });

  // Consultar historial de actividad física por usuario y rango de fechas
  app.get("/api/activity/:id_usuario", async (req, res) => {
    try {
      const id_usuario = Number(req.params.id_usuario);
      if (Number.isNaN(id_usuario)) return res.status(400).json({ success: false, message: "ID inválido" });
      const { from, to } = req.query;
      const actividades = await storage.getActividadesFisicas(
        id_usuario,
        typeof from === "string" ? from : undefined,
        typeof to === "string" ? to : undefined
      );
      res.json({ success: true, actividades });
    } catch (error) {
      console.error("Error consultando actividad física:", error);
      res.status(500).json({ success: false, message: "Error al consultar actividad" });
    }
  });

  // Consultar historial de alimentación por usuario
  app.get("/api/nutrition/:id_usuario", async (req, res) => {
    try {
      const id_usuario = Number(req.params.id_usuario);
      if (Number.isNaN(id_usuario)) return res.status(400).json({ success: false, message: "ID inválido" });
      const { from, to } = req.query;
      const alimentacion = await storage.getAlimentacion(
        id_usuario,
        typeof from === "string" ? from : undefined,
        typeof to === "string" ? to : undefined
      );
      res.json({ success: true, alimentacion });
    } catch (error) {
      console.error("Error consultando alimentación:", error);
      res.status(500).json({ success: false, message: "Error al consultar alimentación" });
    }
  });

  // Registrar alimentación (inserta una comida del día)
  app.post("/api/nutrition", async (req, res) => {
    try {
      const { id_usuario, fecha, comida, descripcion, calorias, proteinas, grasas, carbohidratos } = req.body;
      if (!id_usuario || !fecha || !comida) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
      }
      if (!['Desayuno','Almuerzo','Cena','Snack'].includes(comida)) {
        return res.status(400).json({ success: false, message: "Tipo de comida inválido" });
      }
      await storage.insertAlimentacion({
        id_usuario,
        fecha,
        comida,
        descripcion,
        calorias: calorias != null ? Number(calorias) : undefined,
        proteinas: proteinas != null ? Number(proteinas) : undefined,
        grasas: grasas != null ? Number(grasas) : undefined,
        carbohidratos: carbohidratos != null ? Number(carbohidratos) : undefined,
      });
      // Calcular total de calorías del día y evaluar notificaciones
      const foods = await storage.getAlimentacion(id_usuario, fecha, fecha);
      const totalCal = (foods || []).reduce((sum: number, f: any) => sum + Number(f.calorias || 0), 0);
      evaluateAndCreateNotificationsForUserOnDate(id_usuario, fecha, { totalCalories: totalCal }).catch(() => {});
      res.status(201).json({ success: true, message: "Alimentación registrada" });
    } catch (e) {
      console.error('Error registrando alimentación:', e);
      res.status(500).json({ success: false, message: 'Error al registrar alimentación' });
    }
  });

  // Endpoint proxy para estimar calorías desde imagen (CalorieMama / Calorify)
  app.post('/api/estimate-calories', upload.single('image'), async (req, res) => {
    try {
      const file = (req as any).file;
      if (!file) return res.status(400).json({ success: false, message: 'No image provided' });

      const apiUrl = process.env.CALORIE_MAMA_API_URL;
      const apiKey = process.env.CALORIE_MAMA_API_KEY;
      if (!apiUrl) return res.status(500).json({ success: false, message: 'CALORIE_MAMA_API_URL not configured' });

      // Según la documentación de CalorieMama: enviar multipart/form-data con campo 'media'
      // y pasar la clave en query param `user_key=...`.
      // Intentamos multipart primero; si falla, caeremos a enviar JSON base64.
      const urlObj = new URL(apiUrl);
      // Si el proveedor espera la clave en query param, anexarla
      if (apiKey && !urlObj.searchParams.has('user_key')) {
        urlObj.searchParams.set('user_key', apiKey);
      }

      // Recortar / reescalar la imagen a 544x544 (center crop) para cumplir la spec de CalorieMama
      let processedBuffer = file.buffer;
      try {
        processedBuffer = await sharp(file.buffer)
          .resize(544, 544, { fit: 'cover', position: 'centre' })
          .toFormat('jpeg')
          .toBuffer();
      } catch (e) {
        console.warn('Image processing failed, using original buffer:', e);
        processedBuffer = file.buffer;
      }

      // Intentar enviar la imagen directamente como body binario con Content-Type=image/jpeg
      try {
        const contentType = 'image/jpeg';
        const resp = await fetch(urlObj.toString(), { method: 'POST', headers: { 'Content-Type': contentType }, body: processedBuffer });
        if (!resp.ok) {
          const text = await resp.text().catch(() => '');
          console.error('Calorie service (binary) error', resp.status, text);
          // si falla, seguiremos al fallback base64
        } else {
          const multipartData = await resp.json().catch(async () => {
            const txt = await resp.text().catch(() => '');
            console.warn('Calorie service returned non-JSON response (binary):', txt);
            return null;
          });
          if (multipartData) {
            let predictions: any[] = [];
            if (Array.isArray(multipartData.predictions)) predictions = multipartData.predictions;
            else if (Array.isArray(multipartData.results)) predictions = multipartData.results;
            else if (multipartData.label) predictions = [multipartData];

            const mapped = mapPredictions(predictions);
            console.debug('Calorie service raw response (binary):', multipartData);
            return res.json({ success: true, predictions: mapped, raw: multipartData });
          }
        }
      } catch (e) {
        console.warn('Binary attempt failed, will fallback to JSON base64. Err:', e);
      }

      // Fallback: Convertir la imagen a base64 y enviar JSON — algunos endpoints lo aceptan
      const base64 = processedBuffer.toString('base64');
      const jsonBody = JSON.stringify({ image_base64: base64 });

      const headers: Record<string,string> = { 'Content-Type': 'application/json', 'Accept': 'application/json' };
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
        headers['x-api-key'] = apiKey;
      }

      const resp2 = await fetch(apiUrl, { method: 'POST', headers, body: jsonBody });
      if (!resp2.ok) {
        const text = await resp2.text().catch(() => '');
        console.error('Calorie service (json fallback) error', resp2.status, text);
        return res.status(502).json({ success: false, message: 'Error from calorie service', details: text });
      }

      const data2 = await resp2.json().catch(async () => {
        const txt = await resp2.text().catch(() => '');
        console.warn('Calorie service returned non-JSON response (json fallback):', txt);
        return null;
      });
      let predictions: any[] = [];
      if (data2) {
        if (Array.isArray(data2.predictions)) predictions = data2.predictions;
        else if (Array.isArray(data2.results)) predictions = data2.results;
        else if (data2.label) predictions = [data2];
      }

      const mapped = mapPredictions(predictions);
      console.debug('Calorie service raw response (json fallback):', data2);

      return res.json({ success: true, predictions: mapped, raw: data2 });
    } catch (e) {
      console.error('Error in /api/estimate-calories:', e);
      return res.status(500).json({ success: false, message: 'Internal error' });
    }
  });

  // Consultar historial de sueño por usuario
  app.get("/api/sleep/:id_usuario", async (req, res) => {
    try {
      const id_usuario = Number(req.params.id_usuario);
      if (Number.isNaN(id_usuario)) return res.status(400).json({ success: false, message: "ID inválido" });
      const { from, to } = req.query;
      const sueno = await storage.getSueno(
        id_usuario,
        typeof from === "string" ? from : undefined,
        typeof to === "string" ? to : undefined
      );
      res.json({ success: true, sueno });
    } catch (error) {
      console.error("Error consultando sueño:", error);
      res.status(500).json({ success: false, message: "Error al consultar sueño" });
    }
  });

  // Registrar o actualizar sueño
  app.post("/api/sleep", async (req, res) => {
    try {
      const { id_usuario, fecha, horas_dormidas, calidad_sueno } = req.body;
      if (!id_usuario || !fecha || horas_dormidas == null) {
        return res.status(400).json({ success: false, message: "Faltan datos" });
      }
  await storage.insertOrUpdateSueno({ id_usuario, fecha, horas_dormidas, calidad_sueno });
  // Evaluar notificaciones para la fecha registrada (en background) con contexto de horas
  evaluateAndCreateNotificationsForUserOnDate(id_usuario, fecha, { sleepHours: Number(horas_dormidas) }).catch(() => {});
      res.status(201).json({ success: true, message: "Sueño registrado o actualizado" });
    } catch (error) {
      console.error("Error registrando sueño:", error);
      res.status(500).json({ success: false, message: "Error al registrar sueño" });
    }
  });

  // ===================== Notificaciones =====================
  // Listar notificaciones (opcionalmente desde un ISO timestamp)
  app.get("/api/notifications/:id_usuario", async (req, res) => {
    try {
      const id_usuario = Number(req.params.id_usuario);
      if (Number.isNaN(id_usuario)) return res.status(400).json({ success: false, message: "ID inválido" });
      const { since } = req.query;
      // Obtener rol del usuario para aplicar filtro defensivo: los Admins no deben ver notificaciones de salud
      const user = await storage.getUsuario(id_usuario);
      let notifications = await storage.getNotifications(id_usuario, typeof since === 'string' ? since : undefined);
      if (user?.role === 'Admin') {
        // Filtrar sólo tipo 'general' para Admins (oculta notificaciones de actividad/sueño/alimentación)
        notifications = (notifications || []).filter((n: any) => n.tipo === 'general');
      }
      res.json({ success: true, notifications });
    } catch (e) {
      console.error('Error listando notificaciones:', e);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  });

  // Marcar como leídas
  app.post("/api/notifications/:id_usuario/read", async (req, res) => {
    try {
      const id_usuario = Number(req.params.id_usuario);
      if (Number.isNaN(id_usuario)) return res.status(400).json({ success: false, message: "ID inválido" });
      const { ids } = req.body as { ids?: number[] };
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ success: false, message: 'Sin IDs' });
      const count = await storage.markNotificationsRead(id_usuario, ids);
      res.json({ success: true, count });
    } catch (e) {
      console.error('Error marcando notificaciones:', e);
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  });
  
  // Ruta de registro
  app.post("/api/register", async (req, res) => {
    try {
      const userData = insertUsuarioSchema.parse(req.body);
      
      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash(userData.contraseña, 10);
      
      // Crear usuario con contraseña hasheada
      const userWithHashedPassword = {
        ...userData,
        contraseña: hashedPassword,
      };
      
      const newUser = await storage.insertUsuario(userWithHashedPassword);
      
      // No devolver la contraseña
      const { contraseña, ...userResponse } = newUser;
      
      res.status(201).json({ 
        success: true, 
        message: "Usuario creado exitosamente", 
        user: userResponse 
      });

      // Notificación administrativa: nuevo usuario registrado (para todos los admins)
      try {
        const admins = (await storage.listUsuarios()).filter(u => u.role === 'Admin');
        const title = 'Nuevo usuario registrado';
        const msg = `Se ha registrado ${userResponse.nombre} ${userResponse.apellido} (${userResponse.email}).`;
        for (const admin of admins) {
          await storage.createNotification({
            id_usuario: admin.id_usuario,
            tipo: 'general',
            titulo: title,
            mensaje: msg,
            dedupe_key: `admin_newuser_${userResponse.id_usuario}`,
          });
        }
      } catch (e) {
        console.warn('No se pudo crear notificación administrativa de alta de usuario:', e);
      }
    } catch (error) {
      console.error("Error en registro:", error);
      res.status(400).json({ 
        success: false, 
        message: error instanceof Error ? error.message : "Error al crear usuario" 
      });
    }
  });

  // Ruta de login
  app.post("/api/login", async (req, res) => {
    try {
      console.log("[LOGIN] body recibido:", req.body);
      const loginData = loginUsuarioSchema.parse(req.body);
      
      // Buscar usuario por email
      const user = await storage.getUsuarioByEmail(loginData.email);
      console.log("[LOGIN] usuario encontrado:", user ? { email: user.email, id: user.id_usuario } : null);
      
      if (!user) {
        return res.status(401).json({ 
          success: false, 
          message: "Email o contraseña incorrectos" 
        });
      }
      
      // Verificar contraseña
      console.log("[LOGIN] comparando contraseña… input length:", loginData.contraseña?.length, "hash length:", user.contraseña.length);
      const isPasswordValid = await bcrypt.compare(loginData.contraseña, user.contraseña);
      console.log("[LOGIN] resultado bcrypt.compare =", isPasswordValid);
      
      if (!isPasswordValid) {
        return res.status(401).json({ 
          success: false, 
          message: "Email o contraseña incorrectos" 
        });
      }
      
      // Login exitoso - no devolver la contraseña
      const { contraseña, ...userResponse } = user;
      
      res.json({ 
        success: true, 
        message: "Login exitoso", 
        user: userResponse,
        isAdmin: user.role === 'Admin'
      });
    } catch (error) {
      console.error("Error en login:", error);
      res.status(400).json({ 
        success: false, 
        message: "Error en el login" 
      });
    }
  });

  // Endpoint temporal para depuración (solo desarrollo)
  app.post("/api/verify-hash", async (req, res) => {
    try {
      const { email, contraseña } = req.body;
      if (!email || !contraseña) {
        return res.status(400).json({ ok: false, message: "Falta email o contraseña" });
      }
      const user = await storage.getUsuarioByEmail(email);
      if (!user) return res.status(404).json({ ok: false, message: "Usuario no encontrado" });

      const valid = await bcrypt.compare(contraseña, user.contraseña);
      return res.json({
        ok: true,
        email: user.email,
        hash: user.contraseña,
        valid,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ ok: false, message: "Error interno" });
    }
  });

  // Endpoint de estadísticas admin (simple: total de usuarios)
  app.get('/api/admin/stats', async (req, res) => {
    try {
      const usersCount = await storage.countUsuarios();
      res.json({ success: true, usersCount });
    } catch (e) {
      console.error('Error obteniendo estadísticas admin:', e);
      res.status(500).json({ success: false, message: 'Error obteniendo estadísticas' });
    }
  });

  // Actualización de perfil usuario (PUT /api/users/:id)
  app.put('/api/users/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      if (Number.isNaN(id)) return res.status(400).json({ success: false, message: 'ID inválido' });
      // Validar body parcial
      const parsed = updateUsuarioSchema.parse(req.body);
      const updated = await storage.updateUsuario(id, parsed);
      const { contraseña, ...userResponse } = updated;
      res.json({ success: true, user: userResponse });
    } catch (e) {
      console.error('Error actualizando usuario:', e);
      if (e instanceof Error) {
        return res.status(400).json({ success: false, message: e.message });
      }
      res.status(500).json({ success: false, message: 'Error interno' });
    }
  });

  // Listado básico de usuarios para admin
  app.get('/api/admin/users', async (_req, res) => {
    try {
      const users = await storage.listUsuarios();
      res.json({ success: true, users });
    } catch (e) {
      console.error('Error listando usuarios:', e);
      res.status(500).json({ success: false, message: 'Error listando usuarios' });
    }
  });

  // Registrar rutas FHIR (POC de actividad -> Observation)
  app.use('/fhir', fhirRouter);


  // Enviar notificación por correo (admin)
  app.post('/api/admin/send-email-notification', async (req, res) => {
    try {
      const { userIds, message, subject } = req.body;
      
      if (!message || !userIds || !Array.isArray(userIds)) {
        return res.status(400).json({ 
          success: false, 
          message: 'Faltan datos: se requiere message y userIds (array)' 
        });
      }

      // Obtener emails de los usuarios seleccionados
      const users = await storage.listUsuarios();
      const targetUsers = users.filter(u => userIds.includes(u.id_usuario));

      if (targetUsers.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'No se encontraron usuarios con los IDs proporcionados' 
        });
      }

      // Enviar correos
      const emailPromises = targetUsers.map(user => 
        sendEmailNotification({
          to: user.email,
          subject: subject || '📩 Notificación de Control+',
          message: message
        })
      );

      await Promise.all(emailPromises);

      // Crear notificación en la BD para cada usuario
      const notificationPromises = targetUsers.map(user =>
        storage.createNotification({
          id_usuario: user.id_usuario,
          tipo: 'general',
          titulo: subject || 'Notificación del administrador',
          mensaje: message,
          dedupe_key: `admin_email_${Date.now()}_${user.id_usuario}`
        })
      );

      await Promise.all(notificationPromises);

      res.json({ 
        success: true, 
        message: `Correos enviados a ${targetUsers.length} usuario(s)`,
        sentCount: targetUsers.length 
      });
    } catch (error) {
      console.error('Error enviando notificaciones por correo:', error);
      res.status(500).json({ 
        success: false, 
        message: error instanceof Error ? error.message : 'Error al enviar correos' 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
