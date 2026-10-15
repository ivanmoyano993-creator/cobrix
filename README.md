# Cobrix · integración con un administrador de facturas

Implementación de la prueba técnica de Cobrix: importa clientes y facturas desde la API del administrador de facturas de un ISP, aplica los pagos que el ISP ya cobró y ofrece un panel para operarlo.

- **Qué se pidió:** [`docs/ENUNCIADO.md`](docs/ENUNCIADO.md) · guía de la API en [`docs/API.md`](docs/API.md)
- **Decisiones, lo que quedó fuera y uso de IA:** [`docs/NOTA.md`](docs/NOTA.md)

Sin dependencias de producción: Node 24 ejecuta TypeScript directamente y la base es `node:sqlite`. Las únicas dependencias son de desarrollo (TypeScript para revisar tipos).

## Levantarlo

Requiere **Node 24**.

```bash
npm install
npm start
```

| Qué | Dónde |
| --- | --- |
| Panel de Cobrix | <http://127.0.0.1:4300> |
| API del administrador de facturas (simulada) | <http://127.0.0.1:4310/api/v1> |
| Swagger de la API y caja del ISP («Simulador») | <http://127.0.0.1:4310/docs> |

`npm start` fija la fecha de la prueba en **2026-10-13** y precarga el proveedor con las credenciales del sandbox (`cobrix` / `cobrix-sandbox`) solo la primera vez, así que se puede importar sin configurar nada. Una configuración guardada nunca se pisa.

### Con Docker

```bash
docker compose up --build
```

Mismas URLs que arriba. La imagen (`node:24-alpine`, usuario sin privilegios, healthcheck sobre el panel) guarda todo en el volumen `cobrix-data`: la base del ISP se genera la primera vez y la de Cobrix y su clave viven en `/data/cobrix`. `docker compose down -v` empieza de cero.

### CI/CD

- **CI** ([`ci.yml`](.github/workflows/ci.yml)), en cada PR y en `main`: tipos y pruebas con Node 24 en Ubuntu y Windows, y build de la imagen con una prueba de humo (espera el healthcheck y pide el panel y el Swagger).
- **CD** ([`cd.yml`](.github/workflows/cd.yml)), cuando CI pasa en `main`: publica la imagen en GHCR (`latest` y el SHA) y corre un deploy **simulado** al entorno `staging` de GitHub. No hay servidor real; el paso indica qué haría.

### Variables de entorno

Todas son opcionales. Para cambiar alguna, copia [`.env.example`](.env.example) a `.env` (ignorado por git) y descomenta lo que necesites: `npm start` lo carga con `--env-file-if-exists`, sin dependencias.

```bash
cp .env.example .env
```

| Variable | Por defecto | Para qué |
| --- | --- | --- |
| `PORT` | `4300` | Puerto del panel |
| `BILLING_API_PORT` | `4310` | Puerto de la API simulada |
| `HOST` | `127.0.0.1` | Interfaz en la que escuchan los dos |
| `SANDBOX_TODAY` | `2026-10-13` | «Hoy» del sandbox. Con esta fecha valen los números de los criterios de aceptación |
| `COBRIX_DATA_DIR` | `data/` | Carpeta de la base de Cobrix y de su clave |
| `COBRIX_SECRET_KEY` | — | Clave de cifrado (32 bytes en base64). Sin ella se genera `data/cobrix.key` la primera vez |
| `COBRIX_SIMULATED_LATENCY_MS` | `120` | Latencia simulada por pedido al administrador, para ver el progreso de las corridas. `0` la desactiva |
| `BILLING_API_DB` | `data/billing-api.sqlite` | Base de la API simulada (no se toca) |

## Recorrido en 5 minutos

El ciclo de los criterios de aceptación (§5), desde el panel:

