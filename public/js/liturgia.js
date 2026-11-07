/* Cálculo del día litúrgico (rito romano + Calendario propio OCD).
   Sin dependencias. Funciona en el navegador (window.Liturgia) y en Node (globalThis.Liturgia).
   Simplificaciones documentadas en README: sin memorias del calendario general,
   traslados solo de un día para solemnidades impedidas por domingo privilegiado. */
(function (root) {
  'use strict';

  const DIA = 86400000;
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const GRADOS = { S: 'Solemnidad', F: 'Fiesta', M: 'Memoria', ML: 'Memoria libre', C: 'Conmemoración' };
  // Rango de las celebraciones propias de la Orden (Tabla de los días litúrgicos).
  const RANGO_OCD = { S: 4, F: 8, M: 11, ML: 12, C: 12 };

  // Fechas en UTC a medianoche para evitar saltos por horario de verano.
  const f = (y, m, d) => new Date(Date.UTC(y, m - 1, d));
  const sumar = (fecha, dias) => new Date(fecha.getTime() + dias * DIA);
  const dif = (a, b) => Math.round((a.getTime() - b.getTime()) / DIA);
  const dow = (fecha) => fecha.getUTCDay();
  const mmdd = (fecha) => String(fecha.getUTCMonth() + 1).padStart(2, '0') + '-' + String(fecha.getUTCDate()).padStart(2, '0');
  const iso = (fecha) => fecha.getUTCFullYear() + '-' + mmdd(fecha);
  const domingoAnteriorOIgual = (fecha) => sumar(fecha, -dow(fecha));

  function desdeISO(texto) {
    const [y, m, d] = texto.split('-').map(Number);
    return f(y, m, d);
  }
  function hoyLocal(ahora = new Date()) {
    return f(ahora.getFullYear(), ahora.getMonth() + 1, ahora.getDate());
  }

  function romano(n) {
    const t = [[50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']];
    let s = '';
    for (const [v, r] of t) while (n >= v) { s += r; n -= v; }
    return s;
  }

  // Domingo de Pascua (algoritmo gregoriano anónimo).
  function pascua(y) {
    const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
    const g = Math.floor((8 * b + 13) / 25), h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 19 * l) / 433);
    const mes = Math.floor((h + l - 7 * m + 90) / 25), dia = (h + l - 7 * m + 33 * mes + 19) % 32;
    return f(y, mes, dia);
  }

  function adviento1(y) {
    const nav = f(y, 12, 25);
    const domingoAntes = sumar(nav, -(dow(nav) === 0 ? 7 : dow(nav)));
    return sumar(domingoAntes, -21);
  }
  // Epifanía el 6 de enero: el Bautismo es el domingo siguiente.
  function bautismo(y) {
    const e = f(y, 1, 6);
    return sumar(e, 7 - dow(e));
  }
  function sagradaFamilia(y) {
    const nav = f(y, 12, 25);
    return dow(nav) === 0 ? f(y, 12, 30) : sumar(nav, 7 - dow(nav));
  }

  // Celebraciones móviles (país: Argentina — Ascensión y Corpus en domingo).
  function moviles(y) {
    const P = pascua(y), adv = adviento1(y);
    const lista = [
      { fecha: bautismo(y), nombre: 'Bautismo del Señor', grado: 'F', rango: 5, color: 'blanco' },
      { fecha: sumar(P, 42), nombre: 'Ascensión del Señor', grado: 'S', rango: 2, color: 'blanco' },
      { fecha: sumar(P, 49), nombre: 'Domingo de Pentecostés', grado: 'S', rango: 2, color: 'rojo' },
      { fecha: sumar(P, 50), nombre: 'Bienaventurada Virgen María, Madre de la Iglesia', grado: 'M', rango: 10, color: 'blanco' },
      { fecha: sumar(P, 56), nombre: 'Santísima Trinidad', grado: 'S', rango: 3, color: 'blanco' },
      { fecha: sumar(P, 63), nombre: 'Santísimo Cuerpo y Sangre de Cristo', grado: 'S', rango: 3, color: 'blanco' },
      { fecha: sumar(P, 68), nombre: 'Sagrado Corazón de Jesús', grado: 'S', rango: 3, color: 'blanco' },
      { fecha: sumar(P, 69), nombre: 'Inmaculado Corazón de la Virgen María', grado: 'M', rango: 10, color: 'blanco' },
      { fecha: sumar(adv, -7), nombre: 'Jesucristo, Rey del Universo', grado: 'S', rango: 3, color: 'blanco' },
      { fecha: sagradaFamilia(y), nombre: 'Sagrada Familia de Jesús, María y José', grado: 'F', rango: 5, color: 'blanco' }
    ];
    return lista.map((c) => Object.assign(c, { origen: 'general' }));
  }

  // Tiempo litúrgico, semana y semana del salterio.
  function tiempo(fecha) {
    const y = fecha.getUTCFullYear();
    const P = pascua(y), ceniza = sumar(P, -46), adv = adviento1(y);
    const nav = f(y, 12, 25), baut = bautismo(y);
    const d = dow(fecha);
    let t;
    if (fecha >= adv && fecha < nav) {
      const sem = Math.floor(dif(fecha, adv) / 7) + 1;
      t = { clave: 'adviento', nombre: 'Adviento', semana: sem, salterio: ((sem - 1) % 4) + 1, color: (d === 0 && sem === 3) ? 'rosa' : 'morado' };
    } else if (fecha >= nav || fecha <= baut) {
      const sf = fecha >= nav ? sagradaFamilia(y) : sagradaFamilia(y - 1);
      const sem = Math.max(0, Math.floor(dif(domingoAnteriorOIgual(fecha), sf) / 7));
      t = { clave: 'navidad', nombre: 'Navidad', semana: null, salterio: (sem % 4) + 1, color: 'blanco' };
      if (dif(fecha, nav) >= 0 && dif(fecha, nav) <= 7) t.octava = true;
    } else if (fecha < ceniza) {
      const sem = Math.floor(dif(fecha, baut) / 7) + 1;
      t = { clave: 'ordinario', nombre: 'Tiempo Ordinario', semana: sem, salterio: ((sem - 1) % 4) + 1, color: 'verde' };
    } else if (fecha < sumar(P, -7)) {
      const dom1 = sumar(ceniza, 4);
      const sem = fecha < dom1 ? 0 : Math.floor(dif(fecha, dom1) / 7) + 1;
      const rosa = d === 0 && sem === 4;
      t = { clave: 'cuaresma', nombre: 'Cuaresma', semana: sem, salterio: sem === 0 ? 4 : ((sem - 1) % 4) + 1, color: rosa ? 'rosa' : 'morado' };
    } else if (fecha < sumar(P, -2)) {
      t = { clave: 'santa', nombre: 'Semana Santa', semana: 6, salterio: 2, color: d === 0 ? 'rojo' : 'morado' };
    } else if (fecha < P) {
      t = { clave: 'triduo', nombre: 'Triduo Pascual', semana: null, salterio: null, color: dif(fecha, P) === -2 ? 'rojo' : 'blanco' };
    } else if (fecha <= sumar(P, 49)) {
      const sem = Math.floor(dif(fecha, P) / 7) + 1;
      t = { clave: 'pascua', nombre: 'Pascua', semana: sem, salterio: ((sem - 1) % 4) + 1, color: 'blanco', octava: dif(fecha, P) < 8 };
    } else {
      const rey = sumar(adv, -7);
      const sem = 34 - Math.round(dif(rey, domingoAnteriorOIgual(fecha)) / 7);
      t = { clave: 'ordinario', nombre: 'Tiempo Ordinario', semana: sem, salterio: ((sem - 1) % 4) + 1, color: 'verde' };
    }
    return t;
  }

  // El día "del tiempo" (domingo o feria) con su rango.
  function diaDelTiempo(fecha, t) {
    const y = fecha.getUTCFullYear(), P = pascua(y), d = dow(fecha);
    const dP = dif(fecha, P);
    let nombre, rango;
    if (t.clave === 'triduo') {
      nombre = dP === -2 ? 'Viernes Santo de la Pasión del Señor' : 'Sábado Santo';
      rango = 1;
    } else if (dP === 0) { nombre = 'Domingo de Pascua de la Resurrección del Señor'; rango = 1; }
    else if (dP === -46) { nombre = 'Miércoles de Ceniza'; rango = 2; }
    else if (t.clave === 'santa') {
      nombre = d === 0 ? 'Domingo de Ramos en la Pasión del Señor' : (DIAS[d][0].toUpperCase() + DIAS[d].slice(1) + ' Santo');
      rango = 2;
    } else if (t.clave === 'pascua' && t.octava) { nombre = DIAS[d][0].toUpperCase() + DIAS[d].slice(1) + ' de la Octava de Pascua'; rango = 2; }
    else if (d === 0) {
      if (t.clave === 'navidad') { nombre = 'Domingo de Navidad'; rango = 6; }
      else {
        const etiqueta = t.clave === 'cuaresma' ? 'de Cuaresma' : t.clave === 'adviento' ? 'de Adviento' : t.clave === 'pascua' ? 'de Pascua' : 'del Tiempo Ordinario';
        nombre = 'Domingo ' + romano(t.semana) + ' ' + etiqueta;
        rango = t.clave === 'ordinario' ? 6 : 2;
      }
    } else {
      const dia = DIAS[d][0].toUpperCase() + DIAS[d].slice(1);
      if (t.clave === 'navidad') nombre = dia + ' del tiempo de Navidad';
      else if (t.clave === 'cuaresma' && t.semana === 0) nombre = dia + ' después de Ceniza';
      else nombre = dia + ' de la ' + romano(t.semana) + ' semana ' + (t.clave === 'cuaresma' ? 'de Cuaresma' : t.clave === 'adviento' ? 'de Adviento' : t.clave === 'pascua' ? 'de Pascua' : 'del Tiempo Ordinario');
      const privilegiada = t.clave === 'cuaresma' || (t.clave === 'adviento' && fecha.getUTCDate() >= 17 && fecha.getUTCMonth() === 11) || (t.clave === 'navidad' && t.octava);
      rango = privilegiada ? 9 : 13;
    }
    return { nombre, rango, grado: null, origen: 'tiempo', color: t.color };
  }

  function colorPropio(c) {
    if (c.color) return c.color;
    if (/mártir/i.test(c.nombre)) return 'rojo';
    if (/difuntos/i.test(c.nombre)) return 'morado';
    return 'blanco';
  }

  // Devuelve las celebraciones candidatas de una fecha (sin decidir precedencia).
  function candidatas(fecha, datos) {
    const k = mmdd(fecha), y = fecha.getUTCFullYear();
    const lista = [];
    for (const c of datos.general.fijas) if (c.fecha === k) lista.push(Object.assign({ origen: 'general' }, c));
    for (const c of moviles(y)) if (iso(c.fecha) === iso(fecha)) lista.push(Object.assign({}, c, { fecha: k }));
    for (const c of datos.ocd.celebraciones) {
      if (c.fecha === k) lista.push(Object.assign({ origen: 'ocd', rango: RANGO_OCD[c.grado] }, c));
    }
    // Conmemoración de los difuntos de la Orden: si cae en domingo pasa al lunes.
    if (k === '11-16' && dow(fecha) === 1) {
      const c = datos.ocd.celebraciones.find((x) => x.fecha === '11-15');
      if (c) lista.push(Object.assign({ origen: 'ocd', rango: RANGO_OCD[c.grado], trasladada: true }, c, { fecha: k }));
    }
    return lista;
  }

  function resolverSinTraslado(fecha, datos) {
    const t = tiempo(fecha);
    const delTiempo = diaDelTiempo(fecha, t);
    let lista = candidatas(fecha, datos).filter((c) => !(c.fecha === '11-15' && c.origen === 'ocd' && dow(fecha) === 0));
    return { t, delTiempo, lista };
  }

  function resolver(fecha, datos) {
    const { t, delTiempo, lista: base } = resolverSinTraslado(fecha, datos);
    const lista = base.slice();
    const notas = [];

    // Traslado simple: solemnidad impedida ayer por un domingo privilegiado pasa a hoy.
    const ayer = sumar(fecha, -1);
    if (dow(ayer) === 0) {
      const r = resolverSinTraslado(ayer, datos);
      for (const c of r.lista) {
        if (c.grado === 'S' && c.rango >= 3 && r.delTiempo.rango <= 2) {
          lista.push(Object.assign({}, c, { trasladada: true }));
        }
      }
    }

    // A igual rango gana la celebración propia sobre el día del tiempo (p. ej. Pentecostés).
    const todas = [delTiempo].concat(lista).sort((a, b) =>
      (a.rango - b.rango) || ((a.origen === 'tiempo') - (b.origen === 'tiempo')));
    let principal = todas[0];
    const alternativas = [], omitidas = [];

    for (const c of todas.slice(1)) {
      if (c === delTiempo) {
        if (principal.grado === 'ML') alternativas.push(c);
        continue;
      }
      // En días privilegiados (rango 9) las memorias se rezan como conmemoración.
      if (delTiempo.rango === 9 && principal === delTiempo && (c.grado === 'M' || c.grado === 'ML')) {
        alternativas.push(Object.assign({}, c, { comoConmemoracion: true }));
      } else if (c.grado === 'ML' && principal.grado === 'ML') {
        alternativas.push(c);
      } else {
        omitidas.push(c);
      }
    }
    if (principal.trasladada) notas.push('Trasladada desde el día anterior.');
    for (const c of omitidas) {
      if (c.grado === 'S') notas.push(c.nombre + ': solemnidad impedida; verifique el traslado en el Ordo.');
    }

    return {
      fecha: iso(fecha),
      fechaTexto: DIAS[dow(fecha)] + ' ' + fecha.getUTCDate() + ' de ' + MESES[fecha.getUTCMonth()] + ' de ' + fecha.getUTCFullYear(),
      tiempo: t,
      delTiempo,
      principal: Object.assign({}, principal, { color: principal.origen === 'tiempo' ? t.color : colorPropio(principal) }),
      alternativas,
      omitidas,
      notas
    };
  }

  // Próximas celebraciones propias de la Orden a partir de una fecha.
  function proximasOCD(desde, datos, cantidad = 3) {
    const res = [];
    for (let i = 1; i <= 366 && res.length < cantidad; i++) {
      const dia = sumar(desde, i);
      const k = mmdd(dia);
      for (const c of datos.ocd.celebraciones) if (c.fecha === k) res.push({ fecha: iso(dia), dia, celebracion: c });
    }
    return res.slice(0, cantidad);
  }

  root.Liturgia = {
    GRADOS, MESES, DIAS, f, sumar, dif, dow, mmdd, iso, desdeISO, hoyLocal, romano,
    pascua, adviento1, bautismo, sagradaFamilia, moviles, tiempo, resolver, proximasOCD
  };
})(typeof window !== 'undefined' ? window : globalThis);
