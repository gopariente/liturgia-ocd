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
  data/textos/MM-DD.json            oficio propio de cada celebración
  calendario-ocd.ics     suscripción al calendario completo
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

Probar en la computadora: `python3 -m http.server -d public 8080` y abrir http://localhost:8080

## Cargar los textos de la Orden

1. Pasar los `.doc` a `.docx` (LibreOffice): `soffice --headless --convert-to docx *.doc`
2. Copiarlos a `fuentes/` y ejecutar: `python3 scripts/convertir_docs.py fuentes/`
3. Revisar los JSON generados en `public/data/textos/` antes de publicar.

El título, la fecha y el grado **siempre salen del calendario** (`calendario-propio-ocd.json`), no del documento.

## Pendiente (próximas versiones)

- Salterio de cuatro semanas, Ordinario, Completas y propio del tiempo.
- Memorias del calendario romano general (hoy solo solemnidades y fiestas).
- Comunes (vírgenes, pastores, mártires) para completar los oficios propios.
- Traslados de solemnidades impedidas.

> El cálculo del día sigue las normas universales, simplificadas. Ante la duda, prevalece el *Ordo* de la Orden.

## Licencias

- Código: MIT (ver `LICENSE`).
- Textos litúrgicos y calendario: propiedad de la Orden de los Carmelitas Descalzos y de sus respectivos titulares. Se usan con fines de oración, sin fines de lucro.
