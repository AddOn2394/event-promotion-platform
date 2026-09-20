# Especificación Funcional — Plataforma de Confirmación de Asistencia (Feria de Promociones)

> Versión: 1.1 | Fecha: 2026-09-16 — agrega HU-12 (umbrales de descuento configurables, ADR-023) y notificaciones con seguimiento de entrega en HU-1/3/4/6/7/8 (ADR-024), tras revisión del líder del proyecto sobre extensibilidad del motor de descuento y mitigación real del riesgo de email no entregado.
> Ver `DECISIONES_ARQUITECTURA.md` para el "por qué" de cada regla citada aquí (ADR-XXX) y `PLAN_DESARROLLO.md` para en qué gate se implementa cada historia.


---

## 1. Contexto y Objetivos

El departamento de ventas organiza un evento anual de promociones. Los clientes deben poder confirmar su asistencia y declarar los servicios/productos de su interés **antes** del evento, para que ventas prepare un portafolio de promociones personalizado por cliente. La plataforma:

- Todo cliente es invitado previamente por ventas (ADR-011).
- Calcula descuentos automáticos por categoría (servicios / productos) según reglas de umbral (ADR-004, ADR-005).
- Administra un evento con múltiples slots (día/horario) con cupo limitado (ADR-008, ADR-009).
- Permite editar/cancelar/reconfirmar antes de un deadline configurable (ADR-010).

**No-objetivos** (fuera de alcance de esta entrega): múltiples eventos simultáneos, múltiples roles de ventas con permisos diferenciados, test e2e de UI, diseño para 300k usuarios concurrentes (ver ADR-019).

---

## 2. Roles y Matriz de Permisos

| Rol | Cómo se identifica | Alcance |
|---|---|---|
| **Cliente invitado** | Email + código de acceso de 6 dígitos (ADR-011) | Solo su propia invitación/confirmación, nunca ve datos de otros clientes |
| **Ventas (Admin)** | Email + password, cuenta seed única (ADR-013) | Todas las invitaciones, confirmaciones, catálogo, slots y configuración |

| Acción | Cliente invitado | Ventas (Admin) |
|---|:-:|:-:|
| Ver catálogo/slots activos | ✅ (tras login) | ✅ |
| Confirmar asistencia (primera vez) | ✅ (HU-3) | ❌ |
| Editar selección antes del deadline | ✅ solo la propia (HU-4) | ❌ |
| Cambiar de slot antes del deadline | ✅ solo la propia (HU-5) | ❌ |
| Cancelar / reconfirmar | ✅ solo la propia (HU-6, HU-7) | ❌ |
| Crear invitación | ❌ | ✅ (HU-1) |
| Reenviar código de acceso | ❌ | ✅ (HU-11) |
| Ver/exportar todas las confirmaciones | ❌ | ✅ (HU-8) |
| CRUD catálogo (soft-delete) | ❌ | ✅ (HU-9) |
| CRUD slots + cupo + deadline (N días) | ❌ | ✅ (HU-10) |
| Configurar umbrales de descuento | ❌ | ✅ (HU-12) |

Ambos roles requieren autenticación propia desde el primer acceso.

---

## 3. Historias de Usuario y Criterios de Aceptación

### HU-1: Ventas invita a un cliente

**Como** miembro del equipo de ventas
**Quiero** registrar el email (y opcionalmente nombre) de un cliente e invitarlo
**Para** que reciba su código de acceso y pueda confirmar su participación

