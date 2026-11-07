// Prueba el cálculo litúrgico con fechas conocidas. Uso: node scripts/probar_calendario.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const raiz = new URL('../public/', import.meta.url);
vm.runInThisContext(readFileSync(new URL('js/liturgia.js', raiz), 'utf8'));
const L = globalThis.Liturgia;
const datos = {
  ocd: JSON.parse(readFileSync(new URL('data/calendario-propio-ocd.json', raiz), 'utf8')),
  general: JSON.parse(readFileSync(new URL('data/calendario-general.json', raiz), 'utf8'))
};

const casos = [
  ['2026-04-05', 'Domingo de Pascua de la Resurrección del Señor'],
  ['2026-02-18', 'Miércoles de Ceniza'],
  ['2026-05-24', 'Domingo de Pentecostés'],
  ['2026-07-16', 'Bienaventurada Virgen María del Monte Carmelo, Patrona y Titular de la Orden'],
  ['2026-10-15', 'Santa Teresa de Jesús, Madre nuestra, virgen y doctora de la Iglesia'],
  ['2026-11-07', 'Beato Francisco de Jesús María José Palau y Quer, presbítero', { semana: 31, salterio: 3 }],
  ['2026-11-08', 'Domingo XXXII del Tiempo Ordinario'],
  ['2026-11-14', 'Todos los Santos de la Orden'],
  ['2026-11-15', 'Domingo XXXIII del Tiempo Ordinario'],
  ['2026-11-16', 'Conmemoración de todos los difuntos de la Orden'],
  ['2026-11-22', 'Jesucristo, Rey del Universo'],
  ['2026-11-29', 'Domingo I de Adviento'],
  ['2026-12-08', 'Inmaculada Concepción de la Virgen María'],
  ['2026-12-14', 'San Juan de la Cruz, Padre nuestro, presbítero y doctor de la Iglesia'],
  ['2026-12-25', 'Natividad del Señor'],
  ['2027-01-10', 'Bautismo del Señor'],
  ['2027-03-26', 'Viernes Santo de la Pasión del Señor'],
  ['2027-03-28', 'Domingo de Pascua de la Resurrección del Señor'],
  ['2025-12-08', 'Inmaculada Concepción de la Virgen María'],
  ['2030-12-09', 'Inmaculada Concepción de la Virgen María']
];

let fallas = 0;
for (const [fecha, esperado, extra] of casos) {
  const r = L.resolver(L.desdeISO(fecha), datos);
  let ok = r.principal.nombre === esperado;
  if (ok && extra) ok = r.tiempo.semana === extra.semana && r.tiempo.salterio === extra.salterio;
  if (!ok) fallas++;
  console.log((ok ? 'ok   ' : 'FALLA') + ' ' + fecha + ' → ' + r.principal.nombre + ' [' + r.tiempo.nombre + (r.tiempo.semana ? ' ' + r.tiempo.semana : '') + ', salterio ' + r.tiempo.salterio + ']' + (r.notas.length ? ' · ' + r.notas.join(' ') : ''));
}
if (fallas) { console.error(fallas + ' falla(s)'); process.exit(1); }
console.log('Todas las pruebas pasaron.');
