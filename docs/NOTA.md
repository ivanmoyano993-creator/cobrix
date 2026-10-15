# Nota de entrega

Cómo levantarlo y probarlo: [`README.md`](../README.md).

## Decisiones

**Stack sin dependencias.** Construí sobre el esqueleto: Node 24 con TypeScript ejecutado directamente, `node:sqlite` y un panel renderizado en el servidor. Evalué React, Tailwind y Astro: suman un paso de build y cientos de paquetes, y Astro además trae su propio servidor, lo que rompe el proceso único que comparte la conexión a SQLite y el programador. Preferí invertir ese tiempo en reglas, pruebas y UX.

**Arquitectura hexagonal liviana.** `domain` (reglas puras del §4 y puertos), `application` (corridas, configuración, progreso), `infrastructure` (HTTP, SQLite, reloj, programador) y `web` (adaptador de entrada). El dominio no importa nada de afuera y lo verifico en cada cambio.

**Nunca se adivina.** El JSON de la API se valida campo por campo (`JsonValue`, sin `any`). Si una respuesta se contradice (filas de otro contrato, cuotas o periodos repetidos, «sin deuda» mezclado con cuotas, campos del contrato que cambian entre filas, detalle ilegible), el contrato queda fuera como `inconsistent_response` con el motivo. El vocabulario del ISP (`deuda_id`, `saldo_cuota`) solo existe en el parser; el dominio trabaja con modelos propios en inglés.

**Montos en centavos enteros.** El residual `0,001317` y errores como `0.1 + 0.2` nunca llegan a una suma.

**La simulación es el mismo código.** Cada corrida busca (HTTP), decide (reglas puras) y aplica (sincrónico, en una transacción). Simular ejecuta exactamente lo mismo y termina en `ROLLBACK`. Solo queda el registro de la corrida en el historial. Nunca hay un `await` dentro de la transacción: con una sola conexión a SQLite, el panel vería datos a medio escribir.

**Idempotencia en dos niveles:** la corrida detecta lo «ya importado» y además `external_id` es `UNIQUE` en la base.

**Contraseña del proveedor cifrada** con AES-256-GCM. No se puede hashear porque Cobrix la envía al ISP. La clave sale de `COBRIX_SECRET_KEY` o de `data/cobrix.key`, generada una vez, para que `npm start` funcione sin configurar nada. En producción la clave iría solo por variable de entorno o un gestor de secretos.

**Sin ORM.** TypeORM y MikroORM usan decorators, que no corren con la ejecución directa de TypeScript; Prisma necesita generación de código; `better-sqlite3` necesita `node-gyp` en Windows. Para 8 tablas, repositorios escritos a mano detrás de puertos dan lo mismo sin dependencias.

**`as const` en lugar de `enum`**, porque `erasableSyntaxOnly` y Node no admiten `enum`.

**Una corrida a la vez.** Un candado evita que una corrida manual y la automática se pisen.

**Corrida automática:** «ya pasó la hora y todavía no corrió hoy», así se recupera si el servidor estaba apagado. «Hoy» es el día real de Caracas (`calendarDay`), no el `SANDBOX_TODAY`: con la fecha fijada correría una sola vez para siempre. La última corrida se guarda con el mismo reloj con el que se compara.

**Precarga del proveedor.** `npm start` completa el proveedor con el sandbox solo si nunca se configuró, para que se pueda importar de una. En producción arrancaría vacío.

### Lo que el enunciado dejaba abierto

- **Identificación:** los 6 a 12 dígitos se cuentan después de quitar los ceros a la izquierda.
- **Dos cuotas del mismo periodo** en un contrato se tratan como respuesta contradictoria.
- **Abono parcial:** no cambia el saldo en Cobrix. Lo exigen los números del §5 (1.235 − 280 = 955); si el abono bajara el saldo, darían 950.
- **Saldo del ISP mayor que el de Cobrix:** respuesta inconsistente, la factura sigue abierta.
- **Exonerada** (saldo 0 sin nada pagado): no es un pago y la factura sigue abierta con ese motivo.
- **Factura que pagó la cuota:** la más reciente del libro con `id_factura` distinto de 0.
- **Rango del libro de cuotas:** desde el vencimiento más viejo abierto del contrato hasta el fin del mes en curso.
- **Cuota del mes en curso:** si no figura en el libro, se consulta el contrato. Solo en ese caso, para no hacer pedidos de más.
- **Error HTTP o JSON inesperado en un contrato:** ese contrato queda fuera y la corrida sigue. Credenciales malas o la API caída hacen fallar la corrida.
- **Topes por corrida:** desde la primera factura que excede un tope, esa y las siguientes quedan frenadas, en orden de contrato y periodo. Lo ya importado no cuenta para el tope.
- **Cliente:** se crea solo si se le importa al menos una factura.
- **Probar conexión:** usa lo escrito en el formulario sin guardarlo.
- **Contratos en el Resumen:** muestro los dos números, «Contratos importados: 21 · de 27 en el administrador». Los 21 son los que gestiona Cobrix (los de clientes importados); los 27 salen del contador de la última importación. Los 6 que quedan fuera no se guardan porque sus titulares no pueden ser clientes (§5); su motivo está en el detalle de cada importación.