**Criterios de aceptación**:
- [ ] Formulario con email (requerido) y nombre/apellidos (opcional)
- [ ] Al guardar, se genera un código de 6 dígitos numéricos (ADR-011), se hashea (`codigo_acceso_hash`) y nunca se guarda en texto plano
- [ ] Se envía email vía Resend con el código y el link a la plataforma (ADR-015)
- [ ] Si el email ya tiene invitación activa, no se crea una duplicada — se ofrece reenviar el código (HU-11)
- [ ] La invitación queda "sin respuesta" (`usada_en IS NULL`) hasta el primer login exitoso del cliente
- [ ] Se crea un registro en `notificaciones` (tipo=`invitacion`, estado=`pendiente`) en la misma transacción que la invitación; el envío real ocurre después de confirmar la transacción, nunca dentro de ella (ADR-024)
- [ ] El webhook de Resend actualiza el registro a `enviado`/`fallido`/`rebotado`; un rebote (`rebotado`) es un estado distinto de "sin respuesta" — ventas lo distingue en HU-8, no lo confunde con que el cliente simplemente no ha entrado

### HU-2: Cliente inicia sesión con su código

**Como** cliente invitado
**Quiero** ingresar mi email y el código que recibí por correo
**Para** acceder a mi formulario de confirmación de asistencia

**Criterios de aceptación**:
- [ ] Email pre-llenado al acceder desde el link del correo
- [ ] Email+código correctos → JWT en cookie httpOnly; se registra `invitaciones.usada_en` si es el primer login
- [ ] Máximo 5 intentos fallidos en 15 minutos, contados **por email, sin importar la IP de origen** — un atacante de fuerza bruta contra un código específico normalmente rota de IP (botnet/dispositivos distintos) precisamente para evadir un límite por IP, así que el contador que realmente protege el espacio de 1,000,000 combinaciones del código es el de email (ADR-022)
- [ ] Código inválido/expirado muestra mensaje genérico, sin revelar si el email existe (no enumeration)
- [ ] Sin invitación previa para ese email, el login se rechaza — no existe ruta de acceso sin invitación (ADR-011)

### HU-3: Cliente confirma su asistencia por primera vez

**Como** cliente invitado ya autenticado
**Quiero** seleccionar los servicios/productos de mi interés y mi horario de asistencia
**Para** confirmar mi participación y conocer el descuento que obtengo

**Criterios de aceptación**:
- [ ] Email de solo lectura (identidad ya autenticada); nombre/apellidos editable (ADR-011)
- [ ] Catálogo activo se carga una vez; el buscador filtra en memoria, sin llamadas por tecleo (ADR-012)
- [ ] Dos cajas en vivo, "Servicios seleccionados" / "Productos seleccionados", con opción de quitar cada ítem (ADR-004)
- [ ] Cada caja muestra su % de descuento en vivo (preview cliente, no autoritativo)
- [ ] Selector de slot con cupos disponibles visibles (informativo, no autoritativo)
- [ ] Al confirmar, el servidor recalcula el descuento — nunca confía en el valor mostrado en el cliente
- [ ] Por categoría, se evalúa primero la condición de 5%, luego 3% — tier más alto gana (ADR-005)
- [ ] Suma exactamente Q.1,500.00 en servicios **no** califica para 5% (frontera estricta, ADR-005)
- [ ] Confirmar toma el cupo del slot de forma atómica (`UPDATE ... WHERE cupos_disponibles > 0`); si ya no hay cupo, se rechaza y el cliente elige otro (ADR-009)
- [ ] Se guarda snapshot de nombre/precio/categoría de cada ítem y el % resultante (ADR-006)
- [ ] `confirmaciones.invitacion_id` es `UNIQUE` — esta es la única confirmación posible para esa invitación (ADR-011)
- [ ] Requiere al menos 1 ítem seleccionado (servicio o producto) — una confirmación con selección vacía se rechaza (400), validado en el schema Zod compartido (G0)
- [ ] `POST /confirmaciones` se rechaza con 409 si ya existe una confirmación en estado `confirmada` para esa invitación (ese caso es HU-4/HU-5 vía `PATCH`, no un segundo `POST`)
- [ ] Los umbrales usados (mínimos, monto Q1,500, %) vienen de `configuracion_descuento` vigente al momento de confirmar, y se congelan en la propia confirmación (ADR-023) — un cambio posterior de esos umbrales no reinterpreta esta confirmación
- [ ] Tras confirmar, se crea un registro en `notificaciones` (tipo=`confirmacion`) y se envía email de confirmación con el resumen (servicios/productos/descuento/slot) — **nunca incluye el código de acceso** (ADR-024)

