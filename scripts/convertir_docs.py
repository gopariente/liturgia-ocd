#!/usr/bin/env python3
"""Convierte los documentos de la Orden (.docx o .txt) a public/data/textos/MM-DD.json.

Uso:  python3 scripts/convertir_docs.py fuentes/
      (los .doc viejos: pasarlos antes a .docx con  soffice --headless --convert-to docx *.doc)

- La fecha sale del calendario (campo "doc" de calendario-propio-ocd.json), no del nombre
  del archivo, para respetar las correcciones del calendario vigente.
- Si la celebración ya es de un santo canonizado, cambia "beato/a" por "san/santa".
- Sin dependencias externas: lee el .docx como ZIP.
Revise siempre el resultado antes de publicar.
"""
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path
from xml.etree import ElementTree as ET

RAIZ = Path(__file__).resolve().parent.parent
CAL = RAIZ / "public" / "data" / "calendario-propio-ocd.json"
SALIDA = RAIZ / "public" / "data" / "textos" / "es"  # una carpeta por idioma
W = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def leer(path: Path) -> list[str]:
    if path.suffix.lower() == ".txt":
        return path.read_text(encoding="utf-8", errors="replace").splitlines()
    with zipfile.ZipFile(path) as z:
        root = ET.fromstring(z.read("word/document.xml"))
    lineas = []
    for p in root.iter(W + "p"):
        lineas.append("".join(t.text or "" for t in p.iter(W + "t")))
    return lineas


MARCAS = [
    ("lectura", r"^oficio de lectura"),
    ("segunda", r"^segunda lectura"),
    ("responsorio", r"^responsorio"),
    ("oracion", r"^(oracion( colecta)?|oremos)\b"),
    ("laudes", r"^laudes\b"),
    ("visperas", r"^visperas\b"),
    ("benedictus", r"^(ant(ifona)?\.? ?(del )?bened)"),
    ("magnificat", r"^(ant(ifona)?\.? ?(del )?magn)"),
    ("comun", r"^del comun"),
    # Partes que no se cargan (himnos, salmos, lecturas bíblicas: textos de otras ediciones)
    ("otro", r"^(himno|salmodia|salmo \d|cantico|primera lectura|lectura breve|responsorio breve|preces|"
             r"invitatorio|te deum|hora intermedia|tercia|sexta|nona|completas|evangelio|oficio de vigilia|"
             r"misa|antifona de entrada|antifona de comunion|lecturas?\b|o bien|todo,? como)"),
]
FIN_ORACION = re.compile(r"(por nuestro se[nñ]or|por jesucristo|por cristo|que vive y reina|por los siglos de los siglos)", re.I)
PREFIJO_ANT = re.compile(r"^ant(?:[ií]fona)?\.?\s*(?:del\s+)?(?:bened\w*|magn\w*)\.?\s*[:.]?\s*", re.I)


def canonizar(texto: str, nombre: str) -> str:
    if not re.match(r"^(San|Santa|Santos|Santas|Santo)\b", nombre):
        return texto
    reemplazos = {r"\b([Dd])el\s+[Bb]eato\b": r"\1e san", r"\b([Aa])l\s+[Bb]eato\b": r"\1 san",
                  r"\bEl\s+[Bb]eato\b": "San", r"\bel\s+[Bb]eato\b": "san",
                  r"\b([Dd]e|[Aa])\s+la\s+[Bb]eata\b": r"\1 santa",
                  r"\bLa\s+[Bb]eata\b": "Santa", r"\bla\s+[Bb]eata\b": "santa", r"\b[Ll]os\s+[Bb]eatos\b": "los santos",
                  r"\b[Ll]as\s+[Bb]eatas\b": "las santas",
                  r"\bBeatos\b": "Santos", r"\bbeatos\b": "santos", r"\bBeatas\b": "Santas", r"\bbeatas\b": "santas",
                  r"\bBeato\b": "San", r"\bbeato\b": "san", r"\bBeata\b": "Santa", r"\bbeata\b": "santa",
                  r"\bBto\.?\s": "San ", r"\bBta\.?\s": "Santa "}
    for patron, nuevo in reemplazos.items():
        texto = re.sub(patron, nuevo, texto)
    return texto


