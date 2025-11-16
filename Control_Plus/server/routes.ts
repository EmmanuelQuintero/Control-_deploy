import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcrypt";
import { insertUsuarioSchema, loginUsuarioSchema, updateUsuarioSchema } from "@shared/schema";
import { evaluateAndCreateNotificationsForUserOnDate } from "./notifications";
import { sendEmailNotification } from "./email";
import fhirRouter from './fhir/routes';

export async function registerRoutes(app: Express): Promise<Server> {
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