### HU-4: Cliente edita su selección antes del deadline

**Como** cliente ya confirmado
**Quiero** modificar los servicios/productos que elegí
**Para** ajustar mi selección antes de que cierre la ventana de edición

**Criterios de aceptación**:
- [ ] Solo posible si `ahora < (slot_actual.fecha_hora_inicio − N días)`, evaluado contra el slot que tenía **antes** de cualquier cambio (ADR-010)
- [ ] Fuera de la ventana: mensaje "ediciones no permitidas, comuníquese al departamento de ventas al [teléfono ficticio]", sin aplicar ningún cambio
- [ ] El descuento se recalcula con las mismas reglas de HU-3, nuevo snapshot al guardar (incluyendo los umbrales vigentes, ADR-023)
- [ ] Si la confirmación está en estado `cancelada`, `PATCH /confirmaciones/mia` rechaza con 409 y remite a HU-7 (reconfirmar) — editar y reconfirmar son operaciones distintas
- [ ] Se crea un registro en `notificaciones` (tipo=`edicion`) y se envía email confirmando los cambios, sin el código de acceso (ADR-024)

### HU-5: Cliente cambia de slot al editar

**Como** cliente ya confirmado
**Quiero** cambiar el día/horario al que voy a asistir
**Para** ajustar mi asistencia a un horario que me convenga mejor

**Criterios de aceptación**:
- [ ] Sujeto a la misma ventana de edición que HU-4
- [ ] Transacción única: libera cupo del slot viejo (+1), toma cupo del nuevo (−1 con `WHERE > 0`); locks en orden determinista por `id` de slot ascendente (ADR-009)
- [ ] Slot destino lleno → se revierte todo, el cliente conserva su slot original, mensaje claro de cupo lleno
- [ ] La elegibilidad de edición se evalúa contra el slot **antes** del cambio, nunca el nuevo (ADR-010)

### HU-6: Cliente cancela su asistencia

**Como** cliente ya confirmado
**Quiero** cancelar mi asistencia
**Para** liberar mi cupo si ya no puedo/quiero asistir

**Criterios de aceptación**:
- [ ] Solo dentro de la misma ventana de edición que HU-4
- [ ] Libera el cupo del slot (+1) en la misma transacción, marca `estado = 'cancelada'`
- [ ] No se borra la fila — el snapshot se conserva para el historial de ventas (ADR-006, ADR-009)
- [ ] Se crea un registro en `notificaciones` (tipo=`cancelacion`) y se envía email confirmando la cancelación, sin el código de acceso (ADR-024)

### HU-7: Cliente reconfirma después de cancelar

**Como** cliente que canceló previamente
**Quiero** volver a confirmar mi asistencia con mi mismo código
**Para** participar en la feria si cambio de opinión

**Criterios de aceptación**:
- [ ] El código sigue vigente — vive mientras viva la invitación, no expira al cancelar (ADR-011)
- [ ] Reconfirmar reutiliza la misma fila (`invitacion_id` UNIQUE) — nunca crea una segunda confirmación
- [ ] Toma cupo con un `-1` fresco (`WHERE cupos_disponibles > 0`); si el slot original ya no tiene cupo, debe elegir otro
- [ ] `estado` vuelve a `confirmada`, snapshot se sobrescribe con la nueva selección
- [ ] Se crea un registro en `notificaciones` (tipo=`reconfirmacion`) y se envía email confirmando la nueva asistencia, sin el código de acceso (ADR-024)

### HU-8: Ventas consulta y exporta las confirmaciones