def convertir(path: Path, cel: dict) -> dict:
    lineas = [l.strip() for l in leer(path)]
    estado, buf = "encabezado", []
    hechos = set()
    datos = {"fecha": cel["fecha"], "vida": "", "comun": "", "lectura": [], "oracion": ""}
    partes = {"encabezado": [], "vida": [], "segunda": [], "responsorio": [], "oracion": [], "benedictus": [], "magnificat": []}

    for l in lineas:
        if not l:
            continue
        n = norm(l)
        marca = next((k for k, rx in MARCAS if re.match(rx, n)), None)
        if re.match(r"^(responsorio breve|benedictus$|magnificat$|nunc dimittis)", n) or \
                (marca == "oracion" and re.search(r"\bcomo en\b|\bdel comun\b|\bpropia\b", n)):
            marca = "otro"
        if marca == "comun":
            datos["comun"] = l
            estado = "post"
            continue
        if marca == "lectura":
            # A veces la segunda lectura sigue sin su propio título: se toma provisoriamente.
            if "segunda" not in hechos:
                estado, partes["segunda"] = "segunda", []
            else:
                estado = "otro"
            continue
        if marca in ("laudes", "visperas"):
            estado = "post"
            continue
        if marca == "otro":
            estado = "otro"
            continue
        if marca:
            # Solo se toma la primera segunda lectura, el primer responsorio y la primera oración.
            if marca in ("segunda", "responsorio", "oracion") and marca in hechos:
                estado = "otro"
                continue
            if marca == "segunda":
                partes["segunda"] = []
            estado = marca
            hechos.add(marca)
            if marca in ("benedictus", "magnificat"):
                resto = PREFIJO_ANT.sub("", l).strip()
                if resto and not partes[marca]:
                    partes[marca].append(resto)
                estado = "otro"
            elif marca == "responsorio":
                partes[marca].append("§" + l[len("responsorio"):].strip())
            continue
        if estado == "responsorio" and (re.match(r"^(ant\b|gloria al padre)", n) or len(partes["responsorio"]) >= 7):
            estado = "otro"
            continue
        if estado == "oracion" and partes["oracion"] and FIN_ORACION.search(partes["oracion"][-1]):
            estado = "otro"
            continue
        if estado == "encabezado":
            # Las primeras líneas en mayúsculas (fecha, nombre, título) se descartan.
            # La reseña biográfica es el primer párrafo largo; lo anterior es título.
            if len(l) < 80:
                partes["encabezado"].append(l)
                continue
            estado = "vida"
        if estado in partes:
            partes[estado].append(l)

    datos["vida"] = " ".join(partes["vida"])
    seg = partes["segunda"]
    if seg:
        datos["lectura"].append({"t": "rubrica", "x": "Segunda lectura"})
        if len(seg) > 1:
            datos["lectura"].append({"t": "fuente", "x": seg[0]})
            if len(seg) > 2 and len(seg[1]) < 90:
                datos["lectura"].append({"t": "titulo", "x": seg[1]})
                seg = seg[2:]
            else:
                seg = seg[1:]
        datos["lectura"] += [{"t": "texto", "x": p} for p in seg]
    if partes["responsorio"]:
        cita = partes["responsorio"][0].lstrip("§").strip() if partes["responsorio"][0].startswith("§") else ""
        datos["lectura"].append({"t": "rubrica", "x": "Responsorio" + (" · " + cita if cita else "")})
        datos["lectura"] += [{"t": "verso", "x": p} for p in partes["responsorio"] if not p.startswith("§")]
    datos["oracion"] = " ".join(partes["oracion"])
    if partes["benedictus"]:
        datos["ant_benedictus"] = partes["benedictus"][0]
    if partes["magnificat"]:
        datos["ant_magnificat"] = partes["magnificat"][0]

    texto = json.dumps(datos, ensure_ascii=False)
    return json.loads(canonizar(texto, cel["nombre"]))


def main():
    if len(sys.argv) != 2:
        print(__doc__)
        sys.exit(1)
    carpeta = Path(sys.argv[1])
    cal = json.loads(CAL.read_text(encoding="utf-8"))
    por_doc = {norm(Path(c["doc"]).stem): c for c in cal["celebraciones"] if c.get("doc")}
    SALIDA.mkdir(parents=True, exist_ok=True)
    hechos, sin_fecha = 0, []
    for path in sorted(carpeta.iterdir()):
        if path.suffix.lower() not in (".docx", ".txt"):
            continue
        cel = por_doc.get(norm(path.stem))
        if not cel:
            sin_fecha.append(path.name)
            continue
        datos = convertir(path, cel)
        destino = SALIDA / f"{cel['fecha']}.json"
        destino.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        hechos += 1
        print(f"✓ {path.name} → {destino.name}  ({cel['nombre']})")
    print(f"\n{hechos} documento(s) convertidos.")
    if sin_fecha:
        print("Sin celebración en el calendario (revisar a mano):", ", ".join(sin_fecha))


if __name__ == "__main__":
    main()
