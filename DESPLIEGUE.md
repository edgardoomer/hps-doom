# Despliegue en una VM de Google Cloud (e2-medium)

Guía para publicar HPS-DOOM en una máquina virtual de Google Compute Engine.
Stack: **Debian/Ubuntu + Node 22 + npm 11 + Nitro (node-server) + Nginx + HTTPS
(Let's Encrypt)**. La aplicación no usa base de datos: los datos de bombas y
curvas viven en el código.

> **Aviso de coste.** La `e2-medium` (2 vCPU, 4 GB) **no está en la capa
> gratuita**; factura por hora encendida, del orden de 25 USD/mes. La única
> máquina *Always Free* es la `e2-micro` en `us-west1`, `us-central1` o
> `us-east1`, y en ella el build de Vite se queda sin memoria: con 1 GB el
> proceso muere a mitad. Si quieres coste cero, usa `e2-micro` y sigue la
> variante del final: construyes en tu equipo y subes solo el resultado.

> **Lo que rompe el despliegue.** El build por defecto genera un bundle para
> **Cloudflare Workers**, no para Node. Hay que construir con
> `NITRO_PRESET=node-server`. Está en la FASE 3 y es el paso que no se puede
> saltar.

---

## FASE 1 · Crear la VM en Google Cloud

1. Entra en <https://console.cloud.google.com> y selecciona tu proyecto.
2. Menú → **Compute Engine → Instancias de VM → Crear instancia**.
3. Configura:
   - **Región:** `us-east1` o `us-central1` (las más cercanas a Ecuador con
     buen precio).
   - **Serie:** E2 · **Tipo de máquina:** `e2-medium`.
   - **Disco de arranque:** Debian 12 (o Ubuntu 24.04 LTS), 20 GB estándar
     sobra: la app ocupa 4 MB y las dependencias unos 350 MB.
   - **Firewall:** marca **Permitir tráfico HTTP** y **Permitir tráfico HTTPS**.
4. **Crear.** Anota la **IP externa** que aparece en la lista.
5. (Recomendado) Reserva esa IP como **estática** para que no cambie al
   reiniciar: VPC network → IP addresses → reservar la IP externa de la VM.
   Si vas a poner un dominio, esto es obligatorio.

---

## FASE 2 · Conectarte y preparar el servidor

Pulsa el botón **SSH** junto a la VM (abre una terminal en el navegador, sin
configurar claves). Dentro:

```bash
# Actualizar el sistema
sudo apt update && sudo apt upgrade -y

# Node 22 LTS desde el repositorio oficial de NodeSource
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Node 22 trae npm 10, que NO puede instalar este proyecto (ver nota abajo)
sudo npm install -g npm@11

# Comprueba: node debe decir v22.x o superior, npm debe decir 11.x o superior
node -v && npm -v
```

> **Por qué hay que actualizar npm.** El árbol de dependencias tiene un
> conflicto entre pares (`ajv` 6 y 8) que el resolutor de npm 10 no sabe
> expresar en un lockfile coherente: `npm ci` falla con
> `Missing: lru-cache@... from lock file` o `Invalid: lock file's ajv@6...`.
> No es un lockfile roto — el mismo archivo instala sin problema con npm 11 y
> con npm 12. Regenerarlo con npm 10 no lo arregla: el lock que produce falla
> contra sí mismo.

> Con 4 GB de RAM no hace falta swap. Si algún día bajas de máquina, añádela
> antes de construir:
> `sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile`

---

## FASE 3 · Traer el código y construirlo

```bash
# El repo es publico, no necesitas credenciales
cd ~
git clone https://github.com/edgardoomer/hps-doom.git
cd hps-doom/codigo_lovable

# Instalar dependencias exactamente como estan en el lockfile
npm ci
```

Crea el archivo `.env` de **producción**:

```bash
nano .env
```

Pega esto y sustituye la clave por la tuya:

```
# Clave del asistente del chat.
DEEPSEEK_API_KEY=tu-clave-de-deepseek

# Puerto interno. Nginx reenviara aqui; no se expone al exterior.
PORT=3000

# Opcionales, solo si quieres cambiar los valores por defecto.
# DEEPSEEK_MODEL=deepseek-chat
# DEEPSEEK_BASE_URL=https://api.deepseek.com/v1
# DEEPSEEK_MAX_TOKENS=1500
```

Protege el archivo, porque contiene un secreto:

```bash
chmod 600 .env
```

> `.env` está en `.gitignore`, así que sobrevive a los `git pull` y nunca se
> sube al repositorio.

Ahora el build. **La variable `NITRO_PRESET` no es opcional:** sin ella
obtienes un bundle de Cloudflare Workers que no arranca con `node`.

```bash
NITRO_PRESET=node-server npm run build

# Verifica el preset antes de seguir: debe imprimir  node-server
node -e "console.log(require('./.output/nitro.json').preset)"
```

Prueba rápida (Ctrl+C para salir). Debe responder `200`:

```bash
PORT=3000 node .output/server/index.mjs &
sleep 3
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/curvas
kill %1
```

---

## FASE 4 · La aplicación como servicio (systemd)

Así arranca sola al encender la máquina y se reinicia si se cae.

```bash
sudo tee /etc/systemd/system/hps-doom.service > /dev/null <<EOF
[Unit]
Description=HPS-DOOM
After=network-online.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$HOME/hps-doom/codigo_lovable
EnvironmentFile=$HOME/hps-doom/codigo_lovable/.env
ExecStart=/usr/bin/node .output/server/index.mjs
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now hps-doom
sudo systemctl status hps-doom --no-pager   # debe decir "active (running)"
```

---

## FASE 5 · Nginx por delante

La aplicación escucha en el 3000, que **no** debe quedar expuesto. Nginx
recibe en el 80 y el 443 y reenvía hacia dentro.

**Pon tu dominio en `server_name`**, no un comodín. Certbot busca el bloque
por ese nombre en la FASE 6 y con `_` no lo encuentra: emite el certificado
pero no lo instala. Si aún no tienes dominio, deja `_` para entrar por IP,
pero cámbialo antes de pedir el certificado.

```bash
sudo tee /etc/nginx/sites-available/hps-doom > /dev/null <<'EOF'
server {
  listen 80;
  server_name hps-doom.duckdns.org;   # tu dominio, o _ si aun no tienes

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # El asistente puede tardar; no cortes la respuesta antes de tiempo.
    proxy_read_timeout 120s;
  }
}
EOF

sudo ln -sf /etc/nginx/sites-available/hps-doom /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
```

Abre `http://TU_IP_EXTERNA` en el navegador: ya debería verse el panel de
operación. La raíz redirige sola a `/curvas`.

---

## FASE 6 · HTTPS gratis (necesita un dominio)

Let's Encrypt **no emite certificados para una IP**, hace falta un nombre.
Opciones para un subdominio gratis: [DuckDNS](https://www.duckdns.org),
[js.org](https://js.org) o [FreeDNS](https://freedns.afraid.org). Apunta un
registro **A** de tu dominio a la IP estática de la VM.

Antes de lanzar certbot, comprueba dos cosas. Que el dominio apunta a la VM y
no a tu casa —DuckDNS toma la IP de quien lo actualiza, así que **actualízalo
desde la propia VM**— y que el puerto 80 llega de verdad:

```bash
# Desde la VM, para que DuckDNS registre SU ip y no la tuya
curl "https://www.duckdns.org/update?domains=TU_SUBDOMINIO&token=TU_TOKEN&ip="

# Debe devolver la IP externa de la VM
dig +short hps-doom.duckdns.org
```

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d hps-doom.duckdns.org
```

> Con DuckDNS pide **un solo dominio**. El `www.` resuelve por comodín pero
> añade un segundo reto que puede fallar sin darte nada a cambio.

Certbot edita Nginx, activa HTTPS y programa la renovación automática. No hay
que tocar nada más en la aplicación: no tiene ajuste de redirección propio.

---

## Actualizar el sitio más adelante

Cada vez que subas cambios a GitHub:

```bash
cd ~/hps-doom && git pull
cd codigo_lovable && npm ci && NITRO_PRESET=node-server npm run build
sudo systemctl restart hps-doom
```

---

## Variante de coste cero (e2-micro)

Si prefieres no pagar, crea la VM como `e2-micro` en `us-west1`,
`us-central1` o `us-east1` con disco estándar de hasta 30 GB. El único cambio
es que **la máquina no construye**: lo haces en tu equipo y subes el
resultado, que pesa 4,2 MB y es autocontenido.

En tu equipo:

```bash
cd codigo_lovable
NITRO_PRESET=node-server npm run build
gcloud compute scp --recurse .output NOMBRE-VM:~/hps-doom/ --zone ZONA
```

En la VM se saltan el `git clone`, el `npm ci` y el build. El `.env` va en
`~/hps-doom/.env`, y en el servicio de systemd cambian dos líneas:

```
WorkingDirectory=/home/TU_USUARIO/hps-doom
EnvironmentFile=/home/TU_USUARIO/hps-doom/.env
```

El resto —nginx, firewall, certificado— es idéntico. Para actualizar,
reconstruyes en tu equipo, vuelves a copiar y `sudo systemctl restart hps-doom`.

---

## Notas y solución de problemas

- **Logs de la app:** `sudo journalctl -u hps-doom -n 50 --no-pager`
- **Logs de Nginx:** `sudo tail -n 50 /var/log/nginx/error.log`
- **`npm ci` falla con `Missing: ... from lock file` o `Invalid: lock file's ajv@...`:**
  estás en npm 10. Actualiza con `sudo npm install -g npm@11` y repite. No
  ejecutes `npm install` para "arreglar" el lock: con npm 10 genera uno que
  sigue fallando.
- **Certbot dice `Could not automatically find a matching server block`:** el
  `server_name` de Nginx es `_` en vez de tu dominio. Corrígelo, recarga con
  `sudo systemctl reload nginx` e instala el certificado ya emitido con
  `sudo certbot install --cert-name TU_DOMINIO` — no vuelvas a pedirlo, Let's
  Encrypt limita los intentos por semana.
- **Certbot da `Timeout during connect` al validar:** el dominio no apunta a
  la VM. Comprueba con `dig +short TU_DOMINIO` que devuelve su IP externa; si
  usas DuckDNS, actualízalo desde la VM y no desde tu equipo.
- **No arranca y el log menciona `wrangler` o `Cloudflare`:** construiste sin
  `NITRO_PRESET=node-server`. Repite el build de la FASE 3.
- **502 en Nginx:** el servicio está caído o escucha en otro puerto. Revisa
  `sudo systemctl status hps-doom` y que `PORT` en el `.env` coincida con el
  `proxy_pass` de Nginx.
- **La página carga pero el chat no responde:** falta la clave o la máquina no
  sale a internet. Comprueba desde la VM con
  `curl -s -o /dev/null -w "%{http_code}\n" https://api.deepseek.com`.
  Sin clave la aplicación sigue funcionando: el análisis inicial se redacta en
  local y solo las consultas del chat quedan sin modelo.
- **`unable to verify the first certificate`:** hay un proxy que inspecciona
  TLS. La aplicación ya fusiona las CAs del sistema; añade la raíz corporativa
  al almacén de la VM y ejecuta `sudo update-ca-certificates`.
- **Timeout al preguntar al chat:** Nginx corta antes que el modelo. Sube
  `proxy_read_timeout` en la configuración de la FASE 5.
- **No hay base de datos ni copias de seguridad que hacer.** Los datos de las
  14 unidades, las curvas de fábrica y los diccionarios del asistente están en
  el código. Lo único que vive solo en la VM es el `.env` con la clave.
- **DeepSeek** necesita saldo en la cuenta para responder. Es pago por uso: una
  consulta del chat gasta unos 10.000 tokens de entrada, céntimos con tu
  tráfico.
- **Rota la clave** que usaste en desarrollo antes de publicar, y pon la nueva
  solo en el `.env` de la VM.

---

## Alternativa sin servidor: Netlify

Si no quieres mantener una VM, el proyecto también corre en Netlify sin
tocar el código: los estáticos van a su CDN y el servidor SSR (con la server
function del asistente) se convierte en una Netlify Function. La
configuración ya está en el repositorio, en `netlify.toml`: carpeta base
`codigo_lovable`, build con Node 24 y preset `netlify` de Nitro, publicación
de `dist/`. En el plan gratuito sobra para este tráfico.

1. En [app.netlify.com](https://app.netlify.com) → **Add new project → Import
   an existing project → GitHub** y elige `edgardoomer/hps-doom`. Netlify
   lee `netlify.toml`, así que no cambies nada en el formulario de build.
2. Antes de desplegar, en **Site configuration → Environment variables**,
   añade `DEEPSEEK_API_KEY` con tu clave. Es la única variable necesaria; sin
   ella el sitio funciona igual, pero el chat responde con el motor local.
3. **Deploy.** El primer build tarda unos 2 minutos. Cada `git push` a `main`
   vuelve a desplegar solo.

Para reproducir el build de Netlify en tu equipo:

```bash
cd codigo_lovable
NITRO_PRESET=netlify npm run build
```

Deja los estáticos en `dist/` y la función en
`.netlify/functions-internal/server/`. Ambas carpetas están en `.gitignore`.

Cosas que conviene saber:

- **Node 24, no 22.** `netlify.toml` fija `NODE_VERSION = "24"` porque trae
  npm 11; con el npm 10 de Node 22 la instalación falla igual que en la VM
  (ver arriba). Las funciones corren en la misma versión de Node que el
  build.
- **Sólo hay un lockfile, `package-lock.json`.** Netlify elige el gestor de
  paquetes por el lockfile que encuentra: si hubiera un `bun.lock` instalaría
  con Bun. Si algún día lo regeneras con Bun, bórralo antes de subirlo.
- **Tiempo de las funciones.** Netlify corta cada petición síncrona a los
  60 segundos, en todos los planes. Una consulta al chat tarda entre 2 y 20
  segundos según lo largo de la respuesta, así que sobra margen; sólo si
  DeepSeek se quedara colgado vería el usuario un error en vez de la
  respuesta del motor local.
- **La clave no viaja en el repositorio.** El código la lee de `process.env`
  dentro de la función; Netlify inyecta ahí las variables del panel. Lo mismo
  de siempre: rota la que usaste en desarrollo y pon la nueva sólo en Netlify.
