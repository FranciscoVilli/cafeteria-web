# ☕ Cafetería Universitaria · Pedidos anticipados

Sistema web para **pedir en la cafetería de la universidad sin hacer fila**.

- El **cliente** (estudiante, docente o administrativo) ve el menú desde el celular, arma su pedido,
  lo confirma y recibe un **código de retiro** de 6 caracteres. Sigue el estado del pedido en línea
  y lo retira cuando está listo.
- El **personal de la cafetería** atiende los pedidos en una **bandeja** que se actualiza sola,
  los avanza de estado (*Pendiente → En preparación → Listo para retirar*) y los **entrega
  verificando el código** que muestra el cliente. También administra el menú: productos, precios,
  disponibilidad, descripciones y fotos.

> Proyecto de la asignatura **Construcción y Evolución de Software** · Release 1.0 (27 de noviembre de 2026).

---

## Funcionalidades

| Perfil | Qué puede hacer | Historias |
|---|---|---|
| Cliente | Ver el menú por categoría (Bebidas, Alimentos, Postres) con fotos, en un selector destacado y en catálogo | HU-01 |
| Cliente | Agregar productos al pedido, cambiar cantidades (1–50) y quitarlos | HU-02 |
| Cliente | Ver el importe total antes de confirmar | HU-03 |
| Cliente | Confirmar el pedido y recibir su código de retiro | HU-04 |
| Cliente | Consultar el estado de sus pedidos (o buscarlos por código) | HU-05 |
| Personal | Registrar productos (precio, categoría, descripción, foto) | HU-06 |
| Personal | Editar productos y marcarlos como disponibles / no disponibles | HU-07 |
| Personal | Ver la bandeja de pedidos filtrada por estado, con contadores | HU-08 |
| Personal | Avanzar el estado de un pedido | HU-09 |
| Personal | Entregar un pedido verificando el código de retiro | HU-10 |
| Cliente | Crear cuenta e ingresar con correo y contraseña | HU-11 |

Reglas importantes: los importes se guardan en **centavos enteros** (sin errores de redondeo), confirmar
un pedido es **una sola transacción** (se guarda completo o no se guarda), los estados solo avanzan
en orden y un pedido solo se entrega con el código correcto.

## Tecnologías

