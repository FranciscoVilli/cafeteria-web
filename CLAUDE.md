@AGENTS.md

# Cafetería Universitaria · guía del proyecto

Proyecto de la materia Construcción y Evolución de Software (Release 1.0). Los requisitos
(HU-01…HU-11, RN-NEG-xx, SUP-xx, RNF-xx) vienen de la Documentación de Requisitos; los
nombres de servicios, mensajes de error y escenarios de prueba los siguen al pie de la letra.

## Comandos

`npm run dev` · `npm run build` · `npm run lint` · `npx next typegen && npm run typecheck` ·
`npm test` · `npm run test:cobertura` (exige ≥ 80 % en `lib/dominio` y `lib/aplicacion`).

## Arquitectura en capas (RNF-06) — respetarla

- `lib/dominio/`: funciones e interfaces **puras e inmutables**. No importa Next.js, React ni
  Supabase. Toda regla de negocio va aquí, con su mensaje en español (se muestra tal cual).
- `lib/aplicacion/`: servicios de casos de uso; dependen solo de los puertos (`puertos.ts`).
- `lib/infraestructura/supabase/`: implementa los puertos. Traduce errores de PostgreSQL a
  errores del dominio (`traducirError`).
- `lib/acciones/`: Server Actions. **Cada una verifica sesión y rol** con `exigirCliente()` o
  `exigirPersonal()` de `lib/sesion.ts` — el proxy no basta (las acciones aceptan POST directo).
  Devuelven `Resultado<T>` vía `ejecutar()`.
- Dos clientes Supabase no intercambiables: `crearClienteServidor()` (cookies, solo sesión) y
  `crearClienteAdmin()` (service role, se salta RLS; solo desde el servidor).

## Reglas de datos

- Dinero en **centavos enteros**; nunca `number` decimal para importes. Usar `aCentavos`/`dolares`.
- Fechas: `timestamptz` en la base; mostrar con `lib/formato.ts` (zona America/Guayaquil).
- La fuente de verdad del esquema son las migraciones en `supabase/migrations/`. Toda migración
  nueva necesita pruebas en `supabase/__tests__/` (corren sobre PGlite, PostgreSQL real en memoria).
- RLS activado y sin políticas: anon/authenticated no tienen acceso. Mantenerlo así.

## Pruebas

Vitest. Tests en `__tests__/` junto al código. Los de historias usan repositorios en memoria
(`lib/aplicacion/__tests__/memoria.ts`); un `it` por escenario Dado–Cuando–Entonces, con el
nombre «Esc. N: …» para que sirvan como documentación de casos de prueba.

## Next.js 16

`proxy.ts` (no `middleware.ts`), `params`/`searchParams` son Promises, `PageProps<"/ruta">`
requiere `npx next typegen`. Consultar `node_modules/next/dist/docs/` antes de usar APIs nuevas.