**Como** miembro del equipo de ventas
**Quiero** ver todas las confirmaciones (incluyendo quiénes no han respondido y a quiénes no les llegó el correo) con su selección y descuento
**Para** preparar el portafolio de promociones personalizado de cada cliente, y actuar proactivamente si un correo no llegó

**Criterios de aceptación**:
- [ ] Listado filtrable por estado: confirmada / cancelada / sin respuesta (sin confirmación y sin rebote ni fallo de envío) / **rebotada** (`notificaciones.estado_envio = 'rebotado'` para el tipo `invitacion`) / **fallida** (`estado_envio = 'fallido'`: el correo de invitación nunca salió, ADR-030) — estos 5 estados nunca se agrupan entre sí (ADR-024, ADR-030). El estado de envío es el de la notificación de invitación **más reciente**, así que un reenvío exitoso (HU-11) limpia "fallida"; con confirmación, gana el estado de la confirmación
- [ ] Exporta CSV con columnas fijas: nombre, email, slot, servicios, productos, subtotal servicios, % descuento servicios, subtotal productos, % descuento productos, total, estado (ADR-013, corregido por ADR-027: una sola columna "nombre" — el modelo de datos no tiene un campo `apellidos` separado, `invitaciones.nombre_cliente` es texto libre desde Gate 2)
- [ ] Los datos exportados son el snapshot congelado (ADR-006), no un recálculo contra el catálogo actual ni contra la configuración de descuento vigente (ADR-023)

### HU-9: Ventas gestiona el catálogo

**Como** miembro del equipo de ventas
**Quiero** crear, editar y desactivar servicios/productos
**Para** mantener actualizada la oferta de la feria

**Criterios de aceptación**:
- [ ] CRUD con soft-delete (`activo = false`, nunca borrado físico, ADR-007)
- [ ] Un ítem desactivado deja de aparecer en el formulario del cliente pero sigue íntegro en confirmaciones ya hechas (vía snapshot)
- [ ] Editar el precio de un ítem no afecta confirmaciones ya hechas (ADR-006)

### HU-10: Ventas gestiona los slots del evento

**Como** miembro del equipo de ventas
**Quiero** crear slots (día/horario/cupo) y configurar el deadline de edición
**Para** organizar la logística del evento y controlar cuánto tiempo antes se cierran las ediciones

**Criterios de aceptación**:
- [ ] CRUD con soft-delete, igual que catálogo (ADR-007)
- [ ] Si se reduce `cupo_maximo` por debajo de las reservas actuales, se rechaza con error explícito (ADR-009)
- [ ] El N de días de deadline es configurable y se aplica a cada confirmación según su propio slot (ADR-010)

### HU-11: Ventas reenvía un código de acceso

**Como** miembro del equipo de ventas
**Quiero** reenviar el código de acceso a un cliente ya invitado
**Para** el caso de que no lo recibió o lo perdió

**Criterios de aceptación (corregidos 2026-09-17, ver ADR-011 revisión Gate 2 sesión B)**:
- [ ] "Reenviar" **genera un código nuevo** e invalida el anterior — el criterio original ("reenvía el mismo código") es incompatible con nunca guardar el código en texto plano (solo se persiste `codigo_acceso_hash`, ADR-011); no hay forma de recuperar el código original para reenviarlo literal sin reintroducir ese riesgo de seguridad. Ratificado con el líder del proyecto.
- [ ] Si el cliente ya tiene una sesión abierta con el código anterior, esa sesión (JWT ya emitido) sigue válida hasta que expire — invalidar el código no revoca JWTs ya firmados; solo un login *nuevo* con el código viejo deja de funcionar.
- [ ] Disponible solo para invitaciones existentes, mismo botón/pantalla que HU-1

### HU-12: Ventas configura los umbrales de descuento

**Como** miembro del equipo de ventas
**Quiero** cambiar los valores que determinan el % de descuento (mínimos de servicios/productos, monto Q1,500, porcentajes)
**Para** ajustar la promoción sin depender de un cambio de código

