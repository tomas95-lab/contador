# contable. — Documentación Técnica y Funcional Completa

> **Plataforma de gestión fiscal para monotributistas argentinos con integración real a ARCA (ex-AFIP) y asistente de IA.**

---

## Tabla de Contenidos

1. [Visión General](#1-visión-general)
2. [Stack Tecnológico](#2-stack-tecnológico)
3. [Arquitectura del Sistema](#3-arquitectura-del-sistema)
4. [Base de Datos](#4-base-de-datos)
5. [Modelos de Datos](#5-modelos-de-datos)
6. [Backend Express](#6-backend-express)
7. [Integración con ARCA](#7-integración-con-arca)
8. [Frontend — Estructura y Navegación](#8-frontend--estructura-y-navegación)
9. [Secciones y Vistas](#9-secciones-y-vistas)
10. [Asistente IA — "Conta"](#10-asistente-ia--conta)
11. [Lógica de Negocio Fiscal](#11-lógica-de-negocio-fiscal)
12. [Seguridad](#12-seguridad)
13. [Configuración y Despliegue](#13-configuración-y-despliegue)
14. [Estructura de Archivos](#14-estructura-de-archivos)
15. [Scripts Disponibles](#15-scripts-disponibles)
16. [Flujo de Datos Completo](#16-flujo-de-datos-completo)
17. [Checklist de Emergencia ARCA](#17-checklist-de-emergencia-arca)

---

## 1. Visión General

**contable.** es una aplicación web especializada en la gestión fiscal de **monotributistas argentinos**. No es un sistema de facturación genérico: está construida específicamente para manejar las reglas del monotributo, la interacción con ARCA (ex-AFIP) y los recategorización bianuales.

### Propuesta de valor

| Problema                                                   | Solución                                                    |
| ---------------------------------------------------------- | ----------------------------------------------------------- |
| El monotributista no sabe cuándo va a exceder su categoría | Radar fiscal con proyección en tiempo real                  |
| Emitir facturas en ARCA es lento y error-prone             | Emisión directa desde la app con un click                   |
| El contador cobra caro por responder consultas simples     | Asistente IA "Conta" disponible 24/7                        |
| No hay visibilidad sobre el pago mensual del monotributo   | Panel de cuotas con estado pagado/pendiente                 |
| Las alertas del ARCA llegan tarde                          | Alertas proactivas calculadas localmente antes que el fisco |

### Usuarios objetivo

- **Monotributistas** — freelancers, profesionales, prestadores de servicios
- **Contadores** — panel multi-cliente (en desarrollo)
- **Exportadores de servicios** — soporte para Factura E (exportación)

### Modo demo

La app funciona sin cuenta, con datos de ejemplo, para que el usuario pruebe todas las funcionalidades antes de registrarse.

---

## 2. Stack Tecnológico

### Frontend

| Tecnología            | Versión | Rol                             |
| --------------------- | ------- | ------------------------------- |
| React                 | 19.2.4  | Framework UI                    |
| TypeScript            | ~5.9.3  | Tipado estático                 |
| Vite                  | 7.3.1   | Build tool + dev server         |
| React Router          | 7.16.0  | Enrutamiento client-side        |
| Tailwind CSS          | 4.2.1   | Estilos utilitarios             |
| shadcn/ui             | 4.7.0   | Componentes UI (Radix-based)    |
| Radix UI              | 1.4.3   | Primitivos headless accesibles  |
| Recharts              | 3.8.0   | Gráficos (área, barras, líneas) |
| @tanstack/react-table | 8.21.3  | Tablas headless                 |
| Supabase JS           | 2.106.0 | Cliente auth + base de datos    |
| react-markdown        | 10.1.0  | Renderizado de markdown         |
| lucide-react          | 1.16.0  | Íconos                          |
| next-themes           | 0.4.6   | Modo oscuro/claro               |
| sonner                | 2.0.7   | Notificaciones toast            |
| Zod                   | 4.4.3   | Validación de esquemas          |
| Geist Font            | 5.2.9   | Tipografía variable             |

### Backend

| Tecnología         | Versión | Rol                                      |
| ------------------ | ------- | ---------------------------------------- |
| Node.js            | 24.x    | Runtime                                  |
| Express            | 5.2.1   | Framework web                            |
| TypeScript         | ~5.9.3  | Tipado estático                          |
| jsonwebtoken       | 9.0.3   | Verificación JWT                         |
| jwks-rsa           | 4.0.1   | Verificación de claves públicas Supabase |
| express-rate-limit | 8.5.2   | Rate limiting                            |
| Zod                | 4.4.3   | Validación de requests                   |

### ARCA / AFIP (Integración SOAP)

| Tecnología      | Versión | Rol                                    |
| --------------- | ------- | -------------------------------------- |
| soap            | 1.9.2   | Cliente SOAP (WSAA, WSFE, WSFEX)       |
| node-forge      | 1.4.0   | Generación RSA, manejo de certificados |
| fast-xml-parser | 5.8.0   | Parsing de respuestas XML              |

### Infraestructura

| Servicio       | Propósito                                      |
| -------------- | ---------------------------------------------- |
| Supabase Cloud | Auth (GoTrue), PostgreSQL, RLS, Edge Functions |
| Vercel         | Hosting del frontend (SPA)                     |
| Render         | Hosting del backend (Node Web Service)         |

### Testing y Dev Tools

| Herramienta | Versión | Rol                |
| ----------- | ------- | ------------------ |
| Vitest      | 4.1.7   | Tests unitarios    |
| ESLint      | 9.39.4  | Linting            |
| Prettier    | 3.8.1   | Formateo de código |

---

## 3. Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────────┐
│                          USUARIO (Browser)                          │
└────────────────────────────┬────────────────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Vercel — Frontend (React/Vite)                   │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │  Resumen   │  │   Cobros   │  │Facturación │  │  Proyecciones│  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │
│                                                                     │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌──────────────┐  │
│  │   Conta    │  │   Config   │  │    ARCA    │  │    Ayuda     │  │
│  │    (IA)   │  │            │  │  Onboarding│  │              │  │
│  └────────────┘  └────────────┘  └────────────┘  └──────────────┘  │
└────────┬───────────────────────────────────────┬────────────────────┘
         │ Supabase JS SDK                        │ fetch + JWT
         ▼                                        ▼
┌─────────────────────────┐       ┌───────────────────────────────────┐
│   Supabase Cloud        │       │   Render — Backend (Express)      │
│                         │       │                                   │
│  ┌─────────────────┐    │       │  /api/credentials/generate-csr   │
│  │   PostgreSQL    │    │       │  /api/credentials/save            │
│  │   (15 tablas)   │    │       │  /api/invoices/emit               │
│  └─────────────────┘    │       │  /api/invoices/arca/historical    │
│                         │       │  /api/invoices/arca/annual-summary│
│  ┌─────────────────┐    │       │                                   │
│  │  GoTrue (Auth)  │    │       └──────────────────┬────────────────┘
│  └─────────────────┘    │                          │ SOAP + CMS
│                         │                          ▼
│  ┌─────────────────┐    │       ┌───────────────────────────────────┐
│  │ Edge Functions  │    │       │        ARCA (ex-AFIP)             │
│  │  (claude-chat)  │    │       │                                   │
│  └─────────────────┘    │       │  WSAA — Autenticación             │
│                         │       │  WSFE — Facturas C (domésticas)   │
└─────────────────────────┘       │  WSFEX — Facturas E (exportación) │
                                  └───────────────────────────────────┘
```

### Separación de responsabilidades

```
Frontend (Vercel)
  ├── Toda la UI y UX
  ├── Cálculos de proyecciones y alertas (src/lib/accounting.ts)
  ├── CRUD de datos vía Supabase SDK
  └── Comunicación con backend para operaciones ARCA

Backend (Render)
  ├── Autenticación JWT de todos los endpoints
  ├── Generación de CSR (RSA 2048-bit)
  ├── Cifrado/descifrado de credenciales ARCA
  ├── Toda la comunicación SOAP con ARCA
  └── Emisión, consulta y validación de facturas

Supabase
  ├── Auth (email/password, sessions, JWT)
  ├── PostgreSQL con RLS (cada usuario solo ve sus datos)
  ├── Edge Function claude-chat (Anthropic API proxy)
  └── Cifrado AES-256 de credenciales en base de datos
```

---

## 4. Base de Datos

La base de datos corre en **PostgreSQL (Supabase Cloud)** con Row Level Security habilitado en todas las tablas. Hay **16 migraciones** aplicadas al 29/05/2026.

### Tablas principales

```
payments               invoices              assistant_messages
─────────────          ─────────────         ────────────────────
id (uuid, PK)          id (uuid, PK)         id (uuid, PK)
date (date)            payment_id (uuid,FK)  role (text)
amount (numeric)       number (int)          content (text)
client (text)          invoice_type (text)   user_id (uuid, FK)
description (text)     point_of_sale (int)   created_at (timestamptz)
method (text)          issue_date (date)
invoice_status(text)   client (text)
source (text)          description (text)
invoice_type (text)    amount (numeric)
point_of_sale (int)    cae (text)
cae (text)             cae_expires_at (date)
receiver_cuit (text)   status (text)
user_id (uuid, FK)     user_id (uuid, FK)
created_at (timestamptz) created_at (timestamptz)
```

```
user_fiscal_profiles      user_arca_credentials      tax_settings
─────────────────         ─────────────────────      ─────────────────
user_id (uuid, PK, FK)    id (uuid, PK)              id (uuid, PK)
activity (text)           user_id (uuid, FK)         user_id (uuid, FK)
work_status (text)        cuit (text)                category_key (text)
current_category (text)   certificate (bytea)        annual_limit (numeric)
expected_monthly_income   private_key (bytea)        monthly_tax (numeric)
notes (text)              pos_wsfe (int[])           warning_at (numeric)
updated_at (timestamptz)  pos_wsfex (int[])          updated_at (timestamptz)
                          created_at (timestamptz)
                          updated_at (timestamptz)
```

```
tax_payments          tax_categories           foreign_clients
─────────────         ───────────────          ─────────────────
id (uuid, PK)         category_key (text, PK)  id (uuid, PK)
month_key (text)      annual_limit (numeric)   user_id (uuid, FK)
amount (numeric)      monthly_tax (numeric)    name (text)
paid_at (timestamptz) warning_at (numeric)     country_code (text)
user_id (uuid, FK)    updated_at (timestamptz) tax_id (text)
created_at (timestamptz)                       address (text)
                                               platform (text)
                                               created_at (timestamptz)
                                               updated_at (timestamptz)
```

```
risk_alerts
─────────────────────
id (uuid, PK)
user_id (uuid, FK)
type (text)
severity (text)      — critical | warning | info
title (text)
message (text)
action_label (text)
action_url (text)
is_read (bool)
is_resolved (bool)
metadata (jsonb)
created_at (timestamptz)
updated_at (timestamptz)
```

### Seguridad en base de datos

- **RLS activo** en todas las tablas excepto `tax_categories` (datos globales)
- **Políticas**: cada usuario solo puede leer/escribir sus propios registros (`auth.uid() = user_id`)
- **Extensión pgcrypto**: cifrado AES-256 de `certificate` y `private_key` en `user_arca_credentials`
- **Funciones SQL cifradas**: `encrypt_arca_credential()` / `decrypt_arca_credential()` con clave maestra en variable de entorno
- **Índices**: `payments_arca_historical_cae_idx` (deduplicación ARCA), `risk_alerts_user_type_period_idx`

---

## 5. Modelos de Datos

### TypeScript — Tipos del Dominio (`src/types/accounting.ts`)

#### `TaxCategory` — Categorías del monotributo

```typescript
type TaxCategory = {
  key: string // "A" | "B" | ... | "K"
  annualLimit: number // Límite anual en ARS
  monthlyTax: number // Cuota mensual en ARS
  warningAt: number // Umbral de alerta (85% del límite)
}
```

#### Categorías vigentes (2026)

| Categoría | Límite Anual (ARS) | Cuota Mensual (ARS) |  Alerta al |
| :-------: | -----------------: | ------------------: | ---------: |
|     A     |         10.200.000 |              42.387 |  8.670.000 |
|     B     |         14.400.000 |              47.399 | 12.240.000 |
|     C     |         21.600.000 |              55.045 | 18.360.000 |
|     D     |         28.800.000 |              63.634 | 24.480.000 |
|     E     |         36.000.000 |              80.576 | 30.600.000 |
|     F     |         45.600.000 |             100.617 | 38.760.000 |
|     G     |         57.600.000 |             122.791 | 48.960.000 |
|     H     |         72.000.000 |             229.529 | 61.200.000 |
|     I     |         86.400.000 |             640.049 | 73.440.000 |
|     J     |        100.000.000 |           1.028.726 | 85.000.000 |
|     K     |        108.300.000 |           1.381.688 | 92.055.000 |

#### `IncomePayment` — Cobros registrados

```typescript
type IncomePayment = {
  id: string
  date: string                    // ISO 8601
  amount: number
  client: string
  description: string
  method: "Transferencia" | "Mercado Pago" | "Efectivo" | ...
  invoiceStatus: "Pendiente" | "Facturado" | "No aplica"
  source?: "manual" | "arca"     // Origen del registro
  invoiceType?: "C" | "E"
  pointOfSale?: number
  cae?: string                   // 14 dígitos, empieza con "7"
  receiverCuit?: string
}
```

#### `GeneratedInvoice` — Facturas emitidas

```typescript
type GeneratedInvoice = {
  id: string
  paymentId: string
  number: number // Secuencial por punto de venta
  invoiceType: "C" | "E"
  pointOfSale: number
  issueDate: string
  client: string
  description: string
  amount: number
  cae: string // Código autorización electrónica
  caeExpiresAt: string
  status: "active" | "cancelled"
}
```

#### `ProactiveAlert` — Alertas de riesgo

```typescript
type ProactiveAlert = {
  id: string
  type: string
  severity: "critical" | "error" | "warning" | "info"
  title: string
  message: string
  actionLabel?: string
  actionUrl?: string
  isRead: boolean
  isResolved: boolean
}
```

#### `AppSection` — Secciones navegables

```typescript
type AppSection =
  | "resumen"
  | "cobros"
  | "asistente"
  | "facturacion"
  | "proyecciones"
  | "clientes"
  | "arca"
  | "configuracion"
  | "ayuda"
```

---

## 6. Backend Express

**Archivo principal:** `server/index.ts` (Express 5, Node 24)

### Autenticación JWT

Todos los endpoints protegidos validan el JWT emitido por Supabase:

- Algoritmo: **ES256**
- JWKS endpoint de Supabase para verificación de clave pública
- Middleware `authenticateJwt` → extrae `req.userId` del token

### Endpoints

| Método | Ruta                                | Rate Limit             | Descripción                                         |
| ------ | ----------------------------------- | ---------------------- | --------------------------------------------------- |
| GET    | `/api/health`                       | Global (100/min)       | Health check del backend                            |
| GET    | `/api/credentials/status`           | JWT requerido          | ¿Tiene el usuario credenciales ARCA configuradas?   |
| POST   | `/api/credentials/generate-csr`     | **3/hora** por usuario | Genera CSR RSA-2048 para solicitar certificado ARCA |
| POST   | `/api/credentials/save`             | JWT requerido          | Guarda certificado + clave + puntos de venta        |
| POST   | `/api/invoices/emit`                | **10/min** por usuario | Emite factura en ARCA (WSAA + WSFE/WSFEX)           |
| GET    | `/api/invoices/arca/annual-summary` | **5/min** por usuario  | Resumen anual de ventas por punto de venta          |
| GET    | `/api/invoices/arca/historical`     | **5/min** por usuario  | Historial paginado de facturas desde ARCA           |
| GET    | `/api/invoices/arca/points-of-sale` | **5/min** por usuario  | Puntos de venta disponibles para WSFE               |

### Manejo de errores

```
ZodError          → 400 (detalles de validación)
ArcaError         → código HTTP apropiado + mensaje en español traducido
JWT inválido      → 401
Sin credenciales  → 404
Error interno     → 500 (mensaje genérico, sin detalles internos)
```

### Variables de entorno del backend

```env
PORT=3001
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=...
ARCA_ENCRYPTION_KEY=...

ARCA_ENV=homologacion              # o "production"
ARCA_CMS_DIGEST=sha256
ARCA_CACHE_DIR=.arca-cache
ARCA_REQUEST_TIMEOUT_MS=15000
ARCA_HISTORICAL_PAGE_SIZE=100
ARCA_HISTORICAL_MAX_INVOICES_PER_QUERY=500
ARCA_DEFAULT_CONDICION_IVA_RECEPTOR_ID=5
```

---

## 7. Integración con ARCA

ARCA (ex-AFIP) expone sus servicios mediante **SOAP sobre HTTPS**. La integración cubre tres servicios web federales:

### Flujo general de autenticación

```
1. Cargar certificado (CRT) + clave privada del usuario desde DB cifrada
       ↓
2. Generar CMS (firma criptográfica) con SHA-256
       ↓
3. Llamar WSAA con el CMS → obtener Token + Autorización (válidos 12hs)
       ↓
4. Cachear token solo en memoria del proceso
       ↓
5. Usar token en WSFE o WSFEX para operar
```

### WSAA (Web Service de Autenticación y Autorización)

- Genera CMS firmado con la clave privada del usuario
- Obtiene `token` + `sign` válidos por 12 horas
- Cache en memoria para evitar solicitudes repetidas sin persistir `token`/`sign` en disco

### WSFE (Web Service de Facturación Electrónica — Factura C)

| Operación                | Descripción                                     |
| ------------------------ | ----------------------------------------------- |
| `FECompUltimoAutorizado` | Obtiene el último número de comprobante emitido |
| `FECAESolicitar`         | Solicita CAE para nuevo comprobante             |
| `FECompTotXRequest`      | Consulta total de comprobantes                  |
| `FECompConsultar`        | Consulta un comprobante específico              |

**Campos de una Factura C:**

- Tipo de comprobante: 11 (Factura C)
- Punto de venta: configurable por usuario
- CUIT receptor (puede ser 0 para consumidor final)
- Condición IVA del receptor
- Importe total (sin IVA, monotributista)
- Período fiscal

### WSFEX (Web Service de Facturación de Exportación — Factura E)

| Operación        | Descripción                              |
| ---------------- | ---------------------------------------- |
| `FEXGetCMP`      | Obtiene un comprobante de exportación    |
| `FEXGetLast_CMP` | Último número emitido                    |
| `FEXAuthorize`   | Autoriza nuevo comprobante (obtiene CAE) |

**Campos adicionales en Factura E:**

- País de destino (código ISO)
- CUIT del país destino
- Nombre del cliente en el exterior
- Domicilio en el exterior
- ID fiscal extranjero
- Moneda (USD / ARS) + cotización
- Unidad de medida + cantidad
- Idioma del comprobante

### Gestión de credenciales

```
Flujo de alta de credenciales:
────────────────────────────────────────────────────────
1. Usuario pide CSR  →  Backend genera par RSA-2048
2. Clave privada almacenada EN MEMORIA 45 minutos
3. Backend devuelve CSR (texto PEM) al frontend
4. Usuario descarga CSR, va a ARCA, obtiene CRT firmado
5. Usuario sube CRT al frontend
6. Frontend envía CRT al backend
7. Backend valida: CRT ↔ clave privada + CUIT del cert = CUIT configurado
8. Backend cifra (AES-256) y guarda en Supabase
────────────────────────────────────────────────────────
La clave privada NUNCA sale del servidor en texto plano.
```

### Traducción de errores ARCA

El módulo `server/arca/errors.ts` traduce los faults SOAP de ARCA (en inglés técnico o códigos numéricos) a mensajes en español comprensibles para el usuario, preservando la información accionable sin exponer internos del sistema.

---

## 8. Frontend — Estructura y Navegación

### Rutas React Router (src/main.tsx)

```
/         →  LandingPage   (lazy loaded)
/app      →  App           (lazy loaded, dentro de ErrorBoundary)
*         →  redirect a /
```

### Marca y tema

- `public/logo/logos/` contiene los assets activos de marca: familia D en variantes `icon`, `lockup` y `wordmark`.
- `src/lib/brand-assets.ts` centraliza esas rutas para `AppSidebar`, `AuthScreen`, `Navbar`, `Footer` e `index.html`.
- El favicon apunta a `/logo/logos/icon/D-navy-32.png`.
- `ThemeProvider` usa `light` como default, persiste la preferencia en `localStorage.theme` y ya no escucha la tecla `D`.
- `ThemeToggle` vive en `src/components/theme-toggle.tsx` y se usa dentro de la app, pantalla de auth y onboarding. No se muestra en la landing pública.
- Los tokens del dark mode están en `src/index.css` y usan un navy oscuro suave en vez de negro puro.

### Layout principal (App.tsx)

```
┌─────────────────────────────────────────────────┐
│              SiteHeader                         │
│   [≡]  contable.  [Período]  [Estado datos]     │
├────────────────┬────────────────────────────────┤
│                │                                │
│   AppSidebar   │      Sección activa            │
│                │                                │
│  ○ Resumen     │  (DashboardView / IncomeTracker│
│  ○ Cobros      │   / AssistantPanel / ...)      │
│  ○ Conta       │                                │
│  ○ Facturación │                                │
│  ○ Proyecciones│                                │
│  ─────────     │                                │
│  ○ Configuración                                │
│  ○ Ayuda       │                                │
│  ─────────     │                                │
│  [Avatar]      │                                │
│  [user@mail]   │                                │
└────────────────┴────────────────────────────────┘
```

### Componentes de navegación

| Componente     | Archivo             | Función                                                  |
| -------------- | ------------------- | -------------------------------------------------------- |
| `AppSidebar`   | `app-sidebar.tsx`   | Sidebar colapsable con menú principal                    |
| `SiteHeader`   | `site-header.tsx`   | Header con título, badges de estado, trigger del sidebar |
| `NavMain`      | `nav-main.tsx`      | Ítems de navegación primaria                             |
| `NavSecondary` | `nav-secondary.tsx` | Ítems secundarios (config, ayuda)                        |
| `NavUser`      | `nav-user.tsx`      | Dropdown de perfil de usuario + sign out                 |

### Estado global (App.tsx — React hooks)

El estado de toda la aplicación vive en `App.tsx` y se pasa por props a cada sección:

```typescript
// Autenticación
session: Session | null
authStatus: "loading" | "authenticated" | "anonymous"

// Datos
payments: IncomePayment[]
invoices: GeneratedInvoice[]
assistantMessages: AssistantMessage[]
fiscalProfile: UserFiscalProfile
category: TaxCategory           // Categoría actual del usuario
allCategories: TaxCategory[]    // Todas las categorías (A-K)
taxPayments: TaxPayment[]

// Estado de la app
dataStatus: "loading" | "connected" | "local" | "demo" | "error"
arcaCredentialsStatus: "loading" | "configured" | "missing" | "error"
isDemoSession: boolean
activeSection: AppSection
isIssuingInvoice: boolean
```

### Carga diferida (lazy loading)

Cada sección principal se carga solo cuando el usuario la navega:

```typescript
const DashboardView      = React.lazy(() => import("./components/accounting/dashboard-view"))
const IncomeTracker      = React.lazy(() => import("./components/accounting/income-tracker"))
const AssistantPanel     = React.lazy(() => import("./components/accounting/assistant-panel"))
const InvoicingPanel     = React.lazy(() => import("./components/accounting/invoicing-panel"))
const ProjectionsPanel   = React.lazy(() => import("./components/accounting/projections-panel"))
const AccountantClientsPanel = React.lazy(() => ...)
const ArcaConnectView    = React.lazy(() => ...)
const SettingsView       = React.lazy(() => import("./components/settings-view"))
const HelpView           = React.lazy(() => import("./components/help-view"))
```

---

## 9. Secciones y Vistas

### 9.1 Resumen (Dashboard)

La pantalla principal. Concentra la información fiscal más crítica.

```
┌────────────────────────────────────────────────────────────────┐
│  RADAR FISCAL                                                  │
│  ┌─────────────────────────────────┐  ┌──────────────────────┐│
│  │  Riesgo: MEDIO  Score: 45/100  │  │  Margen disponible   ││
│  │  ████████████░░░░░░  67% usado │  │  Proyección anual    ││
│  │                                │  │  Fecha est. tope     ││
│  │  [Ver proyecciones →]          │  │  Sin facturar        ││
│  └─────────────────────────────────┘  └──────────────────────┘│
│                                                                │
│  ALERTAS PROACTIVAS                                           │
│  ⚠ Alcanzarás tu límite en ~35 días. Considerá recategorizar. │
│  ℹ Tienes 3 cobros sin facturar por $450.000                  │
│                                                                │
│  CATEGORÍA FISCAL    │  CUOTAS MONOTRIBUTO  │  REPORTE MENSUAL│
│  ┌─────────────────┐ │  ┌─────────────────┐ │  ┌────────────┐ │
│  │  Categoría D    │ │  │  ✓ ENE 2026     │ │  │ Mayo 2026  │ │
│  │  $28.800.000    │ │  │  ✓ FEB 2026     │ │  │ $485.000   │ │
│  │  ████░░░  67%   │ │  │  ✓ MAR 2026     │ │  │            │ │
│  └─────────────────┘ │  │  ○ ABR 2026     │ │  └────────────┘ │
│                       │  │  ● MAY 2026 HOY │ │                 │
│  GRÁFICO DE INGRESOS  │  └─────────────────┘ │                 │
│  ┌────────────────────────────────────┐       │                 │
│  │ $800k                              │       │                 │
│  │       █                            │       │                 │
│  │   █   █   █                       │       │                 │
│  │   █   █   █   █   █   █           │       │                 │
│  │  DIC ENE FEB MAR ABR MAY          │       │                 │
│  └────────────────────────────────────┘       │                 │
└────────────────────────────────────────────────────────────────┘
```

**Componentes del dashboard:**

| Componente          | Archivo                    | Contenido                                                    |
| ------------------- | -------------------------- | ------------------------------------------------------------ |
| `RiskStatusCard`    | (dentro de dashboard-view) | Nivel de riesgo, score 0-100, barra de uso, 4 métricas clave |
| `ProactiveAlerts`   | `proactive-alerts.tsx`     | Alertas calculadas + sincronizadas con backend, dismissibles |
| `SectionCards`      | `section-cards.tsx`        | Cards de categoría actual con límite, uso y margen           |
| `RevenueChart`      | `revenue-chart.tsx`        | Gráfico de barras Recharts (6 meses)                         |
| `TaxDuesPanel`      | `tax-dues-panel.tsx`       | Estado de cuotas mensuales (pagado/pendiente/vencido)        |
| `MonthlyReportCard` | `monthly-report-card.tsx`  | Resumen del mes actual                                       |
| `PaymentsTable`     | `payments-table.tsx`       | Últimos cobros registrados                                   |

---

### 9.2 Cobros (Income Tracker)

Gestión de todos los ingresos del monotributista.

**Métricas superiores:**

- Total del mes actual
- Pendiente de facturar (acumulado)
- Cantidad de cobros del mes

**Formulario de carga:**

| Campo             | Tipo        | Validación                                    |
| ----------------- | ----------- | --------------------------------------------- |
| Fecha             | Date picker | Requerido                                     |
| Monto             | Número      | > 0, requerido                                |
| Cliente           | Texto       | Requerido                                     |
| Descripción       | Texto       | Requerido                                     |
| Método de pago    | Select      | Transferencia / Mercado Pago / Efectivo / ... |
| Estado de factura | Select      | Pendiente / Facturado / No aplica             |

**Tabla de cobros:**

- Ordenable por columnas
- Edición inline (editar todos los campos)
- Eliminación con confirmación
- Badge de estado de factura por color
- Indicador de fuente (manual / ARCA)

---

### 9.3 Facturación

Emisión y seguimiento de facturas electrónicas directamente en ARCA.

```
MÉTRICAS SUPERIORES
  Pendiente de facturar | Monto total facturado | Cantidad de facturas

COBROS PENDIENTES (izquierda)
  ┌─────────────────────────────────────────────────────┐
  │  Cobro: Cliente XYZ — $150.000 — 15/05/2026         │
  │  Tipo: [Factura C ▾]  CUIT: [_____________]         │
  │  Cond. IVA: [Consumidor Final ▾]                    │
  │  [Emitir factura →]                                 │
  ├─────────────────────────────────────────────────────┤
  │  Cobro: Empresa ABC — $200.000 — 20/05/2026         │
  │  Tipo: [Factura E ▾]                                │
  │  ▼ Datos del cliente exterior                       │
  │    Nombre, País, ID fiscal, Dirección, Plataforma   │
  │    Moneda: [USD] Cotización: [1080]                 │
  │    Equivalente ARS: $216.000.000                    │
  │    [✓ Guardar cliente]  [Emitir E →]                │
  └─────────────────────────────────────────────────────┘

FACTURAS EMITIDAS (derecha)
  Tabla con: Tipo+Número | Estado | Cliente | Monto | [↓ HTML]

PANEL ARCA (sidebar)
  Estado: Sincronizando / Preparado
  Certificado digital: Activo
  Factura C: Habilitada (POS 0001)
  Permisos ARCA: OK
  [Validar] [Consultar]
```

**Flujo de emisión:**

1. Usuario selecciona cobro pendiente
2. Elige tipo de factura (C para Argentina / E para exterior)
3. Completa datos del receptor
4. Confirma en diálogo de confirmación
5. Frontend llama `POST /api/invoices/emit` con JWT
6. Backend: WSAA obtiene token → WSFE/WSFEX emite → retorna CAE
7. Frontend actualiza el cobro (`invoiceStatus: "Facturado"`, guarda CAE)
8. Factura aparece en tabla de emitidas
9. Usuario puede descargar HTML de la factura

---

### 9.4 Proyecciones

Simulador de escenarios de categorías del monotributo.

**Métricas superiores:**

- Proyección del período actual
- Margen disponible
- Desvío proyectado

**Tabla de escenarios:**

| Categoría | Límite Anual    | Uso %   | Margen          | Estado       |
| --------- | --------------- | ------- | --------------- | ------------ |
| A         | $10.200.000     | 215%    | -$11.870.000    | ⚠ Superado   |
| B         | $14.400.000     | 152%    | -$7.670.000     | ⚠ Superado   |
| C         | $21.600.000     | 101%    | -$215.000       | ⚠ Superado   |
| **D**     | **$28.800.000** | **76%** | **+$6.985.000** | **★ Actual** |
| E         | $36.000.000     | 61%     | +$14.185.000    | ✓ Margen     |
| ...       | ...             | ...     | ...             | ...          |

**Simulación bilateral:** Proyecta qué pasaría si el usuario tuviera una categoría mayor o menor, mostrando cuándo sería el próximo punto de riesgo.

---

### 9.5 Conta — Asistente IA

Asistente conversacional con conocimiento fiscal profundo del sistema del usuario.

**Panel izquierdo — Perfil fiscal:**

| Campo                    | Tipo       | Ejemplo                             |
| ------------------------ | ---------- | ----------------------------------- |
| Actividad                | Texto      | "Desarrollador de software"         |
| Situación laboral        | Select     | Dependencia / Independiente / Ambas |
| Categoría actual         | Select     | A-K                                 |
| Ingreso mensual esperado | Número     | $300.000                            |
| Casos especiales         | Checkboxes | Cripto / Exportación / Dependencia  |
| Notas adicionales        | Textarea   | Libre                               |

**Área de chat:**

- Mensajes renderizados en Markdown
- El asistente recibe en contexto:
  - Métricas fiscales actuales (% de uso, proyección, margen)
  - Perfil fiscal del usuario
  - Últimos cobros y facturas
  - Alertas activas
  - Estado de la conexión ARCA
  - Nivel de riesgo calculado (BAJO / MEDIO / ALTO / CRÍTICO)
- Preguntas sugeridas contextuales
- Historial persistido en Supabase
- Botón "Limpiar conversación"

**Detección de preparación de facturas:**
Cuando el usuario le pide al asistente que prepare una factura, aparece una tarjeta de acción rápida con todos los datos pre-completados para emitir directamente desde el chat.

---

### 9.6 ARCA Onboarding

Wizard de 3 pasos para conectar el certificado digital del usuario con ARCA.

```
Paso 1: Generar solicitud de certificado
  → Usuario ingresa CUIT
  → El backend genera CSR (RSA 2048-bit)
  → Clave privada queda en memoria 10 minutos
  → Textarea con el texto PEM del CSR
  → Botones "Copiar" y "Descargar código"

Paso 2: Trámite en ARCA
  → Botón "Abrir ARCA" usa VITE_ARCA_ONBOARDING_URL
  → Usuario carga el .csr en ARCA y descarga certificado
  → Usuario autoriza Web Services necesarios
  → Usuario crea/anota puntos de venta WSFE y WSFEX

Paso 3: Guardar credenciales
  → Input tipo file (.crt, .cer, .pem)
  → Ingreso de punto de venta para WSFE
  → Ingreso de punto de venta para WSFEX (opcional)
  → Backend valida CRT vs clave privada
  → Cifra y guarda en base de datos
  → Estado de ARCA cambia a "Configurado"
```

Detalles de producto:

- El header y el panel lateral ofrecen "Ver tutorial".
- El video se embebe desde `https://www.youtube-nocookie.com/embed/uEnpdpVFYlQ?rel=0&modestbranding=1`.
- El enlace externo del tutorial apunta a `https://youtu.be/uEnpdpVFYlQ`.
- En mobile se muestra una pantalla de transferencia: recomienda completar desde computadora, permite abrir el tutorial, copiar link de la app y enviar correo.
- El botón de tema claro/oscuro está disponible en esta pantalla porque el onboarding también se usa fuera del shell principal.

---

### 9.7 Configuración

| Sección           | Contenido                                                            |
| ----------------- | -------------------------------------------------------------------- |
| Cuenta            | Email del usuario (solo lectura)                                     |
| Perfil fiscal     | Enlace al perfil en la sección Conta                                 |
| Credenciales ARCA | CUIT conectado + estado + botón "Reconectar ARCA" (con confirmación) |
| Sesión            | Botón "Cerrar sesión"                                                |

---

### 9.8 Ayuda

Formulario de soporte con campos:

- Nombre
- Email
- Asunto (dropdown con opciones contextuales)
- Mensaje (mínimo 20 caracteres)
- Feedback de envío

Sección de tips fiscales básicos.

---

### 9.9 Landing Page

Ruta `/` — página pública de marketing.

| Componente      | Contenido                                                     |
| --------------- | ------------------------------------------------------------- |
| `Navbar`        | Logo + navegación + CTA de acceso. No muestra toggle de tema. |
| `Hero`          | Headline principal + call-to-action                           |
| `Problem`       | Los problemas que resuelve la app                             |
| `Features`      | Funcionalidades destacadas con íconos                         |
| `Pricing`       | Planes y precios                                              |
| `WaitlistModal` | Formulario de lista de espera                                 |
| `CtaFinal`      | CTA de cierre                                                 |
| `Footer`        | Links y legal                                                 |

---

## 10. Asistente IA — "Conta"

### Arquitectura

```
Frontend (AssistantPanel)
    ↓  fetch + JWT Bearer
Supabase Edge Function (claude-chat)
    ↓  Anthropic API
Claude claude-sonnet-4-6
```

### Contexto enviado al modelo

El asistente recibe en cada conversación:

```typescript
{
  // Métricas fiscales calculadas
  financialMetrics: {
    annualUsagePercent: number    // % del límite anual consumido
    projectedAnnual: number       // proyección al cierre del período
    availableMargin: number       // margen restante
    daysUntilCategoryBreach: number
    periodStart: string
    periodEnd: string
  },

  // Estado de riesgo
  riskSnapshot: {
    level: "BAJO" | "MEDIO" | "ALTO" | "CRÍTICO"
    score: number                 // 0-100
    factors: string[]
  },

  // Perfil del usuario
  fiscalProfile: UserFiscalProfile,

  // Historial de cobros e invoices recientes
  recentPayments: IncomePayment[],
  recentInvoices: GeneratedInvoice[],

  // Estado ARCA
  arcaStatus: "configured" | "missing" | "error",

  // Alertas activas
  activeAlerts: ProactiveAlert[],

  // Historial del chat
  messages: AssistantMessage[]
}
```

### Capacidades del asistente

- Calcular impacto de nuevos ingresos sobre la categoría
- Explicar el sistema de recategorización (enero/julio)
- Preparar borradores de facturas C y E
- Interpretar alertas y explicar qué hacer
- Responder preguntas sobre ARCA, CAE, plazos
- Razonar sobre si conviene o no subir de categoría
- Orientar sobre la ventana de adhesión al monotributo

### Edge Function (`supabase/functions/claude-chat/index.ts`)

- Modelo: `claude-sonnet-4-6`
- Búsqueda web restringida a `arca.gob.ar`
- CORS configurado con `ALLOWED_ORIGIN` separado por comas
- Streaming de respuesta a medida que Claude genera tokens

---

## 11. Lógica de Negocio Fiscal

**Archivo:** `src/lib/accounting.ts`

### Período fiscal del monotributo

El monotributo en Argentina tiene **dos períodos de evaluación bianuales**:

| Período         | Fechas de evaluación | Ventana de adhesión |
| --------------- | -------------------- | ------------------- |
| Enero-Junio     | Enero 1              | Ene 1 - Feb 5       |
| Julio-Diciembre | Julio 1              | Jul 1 - Ago 5       |

La app calcula automáticamente en qué período se encuentra el usuario y proyecta los ingresos **dentro de ese período** (no del año calendario completo).

### Cálculos principales

```
annualUsagePercent = ingresosPeriodo / limitePeriodo * 100

projectedAnnual = (ingresosPeriodo / diasTranscurridos) * diasTotalesPeriodo

daysUntilBreach = (limiteCategoria - ingresosPeriodo) / ingresoPromedioDiario

riskScore = f(annualUsagePercent, daysUntilBreach, mesesSinFacturar)
```

### Sistema de alertas proactivas

Las alertas se calculan localmente en el frontend y se sincronizan a Supabase:

| Tipo de alerta            | Condición                              | Severidad |
| ------------------------- | -------------------------------------- | --------- |
| `category_limit_warning`  | Uso > 85% del límite                   | warning   |
| `category_limit_critical` | Uso > 95% del límite                   | critical  |
| `invoice_pending`         | Cobros sin facturar > 30 días          | info      |
| `tax_due_upcoming`        | Cuota vence en < 5 días                | warning   |
| `tax_due_overdue`         | Cuota vencida sin pagar                | critical  |
| `recategorization_window` | Dentro de ventana de adhesión          | info      |
| `arca_mismatch`           | Discrepancia ARCA vs registros locales | warning   |

### Risk Score

```
Score 0-25:   BAJO     — Sin acción requerida
Score 26-50:  MEDIO    — Monitorear
Score 51-75:  ALTO     — Acción recomendada
Score 76-100: CRÍTICO  — Acción urgente
```

### Fecha clave del monotributo

- **Día 20 de cada mes**: vencimiento de la cuota
- El `TaxDuesPanel` muestra los últimos 6 meses con estado pagado/pendiente/vencido

---

## 12. Seguridad

### Capas de seguridad

```
Nivel 1 — Autenticación
  └── Supabase GoTrue (JWT ES256)
  └── Verificación JWKS en backend

Nivel 2 — Autorización de datos
  └── RLS en PostgreSQL (auth.uid() = user_id)
  └── Service role solo para backend

Nivel 3 — Protección de credenciales ARCA
  └── Generación RSA en backend (nunca en frontend)
  └── Clave privada solo en memoria (45 min TTL)
  └── Cifrado AES-256 antes de persistir en DB
  └── Clave maestra en variable de entorno del servidor

Nivel 4 — Comunicación
  └── CORS explícito (sin wildcards)
  └── Rate limiting por endpoint y por usuario
  └── HTTPS en todos los entornos de producción

Nivel 5 — Secrets management
  └── .env.local ignorado por git
  └── Service role key nunca expuesta al frontend
  └── Edge Function secrets via Supabase CLI
```

### Política de CORS

```
CORS_ORIGIN = origins exactos del frontend, separados por coma (no wildcards)
Pre-flight OPTIONS: manejado por Express cors()
Headers expuestos: Content-Type, Authorization
```

### Rate Limiting

| Endpoint                                 | Límite       | Ventana  |
| ---------------------------------------- | ------------ | -------- |
| Global                                   | 100 requests | 1 minuto |
| `/api/credentials/generate-csr`          | 3 requests   | 1 hora   |
| `/api/invoices/emit`                     | 10 requests  | 1 minuto |
| `/api/invoices/arca/*` consultas pesadas | 5 requests   | 1 minuto |

El límite de `generate-csr` es comportamiento de producción. No existe flag activo para deshabilitarlo ni para devolver CSR ficticios.

---

## 13. Configuración y Despliegue

### Variables de entorno del frontend

```env
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_ANON_KEY=...
VITE_ARCA_API_URL=https://backend.onrender.com
VITE_CONTA_CUIT=XX-XXXXXXXX-X
VITE_ARCA_ONBOARDING_URL=https://auth.afip.gob.ar/contribuyente_/login.xhtml
VITE_ARCA_WSFE_POINTS=1        # POS por defecto para Factura C (opcional)
VITE_ARCA_WSFEX_POINTS=3       # POS por defecto para Factura E (opcional)
```

### Build y deploy

```bash
# Frontend (Vercel)
npm run build          # TypeScript + Vite → dist/
# vercel.json hace rewrite de /* → /index.html (SPA)

# Backend (Render)
npm run server:build   # TypeScript → dist-server/
npm run server:start   # node dist-server/server/index.js

# Edge Functions (Supabase)
supabase functions deploy claude-chat
```

### Topología de despliegue

```
GitHub
  ├── push a main
  │     └── Vercel → build frontend → deploy dist/
  └── push a main
        └── Render → build server → deploy dist-server/

Supabase CLI:
  supabase db push          # Aplicar migraciones pendientes
  supabase functions deploy  # Actualizar Edge Functions
```

### Vite — Optimización de bundles

```javascript
// vite.config.ts — manual chunks para code splitting
{
  "vendor": ["react", "react-dom", "react-router-dom"],
  "supabase": ["@supabase/supabase-js"],
  "charts": ["recharts"],
  "ui": ["@radix-ui/*", "lucide-react"]
}
```

---

## 14. Estructura de Archivos

```
Contador/
├── public/
│   └── logo/logos/                # Sistema de marca: familia D + wordmarks
│
├── src/
│   ├── main.tsx                   # Punto de entrada, React Router
│   ├── App.tsx                    # Shell principal, todo el estado
│   ├── index.css                  # Tailwind + Geist + shadcn vars + tema claro/oscuro
│   │
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components (25 archivos)
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── table.tsx
│   │   │   ├── chart.tsx          # Wrapper de Recharts
│   │   │   └── ... (19 más)
│   │   │
│   │   ├── accounting/            # Vistas de la app
│   │   │   ├── dashboard-view.tsx
│   │   │   ├── income-tracker.tsx
│   │   │   ├── assistant-panel.tsx
│   │   │   ├── invoicing-panel.tsx
│   │   │   ├── projections-panel.tsx
│   │   │   ├── accountant-clients-panel.tsx
│   │   │   ├── arca-connect-view.tsx
│   │   │   ├── arca-onboarding.tsx
│   │   │   ├── fiscal-profile-card.tsx
│   │   │   ├── payments-table.tsx
│   │   │   ├── proactive-alerts.tsx
│   │   │   ├── revenue-chart.tsx
│   │   │   ├── monthly-report-card.tsx
│   │   │   ├── tax-dues-panel.tsx
│   │   │   └── message-markdown.tsx
│   │   │
│   │   ├── app-sidebar.tsx
│   │   ├── auth-screen.tsx
│   │   ├── site-header.tsx
│   │   ├── nav-main.tsx
│   │   ├── nav-secondary.tsx
│   │   ├── nav-user.tsx
│   │   ├── settings-view.tsx
│   │   ├── help-view.tsx
│   │   ├── confirmation-dialog.tsx
│   │   ├── error-boundary.tsx
│   │   ├── section-cards.tsx
│   │   ├── data-table.tsx
│   │   ├── login-form.tsx
│   │   ├── theme-provider.tsx
│   │   ├── theme-toggle.tsx
│   │   └── revenue-chart.tsx
│   │
│   ├── data/
│   │   ├── accounting.ts          # Estado inicial, categorías A-K, demo data
│   │   └── demo.ts                # Sesión demo (sin cuenta)
│   │
│   ├── hooks/
│   │   └── use-mobile.ts          # Breakpoint mobile detection
│   │
│   ├── landing/
│   │   ├── LandingPage.tsx
│   │   └── components/
│   │       ├── Navbar.tsx
│   │       ├── Hero.tsx
│   │       ├── Features.tsx
│   │       ├── Pricing.tsx
│   │       ├── Problem.tsx
│   │       ├── WaitlistModal.tsx
│   │       ├── CtaFinal.tsx
│   │       └── Footer.tsx
│   │
│   ├── lib/
│   │   ├── supabase.ts            # Cliente Supabase (con validación de env)
│   │   ├── supabase-auth.ts       # sign in, sign out, password reset
│   │   ├── supabase-accounting.ts # CRUD: payments, invoices, profile, etc.
│   │   ├── arca-api.ts            # Llamadas al backend para facturas
│   │   ├── arca-credentials-api.ts# CSR, save credentials
│   │   ├── backend-api.ts         # HTTP client genérico con JWT
│   │   ├── brand-assets.ts        # Rutas centralizadas de logos familia D
│   │   ├── alerts-api.ts          # CRUD de alertas proactivas
│   │   ├── foreign-clients-api.ts # CRUD de clientes del exterior
│   │   ├── ai-assistant.ts        # Invocación de Edge Function claude-chat
│   │   ├── accounting.ts          # Lógica de negocio fiscal (proyecciones, riesgo)
│   │   ├── accounting.test.ts     # Tests unitarios (Vitest)
│   │   └── utils.ts               # Helpers (cn(), formatters)
│   │
│   └── types/
│       ├── accounting.ts          # Tipos del dominio
│       └── database.ts            # Tipos auto-generados de Supabase
│
├── server/
│   ├── index.ts                   # Express app, JWT auth, rate limiting
│   ├── config.ts                  # Parsing de env vars, endpoints ARCA
│   │
│   ├── arca/
│   │   ├── wsaa.ts                # Autenticación WSAA (token + sign)
│   │   ├── wsfe.ts                # Factura C (WSFE)
│   │   ├── wsfex.ts               # Factura E exportación (WSFEX)
│   │   ├── soap.ts                # Cliente SOAP genérico
│   │   ├── date.ts                # Utils de fechas ARCA
│   │   ├── objects.ts             # Transformaciones de objetos ARCA
│   │   ├── errors.ts              # Traducción de errores SOAP
│   │   └── timeout.ts             # Manejo de timeouts
│   │
│   ├── lib/
│   │   └── arca-credentials.ts    # Cifrado/descifrado de credenciales
│   │
│   └── routes/
│       ├── credentials.ts         # Endpoints de credenciales ARCA
│       └── invoices.ts            # Endpoints de emisión + consulta
│
├── supabase/
│   ├── functions/
│   │   └── claude-chat/
│   │       └── index.ts           # Edge Function: Claude proxy
│   │
│   ├── migrations/                # 16 migraciones (histórico completo)
│   │   ├── 20260518230000_add_invoices.sql
│   │   ├── 20260518233000_add_auth_rls.sql
│   │   ├── 20260518234500_add_user_fiscal_profiles.sql
│   │   ├── 20260519183000_add_arca_payment_metadata_and_seed_2026.sql
│   │   ├── 20260519191000_update_monotributo_2026_limits.sql
│   │   ├── 20260521202500_import_arca_invoices_since_2025_07.sql
│   │   ├── 20260521211000_add_tax_payments.sql
│   │   ├── 20260527090000_user_arca_credentials.sql
│   │   ├── 20260527091000_tax_settings_per_user.sql
│   │   ├── 20260527092000_enforce_owned_user_ids.sql
│   │   ├── 20260527093000_clean_fiscal_pii.sql
│   │   ├── 20260527100000_encrypt_arca_credentials.sql
│   │   ├── 20260527110000_risk_alerts.sql
│   │   ├── 20260527120000_export_invoices.sql
│   │   ├── 20260529210000_tax_categories.sql
│   │   ├── 20260529211000_lock_arca_credentials_writes.sql
│   │   └── 20260529220000_add_indexes.sql
│   │
│   ├── schema.sql                 # Snapshot del esquema actual
│   ├── seed.sql                   # Datos iniciales
│   └── config.toml                # Config local de Supabase
│
├── certs/                         # Certificados ARCA (git-ignorados)
├── dist/                          # Build del frontend (generado)
├── dist-server/                   # Build del backend (generado)
│
├── package.json
├── tsconfig.json                  # Base (referencias app + node)
├── tsconfig.app.json              # Frontend (ES2022, strict, JSX)
├── tsconfig.server.json           # Backend (NodeNext, outDir)
├── vite.config.ts                 # Plugins React + Tailwind, code splitting
├── components.json                # Configuración shadcn/ui
├── vercel.json                    # SPA rewrite /*→/index.html
├── eslint.config.js
├── .prettierrc
└── index.html                     # Punto de entrada HTML
```

---

## 15. Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Vite dev server en http://localhost:5173
npm run server:dev       # Express backend en http://localhost:3001 (tsx, hot-reload)

# Build
npm run build            # tsc + vite build → dist/
npm run server:build     # tsc → dist-server/
npm run server:start     # node dist-server/server/index.js

# Calidad
npm run lint             # ESLint en todo el proyecto
npm run format           # Prettier sobre *.ts y *.tsx
npm run typecheck        # tsc --noEmit (solo frontend)
npm run server:typecheck # tsc --noEmit (solo backend)

# Tests
npm run test             # Vitest en modo watch
npm run test:run         # Vitest una sola vez

# Preview
npm run preview          # Sirve dist/ localmente (post-build)
```

---

## 16. Flujo de Datos Completo

### Flujo de autenticación

```
1. Usuario ingresa email + password
2. Frontend llama supabase.auth.signInWithPassword()
3. Supabase devuelve Session con JWT
4. App.tsx almacena la sesión en estado
5. Todos los calls a Supabase SDK incluyen el JWT automáticamente
6. Todos los calls al backend incluyen: Authorization: Bearer <JWT>
7. Backend verifica JWT via JWKS de Supabase
```

### Flujo de carga inicial de datos

```
Usuario autenticado
    ↓
Promise.allSettled([
  fetchPayments(),           → Supabase: payments WHERE user_id = uid
  fetchInvoices(),           → Supabase: invoices WHERE user_id = uid
  fetchTaxCategory(),        → Supabase: tax_settings WHERE user_id = uid
  fetchTaxCategories(),      → Supabase: tax_categories (global, sin RLS)
  fetchAssistantMessages(),  → Supabase: assistant_messages WHERE user_id = uid
  fetchFiscalProfile(),      → Supabase: user_fiscal_profiles WHERE user_id = uid
  fetchTaxPayments(),        → Supabase: tax_payments WHERE user_id = uid
])
    ↓
setState(todosLosDatos)
    ↓
Calcular métricas localmente (accounting.ts)
    ↓
Generar alertas proactivas
    ↓
Sincronizar alertas nuevas a Supabase (alerts-api.ts)
```

### Flujo de emisión de factura

```
Usuario hace click en "Emitir"
    ↓
Dialog de confirmación
    ↓
Frontend → POST /api/invoices/emit
  body: { paymentId, invoiceType, receiverCuit, ... }
  headers: Authorization: Bearer <JWT>
    ↓
Backend: authenticateJwt() → extrae userId
    ↓
Backend: fetchUserCredentials(userId) → Supabase service_role
    ↓
Backend: decrypt_arca_credential() → CRT + key
    ↓
Backend: wsaa.getToken(crt, key) → token + sign (cache 12hs)
    ↓
if invoiceType === "C":
  wsfe.getNextNumber(token, sign, posNumber) → nextNum
  wsfe.authorize(token, sign, invoiceData) → CAE
if invoiceType === "E":
  wsfex.getNextNumber(...) → nextNum
  wsfex.authorize(...) → CAE
    ↓
Backend: upsert en public.invoices con service_role
    ↓
Si Supabase falla post-CAE: responde error explícito y registra evento de emergencia sanitizado
    ↓
Backend retorna: { cae, caeExpiresAt, number, pointOfSale }
    ↓
Frontend: updatePayment({ invoiceStatus: "Facturado", cae, ... })
Frontend: createInvoice({ cae, number, ... }) idempotente por user/tipo/PV/número
    ↓
UI actualiza tabla de cobros + tabla de facturas
Toast de éxito con número de factura y CAE
```

### Flujo del asistente IA

```
Usuario envía mensaje
    ↓
Frontend calcula contexto fiscal (métricas, alertas, perfil)
    ↓
Frontend → POST /functions/v1/claude-chat
  body: { messages, financialMetrics, riskSnapshot, fiscalProfile, ... }
  headers: Authorization: Bearer <JWT>
    ↓
Supabase Edge Function:
  - Valida JWT
  - Construye system prompt con contexto fiscal
  - Llama Anthropic API (claude-sonnet-4-6, streaming)
    ↓
Edge Function → stream de tokens al frontend
    ↓
Frontend renderiza respuesta en tiempo real (Markdown)
    ↓
Al completar: guarda mensaje en Supabase (assistant_messages)
```

---

## 17. Checklist de Emergencia ARCA

### ARCA autorizó pero no guardó localmente

1. No volver a emitir la factura.
2. Buscar en logs el evento `arca.invoice_authorized_local_save_failed`.
3. Registrar manualmente en `public.invoices` los campos `user_id`, `invoice_type`, `point_of_sale`, `number`, `issue_date`, `client`, `description`, `amount`, `cae`, `cae_expires_at` y `status = issued`.
4. Confirmar en ARCA por consulta histórica que el CAE, punto de venta, tipo y número coinciden.
5. Avisar al usuario que la factura ya estaba autorizada y fue reconciliada.

### Usuario puso mal punto de venta

1. No cambiar el número de comprobante emitido.
2. Verificar puntos disponibles con `/api/invoices/arca/points-of-sale`.
3. Corregir `wsfe_pto_vta` o `wsfex_pto_vta` en el onboarding/reconexión.
4. Probar en homologación antes de volver a emitir en producción.

### Certificado vencido o inválido

1. Pedir reconexión ARCA desde Configuración.
2. Generar un nuevo CSR.
3. Descargar certificado nuevo en ARCA.
4. Cargar certificado y confirmar que el CUIT coincide.

### CAE emitido pero la UI crasheó

1. Recargar datos desde Supabase.
2. Si la factura no aparece, consultar historial ARCA por tipo/PV/número.
3. Reconciliar usando el mismo procedimiento de "ARCA autorizó pero no guardó localmente".

### ARCA está caído

1. No reintentar en loop.
2. Revisar logs de timeout/conexión y estado público de ARCA si existe.
3. Esperar y reintentar manualmente.
4. Mantener el cobro como pendiente hasta confirmar emisión.

---

_Documentación generada el 29/05/2026. Refleja el estado del código en la rama `master`, commit `02134d6`._
