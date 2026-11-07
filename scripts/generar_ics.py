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


lineas = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Liturgia OCD//Calendario propio//ES",
          "CALSCALE:GREGORIAN", "METHOD:PUBLISH", "X-WR-CALNAME:Calendario propio OCD",
          "X-WR-TIMEZONE:UTC", "REFRESH-INTERVAL;VALUE=DURATION:P7D"]
for c in cal["celebraciones"]:
    mm, dd = c["fecha"].split("-")
    uid = f"ocd-{c['fecha']}-{hashlib.sha1(c['nombre'].encode()).hexdigest()[:10]}@liturgia-ocd"
    lineas += ["BEGIN:VEVENT", f"UID:{uid}", "DTSTAMP:20260101T000000Z",
               f"DTSTART;VALUE=DATE:2026{mm}{dd}", "RRULE:FREQ=YEARLY", "TRANSP:TRANSPARENT",
               plegar("SUMMARY:" + esc(c["nombre"])),
               plegar("DESCRIPTION:" + esc(GRADOS[c["grado"]] + " · Calendario propio de los Carmelitas Descalzos")),
               "END:VEVENT"]
lineas.append("END:VCALENDAR")
(RAIZ / "public/calendario-ocd.ics").write_text("\r\n".join(lineas) + "\r\n", encoding="utf-8")
print(f"{len(cal['celebraciones'])} celebraciones → public/calendario-ocd.ics")
