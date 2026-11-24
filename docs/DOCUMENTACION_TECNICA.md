Documentación del código del **Sistema de Pedidos de la Cafetería Universitaria** (Release 1.0),
generada con [TypeDoc](https://typedoc.org) a partir de los comentarios del código fuente.

Para regenerarla: `npm run docs` (se crea la carpeta `docs-tecnica/`; abrir `index.html`).

## Arquitectura por capas

El código de negocio está en `lib/` y se organiza en capas. Cada capa solo depende de las de
abajo, así las reglas de negocio se prueban sin base de datos ni navegador.

| Capa | Carpeta | Responsabilidad |
|---|---|---|
| Acciones del servidor | `lib/acciones/` | Server Actions que llama la interfaz. Verifican la sesión y el rol (`exigirCliente` / `exigirPersonal`) y devuelven un `Resultado<T>`. |
| Aplicación | `lib/aplicacion/` | Casos de uso: `MenuServicio`, `PedidoServicio`, `ClienteServicio`. Dependen solo de los puertos (`puertos.ts`). |
| Dominio | `lib/dominio/` | Reglas de negocio puras e inmutables: carrito, pedido, estados, dinero en centavos, código de retiro, validaciones y errores. |
| Infraestructura | `lib/infraestructura/supabase/` | Implementa los puertos sobre Supabase (PostgreSQL, Auth y Storage) y traduce los errores de la base a errores del dominio. |
| Composición | `lib/servicios.ts`, `lib/sesion.ts`, `lib/formato.ts` | Arma los servicios con los repositorios reales, obtiene la sesión y da formato a montos y fechas (zona America/Guayaquil). |

## Reglas que se reflejan en el código

- **Dinero en centavos enteros**: nunca se usan decimales para importes (`aCentavos`, `dolares`).
- **Confirmar un pedido es una sola transacción** (función `crear_pedido` de PostgreSQL): se guarda completo o no se guarda.
- **Los estados solo avanzan**: Pendiente → En preparación → Listo para retirar → Entregado.
- **Mensajes de error en español**: cada regla lanza un error del dominio con el mensaje que ve el usuario.

## Cómo leer esta documentación

En el menú lateral cada módulo corresponde a un archivo de `lib/`. Dentro de cada uno se listan
sus funciones, clases, interfaces y tipos con su descripción, parámetros (`@param`), valor de
retorno (`@returns`) y errores que puede lanzar (`@throws`).