## Lo que dejé fuera

- **Autenticación del panel.** Cualquiera con acceso a la URL lo opera.
- **Cuotas que desaparecen del ISP** (deuda anulada del lado del ISP): la factura queda abierta como «sin evidencia», no se cancela sola.
- **Reintentos con espera** ante errores transitorios, y concurrencia acotada al consultar contratos (hoy es uno por vez, a propósito).
- **Rotación de la clave de cifrado.** El formato `v1:` lo deja preparado.
- **Pruebas de navegador** (Playwright). Las del panel van por HTTP contra la API real, y la revisión visual la hice con capturas en Edge headless a 1440 px y 375 px.

## Con más tiempo

- Login y roles para el panel, y auditoría de cambios de configuración.
- Alertas cuando falla la corrida automática (correo de cobranza).
- Conciliación de cuotas que dejan de existir en el ISP.
- Reintentos con espera y concurrencia acotada, con métricas por corrida.
- Exportar a CSV la tabla de clientes y el detalle de cada corrida.

## Punto diferencial

- **Progreso en vivo de las corridas** con Server-Sent Events, sin dependencias: el panel muestra el avance contrato por contrato y se actualiza solo al terminar. `npm start` agrega una latencia simulada (`COBRIX_SIMULATED_LATENCY_MS`) para que se vea contra el sandbox local.
- **Cada fila de una corrida explica su motivo** en palabras del operador, y el detalle se filtra por resultado.
- **Días de atraso** del vencimiento más antiguo en la tabla de clientes, para priorizar la cobranza.
- **El ciclo completo del §5 como prueba automática** contra la API real, incluidos los números que muestra el panel.

## Cómo usé la IA

Trabajé con **Claude Code** en VS Code, por fases, cada una en su rama con pull request: reglas del dominio, cliente HTTP, persistencia, corridas, prueba de aceptación, composición, pantallas, progreso y documentación. Las pruebas se escribían primero (TDD). Yo definía el alcance de cada fase, revisaba el código antes de cada commit y decidía.

**Dónde tuve que corregirla:**

- Hizo commit y push de una fase antes de que terminara de revisarla. Desde ahí, ningún commit sin mi aprobación.
- Dejaba comentarios, `unknown` y casts, y mezclaba constantes, interfaces, tipos y funciones en un mismo archivo. Le pedí todo tipado y separado.
- Usó nombres de campos en español en las interfaces del dominio. Pasamos a modelos en inglés, con el vocabulario del ISP solo en el parser.
- Puso el puerto del proveedor dentro del adaptador HTTP, al revés de la hexagonal.
- Guardaba la contraseña del proveedor en texto plano.
- Concentró toda la persistencia en una interfaz de 16 métodos; la separamos en repositorios.

**Dónde la IA frenó una idea mía con evidencia:** le pedí usar `enum` (compiló y mostró el error `TS1294` de `erasableSyntaxOnly`); propuse un ORM y luego Astro (me mostró el costo concreto en este proyecto: decorators, generación de código, un segundo servidor, build). En los dos casos decidí no usarlos.

**Lo que se detectó verificando, no confiando:**

- La prueba de aceptación del §5 pasó al primer intento contra la API real.
- Revisando capturas del panel aparecieron problemas que ninguna prueba veía: contadores en singular, una columna que se cortaba en el celular, dos números distintos para «siguen abiertas», «esta corrida no dejó filas» mientras todavía corría, y estilos de formulario que se habían perdido en una reescritura.
- Un script de reemplazo rompió el escapado de una expresión regular (`/\s/` quedó como `/s/`). Lo detectó la prueba del correo de cobranza.
- La prueba que vino con el esqueleto fallaba en Windows (`URL.pathname` en lugar de `fileURLToPath`); quedó corregida en su propio PR.
