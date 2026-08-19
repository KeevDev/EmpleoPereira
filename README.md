# Reconstruir Empleo — Pereira, Dosquebradas y Santa Rosa

Tablón de vacantes para las zonas afectadas por el terremoto. Cualquiera puede
publicar una oferta sin registrarse y cualquiera puede contactar directamente
por WhatsApp o correo.

```
EmpleoPereira/
├── frontend/   Next.js 16 + React 19 + Tailwind 4 + Leaflet  →  Vercel
└── backend/    Laravel 13 (API REST) + PostgreSQL 17 + Redis →  Docker, servidor propio
```

El front se despliega en Vercel y llama por HTTPS a la API, que corre en tu
servidor detrás de tu proxy. No comparten nada más: la API es stateless, sin
sesiones ni cookies.

---

## Backend

Requiere solo Docker. No hace falta PHP ni Composer en el host.

```bash
cd backend
cp .env.example .env
```

Rellena en `.env` los cuatro secretos:

```bash
docker compose run --rm --no-deps app php artisan key:generate --show  # APP_KEY
openssl rand -hex 32   # DB_PASSWORD
openssl rand -hex 32   # REDIS_PASSWORD
openssl rand -hex 32   # EMPLEO_IP_HASH_SALT
```

Y ajusta:

| Variable | Qué es |
|---|---|
| `APP_PORT` | Puerto del host donde escucha Nginx. Por defecto `8090`. Se publica **solo en `127.0.0.1`**. |
| `APP_URL` | Dominio público de la API, el que sirve tu proxy con TLS. |
| `CORS_ALLOWED_ORIGINS` | Dominio del front en Vercel. Sin esto el navegador bloquea las llamadas. |
| `NGINX_TRUSTED_PROXY` | Red desde la que llega tu proxy. Determina de quién se acepta `X-Forwarded-For`. |

Arranca:

```bash
docker compose up -d --build
curl http://127.0.0.1:8090/api/v1/health
```

Apunta tu proxy a `http://127.0.0.1:8090` y listo.

### Desarrollo local

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
docker compose exec app php artisan db:seed --class=VacancySeeder   # vacantes de ejemplo
```

Monta el código en caliente, apaga las cachés y publica Postgres en `55432` y
Redis en `56379`.

### Operación

```bash
docker compose exec app php artisan vacantes:moderar        # revisar lo reportado
docker compose exec app php artisan vacantes:moderar --aprobar-todas
docker compose exec app php artisan vacantes:caducar        # (automático cada hora)
docker compose exec app php artisan vacantes:limpiar        # (automático a diario)
docker compose exec app php artisan vacantes:avisar --seco  # (automático cada 15 min)
docker compose exec app php artisan avisos:limpiar          # (automático a diario)
```

La moderación se hace por consola a propósito: sin panel de administración no
hay panel de administración que proteger.

**Nada espera aprobación para verse.** Una vacante que el filtro anti-spam no
rechaza se publica al instante (`EMPLEO_AUTO_PUBLISH=true`, el valor por
defecto). Es una decisión, no un descuido: quien publica lo hace para que
alguien lo lea hoy, y una cola que nadie vacía es lo mismo que no publicar. A
la cola solo llega lo que la comunidad oculta con sus reportes, y eso sí pide
que alguien mire. Si algún día hay quien revise todo antes, `false` devuelve la
moderación previa; `EMPLEO_AUTO_PUBLISH_MAX_SCORE=0` es el término medio:
publica lo impecable y retiene lo que puntúe.

### Avisos push

Opcionales: sin claves VAPID todo funciona igual, solo que la campana no
aparece. Para encenderlos, genera el par una vez y ponlo en el `.env`:

```bash
docker compose run --rm --no-deps app php artisan avisos:claves
```

Después reinicia (`docker compose up -d`). Cambiar esas claves más adelante
invalida todas las suscripciones: cada persona tendría que volver a dar
permiso, así que no es una operación rutinaria.

**Cómo funciona.** Publicar y avisar están separados a propósito. La
moderación va a tandas —aprobar ocho vacantes seguidas no puede convertirse
en ocho notificaciones—, así que `vacantes:avisar` corre cada cuarto de hora
entre las 7:00 y las 21:00, recoge lo publicado desde la última pasada y
manda **un solo** mensaje. La marca `announced_at` se escribe antes de encolar
nada: si el proceso se cae a mitad se pierde un aviso, que es mucho mejor que
repetirlo. Lo que lleva más de doce horas publicado ya no dispara nada, para
que un scheduler parado el fin de semana no despierte a nadie el lunes con
noticias viejas.

El envío lo hace el contenedor `queue`, no la petición web: cada push es una
petición HTTPS cifrada aparte contra el servicio del navegador.

**Sin WebSockets, y a propósito.** Un WebSocket solo entrega mientras la
pestaña está abierta, que es justo el caso que no hace falta cubrir. El push
del navegador llega con la aplicación cerrada y no cuesta ninguna conexión
persistente ni ningún contenedor más.

**En iOS** los avisos solo existen si la aplicación está en la pantalla de
inicio (iOS 16.4+). No hay forma de forzar esa instalación desde el código,
así que la hoja de ajustes lo explica cuando detecta ese caso.

### Pruebas

Se ejecutan dentro de la imagen del proyecto, no en una de PHP genérica: el
cifrado de las notificaciones necesita `gmp`, y sin él los tests del emisor
fallan por una razón que no tiene nada que ver con el código.

```bash
docker compose build app
docker run --rm -v "$PWD":/app -w /app -u "$(id -u):$(id -g)" -e HOME=/tmp \
  --entrypoint php empleo-pereira/api:latest vendor/bin/phpunit
