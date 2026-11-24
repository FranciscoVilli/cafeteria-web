# Documentación técnica

Documentación del código del Sistema de Pedidos de la Cafetería Universitaria (Release 1.0), generada con **TypeDoc** a partir de los comentarios del código fuente.

## Cómo abrirla

GitHub muestra los archivos HTML como código, por eso hay que verla en el navegador:

1. Descargar el repositorio: botón **Code → Download ZIP** estando en la rama `documentacion` (o `git clone -b documentacion https://github.com/FranciscoVilli/cafeteria-web.git`).
2. Abrir `Documentacion/DocumentacionTecnica/index.html` con Chrome, Edge o Firefox.

## Contenido

- Página de inicio con la arquitectura por capas y las reglas principales.
- Un módulo por archivo de `lib/`: acciones del servidor, servicios de aplicación, dominio (carrito, pedido, estados, dinero, código de retiro, errores) e infraestructura (Supabase).
- Para cada función y clase: descripción, parámetros, valor de retorno y errores que puede lanzar, con enlaces entre los tipos.

## Regenerarla

En la rama `main`: `npm install` y luego `npm run docs` (se crea la carpeta `docs-tecnica/`).