1. **Sincronización → Simular importación.** Muestra qué se importaría, cuota por cuota y con el motivo de cada exclusión, sin tocar clientes, contratos ni facturas (la simulación queda en el historial de corridas): 42 cuotas.
2. **Importar.** Se ve el progreso en vivo y al terminar: 20 clientes y 42 facturas abiertas por USD 1.235,00.
3. **Clientes.** Ordenados por deuda, con días de atraso. LUIS GOMEZ tiene 2 contratos; ELENA RUIZ queda con ID `9000123`.
4. **Pagar en la caja del ISP.** En el Swagger, sección **Simulador**, `POST /__sim/pagar` con `{"id_contrato": 900101}` (toda la deuda) o `{"id_contrato": 900103, "monto": 25}` (abono parcial). `POST /__sim/anular` anula un cobro.
5. **Actualizar pagadas** (conviene simularla antes). Con los cinco pagos del §5: 8 pagadas y 34 abiertas por USD 955,00. Cada factura pagada muestra la factura del ISP que la pagó.

Los pagos **no se registran en Cobrix**: el ISP cobra y Cobrix lo refleja leyendo su libro de cuotas. La API del administrador es de solo lectura.

El Swagger carga su interfaz desde internet (unpkg). Sin conexión, la caja del ISP se usa igual con `curl`:

```bash
curl -X POST http://127.0.0.1:4310/__sim/pagar -H 'content-type: application/json' -d '{"id_contrato": 900101}'
```

## Pruebas

```bash
npm test           # todas las pruebas
npm run typecheck
```

| Qué cubren | Dónde |
| --- | --- |
| Reglas del §4: identificación, periodo, clasificación de contratos y cuotas, topes y pagos | `test/domain/` |
| Cliente HTTP contra la API simulada: token, reintento ante 401, errores y JSON inesperado | `test/infrastructure/http/` |
| Persistencia: repositorios, transacciones, idempotencia y contraseña cifrada | `test/infrastructure/persistence/` |
| Corridas, simulación, corrida automática, configuración y progreso | `test/application/`, `test/bootstrap.test.ts` |
| **Ciclo completo del §5** contra la API real: importar → pagar en la caja → actualizar pagadas | `test/acceptance/acceptance.test.ts` |
| Pantallas del panel contra la API real | `test/web/` |

## Arquitectura

Hexagonal liviana: el dominio no depende de nada y cada capa depende solo hacia adentro.

```text
src/cobrix/
  domain/            reglas puras del §4 y puertos (BillingProvider, repositorios, PanelQueries)
  application/       casos de uso: importar, actualizar pagadas, corrida automática, configuración, progreso
  infrastructure/
    http/            cliente del administrador: lectura estricta del JSON → modelos del dominio
    persistence/     SQLite (node:sqlite), un repositorio por agregado, cifrado de la contraseña
    clock/ scheduler/
  bootstrap.ts       raíz de composición
src/web/             panel: adaptador de entrada renderizado en el servidor
src/billing-api/     API simulada del ISP (entregada, no se modifica)
```

Cada capa separa `constants/`, `interfaces/` y `types/` de los archivos con funciones.

**Cómo trabaja una corrida:** busca (HTTP, un contrato por vez) → decide (reglas puras del dominio) → aplica (sincrónico, en una transacción). La simulación ejecuta exactamente lo mismo y termina en `ROLLBACK`. Solo queda el registro de la corrida en el historial. Nunca hay un `await` dentro de la transacción, así que el panel no ve datos a medio escribir.

**Errores:** credenciales malas o la API caída hacen fallar la corrida, que queda registrada con el error. Un contrato con error HTTP o JSON inesperado queda fuera con su motivo y la corrida sigue. Lo que no encaja nunca se adivina.

## Datos

| Archivo | Qué es |
| --- | --- |
| `data/billing-api.sqlite` | Base del ISP. Viene con la prueba y no se toca |
| `data/cobrix.sqlite` | Base de Cobrix: configuración, clientes, contratos, facturas, corridas e historial |
| `data/cobrix.key` | Clave que cifra la contraseña del proveedor (AES-256-GCM) |

La base de Cobrix está en modo WAL: mientras el servidor corre, los cambios recientes viven en `cobrix.sqlite-wal`. Para inspeccionarla, usa un cliente que lea WAL (DB Browser for SQLite, DBeaver) o apaga el servidor antes.

**Empezar de cero:** apaga el servidor y borra `data/cobrix.sqlite*` y `data/cobrix.key`. Para volver la base del ISP a su estado inicial: `POST /__sim/reiniciar` en el Swagger.