| Capa | Herramienta |
|---|---|
| Aplicación web | [Next.js 16](https://nextjs.org) (App Router, Server Components, Server Actions) + React 19 + TypeScript |
| Interfaz | Tailwind CSS 4 · shadcn/ui · lucide-react · tema oscuro estilo café |
| Base de datos y cuentas | [Supabase](https://supabase.com): PostgreSQL, Auth (correo/contraseña) y Storage (fotos) |
| Entorno local | Supabase CLI sobre **Docker** (levanta PostgreSQL, Auth, Storage y Studio en contenedores) |
| Pruebas | Vitest (dominio, servicios y SQL con PGlite) · Playwright (recorrido en navegador) |
| Calidad | ESLint · TypeScript estricto · GitHub Actions (CI en cada push y Pull Request) |
| Producción | Vercel + Supabase en la nube |

---

## 🐳 Ejecutar con Docker (solo el Dockerfile)

La forma más rápida de probar el sistema: **solo necesita Docker Desktop**, sin Node, sin
Supabase y sin claves. La imagen trae todo dentro (PostgreSQL, inicio de sesión, API, fotos y la
aplicación) y en el primer arranque crea las tablas, el menú de ejemplo y las cuentas demo.

```bash
git clone https://github.com/FranciscoVilli/cafeteria-web.git
cd cafeteria-web
docker build -t cafeteria-web .
docker run --name cafeteria -p 3000:3000 cafeteria-web
```

Cuando la consola muestre **«Cafetería Universitaria lista»** (≈ 30 s), abra
**http://localhost:3000** e ingrese con `cliente@cafeteria.local / ClienteDemo2026` o
`cajero@cafeteria.local / MostradorSeguro2026`.

| Acción | Comando |
|---|---|
| Detener | `docker stop cafeteria` (o Ctrl + C) |
| Volver a iniciar (conserva pedidos y fotos) | `docker start -a cafeteria` |
| Empezar de cero (borra los datos del contenedor) | `docker rm -f -v cafeteria` |
| Si el puerto 3000 está ocupado | `docker run --name cafeteria -p 8080:3000 cafeteria-web` → http://localhost:8080 |

La primera construcción descarga ≈ 1,5 GB de imágenes base y tarda unos minutos. Las claves
internas son las de demostración de Supabase: la imagen es para evaluar el sistema en una
computadora, no para publicarla en internet. Los archivos están en [`Dockerfile`](Dockerfile) y
[`docker/`](docker).

---

## 🚀 Levantar el proyecto en tu computadora (desarrollo)

### 1. Requisitos (una sola vez)

| Programa | Versión | Para qué |
|---|---|---|
| [Node.js](https://nodejs.org) | **22 LTS** o superior | Ejecutar la aplicación |
| [Docker Desktop](https://www.docker.com/products/docker-desktop/) | Cualquier versión reciente | Contenedores de la base de datos (Supabase local) |
| [Git](https://git-scm.com) | — | Clonar el repositorio |

> **Windows:** Docker Desktop necesita WSL 2 (el instalador lo ofrece). Después de instalarlo,
> **ábralo y espere a que diga "Engine running"** antes de seguir.

No necesitas instalar PostgreSQL ni crear cuentas en Supabase: todo corre en contenedores locales.

### 2. Clonar e instalar

```bash
git clone https://github.com/<usuario>/cafeteria-web.git
cd cafeteria-web
npm install
```

### 3. Levantar la base de datos (contenedores Docker)

```bash
npm run db:iniciar
```

La primera vez descarga las imágenes de Docker (unos minutos). Crea la base de datos, aplica las
migraciones de `supabase/migrations/` y carga el menú de ejemplo de `supabase/seed.sql`.

### 4. Configurar y crear las cuentas de prueba

```bash
npm run configurar
```

Genera el archivo `.env.local` con las claves del Supabase local y crea dos cuentas de demostración.

### 5. Ejecutar la aplicación

```bash
npm run dev
```

Abra **http://localhost:3000** 🎉

### Cuentas de demostración

| Perfil | Correo | Contraseña | Qué verá |
|---|---|---|---|
| Cliente | `cliente@cafeteria.local` | `ClienteDemo2026` | Menú, pedido, código de retiro y seguimiento |
| Personal | `cajero@cafeteria.local` | `MostradorSeguro2026` | Bandeja de pedidos y gestión del menú (`/personal`) |

También puede crear clientes nuevos en `/registro`. Las cuentas del personal **no** se crean desde la
web (para que nadie se dé acceso al panel); se crean con:

```bash
node --env-file=.env.local scripts/crear-personal.mjs correo@ejemplo.com "UnaClaveSegura123" "Nombre Apellido"
```

### Herramientas locales útiles

| Dirección | Qué es |
|---|---|
| http://localhost:3000 | La aplicación |
| http://127.0.0.1:54323 | **Supabase Studio**: ver y editar tablas, usuarios y fotos |
| `postgresql://postgres:postgres@127.0.0.1:54322/postgres` | Conexión directa a PostgreSQL (DBeaver, pgAdmin…) |

### Del día a día

```bash
npm run db:iniciar     # al empezar a trabajar (si Docker se apagó)
npm run dev            # servidor de desarrollo
npm run db:detener     # al terminar: apaga los contenedores (los datos se conservan)
npm run db:reiniciar   # borra la base y la recrea desde migraciones + seed
                       #   → después ejecute otra vez `npm run configurar`
```

### Problemas comunes

| Síntoma | Solución |
|---|---|
| `Cannot connect to the Docker daemon` / `docker: not found` | Abra Docker Desktop y espere a que el motor esté encendido. |
| `port 54321 already in use` o `54322` | Otro proyecto de Supabase está corriendo: `npx supabase stop --project-id <otro>` o apague ese contenedor en Docker Desktop. |
| `Port 3000 is in use` | Cierre el otro `npm run dev` o use `npm run dev -- -p 3001`. |
| Inicio de sesión falla con las cuentas demo | Ejecute `npm run configurar` (después de `db:reiniciar` hay que volver a crearlas). |
| Las fotos no cargan | Verifique que `npm run db:iniciar` siga corriendo (`npm run db:estado`). |
| Cambié una migración y no se aplica | `npm run db:reiniciar` y luego `npm run configurar`. |

---

## Comandos

| Comando | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga automática |
| `npm run build` / `npm start` | Compilar y ejecutar en modo producción |
| `npm run lint` | Análisis estático con ESLint |
| `npm run typecheck` | Verificación de tipos de TypeScript (ejecute antes `npx next typegen`) |
| `npm test` | Pruebas unitarias, de servicios y de base de datos |
| `npm run test:cobertura` | Pruebas con cobertura; exige ≥ 80 % en dominio y aplicación |
| `npm run db:iniciar` / `db:detener` / `db:reiniciar` / `db:estado` | Manejo de los contenedores de Supabase |
| `npm run configurar` | Genera `.env.local` y crea las cuentas demo |

**Prueba de navegador completa** (con la app corriendo y Google Chrome instalado):

```bash
E2E_PERSONAL_CORREO=cajero@cafeteria.local E2E_PERSONAL_CLAVE=MostradorSeguro2026 node e2e/recorrido.mjs http://localhost:3000
```

Recorre el flujo del cliente y del personal (23 verificaciones) y guarda capturas en `e2e/capturas/`.

---

## Cómo trabajamos (GitHub Flow)

1. `main` siempre tiene código estable y desplegable.
2. Para cada cambio cree una rama desde `main`: `git checkout -b feature/nombre-corto`.
3. Haga commits pequeños y suba la rama: `git push -u origin feature/nombre-corto`.
4. Abra un **Pull Request** hacia `main`. GitHub Actions ejecuta lint, tipos, pruebas y build.
5. Con la CI en verde y la revisión de un compañero, se hace *merge* y se borra la rama.

La rama **`documentacion`** contiene los entregables escritos (requisitos, diseño, manuales,
casos de prueba, análisis estático) y también se integra a `main` mediante Pull Request. El
detalle del método de ramificación está en [`docs/GITHUB_FLOW.md`](docs/GITHUB_FLOW.md).

## Estructura del proyecto

```
app/                  Páginas por perfil: (sitio)/ para clientes, personal/ para el personal
components/           Interfaz; components/ui/ son primitivos de shadcn/ui
lib/dominio/          Reglas de negocio puras: carrito, pedido, estados, dinero, código de retiro
lib/aplicacion/       Casos de uso (MenuServicio, PedidoServicio, ClienteServicio) y puertos
lib/infraestructura/  Repositorios sobre Supabase que implementan los puertos
lib/acciones/         Server Actions: verifican sesión y rol y llaman a los servicios
lib/servicios.ts      Composición: arma los servicios con los repositorios reales
supabase/             Migraciones SQL, seed (menú de ejemplo), config del entorno local y pruebas SQL
scripts/              Configuración local y creación de cuentas del personal
e2e/                  Recorrido automatizado en navegador
public/productos/     Fotos del menú de ejemplo (licencias CC, ver CREDITOS.md)
docker/               Arranque de la imagen todo en uno (ver Dockerfile)
docs/                 Método de ramificación (GitHub Flow)
```

Los documentos del curso (requisitos, diseño, casos de prueba, análisis estático, manuales y
documentación técnica) están en la rama
[`documentacion`](https://github.com/FranciscoVilli/cafeteria-web/tree/documentacion).

La arquitectura es **por capas**: el dominio no conoce Next.js ni Supabase, por eso se prueba sin
base de datos. Las pruebas están organizadas por historia de usuario en
`lib/aplicacion/__tests__/historias-*.test.ts`.

### Pantallas

| Perfil | Ruta | Pantalla |
|---|---|---|
| Público | `/` | Portada |
| Cliente | `/ingresar`, `/registro` | Identificación y registro |
| Cliente | `/menu` | Menú (selector destacado + catálogo) |
| Cliente | `/carrito` | Mi pedido |
| Cliente | `/pedido/[código]` | Resumen, código de retiro y estado |
| Cliente | `/seguimiento` | Mis pedidos |
| Personal | `/personal` | Bandeja de pedidos |
| Personal | `/personal/pedidos/[id]` | Detalle, avance y entrega |
| Personal | `/personal/menu` | Gestión del menú |

### Seguridad

- **RLS activado** en todas las tablas y sin permisos para `anon`/`authenticated`: el navegador nunca
  consulta la base; solo el servidor, con la clave de servicio.
- Cada Server Action verifica la sesión y el rol antes de actuar.
- Límite de intentos en ingreso y registro (10 por minuto por IP).
- Las fotos subidas se validan (JPG/PNG/WebP, máx. 4 MB) y se normalizan a 900×900 WebP.

---

## Producción: Supabase en la nube + Vercel

1. **Supabase:** cree un proyecto en [supabase.com](https://supabase.com) (plan gratuito). En
   **SQL Editor** ejecute en orden:
   - `supabase/migrations/20261117000000_esquema_inicial.sql`
   - `supabase/migrations/20261118000000_postres_y_fotos.sql`
   - `supabase/seed.sql` (opcional: menú de ejemplo)
2. **Vercel:** importe el repositorio (detecta Next.js). En **Settings → Environment Variables**
   cargue las tres variables de `.env.example` con los valores de Supabase → Project Settings → API.
3. **Personal:** cree las cuentas con `scripts/crear-personal.mjs` usando un `.env.local` que apunte
   al proyecto en la nube.
4. Cada push a `main` despliega a producción; cada Pull Request recibe una URL de vista previa.

> ⚠️ La clave `SUPABASE_SERVICE_ROLE_KEY` es secreta: nunca la suba al repositorio ni la ponga en
> una variable que empiece con `NEXT_PUBLIC_`.