**Criterios de aceptación**:
- [ ] Pantalla con los 5 valores de `configuracion_descuento`: mínimo servicios para 3%, mínimo servicios para 5%, monto mínimo en servicios para 5%, mínimo productos para 3%, mínimo productos para 5% (ADR-023)
- [ ] Validación al guardar: todos los mínimos ≥ 1, porcentajes fijos en 3/5 (no editables — solo los umbrales que los disparan), y el umbral de 5% de cada categoría **no puede ser más débil** que el de 3% (ej. mínimo de servicios para 5% < mínimo para 3% se rechaza) — de lo contrario la regla "tier más alto gana" (ADR-005) queda incoherente
- [ ] Cambiar la configuración **no** recalcula confirmaciones ya hechas — cada una guardó su propio snapshot de umbrales (ADR-023); solo aplica a confirmaciones/ediciones nuevas desde ese momento
- [ ] Agregar un escenario de descuento distinto al de estas 4 reglas (ej. una quinta regla) es explícitamente **fuera del alcance de esta pantalla** — requiere un cambio de código en la lista de reglas del motor de descuento (ADR-023), no una opción de UI

---

## 4. Modelo de Datos

```mermaid
erDiagram
    INVITACION ||--o| CONFIRMACION : "tiene (0 o 1, HU-3/HU-7)"
    CONFIRMACION ||--|{ CONFIRMACION_ITEM : "snapshot de (ADR-006)"
    CATALOGO_ITEM ||--o{ CONFIRMACION_ITEM : "referencia original (nullable, soft-delete)"
    SLOT ||--o{ CONFIRMACION : "asignado a (ADR-008)"
    INVITACION ||--o{ NOTIFICACION : "genera (ADR-024)"

    INVITACION {
        uuid idinvitacion PK
        string email UK
        string nombre_cliente
        string codigo_acceso_hash
        timestamp creada_en
        timestamp usada_en "null = sin respuesta, HU-8"
    }
    CONFIRMACION {
        uuid idconfirmacion PK
        uuid idinvitacion FK "UNIQUE, ADR-011"
        uuid idslot FK
        string estado "confirmada | cancelada"
        int subtotal_servicios_cents
        int descuento_servicios_pct
        int subtotal_productos_cents
        int descuento_productos_pct
        int total_cents
        int min_servicios_3pct_snapshot "ADR-023, umbral usado en este cálculo"
        int min_servicios_5pct_snapshot
        int monto_minimo_5pct_servicios_cents_snapshot
        int min_productos_3pct_snapshot
        int min_productos_5pct_snapshot
        timestamp confirmada_en
        timestamp actualizada_en
    }
    CONFIGURACION_DESCUENTO {
        uuid idconfiguracion PK
        int min_servicios_3pct
        int min_servicios_5pct
        int monto_minimo_5pct_servicios_cents
        int min_productos_3pct
        int min_productos_5pct
        timestamp actualizada_en
    }
    NOTIFICACION {
        uuid idnotificacion PK
        uuid idinvitacion FK "siempre presente"
        uuid idconfirmacion FK "nullable, solo confirmacion|edicion|cancelacion|reconfirmacion"
        string tipo "invitacion | confirmacion | edicion | cancelacion | reconfirmacion"
        string estado_envio "pendiente | enviado | fallido | rebotado"
        string id_mensaje_resend
        timestamp creada_en
        timestamp actualizada_en
    }
    CONFIRMACION_ITEM {
        uuid iditem PK
        uuid idconfirmacion FK
        uuid idcatalogo FK "nullable tras soft-delete"
        string nombre_snapshot
        string categoria_snapshot "servicio | producto"
        int precio_cents_snapshot
    }
    CATALOGO_ITEM {
        uuid idcatalogo PK
        string nombre
        string categoria "servicio | producto"
        int precio_cents
        bool activo
    }
    SLOT {
        uuid idslot PK
        timestamp fecha_hora_inicio
        timestamp fecha_hora_fin
        int cupo_maximo
        int cupos_disponibles "CHECK >= 0, ADR-009"
        bool activo
    }
    ADMIN_USER {
        uuid idusuario PK
        string email UK
        string password_hash
    }
    INTENTO_FALLIDO {
        uuid idintento PK
        string identificador "email (sin IP, ver ADR-022)"
        string tipo "login_codigo | login_admin"
        timestamp creado_en
    }
```

