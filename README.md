# Contable

![Node.js 24](https://img.shields.io/badge/Node.js-24.x-339933?logo=nodedotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)
![Licencia](https://img.shields.io/badge/licencia-privada-lightgrey)

**Tu monotributo bajo control.**

Contable es un radar fiscal con contador IA para monotributistas argentinos. No es un facturador generico: es la app que monitorea tu situacion fiscal, proyecta tu categoria y te avisa antes de que ARCA te sorprenda.

El producto combina dashboard financiero, onboarding ARCA, emision real de facturas C y E con CAE, importacion de historial fiscal, alertas persistentes y un asistente especializado llamado **Conta**. La experiencia esta pensada para que una persona monotributista entienda rapidamente donde esta parada, cuanto margen le queda y cual es la proxima accion concreta.

Tecnologicamente, Contable separa la interfaz React del backend Express que habla con ARCA por SOAP. Supabase provee autenticacion, Postgres, RLS y Edge Functions; Render ejecuta el backend Node 24; Vercel sirve el frontend.

## Screenshots

> Los screenshots todavia no estan versionados en el repositorio. Placeholders sugeridos para `docs/screenshots/`:

| Vista            | Placeholder                            | Descripcion                                                                           |
| ---------------- | -------------------------------------- | ------------------------------------------------------------------------------------- |
| Dashboard fiscal | `docs/screenshots/dashboard-radar.png` | Radar de categoria, ingresos del periodo, semaforo de riesgo y proximos vencimientos. |
| Onboarding ARCA  | `docs/screenshots/arca-onboarding.png` | Flujo de CSR, carga de certificado y configuracion de puntos de venta.                |
| Factura E Pro    | `docs/screenshots/factura-e-pro.png`   | Emision para exportadores con USD, tipo de cambio y cliente extranjero.               |
| Conta IA         | `docs/screenshots/conta-ai.png`        | Conversacion con diagnostico fiscal personalizado y contexto ARCA autorizado.         |

## Stack Tecnologico

| Capa                 | Tecnologia                                                       |
| -------------------- | ---------------------------------------------------------------- |
| Frontend             | React 19, TypeScript, Vite 7                                     |
| UI                   | Tailwind CSS 4, shadcn/ui, Radix UI, lucide-react, Recharts      |
| Auth y datos cliente | Supabase JS 2.106.0                                              |
| Backend              | Express 5, TypeScript, Node 24                                   |
| Base de datos        | Supabase Postgres, GoTrue, RLS                                   |
| ARCA                 | SOAP WSAA, WSFE, WSFEX, `node-forge`, `soap`, `fast-xml-parser`  |
| Auth backend         | JWT Supabase con JWKS y ES256                                    |
| IA                   | Anthropic Claude `claude-sonnet-4-6` via Supabase Edge Functions |
| Busqueda IA          | Web search restringido a `arca.gob.ar`                           |
| Deploy frontend      | Vercel                                                           |
| Deploy backend       | Render                                                           |
| Deploy DB/functions  | Supabase Cloud                                                   |

## Arquitectura Del Sistema

```text
+------------------------+          +-------------------------+
| Usuario                |          | Vercel                  |
| Navegador              +--------->| React + Vite            |
+-----------+------------+          +-----------+-------------+
            |                                   |
            | Supabase Auth / JWT               | HTTPS + Bearer JWT
            v                                   v
+------------------------+          +-------------------------+
| Supabase Cloud         |          | Render                  |
| GoTrue + Postgres      |<---------+ Express 5 + Node 24     |
| RLS + RPC cifrado      | service  | JWT JWKS + ARCA routes  |
+-----------+------------+ role     +-----------+-------------+
            |                                   |
            | Edge Function invoke              | SOAP + CMS signed
            v                                   v
+------------------------+          +-------------------------+
| claude-chat            |          | ARCA                    |
| Claude Sonnet          |          | WSAA / WSFE / WSFEX     |
| web_search arca.gob.ar |          | CAE + comprobantes      |
+------------------------+          +-------------------------+
```

## Funcionalidades

- Autenticacion con Supabase Auth.
- Onboarding ARCA completo: generacion de CSR, certificados y puntos de venta.
- Tutorial embebido para guiar el alta ARCA paso a paso.
- Facturacion C y E conectada a ARCA real con CAE.
- Radar de categoria con proyeccion y semaforo de riesgo.
- Alertas fiscales persistentes.
- **Conta**, contador IA con diagnostico fiscal personalizado.
- Factura E Pro para exportadores: USD, tipo de cambio y clientes extranjeros.
- Traductor de errores ARCA a lenguaje humano.
- Multi-usuario con credenciales ARCA cifradas por usuario.
- Dashboard con historial importado desde ARCA.
- Modo claro por defecto y modo oscuro con toggle dentro de la app.

## Requisitos Previos

- Node.js 24.x.
- npm 10+.
- Cuenta y proyecto en Supabase.
- Supabase CLI si vas a aplicar migraciones o desplegar Edge Functions desde local.
- Credenciales ARCA para el CUIT a operar.
- Acceso a Vercel para el frontend.
- Acceso a Render para el backend.
- API key de Anthropic para `claude-chat`.

## Instalacion Y Setup Local

1. Clonar el repositorio:

```bash
git clone https://github.com/tomas95-lab/contador.git
cd contador
```

2. Instalar dependencias:

```bash
npm ci
```

3. Crear variables locales:

```bash
cp .env.example .env.local
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env.local
```

4. Configurar Supabase:

- Crear un proyecto en Supabase.
- Copiar `Project URL`, `anon/public key` y `service_role key` a `.env.local`.
- Aplicar las migraciones de `supabase/migrations`.

Con Supabase CLI, una vez vinculado el proyecto:

```bash
supabase link --project-ref <SUPABASE_PROJECT_REF>
supabase db push
```

5. Configurar la Edge Function de IA:

```bash
supabase secrets set ANTHROPIC_API_KEY=<ANTHROPIC_API_KEY>
supabase secrets set CLAUDE_MODEL=claude-sonnet-4-6
supabase secrets set ALLOWED_ORIGIN=http://localhost:5173
supabase functions deploy claude-chat
```

6. Levantar el backend Express:

```bash
npm run server:dev
```

Por defecto escucha en `http://localhost:3001`.

7. Levantar el frontend:

```bash
npm run dev
```

Por defecto Vite escucha en `http://localhost:5173`.

## Variables De Entorno

Nunca commitear `.env.local`, certificados, private keys, service role keys ni tokens. Los valores siguientes son placeholders.

### Frontend

| Variable                         | Requerida | Placeholder                         | Descripcion                                                       |
| -------------------------------- | --------- | ----------------------------------- | ----------------------------------------------------------------- |
| `VITE_SUPABASE_URL`              | Si        | `https://<project-ref>.supabase.co` | URL publica del proyecto Supabase.                                |
| `VITE_SUPABASE_ANON_KEY`         | Si        | `<SUPABASE_ANON_KEY>`               | Clave anon/public para inicializar Supabase JS en el navegador.   |
| `VITE_ARCA_API_URL`              | Si        | `http://localhost:3001`             | URL del backend Express. En produccion apunta a Render.           |
| `VITE_CONTA_CUIT`                | No        | `XX-XXXXXXXX-X`                     | CUIT visible de referencia en pantallas de onboarding.            |
| `VITE_ARCA_ONBOARDING_URL`       | No        | `https://auth.afip.gob.ar/contribuyente_/login.xhtml` | URL que abre el boton "Abrir ARCA" durante el onboarding. |
| `VITE_ARCA_WSFE_POINTS`          | No        | `4,5`                               | Puntos de venta WSFE a consultar desde el cliente. Default: `4`.  |
| `VITE_ARCA_WSFEX_POINTS`         | No        | `3`                                 | Puntos de venta WSFEX a consultar desde el cliente. Default: `3`. |

### Backend Express

| Variable                                 | Requerida  | Placeholder                                           | Descripcion                                                                      |
| ---------------------------------------- | ---------- | ----------------------------------------------------- | -------------------------------------------------------------------------------- |
| `PORT`                                   | No         | `3001`                                                | Puerto local del backend. Render inyecta su propio puerto.                       |
| `CORS_ORIGIN`                            | Si         | `http://localhost:5173,http://127.0.0.1:5173`         | Origins permitidos, separados por coma. No incluir slash final.                  |
| `SUPABASE_URL`                           | Si         | `https://<project-ref>.supabase.co`                   | URL del proyecto Supabase usada por backend y JWKS.                              |
| `SUPABASE_SERVICE_ROLE_KEY`              | Si         | `<SUPABASE_SERVICE_ROLE_KEY>`                         | Clave service role para operaciones server-side. Solo backend.                   |
| `ARCA_ENCRYPTION_KEY`                    | Si         | `<LONG_RANDOM_SECRET>`                                | Master key usada por RPCs de Supabase para cifrar credenciales ARCA por usuario. |
| `ARCA_ENV`                               | No         | `homologacion`                                        | Ambiente ARCA: `homologacion` o `production`.                                    |
| `ARCA_CMS_DIGEST`                        | No         | `sha256`                                              | Digest usado al firmar CMS para WSAA.                                            |
| `ARCA_CACHE_DIR`                         | No         | `.arca-cache`                                         | Directorio local para cachear tokens/autorizaciones temporales.                  |
| `ARCA_REQUEST_TIMEOUT_MS`                | No         | `15000`                                               | Timeout de requests SOAP hacia ARCA.                                             |
| `ARCA_HISTORICAL_PAGE_SIZE`              | No         | `100`                                                 | Tamano de pagina para consultas historicas.                                      |
| `ARCA_HISTORICAL_MAX_INVOICES_PER_QUERY` | No         | `500`                                                 | Maximo de comprobantes a consultar por query historica.                          |
| `ARCA_DEFAULT_CONDICION_IVA_RECEPTOR_ID` | No         | `5`                                                   | Condicion IVA default para Factura C. `5` representa consumidor final.           |
| `ARCA_EXPORT_DST_CMP`                    | No         | `212`                                                 | Codigo de pais destino para Factura E si no se envia por request.                |
| `ARCA_EXPORT_CLIENT_COUNTRY_CUIT`        | No         | `<COUNTRY_CUIT>`                                      | CUIT pais del cliente extranjero para defaults de exportacion.                   |
| `ARCA_EXPORT_CLIENT_NAME`                | No         | `Cliente del exterior`                                | Nombre default para cliente extranjero.                                          |
| `ARCA_EXPORT_CLIENT_ADDRESS`             | No         | `Exterior`                                            | Domicilio default para cliente extranjero.                                       |
| `ARCA_EXPORT_CLIENT_TAX_ID`              | No         | `NO_DECLARADO`                                        | Tax ID default del cliente extranjero.                                           |
| `ARCA_EXPORT_LANGUAGE`                   | No         | `1`                                                   | Idioma del comprobante exportacion segun parametros WSFEX.                       |
| `ARCA_EXPORT_UNIT_OF_MEASURE`            | No         | `7`                                                   | Unidad de medida default para WSFEX.                                             |
| `ARCA_WSAA_URL_HOMO`                     | No         | `https://wsaahomo.afip.gov.ar/ws/services/LoginCms`   | Override del endpoint WSAA homologacion.                                         |
| `ARCA_WSFE_URL_HOMO`                     | No         | `https://wswhomo.afip.gov.ar/wsfev1/service.asmx`     | Override del endpoint WSFE homologacion.                                         |
| `ARCA_WSFEX_URL_HOMO`                    | No         | `https://wswhomo.afip.gov.ar/wsfexv1/service.asmx`    | Override del endpoint WSFEX homologacion.                                        |
| `ARCA_WSAA_URL_PROD`                     | No         | `https://wsaa.afip.gov.ar/ws/services/LoginCms`       | Override del endpoint WSAA produccion.                                           |
| `ARCA_WSFE_URL_PROD`                     | No         | `https://servicios1.afip.gov.ar/wsfev1/service.asmx`  | Override del endpoint WSFE produccion.                                           |
| `ARCA_WSFEX_URL_PROD`                    | No         | `https://servicios1.afip.gov.ar/wsfexv1/service.asmx` | Override del endpoint WSFEX produccion.                                          |
| `NODE_ENV`                               | Produccion | `production`                                          | Activa comportamiento de produccion en runtime.                                  |
| `NODE_VERSION`                           | Deploy     | `24`                                                  | Version de Node solicitada en Render.                                            |

### Credenciales ARCA Por Usuario

El flujo principal guarda las credenciales ARCA por usuario en Supabase, cifradas con `ARCA_ENCRYPTION_KEY`. Las siguientes variables pueden existir en entornos de despliegue o integraciones auxiliares, pero no deben reemplazar el onboarding multi-usuario.

| Variable             | Requerida    | Placeholder          | Descripcion                                                |
| -------------------- | ------------ | -------------------- | ---------------------------------------------------------- |
| `ARCA_CUIT`          | Segun deploy | `<CUIT_SIN_GUIONES>` | CUIT asociado a credenciales ARCA de servidor o bootstrap. |
| `ARCA_CERT`          | Segun deploy | `<PEM_CERTIFICATE>`  | Contenido PEM del certificado ARCA.                        |
| `ARCA_PRIVATE_KEY`   | Segun deploy | `<PEM_PRIVATE_KEY>`  | Contenido PEM de la private key ARCA.                      |
| `ARCA_WSFE_PTO_VTA`  | Segun deploy | `4`                  | Punto de venta WSFE para Factura C.                        |
| `ARCA_WSFEX_PTO_VTA` | Segun deploy | `3`                  | Punto de venta WSFEX para Factura E.                       |

### Supabase Edge Function `claude-chat`

| Variable            | Requerida | Placeholder             | Descripcion                                                              |
| ------------------- | --------- | ----------------------- | ------------------------------------------------------------------------ |
| `ANTHROPIC_API_KEY` | Si        | `<ANTHROPIC_API_KEY>`   | API key de Anthropic. Se configura como secret de Supabase.              |
| `CLAUDE_MODEL`      | No        | `claude-sonnet-4-6`     | Modelo usado por Conta.                                                  |
| `ALLOWED_ORIGIN`    | Si        | `http://localhost:5173` | Origin permitido para invocar la funcion. En produccion apunta a Vercel. |

### Render / npm Build

| Variable                | Requerida | Placeholder | Descripcion                                                                    |
| ----------------------- | --------- | ----------- | ------------------------------------------------------------------------------ |
| `NPM_CONFIG_PRODUCTION` | Deploy    | `false`     | Permite instalar `devDependencies` durante build aunque `NODE_ENV=production`. |
| `NPM_CONFIG_INCLUDE`    | Deploy    | `dev`       | Asegura que TypeScript y tipos esten disponibles para compilar.                |

## Comandos Disponibles

| Comando                    | Descripcion                                         |
| -------------------------- | --------------------------------------------------- |
| `npm run dev`              | Inicia el frontend Vite en modo desarrollo.         |
| `npm run server:dev`       | Inicia el backend Express con `tsx`.                |
| `npm run server:build`     | Compila el backend TypeScript a `dist-server`.      |
| `npm run server:start`     | Ejecuta el backend compilado.                       |
| `npm run server:typecheck` | Typecheck del backend sin emitir archivos.          |
| `npm run build`            | Compila TypeScript y genera el build frontend Vite. |
| `npm run lint`             | Ejecuta ESLint sobre el proyecto.                   |
| `npm run format`           | Formatea archivos TS/TSX con Prettier.              |
| `npm run typecheck`        | Typecheck general del proyecto.                     |
| `npm run preview`          | Sirve localmente el build de Vite.                  |

## Marca Y Tema

- Los logos activos viven en `public/logo/logos/` y corresponden a la familia D.
- `src/lib/brand-assets.ts` centraliza las rutas de icon, lockup y wordmark para evitar hardcodear assets en componentes.
- `index.html` usa `public/logo/logos/icon/D-navy-32.png` como favicon.
- El tema default es `light`. No se usa el modo `system` ni el atajo por teclado `D`.
- El toggle claro/oscuro esta en `src/components/theme-toggle.tsx` y se muestra en la app, auth y onboarding. La landing publica no muestra toggle.
- La preferencia queda persistida en `localStorage` con la key `theme`.
- Los colores de dark mode estan definidos en `src/index.css` como un navy oscuro suave, no negro puro.

## Estructura Del Proyecto

```text
.
|-- public/                         # Assets publicos
|   `-- logo/logos/                 # Logos activos: familia D, icon, lockup y wordmark
|-- server/                         # Backend Express
|   |-- arca/                       # Clientes WSAA, WSFE, WSFEX, SOAP y errores
|   |-- lib/                        # Integracion Supabase y cifrado de credenciales
|   |-- routes/                     # Rutas HTTP del backend
|   |-- config.ts                   # Configuracion por variables de entorno
|   `-- index.ts                    # App Express, CORS y JWT auth
|-- src/                            # Frontend React
|   |-- components/                 # UI y vistas de producto
|   |-- components/accounting/      # Modulos fiscales: dashboard, alertas, ARCA, Conta
|   |-- hooks/                      # Hooks compartidos
|   |-- lib/                        # Clientes Supabase, backend, ARCA e IA
|   |-- types/                      # Tipos de dominio
|   |-- index.css                   # Tailwind, tokens shadcn y tema claro/oscuro
|   `-- App.tsx                     # Shell principal
|-- supabase/
|   |-- functions/claude-chat/      # Edge Function de Conta
|   |-- migrations/                 # Esquema, RLS, RPCs y tablas fiscales
|   |-- schema.sql                  # Snapshot de esquema
|   `-- seed.sql                    # Datos iniciales
|-- certs/                          # Certificados locales ignorados por git
|-- dist/                           # Build frontend generado
|-- dist-server/                    # Build backend generado
|-- package.json
|-- tsconfig.server.json
`-- vite.config.ts
```

## Como Funciona El Onboarding ARCA

1. El usuario inicia sesion con Supabase Auth. El frontend llama al backend con el JWT de Supabase en `Authorization: Bearer <token>`.
2. El backend valida el JWT con JWKS de Supabase y algoritmo ES256. Si el token es valido, asocia la operacion a `req.userId`.
3. En el paso 1, el usuario ingresa su CUIT y pide generar un CSR. `POST /api/credentials/generate-csr` tiene limite real de 3 solicitudes por hora por usuario autenticado.
4. El backend crea un par RSA de 2048 bits con `node-forge`, firma el CSR y conserva temporalmente la private key en memoria por usuario durante 10 minutos.
5. La pantalla permite copiar o descargar el CSR como `conta-<cuit>.csr`.
6. En el paso 2, el usuario abre ARCA con `VITE_ARCA_ONBOARDING_URL`, carga el CSR, autoriza los Web Services necesarios y crea/anota los puntos de venta.
7. El onboarding incluye un tutorial embebido desde YouTube (`https://youtu.be/uEnpdpVFYlQ`) y un link externo para verlo fuera de la app.
8. En el paso 3, el usuario sube el certificado `.crt`, `.cer` o `.pem` emitido por ARCA e ingresa los puntos de venta WSFE y, opcionalmente, WSFEX.
9. El backend valida que el certificado corresponda al CSR/private key generados y que el CUIT coincida.
10. Las credenciales se guardan en Supabase en `user_arca_credentials`, cifradas por RPC con `ARCA_ENCRYPTION_KEY`.
11. Al emitir o consultar comprobantes, el backend recupera y descifra las credenciales del usuario, obtiene token/autorizacion via WSAA y llama a WSFE o WSFEX segun corresponda.

Notas operativas:

- Si el backend se reinicia antes de subir el certificado, la private key temporal se pierde y el usuario debe generar un nuevo CSR.
- No existe flag de produccion para desactivar el limite de CSR ni para devolver CSR ficticios. El onboarding siempre usa CSR reales.
- ARCA puede bloquear links profundos o externos; por eso la app abre la pantalla de login y tambien indica entrar manualmente a `arca.gob.ar` si hace falta.

## Deploy

### Frontend En Vercel

1. Importar el repo `tomas95-lab/contador` en Vercel.
2. Configurar Node.js 24.x.
3. Usar el preset Vite.
4. Build command:

```bash
npm run build
```

5. Variables requeridas en Vercel:

```text
VITE_SUPABASE_URL=<SUPABASE_URL>
VITE_SUPABASE_ANON_KEY=<SUPABASE_ANON_KEY>
VITE_ARCA_API_URL=<RENDER_BACKEND_URL>
VITE_CONTA_CUIT=<CUIT_DISPLAY>
VITE_ARCA_ONBOARDING_URL=https://auth.afip.gob.ar/contribuyente_/login.xhtml
VITE_ARCA_WSFE_POINTS=<WSFE_POINTS_OPTIONAL>
VITE_ARCA_WSFEX_POINTS=<WSFEX_POINTS_OPTIONAL>
```

### Backend En Render

Crear un Web Service conectado al repo.

| Campo         | Valor                            |
| ------------- | -------------------------------- |
| Runtime       | Node                             |
| Node          | 24                               |
| Branch        | `master`                         |
| Build Command | `npm ci && npm run server:build` |
| Start Command | `npm run server:start`           |

Variables minimas en Render:

```text
NODE_ENV=production
NODE_VERSION=24
NPM_CONFIG_PRODUCTION=false
NPM_CONFIG_INCLUDE=dev
CORS_ORIGIN=<VERCEL_ORIGIN_1>,<VERCEL_ORIGIN_2>
SUPABASE_URL=<SUPABASE_URL>
SUPABASE_SERVICE_ROLE_KEY=<SUPABASE_SERVICE_ROLE_KEY>
ARCA_ENV=production
ARCA_ENCRYPTION_KEY=<LONG_RANDOM_SECRET>
ARCA_REQUEST_TIMEOUT_MS=15000
ARCA_HISTORICAL_PAGE_SIZE=100
ARCA_HISTORICAL_MAX_INVOICES_PER_QUERY=500
```

Si se usan credenciales ARCA de servidor o bootstrap:

```text
ARCA_CUIT=<CUIT_SIN_GUIONES>
ARCA_CERT=<PEM_CERTIFICATE>
ARCA_PRIVATE_KEY=<PEM_PRIVATE_KEY>
ARCA_WSFE_PTO_VTA=<WSFE_POINT_OF_SALE>
ARCA_WSFEX_PTO_VTA=<WSFEX_POINT_OF_SALE>
```

### Supabase Cloud

1. Crear proyecto Supabase.
2. Aplicar migraciones de `supabase/migrations`.
3. Verificar RLS en tablas de usuario y credenciales.
4. Configurar secrets de Edge Function:

```bash
supabase secrets set ANTHROPIC_API_KEY=<ANTHROPIC_API_KEY>
supabase secrets set CLAUDE_MODEL=claude-sonnet-4-6
supabase secrets set ALLOWED_ORIGIN=<VERCEL_ORIGIN>
supabase functions deploy claude-chat
```

## Seguridad

- El frontend nunca recibe `SUPABASE_SERVICE_ROLE_KEY`, certificados ARCA ni private keys.
- El backend valida JWTs de Supabase con JWKS y ES256 antes de acceder a rutas `/api`.
- Supabase RLS separa datos por usuario.
- Las credenciales ARCA se guardan por usuario y cifradas antes de persistirse.
- `ARCA_ENCRYPTION_KEY` debe ser larga, aleatoria y exclusiva del ambiente.
- El CSR guarda la private key temporalmente en memoria y expira a los 10 minutos.
- El limite de generacion de CSR es parte del comportamiento de produccion: 3 solicitudes por usuario por hora.
- CORS debe configurarse con origins exactos, sin slash final y separados por coma.
- La Edge Function de IA restringe CORS y limita la busqueda web a `arca.gob.ar`.
- Los errores ARCA se traducen a mensajes accionables sin exponer detalles sensibles innecesarios.
- `.env.local`, `certs/`, `.arca-cache`, `dist/` y logs locales no deben versionarse.

## Roadmap

- Historial ARCA incremental con sincronizacion programada.
- Healthcheck publico no autenticado para monitoreo externo.
- Rotacion y versionado de credenciales ARCA por usuario.
- Auditoria de acciones fiscales sensibles.
- Soporte avanzado para multiples CUIT por cuenta.
- Notificaciones por email o push antes de vencimientos y cambios de riesgo.
- Exportacion de reportes mensuales en PDF/CSV.
- Panel para contadores que administran multiples clientes.
- Tests automatizados de integraciones ARCA con fixtures SOAP.

## Licencia

Proyecto privado. No hay una licencia open source publicada en este repositorio. Todos los derechos quedan reservados por sus autores salvo que se agregue un archivo `LICENSE` indicando lo contrario.
