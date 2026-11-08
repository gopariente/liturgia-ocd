// Prueba el cálculo litúrgico con fechas conocidas. Uso: node scripts/probar_calendario.mjs
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const raiz = new URL('../public/', import.meta.url);
vm.runInThisContext(readFileSync(new URL('js/liturgia.js', raiz), 'utf8'));
const L = globalThis.Liturgia;
const base = {
  ocd: JSON.parse(readFileSync(new URL('data/calendario-propio-ocd.json', raiz), 'utf8')),
  general: JSON.parse(readFileSync(new URL('data/calendario-general.json', raiz), 'utf8'))
};
const regiones = JSON.parse(readFileSync(new URL('data/regiones.json', raiz), 'utf8'));
const porPais = {};
const datosDe = (pais) => (porPais[pais] ||= L.aplicarRegion(base, regiones, pais));

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
  ['2030-12-09', 'Inmaculada Concepción de la Virgen María'],
  // Memorias del calendario general
  ['2026-11-11', 'San Martín de Tours, obispo'],
  ['2026-11-12', 'San Josafat, obispo y mártir'],
  ['2027-08-07', 'San Alberto de Trápani, presbítero'],
  ['2026-03-17', 'Martes de la IV semana de Cuaresma'],
  // Versiones por país
  ['2026-07-13', 'Santa Teresa de Jesús (de los Andes) Fernández Solar, virgen', { pais: 'cl', grado: 'F' }],
  ['2027-06-07', 'Beata Ana de San Bartolomé, virgen', { pais: 'es', grado: 'M' }],
  ['2026-10-01', 'Santa Teresa del Niño Jesús, virgen y doctora de la Iglesia', { pais: 'fr', grado: 'S' }],
  ['2026-11-20', 'San Rafael de San José Kalinowski, presbítero', { pais: 'pl' }],
  ['2026-11-19', 'Jueves de la XXXIII semana del Tiempo Ordinario', { pais: 'pl' }],
  ['2027-08-02', 'Santa Teresa Benedicta de la Cruz Stein, virgen y mártir', { pais: 'nl', grado: 'F' }],
  ['2026-08-10', 'San Lorenzo, diácono y mártir', { pais: 'es' }],
  ['2026-05-14', 'Ascensión del Señor', { pais: 'de' }],
  ['2026-05-17', 'Ascensión del Señor', { pais: 'ar' }],
  ['2026-05-08', 'Nuestra Señora de Luján, patrona de la Argentina', { pais: 'ar' }],
  ['2026-07-25', 'Santiago, apóstol, patrono de España', { pais: 'es', grado: 'S' }]
];

let fallas = 0;
for (const [fecha, esperado, extra] of casos) {
  const pais = (extra && extra.pais) || 'general';
  const r = L.resolver(L.desdeISO(fecha), datosDe(pais));
  let ok = r.principal.nombre === esperado;
  if (ok && extra && extra.semana) ok = r.tiempo.semana === extra.semana && r.tiempo.salterio === extra.salterio;
  if (ok && extra && extra.grado) ok = r.principal.grado === extra.grado;
  if (!ok) fallas++;
  console.log((ok ? 'ok   ' : 'FALLA') + ' ' + fecha + (pais !== 'general' ? ' [' + pais + ']' : '') + ' → ' + r.principal.nombre + ' [' + r.tiempo.nombre + (r.tiempo.semana ? ' ' + r.tiempo.semana : '') + ', salterio ' + r.tiempo.salterio + ']' + (r.notas.length ? ' · ' + r.notas.join(' ') : ''));
}
if (fallas) { console.error(fallas + ' falla(s)'); process.exit(1); }
console.log('Todas las pruebas pasaron.');