**Notas de representación**:
- `descuento_servicios_pct` / `descuento_productos_pct` son enteros de **porcentaje entero** (0, 3 o 5 — no basis points, no decimales).
- `total_cents` se **almacena como parte del snapshot** al confirmar (ADR-006) — no se recalcula al leer, igual que el resto de la fila.
- Redondeo: al aplicar el % de descuento sobre un subtotal en centavos, se redondea al centavo más cercano con **"round half up"** (ej. 3% de Q.333.33 = 9.9999 centavos de descuento → redondea a 10). Se fija esta regla explícitamente porque un `total_cents` que no coincide en pruebas por 1 centavo es el tipo de defecto que un test de integración detecta tarde si la regla no está escrita de antemano.

---

## 5. Flujo Completo (Secuencia)

```mermaid
sequenceDiagram
    participant V as Ventas (Admin)
    participant API as apps/api
    participant DB as PostgreSQL
    participant Mail as Resend
    participant C as Cliente

    V->>API: POST /admin/invitaciones {email, nombre} (HU-1)
    API->>DB: INSERT invitaciones (codigo_acceso_hash)
    API->>Mail: enviar código + link
    Mail-->>C: email con código

    C->>API: POST /auth/login {email, codigo} (HU-2)
    API->>DB: valida hash + rate limit (ADR-022)
    API->>DB: UPDATE invitaciones.usada_en (si es primera vez)
    API-->>C: JWT (cookie httpOnly)

    C->>API: GET /catalogo, GET /slots
    API-->>C: catálogo activo + cupos_disponibles

    C->>API: POST /confirmaciones {items, slot_id} (HU-3)
    API->>DB: BEGIN
    API->>DB: UPDATE slots SET cupos_disponibles = cupos_disponibles - 1 WHERE id = $1 AND cupos_disponibles > 0
    alt cupo disponible
        API->>DB: INSERT confirmacion + confirmacion_items (snapshot)
        API->>DB: COMMIT
        API-->>C: confirmación exitosa + descuento
    else cupo lleno
        API->>DB: ROLLBACK
        API-->>C: 409 "cupo lleno, elige otro horario"
    end

    Note over C,API: Edición/cambio de slot/cancelación (HU-4, HU-5, HU-6) — antes del deadline
    C->>API: PATCH /confirmaciones/mia {items?, slot_id?}
    API->>API: valida deadline contra el slot ANTES del cambio (ADR-010)
    alt dentro de ventana
        API->>DB: transacción (libera+toma cupo si cambia slot, orden determinista, ADR-009)
        API-->>C: confirmación actualizada
    else fuera de ventana
        API-->>C: 403 "ediciones cerradas, contacte a ventas"
    end
```

---

## 6. Estados de una Confirmación

```mermaid
stateDiagram-v2
    [*] --> SinConfirmar : invitación creada (HU-1)
    SinConfirmar --> Confirmada : HU-3 confirma (toma cupo)
    Confirmada --> Confirmada : HU-4 / HU-5 edita selección o slot
    Confirmada --> Cancelada : HU-6 cancela (libera cupo)
    Cancelada --> Confirmada : HU-7 reconfirma (toma cupo)
```

`SinConfirmar` no es una fila en `confirmaciones` — es la ausencia de una (invitación sin confirmación asociada), visible en HU-8 como "sin respuesta".

---

## 7. Arquitectura del Contrato (referencia rápida — ver ADR-002/003/020/021)

