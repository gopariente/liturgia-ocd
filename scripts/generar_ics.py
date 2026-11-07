#!/usr/bin/env python3
"""Genera public/calendario-ocd.ics (suscripción al calendario propio OCD).
Uso: python3 scripts/generar_ics.py"""
import hashlib
import json
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
cal = json.loads((RAIZ / "public/data/calendario-propio-ocd.json").read_text(encoding="utf-8"))
GRADOS = cal["grados"]


def esc(s: str) -> str:
    return s.replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")


def plegar(linea: str) -> str:
    # RFC 5545: líneas de hasta 75 octetos.
    b = linea.encode("utf-8")
    partes, i = [], 0
    while i < len(b):
        corte = min(i + (75 if not partes else 74), len(b))
        while corte < len(b) and (b[corte] & 0xC0) == 0x80:
            corte -= 1
        partes.append(b[i:corte].decode("utf-8"))
        i = corte
    return "\r\n ".join(partes)


REG = json.loads((RAIZ / "public/data/regiones.json").read_text(encoding="utf-8"))


def con_region(pais):
    info = REG["paises"][pais]
    cels = [dict(c) for c in cal["celebraciones"]]
    for v in REG["variantes_ocd"]:
        if v["grupo"] not in info["grupos"]:
            continue
        if v.get("agregar"):
            cels.append({"fecha": v["fecha"], "nombre": v["nombre"], "grado": v["grado"]})
            continue
        for c in cels:
            if c["fecha"] == v["fecha"]:
                if v.get("mover_a"):
                    c["fecha"] = v["mover_a"]
                if v.get("grado"):
                    c["grado"] = v["grado"]
                if v.get("nombre"):
                    c["nombre"] = v["nombre"]
                break
    return sorted(cels, key=lambda c: c["fecha"]), info["nombre"]


def generar(pais):
    cels, nombre = con_region(pais)
    titulo = "Calendario propio OCD" + ("" if pais == "general" else " · " + nombre)
    lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Liturgia OCD//Calendario propio//ES",
              "CALSCALE:GREGORIAN", "METHOD:PUBLISH", plegar("X-WR-CALNAME:" + esc(titulo)),
              "X-WR-TIMEZONE:UTC", "REFRESH-INTERVAL;VALUE=DURATION:P7D"]
    for c in cels:
        lineas += evento(c)
    lineas.append("END:VCALENDAR")
    archivo = "calendario-ocd.ics" if pais == "general" else f"calendario-ocd-{pais}.ics"
    (RAIZ / "public" / archivo).write_text("\r\n".join(lineas) + "\r\n", encoding="utf-8")
    return archivo, len(cels)


def evento(c):
    mm, dd = c["fecha"].split("-")
    uid = f"ocd-{c['fecha']}-{hashlib.sha1(c['nombre'].encode()).hexdigest()[:10]}@liturgia-ocd"
    return ["BEGIN:VEVENT", f"UID:{uid}", "DTSTAMP:20260101T000000Z",
               f"DTSTART;VALUE=DATE:2026{mm}{dd}", "RRULE:FREQ=YEARLY", "TRANSP:TRANSPARENT",
               plegar("SUMMARY:" + esc(c["nombre"])),
               plegar("DESCRIPTION:" + esc(GRADOS[c["grado"]] + " · Calendario propio de los Carmelitas Descalzos")),
               "END:VEVENT"]


for pais in REG["paises"]:
    archivo, n = generar(pais)
    print(f"{n:3d} celebraciones → public/{archivo}")
