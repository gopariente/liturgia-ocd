#!/usr/bin/env python3
"""Corrige errores tipográficos inequívocos en public/data/textos/<idioma>/*.json.

Uso: python3 scripts/corregir_textos.py [idioma]      (por defecto: es)

Solo aplica cambios sin ambigüedad (palabras que nunca van sin tilde en castellano,
«Amén», espacios después de coma o punto). No toca «esta/está», «mas/más», «tu/tú»,
«el/él», etc.: esos requieren lectura humana. Deja un informe en docs/informe-correcciones-<idioma>.md.
"""
import json
import re
import sys
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
IDIOMA = sys.argv[1] if len(sys.argv) > 1 else "es"
CARPETA = RAIZ / "public" / "data" / "textos" / IDIOMA

# palabra sin tilde → con tilde (se respeta mayúscula inicial o todo en mayúsculas)
PALABRAS = {
    "maria": "maría", "oracion": "oración", "angeles": "ángeles",
    "angel": "ángel", "asi": "así", "avila": "ávila", "ultima": "última", "ultimo": "último",
    "sion": "sión", "mia": "mía", "mio": "mío", "espiritu": "espíritu", "corazon": "corazón",
    "dia": "día", "dias": "días", "tambien": "también", "despues": "después", "jesus": "jesús",
    "jose": "josé", "alli": "allí", "aqui": "aquí", "ademas": "además", "jamas": "jamás",
    "segun": "según", "jerusalen": "jerusalén", "belen": "belén", "razon": "razón",
    "eucaristia": "eucaristía", "santisima": "santísima", "santisimo": "santísimo",
    "alegria": "alegría", "sabiduria": "sabiduría", "martir": "mártir", "martires": "mártires",
    "virgenes": "vírgenes", "unico": "único", "unica": "única", "proposito": "propósito",
    "magnifico": "magnífico", "dificil": "difícil", "facil": "fácil", "comunion": "comunión",
    "pasion": "pasión", "mision": "misión", "contemplacion": "contemplación",
    "salvacion": "salvación", "perfeccion": "perfección", "resurreccion": "resurrección",
    "asuncion": "asunción", "encarnacion": "encarnación", "intercesion": "intercesión",
    "ascension": "ascensión", "conversion": "conversión", "vocacion": "vocación",
}


def con_caso(original, nuevo):
    if original.isupper():
        return nuevo.upper()
    if original[0].isupper():
        return nuevo[0].upper() + nuevo[1:]
    return nuevo


def corregir(texto, cuenta):
    def palabra(m):
        w = m.group(0)
        nuevo = PALABRAS.get(w.lower())
        if not nuevo:
            return w
        res = con_caso(w, nuevo)
        if res != w:
            cuenta[f"{w} → {res}"] += 1
        return res
    texto = re.sub(r"[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+", palabra, texto)
    # «Ame.» al cierre de un himno es «Amén.» (en minúscula «ame» es el verbo amar: no se toca).
    # «Amen» solo como aclamación (seguido de punto, signo o fin); «amen» en mitad de frase es el verbo amar.
    antes = texto
    texto = re.sub(r"\bAmen(?=[.!»]|\s*$)", "Amén", texto)
    texto = re.sub(r"(?<=[,;] )amen(?=[.!»]|\s*$)", "amén", texto)
    texto = re.sub(r"(?<=\n)amen(?=[.!]|\s*$)", "amén", texto)
    if texto != antes:
        cuenta["Amen → Amén (aclamación)"] += 1
    nuevo = re.sub(r"\bAme\.(?=\s*$)", "Amén.", texto)
    if nuevo != texto:
        cuenta["Ame. → Amén. (cierre de himno)"] += 1
    texto = nuevo
    # Espacios después de coma y de punto.
    nuevo = re.sub(r",(?=[A-Za-zÁÉÍÓÚáéíóúÑñ¡¿«])", ", ", texto)
    if nuevo != texto:
        cuenta["espacio después de coma"] += len(re.findall(r",(?=[A-Za-zÁÉÍÓÚáéíóúÑñ¡¿«])", texto))
    texto = nuevo
    nuevo = re.sub(r"(?<=[a-záéíóúñ])\.(?=[A-ZÁÉÍÓÚÑ¡¿«])", ". ", texto)
    if nuevo != texto:
        cuenta["espacio después de punto"] += len(re.findall(r"(?<=[a-záéíóúñ])\.(?=[A-ZÁÉÍÓÚÑ¡¿«])", texto))
    texto = re.sub(r"[ \t]{2,}", " ", nuevo)
    return texto


def recorrer(o, cuenta):
    if isinstance(o, str):
        return corregir(o, cuenta)
    if isinstance(o, list):
        return [recorrer(x, cuenta) for x in o]
    if isinstance(o, dict):
        return {k: (v if k in ("fecha", "t") else recorrer(v, cuenta)) for k, v in o.items()}
    return o


def main():
    total = Counter()
    por_archivo = {}
    for f in sorted(CARPETA.glob("*.json")):
        cuenta = Counter()
        datos = recorrer(json.loads(f.read_text(encoding="utf-8")), cuenta)
        if cuenta:
            f.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
            por_archivo[f.name] = sum(cuenta.values())
            total.update(cuenta)
    lineas = ["# Correcciones automáticas", "", f"Total: {sum(total.values())} cambios en {len(por_archivo)} archivos.", "",
              "| Cambio | Veces |", "|---|---|"] + [f"| {k} | {v} |" for k, v in total.most_common()]
    lineas += ["", "Pendiente de revisión humana: tildes diacríticas (esta/está, mas/más, tu/tú, el/él, mi/mí, se/sé, solo/sólo) y erratas propias de cada documento."]
    (RAIZ / "docs" / f"informe-correcciones-{IDIOMA}.md").write_text("\n".join(lineas) + "\n", encoding="utf-8")
    print(f"{sum(total.values())} cambios en {len(por_archivo)} archivos")
    for k, v in total.most_common(12):
        print(f"  {v:4d}  {k}")


if __name__ == "__main__":
    main()