```

---

## Frontend

```bash
cd frontend
cp .env.example .env.local     # NEXT_PUBLIC_API_URL=http://localhost:8090
pnpm install
pnpm dev
```

### Despliegue en Vercel

1. Importa el repositorio y pon **`frontend`** como *Root Directory*.
2. Define `NEXT_PUBLIC_API_URL` con el dominio público de tu API.
3. Añade ese mismo dominio de Vercel a `CORS_ALLOWED_ORIGINS` en el backend y
   reinicia (`docker compose up -d app`).

Framework, build y salida los detecta Vercel solo.

---

## Cómo está protegido

El sistema no tiene login: cualquiera publica. Eso obliga a que la defensa esté
en otra parte.

**Contra el abuso de la publicación abierta**

- Límites por IP en dos ventanas a la vez, en Redis, más un límite previo en
  Nginx antes de llegar a PHP. Los valores viven en `config/empleo.php`.
- Token de formulario firmado y de un solo uso, que además mide cuánto tarda el
  envío: un formulario que se completa demasiado rápido no lo rellenó una
  persona. Sin captcha ni servicios de terceros.
- Filtro de contenido: enlaces, términos de estafa laboral, texto en
  mayúsculas, descripciones vacías. Puntúa y bloquea.
- Huella de contenido: el mismo aviso no se puede reenviar al poco rato aunque
  se cambie de red.
- Rechazo en el propio envío: lo que puntúa alto o usa términos prohibidos no
  llega a guardarse. Lo que pasa el filtro se publica al momento y deja escrito
  en `moderation_note` por qué puntuó, para poder repasarlo después
  (`EMPLEO_AUTO_PUBLISH`, `EMPLEO_AUTO_PUBLISH_MAX_SCORE`).
- Reportes de la comunidad: varias señales independientes ocultan una vacante
  y la devuelven a la cola de revisión.

**Contra la fuga de datos**

- Nunca se guarda la IP de quien publica, solo un HMAC con sal privada.
- De quien activa los avisos se guarda solo la dirección que genera su propio
  navegador y las categorías que marcó; sin categorías —el caso por defecto—
  no queda registrado ningún interés. Ni IP, ni user-agent, ni historial de
  lo que se le ha enviado. El alta solo acepta endpoints de servicios de push
  conocidos, para que la API no sirva de generador de peticiones ajenas. Se
  borra al desactivar, al primer 404/410 del servicio de push y a los 90 días
  sin abrir la aplicación.
- Las vacantes caducan a los 30 días y se borran del todo a los 90, con sus
  teléfonos y correos.
- `X-Robots-Tag: noindex` en la API: los datos de contacto no acaban en Google.
- El color del avatar lo asigna el servidor, nunca el cliente: el front lo
  escribe dentro de un atributo `style`.

**En la infraestructura**

- El contenedor corre como usuario sin privilegios; `exec`, `shell_exec` y
  compañía están desactivadas en el pool web de PHP.
- Postgres y Redis no publican puertos: solo existen dentro de la red de Docker.
- Nginx escucha solo en loopback; el TLS lo pone tu proxy.
- CORS con lista blanca de orígenes exactos, sin comodines y sin credenciales.

**En el front**

- Content-Security-Policy con nonce por petición y `strict-dynamic`: solo se
  ejecuta el JavaScript que la propia página firma. El service worker de los
  avisos tiene la suya, más estrecha: `default-src 'none'`.
- El permiso de notificaciones se pide solo al pulsar la campana, nunca al
  cargar. Un navegador pregunta una vez: quien lo rechaza en frío ya no puede
  cambiarlo sin entrar en los ajustes del sistema.
- HSTS, `nosniff`, `frame-ancestors 'none'`, `Permissions-Policy` restrictiva.
- Los errores de TypeScript rompen el build en lugar de llegar a producción.
