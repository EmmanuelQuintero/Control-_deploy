# Documentación Técnica - Control+ (Wellness Monitoring Application)

## Índice

1. [Arquitectura General](#arquitectura-general)
2. [Integración Frontend-Backend](#integración-frontend-backend)
3. [Endpoints API Consumidos](#endpoints-api-consumidos)
4. [Manejo de Estados](#manejo-de-estados)
5. [Estructura de Componentes](#estructura-de-componentes)
6. [Base de Datos](#base-de-datos)
7. [Autenticación y Autorización](#autenticación-y-autorización)
8. [Flujos de Datos Principales](#flujos-de-datos-principales)
9. [Scripts y Utilidades](#scripts-y-utilidades)
10. [Variables de Entorno](#variables-de-entorno)
11. [Despliegue](#despliegue)
12. [Consideraciones de Testing](#consideraciones-de-testing)

---

## 1. Arquitectura General

### Stack Tecnológico

**Frontend:**

- React 18 con TypeScript
- Vite como bundler y servidor de desarrollo
- Wouter para enrutamiento client-side
- TanStack Query (React Query) para gestión de cache y estado asíncrono
- Shadcn/ui para componentes UI
- Tailwind CSS para estilos
- Framer Motion para animaciones
- Recharts para visualización de datos

**Backend:**

- Node.js con Express
- TypeScript
- Drizzle ORM para interacciones con base de datos
- MySQL como base de datos relacional
- bcrypt para hashing de contraseñas
- Zod para validación de esquemas

### Estructura Monolítica

La aplicación sigue una arquitectura monolítica con separación clara entre:

- **`client/`**: Todo el código del frontend (React SPA)
- **`server/`**: API REST con Express
- **`shared/`**: Esquemas compartidos entre frontend y backend (schema.ts)

---

## 2. Integración Frontend-Backend

### Modo Desarrollo

En desarrollo, se ejecutan dos procesos:

- **Vite Dev Server** (puerto 5000) sirve el frontend
- **Express Server** (puerto 5000) expone la API REST

Vite proxy redirige las peticiones a `/api/*` al backend Express.

**Configuración en `vite.config.ts`:**

```typescript
server: {
  proxy: {
    '/api': {
      target: 'http://localhost:5000',
      changeOrigin: true
    }
  }
}
```

### Modo Producción

Express sirve tanto el frontend estático (build de Vite) como la API:

```typescript
// server/vite.ts
app.use(express.static(path.join(__dirname, "../dist/public")));
app.use("*", (req, res) => {
  res.sendFile(path.resolve(__dirname, "../dist/public/index.html"));
});
```

---

## 3. Endpoints API Consumidos

### 3.1 Autenticación

#### POST `/api/register`

**Descripción:** Registro de nuevo usuario.

**Request Body:**

```typescript
{
  nombre: string;
  email: string;
  contraseña: string;
  fecha_nacimiento: string; // formato: "YYYY-MM-DD"
  peso: number | string;
  altura: number | string;
  genero: "Masculino" | "Femenino" | "Otro";
  objetivo_salud: string;
  role?: "User" | "Admin";
}
```

**Response (201):**

```typescript
{
  success: true;
  message: "Usuario creado exitosamente";
  user: {
    id_usuario: number;
    nombre: string;
    email: string;
    // ... resto de campos excepto contraseña
  }
}
```

**Proceso:**

1. Valida datos con `insertUsuarioSchema` (Zod)
2. Hashea contraseña con bcrypt (10 rounds)
3. Inserta usuario en DB con `storage.insertUsuario()`
4. Devuelve usuario sin contraseña

---

#### POST `/api/login`

**Descripción:** Autenticación de usuario.

**Request Body:**

```typescript
{
  email: string;
  contraseña: string;
}
```

**Response (200):**

```typescript
{
  success: true;
  message: "Login exitoso";
  user: { /* datos del usuario sin contraseña */ };
  isAdmin: boolean;
}
```

**Response (401):**

```typescript
{
  success: false;
  message: "Email o contraseña incorrectos";
}
```

**Proceso:**

1. Busca usuario por email: `storage.getUsuarioByEmail()`
2. Compara contraseña con bcrypt: `bcrypt.compare()`
3. Devuelve datos del usuario (sin contraseña)

---

### 3.2 Actividad Física

#### POST `/api/activity`

**Descripción:** Registra o actualiza actividad física del día.

**Request Body:**

```typescript
{
  id_usuario: number;
  fecha: string; // "YYYY-MM-DD"
  pasos: number;
  duracion_minutos: number;
}
```

**Response (201):**

```typescript
{
  success: true;
  message: "Actividad registrada o actualizada";
}
```

**Lógica:**

- Si existe registro para `(id_usuario, fecha)`, se actualiza (UPSERT)
- Clave compuesta: PRIMARY KEY (id_usuario, fecha)

---

#### GET `/api/activity/:id_usuario`

**Descripción:** Consulta historial de actividad física.

**Query Params:**

- `from` (opcional): fecha inicio (YYYY-MM-DD)
- `to` (opcional): fecha fin (YYYY-MM-DD)

**Response (200):**

```typescript
{
  success: true;
  actividades: [
    {
      id_usuario: number;
      fecha: string;
      pasos: number;
      duracion_minutos: number;
      calorias_quemadas: number;
    },
    // ...
  ]
}
```

---

### 3.3 Alimentación

#### GET `/api/nutrition/:id_usuario`

**Descripción:** Consulta historial de alimentación.

**Query Params:**

- `from` (opcional): fecha inicio
- `to` (opcional): fecha fin

**Response (200):**

```typescript
{
  success: true;
  alimentacion: [
    {
      id_alimentacion: number;
      id_usuario: number;
      fecha: string;
      tipo_comida: string;
      descripcion: string;
      calorias: number;
      proteinas: number;
      carbohidratos: number;
      grasas: number;
    },
    // ...
  ]
}
```

---

### 3.4 Sueño

#### GET `/api/sleep/:id_usuario`

**Descripción:** Consulta historial de sueño.

**Query Params:**

- `from` (opcional): fecha inicio
- `to` (opcional): fecha fin

**Response (200):**

```typescript
{
  success: true;
  sueno: [
    {
      id_sueno: number;
      id_usuario: number;
      fecha: string;
      horas_dormidas: number;
      calidad_sueno: string;
    },
    // ...
  ]
}
```

---

### 3.5 Gestión de Usuarios (Admin)

#### GET `/api/admin/stats`

**Descripción:** Estadísticas generales (total usuarios).

**Response (200):**

```typescript
{
  success: true;
  usersCount: number;
}
```

---

#### GET `/api/admin/users`

**Descripción:** Lista todos los usuarios (admin).

**Response (200):**

```typescript
{
  success: true;
  users: [
    { id_usuario, nombre, email, fecha_nacimiento, peso, altura, genero, objetivo_salud, role },
    // ...
  ]
}
```

---

#### PUT `/api/users/:id`

**Descripción:** Actualiza perfil de usuario.

**Request Body (parcial):**

```typescript
{
  nombre?: string;
  email?: string;
  peso?: number | string;
  altura?: number | string;
  genero?: string;
  objetivo_salud?: string;
}
```

**Response (200):**

```typescript
{
  success: true;
  user: { /* usuario actualizado sin contraseña */ }
}
```

---

### 3.6 Endpoint de Depuración

#### POST `/api/verify-hash`

**Descripción:** Verifica hash de contraseña (solo desarrollo).

**Request Body:**

```typescript
{
  email: string;
  contraseña: string;
}
```

**Response (200):**

```typescript
{
  ok: true;
  email: string;
  hash: string;
  valid: boolean;
}
```

---

## 4. Manejo de Estados

### 4.1 Context API

#### AuthContext (`client/src/contexts/AuthContext.tsx`)

**Propósito:** Gestión global de sesión de usuario.

**Estado:**

```typescript
{
  user: User | null;
  login: (email, contraseña) => Promise<void>;
  register: (userData) => Promise<void>;
  logout: () => void;
  updateUser: (userData) => void;
}
```

**Persistencia:**

- Guarda `user` en `localStorage` como `control-plus-user`
- Restaura sesión al cargar la app

**Flujo de Login:**

1. `login(email, contraseña)` → POST `/api/login`
2. Si exitoso, guarda `user` en estado y `localStorage`
3. Navega a `/dashboard`

**Flujo de Registro:**

1. `register(userData)` → POST `/api/register`
2. Si exitoso, guarda `user` en estado y `localStorage`
3. Navega a `/dashboard`

---

#### ThemeProvider (`client/src/components/theme-provider.tsx`)

**Propósito:** Gestión de tema claro/oscuro.

**Estado:**

```typescript
{
  theme: "light" | "dark" | "system";
  setTheme: (theme) => void;
}
```

**Persistencia:**

- Guarda preferencia en `localStorage` como `vite-ui-theme`

---

### 4.2 Estado Local (useState)

**Uso extensivo en páginas:**

- **Dashboard:** `healthData`, `loading`, `error`
- **Exercise:** `selectedTab`, `selectedRoutine`, `duration`, `steps`, `loading`, `error`
- **Nutrition/Sleep:** Estados para formularios y visualizaciones

---

### 4.3 Actualización en Tiempo Real (Event-Driven)

**Mecanismo:**
Comunicación entre páginas mediante Custom Events:

```typescript
// En Exercise page (después de registrar actividad):
window.dispatchEvent(new Event('health-data-updated'));

// En Dashboard (listener):
useEffect(() => {
  const handleUpdate = () => fetchHealthData();
  window.addEventListener('health-data-updated', handleUpdate);
  return () => window.removeEventListener('health-data-updated', handleUpdate);
}, [user]);
```

**Beneficio:**

- Dashboard se actualiza automáticamente cuando usuario registra actividad en otra página
- No requiere recargar la página ni polling

---

## 5. Estructura de Componentes

### 5.1 Páginas (Pages)

#### `dashboard.tsx`

**Propósito:** Vista principal con resumen de salud del usuario.

**Funcionalidades:**

- Visualiza pasos, calorías, horas de sueño del día
- Calcula progreso hacia objetivos diarios
- Muestra actividad reciente (últimos 7 días)
- Gráfico de tendencias semanales

**Datos consultados:**

- `GET /api/activity/:id_usuario?from=...&to=...`
- `GET /api/nutrition/:id_usuario?from=...&to=...`
- `GET /api/sleep/:id_usuario?from=...&to=...`

**Componentes utilizados:**

- `StatCard` (métricas principales)
- `ProgressRing` (objetivos diarios)
- `ActivityLog` (actividad reciente)

---

#### `exercise.tsx`

**Propósito:** Registro de actividad física y rutinas de ejercicio.

**Funcionalidades:**

- 5 rutinas pre-definidas: Full Body, Leg & Glute, Cardio HIIT, Back & Shoulders, Core & Abs
- Cada rutina incluye 4-5 ejercicios con sets, reps, duración
- Formulario para registrar pasos y duración
- Animaciones con Framer Motion

**Rutinas disponibles:**

1. **Full Body Strength** (4 ejercicios, 40-45 min)
2. **Leg & Glute Focus** (5 ejercicios, 50 min)
3. **Cardio HIIT** (4 ejercicios, 30-35 min)
4. **Back & Shoulders** (5 ejercicios, 45-50 min)
5. **Core & Abs** (4 ejercicios, 30 min)

**Flujo de registro:**

1. Usuario ingresa pasos y duración
2. POST `/api/activity` con `{ id_usuario, fecha, pasos, duracion_minutos }`
3. Dispatch event `health-data-updated`
4. Dashboard se actualiza automáticamente

---

#### `nutrition.tsx`

**Propósito:** Registro y visualización de alimentación.

**Funcionalidades:**

- Formulario para registrar comidas (tipo, descripción, macros)
- Historial de alimentación
- Visualización de macronutrientes

---

#### `sleep.tsx`

**Propósito:** Registro y análisis de sueño.

**Funcionalidades:**

- Registro de horas dormidas y calidad
- Gráfico de tendencias de sueño (7 días)
- Componente `SleepChart` con Recharts

---

#### `profile.tsx`

**Propósito:** Visualización y edición de perfil de usuario.

**Funcionalidades:**

- Muestra datos personales (nombre, email, peso, altura, etc.)
- Formulario de actualización
- PUT `/api/users/:id` para guardar cambios
- Actualiza `AuthContext` localmente

---

#### `admin-dashboard.tsx`

**Propósito:** Panel de administración.

**Funcionalidades:**

- Estadísticas generales (total usuarios)
- Listado completo de usuarios (`UserListTable`)
- Acceso restringido por rol

---

#### `auth-page.tsx`

**Propósito:** Página de autenticación (login/registro).

**Componentes:**

- `LoginForm`: formulario de login
- `RegisterForm`: formulario de registro con validaciones

---

### 5.2 Componentes de UI (Shadcn/ui)

Ubicados en `client/src/components/ui/`:

- `button.tsx`, `card.tsx`, `input.tsx`, `select.tsx`, etc.
- Basados en Radix UI primitives
- Estilizados con Tailwind CSS y variantes (cva)

---

### 5.3 Componentes de Dominio

#### `StatCard` (`stat-card.tsx`)

**Propósito:** Tarjeta de métrica individual.

**Props:**

```typescript
{
  title: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: { value: number; isPositive: boolean };
}
```

---

#### `ProgressRing` (`progress-ring.tsx`)

**Propósito:** Indicador circular de progreso.

**Props:**

```typescript
{
  progress: number; // 0-100
  label: string;
  size?: number;
}
```

---

#### `ActivityLog` (`activity-log.tsx`)

**Propósito:** Lista de actividades recientes.

**Props:**

```typescript
{
  activities: Array<{
    type: string;
    description: string;
    time: string;
    icon: React.ReactNode;
  }>;
}
```

---

#### `SleepChart` (`sleep-chart.tsx`)

**Propósito:** Gráfico de barras para visualizar horas de sueño.

**Librería:** Recharts (BarChart)

---

#### `MealCard` (`meal-card.tsx`)

**Propósito:** Tarjeta visual para mostrar comida registrada.

**Props:**

```typescript
{
  meal: {
    tipo_comida: string;
    descripcion: string;
    calorias: number;
    proteinas: number;
    carbohidratos: number;
    grasas: number;
  };
}
```

---

## 6. Base de Datos

### 6.1 Motor

**MySQL** con **Drizzle ORM** para consultas tipo-safe.

### 6.2 Configuración (`drizzle.config.ts`)

```typescript
export default {
  schema: "./shared/schema.ts",
  out: "./migrations",
  dialect: "mysql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
};
```

---

### 6.3 Esquema de Tablas

#### Tabla `usuarios`

```sql
CREATE TABLE usuarios (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  contraseña VARCHAR(255) NOT NULL,
  fecha_nacimiento DATE,
  peso DECIMAL(5,2),
  altura DECIMAL(5,2),
  genero ENUM('Masculino', 'Femenino', 'Otro'),
  objetivo_salud TEXT,
  fecha_registro TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  role ENUM('User', 'Admin') DEFAULT 'User'
);
```

**Campos clave:**

- `contraseña`: hash bcrypt (60 caracteres)
- `role`: "User" o "Admin" para control de acceso
- `peso`, `altura`: DECIMAL para precisión

---

#### Tabla `actividadfisica`

```sql
CREATE TABLE actividadfisica (
  id_usuario INT NOT NULL,
  fecha DATE NOT NULL,
  pasos INT DEFAULT 0,
  duracion_minutos INT DEFAULT 0,
  calorias_quemadas INT DEFAULT 0,
  PRIMARY KEY (id_usuario, fecha),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
```

**Clave primaria compuesta:** `(id_usuario, fecha)` → un registro por usuario/día.

---

#### Tabla `alimentacion`

```sql
CREATE TABLE alimentacion (
  id_alimentacion INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  fecha DATE NOT NULL,
  tipo_comida VARCHAR(50),
  descripcion TEXT,
  calorias INT,
  proteinas INT,
  carbohidratos INT,
  grasas INT,
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
```

---

#### Tabla `sueno`

```sql
CREATE TABLE sueno (
  id_sueno INT PRIMARY KEY AUTO_INCREMENT,
  id_usuario INT NOT NULL,
  fecha DATE NOT NULL,
  horas_dormidas DECIMAL(4,2),
  calidad_sueno VARCHAR(50),
  FOREIGN KEY (id_usuario) REFERENCES usuarios(id_usuario) ON DELETE CASCADE
);
```

---

### 6.4 ORM - Drizzle

**Definición en `shared/schema.ts`:**

```typescript
export const usuarios = mysqlTable("usuarios", {
  id_usuario: int("id_usuario").primaryKey().autoincrement(),
  nombre: varchar("nombre", { length: 100 }).notNull(),
  email: varchar("email", { length: 100 }).notNull().unique(),
  contraseña: varchar("contraseña", { length: 255 }).notNull(),
  // ... resto de campos
});
```

**Acceso a datos (`server/storage.ts`):**

```typescript
export const storage = {
  async getUsuarioByEmail(email: string) {
    const [user] = await db.select().from(usuarios).where(eq(usuarios.email, email));
    return user;
  },
  
  async insertUsuario(data) {
    const [newUser] = await db.insert(usuarios).values(data).$returningId();
    return this.getUsuarioById(newUser.id_usuario);
  },
  
  // ... más métodos
};
```

---

### 6.5 Consideraciones sobre DECIMAL

**Problema:** MySQL DECIMAL requiere strings, pero formularios envían numbers.

**Solución en `schema.ts`:**

```typescript
export const insertUsuarioSchema = z.object({
  // ...
  peso: z.union([z.number(), z.string()]).optional(),
  altura: z.union([z.number(), z.string()]).optional(),
});
```

**Conversión en `storage.ts`:**

```typescript
async insertUsuario(data: InsertUsuario) {
  const dataWithStrings = {
    ...data,
    peso: data.peso !== undefined ? String(data.peso) : undefined,
    altura: data.altura !== undefined ? String(data.altura) : undefined,
  };
  // ... insert
}
```

---

## 7. Autenticación y Autorización

### 7.1 Hashing de Contraseñas

**Librería:** bcrypt

**Proceso de Registro:**

```typescript
const hashedPassword = await bcrypt.hash(userData.contraseña, 10); // 10 rounds
```

**Proceso de Login:**

```typescript
const isPasswordValid = await bcrypt.compare(loginData.contraseña, user.contraseña);
```

---

### 7.2 Sesión de Usuario

**Almacenamiento:** localStorage

**Clave:** `control-plus-user`

**Contenido:**

```json
{
  "id_usuario": 1,
  "nombre": "John Doe",
  "email": "john@example.com",
  "role": "User",
  // ... resto de datos (sin contraseña)
}
```

**Restauración al cargar app:**

```typescript
useEffect(() => {
  const storedUser = localStorage.getItem('control-plus-user');
  if (storedUser) {
    setUser(JSON.parse(storedUser));
  }
}, []);
```

---

### 7.3 Protección de Rutas

**Implementación en `App.tsx`:**

```typescript
function App() {
  const { user } = useAuth();
  
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      
      {user ? (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/exercise" component={Exercise} />
          {user.role === 'Admin' && (
            <Route path="/admin" component={AdminDashboard} />
          )}
        </>
      ) : (
        <Redirect to="/auth" />
      )}
    </Switch>
  );
}
```

---

### 7.4 Control de Acceso por Rol

**Roles:**

- `User`: acceso a dashboard, exercise, nutrition, sleep, profile
- `Admin`: acceso adicional a admin dashboard con gestión de usuarios

**Verificación:**

```typescript
if (user.role === 'Admin') {
  // Mostrar opciones de admin
}
```

---

## 8. Flujos de Datos Principales

### 8.1 Flujo de Registro

```
Usuario → RegisterForm → POST /api/register
                              ↓
                    Validación (Zod schema)
                              ↓
                    Hash contraseña (bcrypt)
                              ↓
                    INSERT en tabla usuarios
                              ↓
                    Response { user, success }
                              ↓
AuthContext.register() → Guarda en localStorage → Navega a /dashboard
```

---

### 8.2 Flujo de Login

```
Usuario → LoginForm → POST /api/login
                           ↓
                   Buscar usuario por email
                           ↓
                   Verificar contraseña (bcrypt.compare)
                           ↓
                   Response { user, isAdmin }
                           ↓
AuthContext.login() → Guarda en localStorage → Navega a /dashboard
```

---

### 8.3 Flujo de Actualización de Perfil

```
Usuario → ProfileView → Edita campos → PUT /api/users/:id
                                            ↓
                                  Validación (updateUsuarioSchema)
                                            ↓
                                  UPDATE en tabla usuarios
                                            ↓
                                  Response { user }
                                            ↓
AuthContext.updateUser() → Actualiza localStorage → UI refleja cambios
```

---

### 8.4 Flujo de Registro de Actividad Física

```
Usuario → Exercise Page → Ingresa pasos y duración → POST /api/activity
                                                           ↓
                                                  UPSERT en actividadfisica
                                                           ↓
                                                  Response { success }
                                                           ↓
                                    Dispatch event 'health-data-updated'
                                                           ↓
                                    Dashboard escucha evento → fetchHealthData()
                                                           ↓
                                    GET /api/activity/:id_usuario (últimos 7 días)
                                                           ↓
                                    Actualiza UI con nuevos datos
```

---

### 8.5 Flujo de Agregación de Datos en Dashboard

```
Dashboard mount → useEffect → fetchHealthData()
                                    ↓
          Fetch paralelo de 3 endpoints:
          - GET /api/activity/:id_usuario?from=...&to=...
          - GET /api/nutrition/:id_usuario?from=...&to=...
          - GET /api/sleep/:id_usuario?from=...&to=...
                                    ↓
          Procesar respuestas:
          - Sumar pasos del día
          - Sumar calorías consumidas
          - Obtener horas de sueño
          - Calcular tendencias (últimos 7 días)
          - Construir array de actividad reciente
                                    ↓
          Actualizar estado local (healthData)
                                    ↓
          Re-render con nuevos datos
```

---

## 9. Scripts y Utilidades

### 9.1 Script de Generación de Hashes

**Ubicación:** `server/scripts/generatePasswordHashes.ts`

**Propósito:** Generar hashes bcrypt para contraseñas de prueba.

**Uso:**

```bash
cd server/scripts
npx tsx generatePasswordHashes.ts
```

**Código:**

```typescript
import bcrypt from "bcrypt";

const passwords = [
  "admin123",
  "user123",
  "test123",
  "password123",
  "demo123"
];

async function generateHashes() {
  console.log("Generando hashes bcrypt...\n");
  for (const pwd of passwords) {
    const hash = await bcrypt.hash(pwd, 10);
    console.log(`Contraseña: ${pwd}`);
    console.log(`Hash: ${hash}\n`);
  }
}

generateHashes();
```

---

### 9.2 Script de Limpieza de Actividades

**Ubicación:** `server/scripts/cleanupActividadFisica.ts`

**Propósito:** Eliminar registros duplicados o limpiar datos inconsistentes.

---

## 10. Variables de Entorno

### Archivo `.env` (raíz del proyecto)

```env
DATABASE_URL=mysql://usuario:contraseña@localhost:3306/control_plus
NODE_ENV=development
PORT=5000
```

**Variables clave:**

- `DATABASE_URL`: Conexión a MySQL (usado por Drizzle)
- `NODE_ENV`: "development" o "production"
- `PORT`: Puerto del servidor Express (default: 5000)

---

## 11. Despliegue

### 11.1 Build de Producción

```bash
# Instalar dependencias
npm install

# Build del frontend (Vite)
npm run build

# Ejecutar servidor
npm run start
```

**Resultado:**

- Frontend compilado en `dist/public/`
- Express sirve archivos estáticos + API

---

### 11.2 Consideraciones

1. **Base de Datos:**
   - Configurar MySQL en servidor
   - Ejecutar migraciones: `npx drizzle-kit push:mysql`

2. **Variables de Entorno:**
   - Configurar `DATABASE_URL` en producción
   - Asegurar `NODE_ENV=production`

3. **Seguridad:**
   - Usar HTTPS
   - Configurar CORS si frontend y backend están en dominios diferentes
   - Rotar secrets de bcrypt rounds si es necesario

4. **Escalabilidad:**
   - Considerar pool de conexiones MySQL
   - Cachear consultas frecuentes (Redis)
   - Load balancer si tráfico aumenta

---

## 12. Consideraciones de Testing

### 12.1 Testing Unitario

**Frontend (React Testing Library):**

- Componentes de UI (buttons, cards, forms)
- Lógica de utilidades (`lib/utils.ts`)

**Backend (Jest):**

- Funciones de storage (`storage.ts`)
- Validaciones de Zod schemas

---

### 12.2 Testing de Integración

**API Testing (Supertest):**

- Endpoints de autenticación
- CRUD de actividades, nutrición, sueño
- Validar respuestas y códigos de estado

---

### 12.3 Testing E2E (Playwright/Cypress)

**Flujos críticos:**

1. Registro de usuario → Login → Ver dashboard
2. Registrar actividad → Verificar actualización en dashboard
3. Editar perfil → Verificar persistencia
4. Admin: acceder a admin dashboard → Ver listado de usuarios

---

## Resumen Final

**Control+** es una aplicación monolítica fullstack TypeScript que combina:

- **Frontend:** React SPA con Vite, Wouter, Shadcn/ui, Tailwind
- **Backend:** Express API con Drizzle ORM + MySQL
- **Autenticación:** bcrypt + localStorage para sesión
- **Sincronización:** Event-driven updates para UI reactiva
- **Datos:** Actividad física, nutrición, sueño con agregación diaria
- **Roles:** User y Admin con control de acceso

**Características clave:**

- Dashboard con métricas en tiempo real
- 5 rutinas de ejercicio pre-definidas
- Registro de actividad con UPSERT diario
- Historial de datos con rango de fechas
- Panel de administración
- Tema claro/oscuro persistente

**Arquitectura escalable** con separación clara de responsabilidades, validaciones tipo-safe (Zod), y ORM para consultas seguras.

---

**Documentación generada el:** 21 de octubre de 2025  
**Versión del proyecto:** 1.0.0  
**Stack:** React 18 + TypeScript + Express + MySQL + Drizzle ORM