```mermaid
graph TD
    subgraph apps
        Web["apps/web (React)"]
        Api["apps/api (Express)"]
    end
    Shared["packages/shared-types<br/>(schemas Zod + tipos + OpenAPI generado)"]
    DB[("PostgreSQL")]
    Mail["Resend"]

    Web -->|"importa schemas Zod + tipos"| Shared
    Api -->|"importa schemas Zod + tipos"| Shared
    Web -->|"HTTP/JSON validado contra el contrato"| Api
    Api --> DB
    Api --> Mail
    Mail -.->|"webhook de entrega (ADR-024)"| Api
```

Los schemas Zod viven en `packages/shared-types`, porque `apps/web` los necesita como objetos reales para validar formularios con React Hook Form (ADR-016). `apps/api` sigue siendo quien los usa para validar request/response, y de ahí se genera el OpenAPI; el cambio es solo dónde vive el archivo fuente. Ver ADR-003 actualizada en `DECISIONES_ARQUITECTURA.md`.

---

## 8. Endpoints (derivados de las historias — contrato real se genera de los schemas Zod, Gate 0)

| Método | Ruta | Historia | Rol |
|---|---|---|---|
| POST | `/admin/auth/login` | — | Ventas |
| POST | `/admin/invitaciones` | HU-1 | Ventas |
| POST | `/admin/invitaciones/:id/reenviar` | HU-11 | Ventas |
| GET | `/admin/confirmaciones` | HU-8 | Ventas |
| GET | `/admin/confirmaciones/export.csv` | HU-8 | Ventas |
| CRUD | `/admin/catalogo` | HU-9 | Ventas |
| CRUD | `/admin/slots` | HU-10 | Ventas |
| GET/PATCH | `/admin/configuracion` (N días deadline) | HU-10 | Ventas |
| GET/PATCH | `/admin/configuracion/descuento` | HU-12 | Ventas |
| POST | `/webhooks/resend` | ADR-024 | Sistema (Resend) |
| POST | `/auth/login` | HU-2 | Cliente |
| GET | `/catalogo` | HU-3 | Cliente |
| GET | `/slots` | HU-3 | Cliente |
| POST | `/confirmaciones` | HU-3, HU-7 | Cliente |
| PATCH | `/confirmaciones/mia` | HU-4, HU-5 | Cliente |
| POST | `/confirmaciones/mia/cancelar` | HU-6 | Cliente |

---

## 9. Riesgos y su mitigación

- **Deadline mal configurado (N=0 o negativo)** → mitigado: el admin panel valida N ≥ 0 al guardar configuración (HU-10, criterio ya incluido) — un N negativo abriría edición después del evento.
- **Email no entregado (invitación, confirmación, edición, cancelación, reconfirmación)** → mitigado: registro `notificaciones` + webhook de Resend (ADR-024) detecta rebotes/fallos sin depender de que el cliente se queje; ventas los ve como estado distinto en HU-8. El reenvío manual (HU-11) sigue siendo la acción correctiva, pero ahora hay señal proactiva de que hace falta.
- **Confusión entre "sin respuesta", "rebotada", "fallida" y "cancelada"** → mitigado: HU-8 los trata como 4 filtros distintos, nunca agrupados como "inactivas" — "rebotada" y "fallida" indican un problema de entrega (del buzón del cliente y del sistema, respectivamente, ADR-030), "sin respuesta" puede ser un cliente que simplemente no ha entrado, "cancelada" tuvo una confirmación previa.
- **Umbral de descuento configurado de forma incoherente (5% más débil que 3%)** → mitigado: HU-12 valida esa coherencia al guardar, antes de que afecte ninguna confirmación nueva.
- **Cambio de umbral afecta retroactivamente confirmaciones pasadas** → mitigado: cada confirmación congela los umbrales que usó (ADR-023) — un cambio de configuración nunca reinterpreta una confirmación ya hecha.
