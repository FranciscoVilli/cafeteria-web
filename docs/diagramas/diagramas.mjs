// Fuentes Mermaid de los diagramas del sistema (se copian al repositorio en docs/diagramas/).
export const DIAGRAMAS = {
  "01-dominio-conceptual": `classDiagram
  direction LR
  class CuentaDeAcceso {
    correo
    contraseña
    rol
  }
  class Cliente {
    codigo
    nombre
    apellido
    cedula
    celular
    correoInstitucional
  }
  class Producto {
    codigo
    nombre
    categoria
    precio
    disponible
    descripcion
    foto
  }
  class Pedido {
    codigoRetiro
    estado
    fechaRegistro
    importeTotal
  }
  class DetallePedido {
    cantidad
    precioUnitario
  }
  CuentaDeAcceso "1" -- "0..1" Cliente : identifica a
  Cliente "1" -- "0..*" Pedido : realiza
  Pedido "1" *-- "1..*" DetallePedido : contiene
  DetallePedido "*" --> "1" Producto : se refiere a`,

  "02-estados-pedido": `stateDiagram-v2
  direction TB
  state "Pendiente" as PENDIENTE
  state "En preparación" as EN_PREPARACION
  state "Listo para retirar" as LISTO_PARA_RETIRAR
  state "Entregado" as ENTREGADO
  [*] --> PENDIENTE : confirmar pedido
  PENDIENTE --> EN_PREPARACION : iniciar preparación
  EN_PREPARACION --> LISTO_PARA_RETIRAR : terminar preparación
  LISTO_PARA_RETIRAR --> ENTREGADO : entregar con código correcto
  ENTREGADO --> [*]`,

  "04-despliegue": `flowchart LR
  subgraph USR["Dispositivos"]
    CEL["Celular o PC del cliente<br/>(navegador)"]
    MOS["PC o tablet del mostrador<br/>(navegador)"]
  end
  subgraph VER["Vercel"]
    NEXT["Next.js 16<br/>Server Components,<br/>Server Actions y proxy.ts"]
  end
  subgraph SUP["Supabase (nube)"]
    AUTH["Auth<br/>correo y contraseña"]
    PG[("PostgreSQL<br/>tablas, funciones, RLS")]
    ST["Storage<br/>bucket productos"]
  end
  GH["GitHub<br/>repositorio y Actions (CI)"]
  CEL -- HTTPS --> NEXT
  MOS -- HTTPS --> NEXT
  NEXT -- "sesión (cookies)" --> AUTH
  NEXT -- "service_role" --> PG
  NEXT -- "subida de fotos" --> ST
  CEL -. "fotos del menú" .-> ST
  GH -- "push a main: despliegue" --> VER`,

  "05-clases-dominio": `classDiagram
  direction TB
  class EstadoPedido {
    <<enumeration>>
    PENDIENTE
    EN_PREPARACION
    LISTO_PARA_RETIRAR
    ENTREGADO
  }
  class Categoria {
    <<enumeration>>
    BEBIDA
    ALIMENTO
    POSTRE
  }
  class Producto {
    <<interface>>
    +codigo : string
    +nombre : string
    +categoria : Categoria
    +precioCentavos : number
    +disponible : boolean
    +descripcion : string
    +imagenUrl : string | null
  }
  class Cliente {
    <<interface>>
    +codigo : string
    +nombre : string
    +apellido : string
    +cedula : string
    +celular : string
    +correoInstitucional : string
  }
  class Pedido {
    <<interface>>
    +id : number | null
    +codigoRetiro : string
    +cliente : Cliente
    +estado : EstadoPedido
    +fechaRegistro : Date
    +detalles : DetallePedido[]
    +importeTotalCentavos : number
  }
  class DetallePedido {
    <<interface>>
    +producto : ResumenProducto
    +cantidad : number
    +precioUnitarioCentavos : number
  }
  class LineaCarrito {
    <<interface>>
    +codigo : string
    +cantidad : number
  }
  class pedido_ts {
    <<módulo>>
    +confirmar(cliente, detalles, codigoRetiro, fecha) Pedido
    +calcularTotal(pedido) Centavos
    +subtotal(detalle) Centavos
    +avanzar(pedido) Pedido
    +entregar(pedido, codigoPresentado) Pedido
  }
  class carrito_ts {
    <<módulo>>
    +agregar(carrito, codigo, cantidad) Carrito
    +cambiarCantidad(carrito, codigo, cantidad) Carrito
    +quitar(carrito, codigo) Carrito
    +estaVacio(carrito) boolean
  }
  class estado_pedido_ts {
    <<módulo>>
    +siguienteEstado(estado) EstadoPedido
    +mensajeTransicion(actual, destino) string
  }
  Cliente "1" -- "0..*" Pedido : realiza
  Pedido "1" *-- "1..*" DetallePedido : contiene
  DetallePedido "*" --> "1" Producto
  Pedido --> EstadoPedido
  Producto --> Categoria
  carrito_ts ..> LineaCarrito : Carrito = LineaCarrito[]
  pedido_ts ..> Pedido
  pedido_ts ..> estado_pedido_ts`,

  "06-servicios-repositorios": `classDiagram
  direction LR
  class MenuServicio {
    +listarMenuCliente() Producto[]
    +listarTodosLosProductos() Producto[]
    +registrarProducto(datos) Producto
    +actualizarProducto(codigo, nombre, categoria, precio, extras) Producto
    +cambiarDisponibilidad(codigo, disponible) Producto
  }
  class ClienteServicio {
    +registrarCliente(datos, contrasena) Cliente
    +buscarPorCodigo(codigo) Cliente
    +buscarPorUsuario(usuarioId) Cliente
  }
  class PedidoServicio {
    +agregarAlCarrito(carrito, codigo, cantidad) Carrito
    +cambiarCantidad(carrito, codigo, cantidad) Carrito
    +quitarDelCarrito(carrito, codigo) Carrito
    +calcularTotal(carrito) Centavos
    +resumirCarrito(carrito) ResumenCarrito
    +confirmarPedido(carrito, codigoCliente) Pedido
    +consultarPorCodigoRetiro(codigo) Pedido
    +consultarPedidosDeCliente(codigoCliente) Pedido[]
    +listarPedidos(estado) Pedido[]
    +contarPorEstado() Record
    +avanzarEstado(id) Pedido
    +entregarPedido(id, codigoPresentado) Pedido
  }
  class ProductoRepositorio {
    <<interface>>
    +guardar(producto)
    +buscarPorCodigo(codigo) Producto
    +buscarVarios(codigos) Producto[]
    +listarDisponibles() Producto[]
    +listarTodos() Producto[]
  }
  class ClienteRepositorio {
    <<interface>>
    +registrar(datos, usuarioId) Cliente
    +buscarPorCodigo(codigo) Cliente
    +buscarPorUsuario(usuarioId) Cliente
    +existePorCedula(cedula) boolean
    +existePorCorreo(correo) boolean
  }
  class PedidoRepositorio {
    <<interface>>
    +guardar(pedido) Pedido
    +actualizarEstado(pedido, estadoAnterior) boolean
    +buscarPorId(id) Pedido
    +buscarPorCodigoRetiro(codigo) Pedido
    +listarPorEstado(estado) Pedido[]
    +listarPorCliente(codigoCliente) Pedido[]
    +contarPorEstado() Record
    +existeCodigoRetiro(codigo) boolean
  }
  class ProveedorCuentas {
    <<interface>>
    +crearCuentaCliente(correo, contrasena, nombre) string
    +eliminarCuenta(usuarioId)
  }
  MenuServicio --> ProductoRepositorio
  ClienteServicio --> ClienteRepositorio
  ClienteServicio --> ProveedorCuentas
  PedidoServicio --> PedidoRepositorio
  PedidoServicio --> ProductoRepositorio
  PedidoServicio --> ClienteRepositorio
  ProductosSupabase ..|> ProductoRepositorio
  ClientesSupabase ..|> ClienteRepositorio
  PedidosSupabase ..|> PedidoRepositorio
  CuentasSupabase ..|> ProveedorCuentas`,

  "07-errores": `classDiagram
  direction LR
  Error <|-- ReglaNegocioError
  Error <|-- PersistenciaError
  PersistenciaError <|-- CodigoRetiroDuplicadoError
  ReglaNegocioError <|-- CantidadInvalidaError
  ReglaNegocioError <|-- ProductoNoDisponibleError
  ReglaNegocioError <|-- PedidoVacioError
  ReglaNegocioError <|-- TransicionEstadoInvalidaError
  ReglaNegocioError <|-- CodigoRetiroIncorrectoError
  ReglaNegocioError <|-- DatoInvalidoError
  ReglaNegocioError <|-- EntidadDuplicadaError
  ReglaNegocioError <|-- EntidadNoEncontradaError
  ReglaNegocioError <|-- NoAutorizadoError`,

  "08-actividad-pn01": `flowchart TB
  I((Inicio)) --> A["Consultar el menú (/menu)"]
  A --> B["Elegir productos y cantidades<br/>(selector o catálogo)"]
  B --> C["Validar cantidad (1 a 50) y disponibilidad"]
  C --> D["Ver el pedido y el importe total (/carrito)"]
  D --> E{"¿El cliente confirma?"}
  E -- no --> X["No se registra el pedido"]
  E -- sí --> S{"¿Inició sesión<br/>como cliente?"}
  S -- no --> L["Ingresar o crear cuenta<br/>(/ingresar, /registro)"]
  L --> E
  S -- sí --> F{"¿Carrito con productos<br/>y todos disponibles?"}
  F -- no --> G["Informar el motivo;<br/>el pedido no se confirma"]
  F -- sí --> H["Generar código de retiro único"]
  H --> J["Registrar el pedido Pendiente<br/>(crear_pedido, una transacción)"]
  J --> K["Mostrar resumen y código<br/>(/pedido/[código])"]
  K --> Z((Fin))
  G --> Z
  X --> Z`,

  "09-actividad-pn02": `flowchart TB
  I((Inicio)) --> A["Ver la bandeja de pedidos (/personal)<br/>filtrada por estado y por orden de llegada"]
  A --> B["Abrir el detalle del pedido"]
  B --> C{"Estado actual"}
  C -- Pendiente --> D["Iniciar preparación"]
  C -- En preparación --> E["Marcar listo para retirar"]
  D --> A
  E --> A
  C -- Listo para retirar --> F["El cliente muestra su código"]
  F --> G["Digitar el código"]
  G --> H{"¿Coincide?"}
  H -- no --> M["Rechazar: código incorrecto"]
  M --> G
  H -- sí --> J["Registrar la entrega (Entregado)"]
  J --> Z((Fin))`,

  "10-secuencia-confirmar": `sequenceDiagram
  autonumber
  actor Cliente
  participant UI as Página /carrito
  participant SA as Server Action confirmarPedido
  participant PS as PedidoServicio
  participant CR as ClienteRepositorio
  participant PR as ProductoRepositorio
  participant D as dominio/pedido
  participant PeR as PedidoRepositorio
  participant DB as PostgreSQL
  Cliente->>UI: Confirmar pedido
  UI->>SA: confirmarPedido(carrito)
  SA->>SA: exigirCliente() (sesión y rol)
  SA->>PS: confirmarPedido(carrito, codigoCliente)
  PS->>CR: buscarPorCodigo(codigoCliente)
  CR-->>PS: cliente
  alt carrito vacío
    PS-->>SA: PedidoVacioError
  end
  PS->>PR: buscarVarios(códigos del carrito)
  PR-->>PS: productos con precio vigente
  alt algún producto no disponible
    PS-->>SA: ProductoNoDisponibleError
  end
  loop hasta 5 intentos
    PS->>PeR: existeCodigoRetiro(candidato)
    PeR-->>PS: false
    PS->>D: confirmar(cliente, detalles, código, fecha)
    D-->>PS: pedido PENDIENTE con total
    PS->>PeR: guardar(pedido)
    PeR->>DB: rpc crear_pedido (una transacción)
    alt código repetido (UNIQUE)
      DB-->>PeR: error 23505
      PeR-->>PS: CodigoRetiroDuplicadoError, se reintenta
    else guardado
      DB-->>PeR: id del pedido
      PeR-->>PS: pedido con id
    end
  end
  PS-->>SA: pedido
  SA-->>UI: ok y código de retiro
  UI-->>Cliente: Resumen y código de retiro`,

  "11-secuencia-avanzar": `sequenceDiagram
  autonumber
  actor Personal
  participant UI as Página del pedido
  participant SA as Server Action avanzarPedido
  participant PS as PedidoServicio
  participant PeR as PedidoRepositorio
  participant D as dominio/pedido
  Personal->>UI: Avanzar el pedido
  UI->>SA: avanzarPedido(id)
  SA->>SA: exigirPersonal()
  SA->>PS: avanzarEstado(id)
  PS->>PeR: buscarPorId(id)
  PeR-->>PS: pedido
  PS->>D: avanzar(pedido)
  alt PENDIENTE o EN_PREPARACION
    D-->>PS: pedido con el estado siguiente
    PS->>PeR: actualizarEstado(pedido, estadoAnterior)
    alt otro usuario lo cambió antes
      PeR-->>PS: false
      PS-->>SA: TransicionEstadoInvalidaError
    else actualizado
      PeR-->>PS: true
      PS-->>SA: pedido
      SA-->>UI: nuevo estado
    end
  else LISTO_PARA_RETIRAR o ENTREGADO
    D-->>PS: TransicionEstadoInvalidaError
    PS-->>SA: motivo del rechazo
  end`,

  "12-secuencia-entregar": `sequenceDiagram
  autonumber
  actor Personal
  participant UI as Página del pedido
  participant SA as Server Action entregarPedido
  participant PS as PedidoServicio
  participant PeR as PedidoRepositorio
  participant D as dominio/pedido
  Personal->>UI: Digitar el código del cliente y entregar
  UI->>SA: entregarPedido(id, código)
  SA->>SA: exigirPersonal()
  SA->>PS: entregarPedido(id, codigoPresentado)
  PS->>PeR: buscarPorId(id)
  PeR-->>PS: pedido
  PS->>D: entregar(pedido, codigoPresentado)
  alt estado distinto de LISTO_PARA_RETIRAR
    D-->>PS: TransicionEstadoInvalidaError
    PS-->>SA: motivo del rechazo
  else el código no coincide
    D-->>PS: CodigoRetiroIncorrectoError
    PS-->>SA: motivo del rechazo
  else todo correcto
    D-->>PS: pedido ENTREGADO
    PS->>PeR: actualizarEstado(pedido, LISTO_PARA_RETIRAR)
    PeR-->>PS: true
    PS-->>SA: pedido entregado
    SA-->>UI: entrega registrada
  end`,

  "13-entidad-relacion": `erDiagram
  AUTH_USERS ||--|| PERFIL : "tiene rol"
  AUTH_USERS ||--o| CLIENTE : "es"
  CLIENTE ||--o{ PEDIDO : realiza
  PEDIDO ||--|{ DETALLE_PEDIDO : contiene
  PRODUCTO ||--o{ DETALLE_PEDIDO : "se pide en"
  AUTH_USERS {
    uuid id PK
    text email UK
  }
  PERFIL {
    uuid usuario_id PK,FK
    text rol "cliente o personal"
    text nombre
    boolean activo
  }
  CLIENTE {
    text codigo PK "CLI-001"
    uuid usuario_id UK,FK
    text nombre
    text apellido
    text cedula UK
    text celular
    text correo_institucional UK
  }
  PRODUCTO {
    text codigo PK
    text nombre
    text categoria "BEBIDA, ALIMENTO o POSTRE"
    integer precio_centavos
    boolean disponible
    text descripcion
    text imagen_url
  }
  PEDIDO {
    bigint id PK
    text codigo_retiro UK
    text cliente_codigo FK
    text estado
    timestamptz fecha_registro
    integer importe_total_centavos
  }
  DETALLE_PEDIDO {
    bigint pedido_id PK,FK
    text producto_codigo PK,FK
    smallint orden
    integer cantidad "1 a 50"
    integer precio_unitario_centavos
  }`,
};
