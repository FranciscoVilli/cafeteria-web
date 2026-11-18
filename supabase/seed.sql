-- Menú de ejemplo para desarrollo y demostración de PN-01 y PN-02.
-- Las fotos están en public/productos (créditos en public/productos/CREDITOS.md).
-- No se ejecuta en producción automáticamente: cárguelo a mano si desea datos de prueba.
insert into public.producto (codigo, nombre, categoria, precio_centavos, disponible, descripcion, imagen_url) values
  ('BEB-001', 'Café americano',     'BEBIDA',   150, true,  'Espresso alargado con agua caliente. Intenso y aromático.',            '/productos/americano.webp'),
  ('BEB-002', 'Jugo de naranja',    'BEBIDA',   125, true,  'Naranjas exprimidas al momento, sin azúcar añadida.',                  '/productos/jugo-naranja.webp'),
  ('BEB-003', 'Capuchino',          'BEBIDA',   200, true,  'Espresso con leche vaporizada y una capa generosa de espuma.',         '/productos/capuchino.webp'),
  ('BEB-004', 'Espresso',           'BEBIDA',   125, true,  'Shot corto de café de altura ecuatoriano. Cuerpo pleno.',              '/productos/espresso.webp'),
  ('BEB-005', 'Latte',              'BEBIDA',   225, true,  'Suave y cremoso, con arte latte hecho por nuestro barista.',           '/productos/latte.webp'),
  ('BEB-006', 'Latte helado',       'BEBIDA',   250, true,  'Espresso sobre hielo y leche fría. Refrescante para el receso.',       '/productos/latte-helado.webp'),
  ('BEB-007', 'Chocolate caliente', 'BEBIDA',   175, true,  'Cacao fino de Ecuador con leche y malvaviscos.',                       '/productos/chocolate-caliente.webp'),
  ('ALI-001', 'Sánduche de pollo',  'ALIMENTO', 250, true,  'Pan tostado a la plancha con pollo desmechado y queso derretido.',     '/productos/sanduche-pollo.webp'),
  ('ALI-002', 'Empanada de queso',  'ALIMENTO', 100, true,  'Masa crujiente horneada, rellena de queso fresco.',                    '/productos/empanada-queso.webp'),
  ('ALI-003', 'Ensalada de frutas', 'ALIMENTO', 200, false, 'Sandía, kiwi y frutas de temporada recién cortadas.',                  '/productos/ensalada-frutas.webp'),
  ('ALI-004', 'Humita',             'ALIMENTO', 125, true,  'Tradicional humita de choclo tierno, envuelta en su hoja.',            '/productos/humita.webp'),
  ('ALI-005', 'Croissant',          'ALIMENTO', 150, true,  'Hojaldre de mantequilla horneado cada mañana.',                        '/productos/croissant.webp'),
  ('POS-001', 'Cheesecake',         'POSTRE',   275, true,  'Base de galleta, crema de queso suave y salsa de frutos rojos.',       '/productos/cheesecake.webp'),
  ('POS-002', 'Brownie con helado', 'POSTRE',   225, true,  'Brownie tibio de chocolate con una bola de helado de vainilla.',       '/productos/brownie.webp'),
  ('POS-003', 'Torta de chocolate', 'POSTRE',   250, true,  'Bizcocho húmedo con ganache de chocolate y nueces.',                   '/productos/torta-chocolate.webp'),
  ('POS-004', 'Tres leches',        'POSTRE',   225, true,  'Esponjoso, bañado en tres leches y coronado con crema.',               '/productos/tres-leches.webp'),
  ('POS-005', 'Pie de manzana',     'POSTRE',   200, true,  'Masa quebrada con manzanas caramelizadas y canela.',                   '/productos/pie-manzana.webp')
on conflict (codigo) do nothing;
