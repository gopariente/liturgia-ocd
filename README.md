# Liturgia de las Horas · Carmelitas Descalzos (OCD)

App web gratuita para rezar la Liturgia de las Horas con el **Calendario propio de la Orden de los Carmelitas Descalzos**. Funciona en el celular como una app (PWA), también sin conexión.

- **Sin cuentas ni inicio de sesión.** No guarda datos personales: las preferencias (tamaño de letra, modo nocturno) quedan solo en el dispositivo.
- **Sin servidor ni base de datos.** Son archivos estáticos: nada que hackear del lado del servidor y costo cero.
- **Sin dependencias externas.** No carga fuentes, scripts ni analíticas de terceros.

## Estructura

```
public/                  ← lo que se publica (raíz del sitio)
  index.html             pantalla única de la app
  css/app.css
  js/liturgia.js         cálculo del día litúrgico y precedencias
  js/app.js              interfaz (Hoy, Índice, Santo, Oficio, Ajustes)
  sw.js                  modo sin conexión
  data/calendario-propio-ocd.json   calendario propio (fuente: Curia General OCD)
  data/calendario-general.json      solemnidades y fiestas universales
  data/regiones.json                países: variantes OCD «en las casas de…» y calendarios nacionales
  data/textos/<idioma>/MM-DD.json   oficio propio de cada celebración
  data/salterio/<idioma>/           salterio y salmodia complementaria
  i18n/<idioma>.json                textos de pantalla
  calendario-ocd*.ics    suscripción al calendario (general y uno por país)
  _headers               cabeceras de seguridad (Cloudflare Pages)
scripts/
  convertir_docs.py      convierte los .doc/.docx de la Orden a data/textos
  generar_ics.py         regenera calendario-ocd.ics
  probar_calendario.mjs  prueba el cálculo litúrgico en fechas conocidas
```

## Publicar (gratis)

1. **GitHub:** crear un repositorio público y subir esta carpeta.
2. **Cloudflare Pages:** *Workers & Pages → Create → Pages → Connect to Git*, elegir el repositorio.
   - Build command: *(vacío)*
   - Output directory: `public`
3. Opcional: conectar un dominio propio en Cloudflare.
4. Verificar que la app **Cloudflare Workers and Pages** de GitHub tenga acceso a este repositorio
   (GitHub → Settings → Applications → Cloudflare Workers and Pages → Configure → Repository access).
   Sin ese acceso, los cambios unidos a `main` no se publican.

Probar en la computadora: `python3 -m http.server -d public 8080` y abrir http://localhost:8080

## Cargar los textos de la Orden

1. Pasar los `.doc` a `.docx` (LibreOffice): `soffice --headless --convert-to docx *.doc`
2. Copiarlos a `fuentes/` y ejecutar: `python3 scripts/convertir_docs.py fuentes/`
3. Revisar los JSON generados en `public/data/textos/` antes de publicar.

El título, la fecha y el grado **siempre salen del calendario** (`calendario-propio-ocd.json`), no del documento.

## Versiones por país

El usuario elige su país en Ajustes. El día se calcula en capas:

1. Calendario romano general (`calendario-general.json`).
2. Calendario nacional (`regiones.json → nacionales`) y traslados (Ascensión o Corpus en jueves).
3. Calendario propio OCD (`calendario-propio-ocd.json`).
4. Variantes OCD por país (`regiones.json → variantes_ocd`), según el Calendario propio vigente.

Cada variante cambia el grado (`grado`), el nombre (`nombre`), traslada la fecha (`mover_a`) o agrega una celebración (`agregar`).
Los calendarios nacionales están incompletos: deben verificarse con cada conferencia episcopal antes de publicarlos.

## Idiomas

- Pantalla: copiar `i18n/es.json` a `i18n/<código>.json`, traducir y sumar el idioma en `IDIOMAS` (`js/app.js`).
- Textos litúrgicos: misma estructura en `data/textos/<código>/` y `data/salterio/<código>/`.
- Los nombres de los días y tiempos litúrgicos que arma `js/liturgia.js` todavía están en español.

## Textos comunes y derechos de autor

El salterio, el ordinario, los comunes y el propio del tiempo son universales, pero cada traducción oficial tiene titular
(español: Conferencia Episcopal Española; inglés: ICEL; latín: Libreria Editrice Vaticana). Solo se cargan en este
repositorio público los textos propios de la Orden y los que se publiquen con autorización del titular.

## Pendiente (próximas versiones)

- Salterio de cuatro semanas, Ordinario, Completas y propio del tiempo.
- Memorias del calendario romano general (hoy solo solemnidades y fiestas).
- Comunes (vírgenes, pastores, mártires) para completar los oficios propios.
- Retratos de los santos (ver `public/img/santos/LEEME.md`).
- Textos sin cargar: 25 de mayo y 15 de noviembre no tienen segunda lectura propia en los documentos; 24 de julio B (Mercedes Prat) no figura en el calendario OCD.
- Traslados de solemnidades impedidas.

> El cálculo del día sigue las normas universales, simplificadas. Ante la duda, prevalece el *Ordo* de la Orden.

## Licencias

- Código: MIT (ver `LICENSE`).
- Textos litúrgicos y calendario: propiedad de la Orden de los Carmelitas Descalzos y de sus respectivos titulares. Se usan con fines de oración, sin fines de lucro.
