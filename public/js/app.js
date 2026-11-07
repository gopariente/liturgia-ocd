/* Interfaz de la app. Sin dependencias.
   Seguridad: el contenido se arma con textContent / createElement (nunca innerHTML). */
(function () {
  'use strict';
  const L = window.Liturgia;
  const main = document.getElementById('contenido');
  const estado = { datos: null, textos: new Map() };

  // ---------- Preferencias (solo en este dispositivo) ----------
  const PREF = 'liturgia-ocd:pref';
  // País por defecto según el idioma del navegador (es-AR → ar); si no coincide, calendario general.
  function paisPorDefecto() {
    const m = (navigator.language || '').toLowerCase().match(/-([a-z]{2})$/);
    return m ? m[1] : 'general';
  }
  function leerPref() {
    const def = { texto: 19, tema: 'auto', aviso: 'manana', pais: paisPorDefecto(), idioma: 'es' };
    try { return Object.assign(def, JSON.parse(localStorage.getItem(PREF) || '{}')); }
    catch (e) { return def; }
  }
  function guardarPref(p) { try { localStorage.setItem(PREF, JSON.stringify(p)); } catch (e) { /* modo privado */ } }
  function aplicarPref(p) {
    document.documentElement.style.setProperty('--texto', p.texto + 'px');
    if (p.tema === 'auto') document.documentElement.removeAttribute('data-tema');
    else document.documentElement.setAttribute('data-tema', p.tema);
  }
  let pref = leerPref();
  aplicarPref(pref);

  // ---------- Idiomas ----------
  // Textos de pantalla en i18n/<idioma>.json. Para sumar un idioma: copiar es.json, traducirlo y agregarlo aquí.
  const IDIOMAS = [['es', 'Español']];
  let TXT = {};
  const tx = (k) => TXT[k] || k;
  async function cargarIdioma() {
    try { TXT = await json('i18n/' + pref.idioma + '.json'); }
    catch (e) { pref.idioma = 'es'; TXT = await json('i18n/es.json'); }
    document.documentElement.lang = pref.idioma;
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = tx(el.dataset.i18n);
  }

  // ---------- Utilidades de DOM ----------
  function h(tag, attrs, ...hijos) {
    const el = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs || {})) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'class') el.className = v;
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : String(v));
    }
    for (const c of hijos.flat()) {
      if (c === null || c === undefined || c === false) continue;
      el.append(c instanceof Node ? c : document.createTextNode(String(c)));
    }
    return el;
  }
  const ICONOS = {
    atras: 'M15 6l-6 6 6 6', adelante: 'M9 6l6 6-6 6', luna: 'M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z',
    calendario: 'M3 5h18v16H3zM3 10h18M8 3v4M16 3v4', libro: 'M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 19a2 2 0 0 1 2-2h13'
  };
  function icono(nombre) {
    const ns = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(ns, 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true');
    const p = document.createElementNS(ns, 'path'); p.setAttribute('d', ICONOS[nombre]);
    svg.append(p); return svg;
  }
  function pintar(...nodos) {
    main.replaceChildren(...nodos);
    window.scrollTo(0, 0);
  }
  const GR = L.GRADOS;
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);

  // ---------- Datos ----------
  async function json(url) {
    const r = await fetch(url, { credentials: 'omit' });
    if (!r.ok) throw new Error(url + ': ' + r.status);
    return r.json();
  }
  async function cargarDatos() {
    if (!estado.base) {
      const [ocd, general, regiones] = await Promise.all([json('data/calendario-propio-ocd.json'), json('data/calendario-general.json'), json('data/regiones.json')]);
      estado.base = { ocd, general };
      estado.regiones = regiones;
    }
    if (!estado.datos || estado.datos.pais !== pref.pais) {
      if (!estado.regiones.paises[pref.pais]) pref.pais = 'general';
      estado.datos = L.aplicarRegion(estado.base, estado.regiones, pref.pais);
    }
    return estado.datos;
  }
  // El texto propio se guarda con la fecha del calendario general (aunque un país la traslade).
  const claveTexto = (c) => c.fechaOriginal || c.fecha;
  async function texto(mmdd) {
    const clave = pref.idioma + '/' + mmdd;
    if (!estado.textos.has(clave)) {
      let t = null;
      try { t = await json('data/textos/' + clave + '.json'); } catch (e) { t = null; }
      estado.textos.set(clave, t);
    }
    return estado.textos.get(clave);
  }
  const celebracionOCD = (mmdd) => estado.datos.ocd.celebraciones.filter((c) => c.fecha === mmdd);

  // ---------- Horas ----------
  const HORAS = [
    { id: 'lectura' }, { id: 'laudes' }, { id: 'intermedia' }, { id: 'visperas' }, { id: 'completas' }
  ];
  for (const x of HORAS) {
    Object.defineProperty(x, 'nombre', { get: () => tx('hora_' + x.id) });
    Object.defineProperty(x, 'sub', { get: () => tx('hora_' + x.id + '_sub') });
  }
  function horaActual() {
    const hr = new Date().getHours();
    if (hr >= 5 && hr < 10) return 'laudes';
    if (hr >= 10 && hr < 16) return 'intermedia';
    if (hr >= 16 && hr < 21) return 'visperas';
    return 'completas';
  }

  // ---------- Vista: Hoy ----------
  async function vistaHoy(fechaISO) {
    const datos = await cargarDatos();
    const hoy = L.hoyLocal();
    const fecha = fechaISO ? L.desdeISO(fechaISO) : hoy;
    const r = L.resolver(fecha, datos);
    const t = r.tiempo;
    const esHoy = L.iso(fecha) === L.iso(hoy);
    const p = r.principal;

    const tituloDia = p.origen === 'ocd' ? h('a', { class: 'tarjeta', href: '#/santo/' + p.fecha }, tarjetaContenido()) : h('div', { class: 'tarjeta' }, tarjetaContenido());
    function tarjetaContenido() {
      return [
        h('span', { class: 'grado' }, h('span', { class: 'color-lit ' + p.color, title: 'Color litúrgico: ' + p.color }),
          (esHoy ? 'Hoy' : mayus(r.fechaTexto.split(' ')[0])) + (p.grado ? ' · ' + GR[p.grado] : '') + (p.origen === 'ocd' ? ' · Propio OCD' : '')),
        h('span', { class: 'nombre' }, p.nombre),
        h('span', { class: 'detalle' }, (p.origen !== 'tiempo' ? r.delTiempo.nombre + ' · ' : '') + (t.salterio ? 'Salterio ' + L.romano(t.salterio) : t.nombre))
      ];
    }

    const alternativas = r.alternativas.map((c) => {
      const destino = c.origen === 'ocd' ? '#/santo/' + c.fecha : null;
      const cont = [h('span', { class: 'grado' }, c.comoConmemoracion ? 'Puede hacerse conmemoración' : (c.origen === 'tiempo' ? 'O bien la feria' : 'También ' + (GR[c.grado] || '').toLowerCase())),
        h('span', { class: 'nombre' }, c.nombre)];
      return destino ? h('a', { class: 'tarjeta secundaria', href: destino }, cont) : h('div', { class: 'tarjeta secundaria' }, cont);
    });
    const omitidasOCD = r.omitidas.filter((c) => c.origen === 'ocd').map((c) =>
      h('p', { class: 'nota' }, 'Este año no se celebra: ' + c.nombre + ' (' + GR[c.grado].toLowerCase() + '), por coincidir con ' + p.nombre + '.'));

    const actual = esHoy ? horaActual() : null;
    const horas = h('div', { class: 'horas' }, HORAS.map((x) =>
      h('a', { class: 'hora' + (x.id === actual ? ' actual' : ''), href: '#/oficio/' + r.fecha + '/' + x.id },
        h('b', {}, x.nombre), h('span', {}, x.id === actual ? 'Ahora · ' + x.sub : x.sub))));

    const prox = L.proximasOCD(fecha, datos, 3).map((x) => {
      const d = x.dia;
      return h('a', { class: 'fila', href: '#/santo/' + x.celebracion.fecha },
        h('span', { class: 'dia' }, h('b', {}, d.getUTCDate()), h('small', {}, L.MESES[d.getUTCMonth()].slice(0, 3))),
        h('span', { class: 'txt' }, h('b', {}, x.celebracion.nombre), h('span', { class: 'insignia ' + x.celebracion.grado }, GR[x.celebracion.grado])));
    });

    const anterior = L.iso(L.sumar(fecha, -1)), siguiente = L.iso(L.sumar(fecha, 1));
    pintar(
      h('header', { class: 'cabecera' },
        h('div', { class: 'herramientas' },
          h('a', { class: 'icono-boton', href: '#/dia/' + anterior, 'aria-label': 'Día anterior' }, icono('atras')),
          h('span', { class: 'fecha' }, r.fechaTexto),
          h('a', { class: 'icono-boton', href: '#/dia/' + siguiente, 'aria-label': 'Día siguiente' }, icono('adelante'))),
        h('img', { src: 'img/escudo.svg', alt: 'Escudo de la Orden de los Carmelitas Descalzos', width: 112, height: 146 }),
        h('h1', {}, tx('titulo')),
        h('span', { class: 'orden' }, tx('orden'))),
      h('section', { class: 'seccion' },
        tituloDia, ...alternativas, ...omitidasOCD,
        ...r.notas.map((n) => h('p', { class: 'nota' }, n)),
        !esHoy ? h('a', { class: 'boton claro', href: '#/hoy' }, tx('volverHoy')) : null),
      h('section', { class: 'seccion', 'aria-labelledby': 'rezar' }, h('h2', { class: 'etiqueta', id: 'rezar' }, tx('rezar')), horas),
      h('section', { class: 'seccion', 'aria-labelledby': 'prox' }, h('h2', { class: 'etiqueta', id: 'prox' }, tx('proximas')), ...prox)
    );
  }

  // ---------- Vista: Índice ----------
  function vistaIndice() {
    const libro = [
      ['Ordinario de la Liturgia de las Horas', '#/oficio/' + L.iso(L.hoyLocal()) + '/laudes'],
      ['Salterio (cuatro semanas)', null], ['Propio del tiempo', null], ['Comunes', null],
      ['Salmodia complementaria', null], ['Completas', '#/oficio/' + L.iso(L.hoyLocal()) + '/completas'],
      ['Propio de la Orden (santoral)', '#/calendario']
    ];
    pintar(
      cabeceraSimple(tx('indice')),
      h('section', { class: 'seccion' },
        h('h2', { class: 'etiqueta' }, 'Libro de las Horas'),
        ...libro.map(([n, href]) => href
          ? h('a', { class: 'fila papel', href }, h('span', { class: 'txt' }, h('b', {}, n)))
          : h('div', { class: 'fila papel' }, h('span', { class: 'txt' }, h('b', {}, n), h('span', { class: 'nota' }, 'En preparación'))))),
      h('section', { class: 'seccion' },
        h('h2', { class: 'etiqueta' }, 'Suscripción'),
        h('p', { class: 'nota' }, 'Agregue todo el calendario propio de la Orden a su agenda (Google, iPhone, Outlook). Se actualiza solo.'),
        botonesSuscripcion())
    );
  }

  // ---------- Vista: Calendario propio ----------
  async function vistaCalendario(mesInicial) {
    const datos = await cargarDatos();
    const hoy = L.hoyLocal();
    let mes = mesInicial || String(hoy.getUTCMonth() + 1).padStart(2, '0');
    let filtro = '';
    const lista = h('div', { class: 'seccion' });
    const chips = h('div', { class: 'chips', role: 'group', 'aria-label': 'Mes' });
    const meses = L.MESES.map((m, i) => String(i + 1).padStart(2, '0'));

    function render() {
      chips.replaceChildren(...meses.map((m, i) => h('button', {
        type: 'button', class: 'chip', 'aria-pressed': String(m === mes && !filtro),
        onclick: () => { mes = m; filtro = ''; buscador.value = ''; history.replaceState(null, '', '#/calendario/' + m); render(); }
      }, mayus(L.MESES[i].slice(0, 3)))));
      const norm = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const items = datos.ocd.celebraciones.filter((c) => filtro ? norm(c.nombre).includes(norm(filtro)) : c.fecha.startsWith(mes + '-'));
      const hoyK = L.mmdd(hoy);
      lista.replaceChildren(...(items.length ? items.map((c) => {
        const [m, d] = c.fecha.split('-');
        return h('a', { class: 'fila papel' + (c.fecha === hoyK ? ' hoy' : ''), href: '#/santo/' + c.fecha },
          h('span', { class: 'dia' }, h('b', {}, Number(d)), h('small', {}, L.MESES[Number(m) - 1].slice(0, 3))),
          h('span', { class: 'txt' }, h('b', {}, c.nombre), h('span', { class: 'insignia ' + c.grado }, GR[c.grado])));
      }) : [h('p', { class: 'nota' }, filtro ? 'Sin resultados.' : 'Sin celebraciones propias este mes.')]));
    }
    const buscador = h('input', { class: 'buscar', type: 'search', id: 'buscar', placeholder: 'Ej.: Teresa, Elías, mártires', autocomplete: 'off',
      oninput: (e) => { filtro = e.target.value.trim(); render(); } });
    pintar(
      cabeceraSimple(tx('calendarioPropio'), tx('orden')),
      h('section', { class: 'seccion' },
        h('label', { class: 'etiqueta', for: 'buscar' }, 'Buscar santo o celebración'), buscador, chips),
      lista
    );
    render();
  }

  // ---------- Vista: Santo / celebración ----------
  async function vistaSanto(mmdd) {
    await cargarDatos();
    const cels = celebracionOCD(mmdd);
    if (!cels.length) return noEncontrado();
    const c = cels[0];
    const txt = await texto(claveTexto(c));
    const iniciales = c.nombre.replace(/^(San|Santa|Santos|Santas|Beato|Beata|Beatos|Beatas|Bienaventurada)\s+/i, '')
      .split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w)).slice(0, 2).map((w) => w[0]).join('');
    const [m, d] = mmdd.split('-').map(Number);
    const proxima = proximaFecha(m, d);
    const r = L.resolver(proxima, estado.datos);
    const impedida = r.principal.nombre !== c.nombre && !r.alternativas.some((a) => a.nombre === c.nombre);
    const salida = h('div', { class: 'estado', role: 'status', hidden: true });

    pintar(
      h('div', { class: 'cabecera-simple' }, h('a', { class: 'icono-boton', href: '#/calendario/' + mmdd.slice(0, 2), 'aria-label': 'Volver al calendario' }, icono('atras'))),
      h('div', { class: 'retrato', 'aria-hidden': 'true' }, h('div', { class: 'marco' }, iniciales || '✝')),
      h('div', { class: 'titulo-santo' },
        h('span', { class: 'etiqueta' }, d + ' de ' + L.MESES[m - 1] + ' · ' + GR[c.grado]),
        h('h1', {}, c.nombre),
        c.variante ? h('p', { class: 'nota' }, tx('varianteDe') + ' ' + estado.regiones.paises[pref.pais].nombre + (c.fechaOriginal ? ' (' + tx('enGeneral') + ' ' + Number(c.fechaOriginal.slice(3)) + ' de ' + L.MESES[Number(c.fechaOriginal.slice(0, 2)) - 1] + ')' : '') + '.') : null,
        impedida ? h('p', { class: 'nota' }, 'En ' + proxima.getUTCFullYear() + ' coincide con ' + r.principal.nombre + ' y no se celebra.') : null),
      h('section', { class: 'seccion' },
        txt && txt.vida ? [h('h2', { class: 'etiqueta' }, 'Su vida'), h('p', { class: 'prosa' }, txt.vida)]
          : h('p', { class: 'nota' }, 'La reseña de esta celebración todavía no fue cargada.'),
        txt ? h('a', { class: 'boton claro', href: '#/oficio/' + L.iso(proxima) + '/lectura/' + mmdd }, 'Rezar su oficio propio') : null),
      h('section', { class: 'seccion', 'aria-labelledby': 'rec' },
        h('h2', { class: 'etiqueta', id: 'rec' }, tx('recordatorio')),
        h('div', { class: 'dos' },
          h('a', { class: 'boton', href: urlGoogle(c), target: '_blank', rel: 'noopener noreferrer' }, tx('google')),
          h('button', { class: 'boton claro', type: 'button', onclick: () => { descargarICS(c); salida.hidden = false; salida.textContent = 'Archivo descargado: ábralo para agregarlo a su calendario.'; } }, 'Apple / Outlook (.ics)')),
        h('p', { class: 'nota' }, 'El aviso llega a las ' + (pref.aviso === 'vispera' ? '19:00 de la víspera' : '7:00 del día') + '. Puede cambiarlo en Ajustes.'),
        salida,
        botonesSuscripcion())
    );
  }
  function proximaFecha(m, d) {
    const hoy = L.hoyLocal();
    let f = L.f(hoy.getUTCFullYear(), m, d);
    if (f < hoy) f = L.f(hoy.getUTCFullYear() + 1, m, d);
    return f;
  }

  // ---------- Recordatorios (sin servidor) ----------
  const compacto = (f) => L.iso(f).replace(/-/g, '');
  function urlGoogle(c) {
    const [m, d] = c.fecha.split('-').map(Number);
    const ini = proximaFecha(m, d);
    const q = new URLSearchParams({
      action: 'TEMPLATE', text: c.nombre, dates: compacto(ini) + '/' + compacto(L.sumar(ini, 1)),
      recur: 'RRULE:FREQ=YEARLY', details: GR[c.grado] + ' · Calendario propio de los Carmelitas Descalzos'
    });
    return 'https://calendar.google.com/calendar/render?' + q.toString();
  }
  function descargarICS(c) {
    const [m, d] = c.fecha.split('-').map(Number);
    const ini = proximaFecha(m, d);
    const esc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,');
    const disparo = pref.aviso === 'vispera' ? '-PT5H' : 'PT7H';
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Liturgia OCD//ES', 'BEGIN:VEVENT',
      'UID:ocd-' + c.fecha + '-' + Date.now() + '@liturgia-ocd',
      'DTSTAMP:' + new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z',
      'DTSTART;VALUE=DATE:' + compacto(ini), 'DTEND;VALUE=DATE:' + compacto(L.sumar(ini, 1)), 'RRULE:FREQ=YEARLY',
      'SUMMARY:' + esc(c.nombre), 'DESCRIPTION:' + esc(GR[c.grado] + ' · Calendario propio OCD'),
      'BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + esc(c.nombre), 'TRIGGER;RELATED=START:' + disparo, 'END:VALARM',
      'END:VEVENT', 'END:VCALENDAR'].join('\r\n') + '\r\n';
    const url = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
    const a = h('a', { href: url, download: 'ocd-' + c.fecha + '.ics' });
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }
  function botonesSuscripcion() {
    const https = location.protocol === 'https:';
    const archivo = pref.pais === 'general' ? 'calendario-ocd.ics' : 'calendario-ocd-' + pref.pais + '.ics';
    return h('div', { class: 'dos' },
      https ? h('a', { class: 'boton punteado', href: 'webcal://' + location.host + location.pathname.replace(/[^/]*$/, '') + archivo }, tx('suscribirme')) : null,
      h('a', { class: 'boton punteado', href: archivo, download: archivo }, tx('descargarIcs')));
  }

  // ---------- Vista: Oficio ----------
  const BENEDICTUS = 'Bendito sea el Señor, Dios de Israel, porque ha visitado y redimido a su pueblo, suscitándonos una fuerza de salvación en la casa de David, su siervo, según lo había predicho desde antiguo por boca de sus santos profetas.\nEs la salvación que nos libra de nuestros enemigos y de la mano de todos los que nos odian; ha realizado así la misericordia que tuvo con nuestros padres, recordando su santa alianza y el juramento que juró a nuestro padre Abraham.\nPara concedernos que, libres de temor, arrancados de la mano de los enemigos, le sirvamos con santidad y justicia, en su presencia, todos nuestros días.\nY a ti, niño, te llamarán profeta del Altísimo, porque irás delante del Señor a preparar sus caminos, anunciando a su pueblo la salvación, el perdón de sus pecados.\nPor la entrañable misericordia de nuestro Dios, nos visitará el sol que nace de lo alto, para iluminar a los que viven en tinieblas y en sombra de muerte, para guiar nuestros pasos por el camino de la paz.';
  const MAGNIFICAT = 'Proclama mi alma la grandeza del Señor, se alegra mi espíritu en Dios, mi Salvador; porque ha mirado la humillación de su esclava.\nDesde ahora me felicitarán todas las generaciones, porque el Poderoso ha hecho obras grandes por mí: su nombre es santo, y su misericordia llega a sus fieles de generación en generación.\nÉl hace proezas con su brazo: dispersa a los soberbios de corazón, derriba del trono a los poderosos y enaltece a los humildes, a los hambrientos los colma de bienes y a los ricos los despide vacíos.\nAuxilia a Israel, su siervo, acordándose de la misericordia, como lo había prometido a nuestros padres, en favor de Abraham y su descendencia por siempre.';
  const GLORIA = 'Gloria al Padre, y al Hijo, y al Espíritu Santo. Como era en el principio, ahora y siempre, por los siglos de los siglos. Amén.';
  const PADRENUESTRO = 'Padre nuestro, que estás en el cielo, santificado sea tu Nombre; venga a nosotros tu reino; hágase tu voluntad en la tierra como en el cielo. Danos hoy nuestro pan de cada día; perdona nuestras ofensas, como también nosotros perdonamos a los que nos ofenden; no nos dejes caer en la tentación, y líbranos del mal.';

  async function vistaOficio(fechaISO, horaId, forzado) {
    const datos = await cargarDatos();
    const fecha = L.desdeISO(fechaISO);
    const r = L.resolver(fecha, datos);
    const hora = HORAS.find((x) => x.id === horaId) || HORAS[1];
    // Desde la ficha de un santo se puede abrir su oficio propio aunque ese día no se celebre.
    const elegido = forzado ? celebracionOCD(forzado)[0] : null;
    const p = elegido ? Object.assign({ origen: 'ocd' }, elegido) : r.principal;
    const propio = p.origen === 'ocd' ? await texto(claveTexto(p)) : null;
    const t = r.tiempo;
    const aleluya = t.clave !== 'cuaresma' && t.clave !== 'santa' && t.clave !== 'triduo';
    const salterio = t.salterio ? 'semana ' + L.romano(t.salterio) + ' del salterio, ' + L.DIAS[L.dow(fecha)] : t.nombre;

    const R = (txt) => h('p', { class: 'rubrica' }, txt);
    const ind = (txt) => h('p', { class: 'indicacion' }, txt);
    const pend = (txt) => h('p', { class: 'pendiente' }, txt);
    const verso = (txt) => {
      const m = txt.match(/^(R\.|V\.|R\/|V\/|Ant\.)\s*(.*)$/);
      return h('p', { class: 'verso' }, m ? [h('b', {}, m[1]), ' ' + m[2]] : txt);
    };
    const parrafos = (txt) => txt.split('\n').map((x) => h('p', {}, x));
    const bloques = (lista) => lista.map((b) => b.t === 'rubrica' ? R(b.x) : b.t === 'fuente' ? h('p', { class: 'fuente' }, b.x)
      : b.t === 'titulo' ? h('h3', {}, b.x) : b.t === 'verso' ? verso(b.x) : h('p', {}, b.x));

    const inicio = (hora.id === 'lectura' || hora.id === 'laudes')
      ? [R('Invitatorio (si es la primera hora del día)'), verso('V. Señor, ábreme los labios.'), verso('R. Y mi boca proclamará tu alabanza.'),
        pend('Salmo invitatorio y antífona: en preparación.'), R('Si no se dijo el invitatorio'),
        verso('V. Dios mío, ven en mi auxilio.'), verso('R. Señor, date prisa en socorrerme.'), h('p', {}, GLORIA + (aleluya ? ' Aleluya.' : ''))]
      : [verso('V. Dios mío, ven en mi auxilio.'), verso('R. Señor, date prisa en socorrerme.'), h('p', {}, GLORIA + (aleluya ? ' Aleluya.' : ''))];
    if (hora.id === 'completas') inicio.push(R('Examen de conciencia'), ind('Se recomienda un breve examen de conciencia en silencio.'));

    const estrofas = (txt) => txt.split(/\n\s*\n/).map((x) => h('p', { class: 'estrofa' }, x));
    const salmo = (s, antExtra) => {
      const ant = s.ant || antExtra;
      return [ant ? verso('Ant. ' + ant) : null, h('h3', {}, s.titulo), s.subtitulo ? h('p', { class: 'fuente centro' }, s.subtitulo) : null,
        ...estrofas(s.texto), s.sinGloria ? null : h('p', {}, GLORIA), ant ? verso('Ant. ' + ant) : null];
    };
    let cuerpo;
    const esDomingo = L.dow(fecha) === 0;
    if (hora.id === 'intermedia') {
      // Salmodia complementaria (válida cualquier día). En solemnidad en domingo: salmo 117 del domingo I.
      const comp = await json('data/salterio/' + pref.idioma + '/complementaria.json');
      const menor = estado.menor || (new Date().getHours() < 12 ? 'tercia' : new Date().getHours() < 15 ? 'sexta' : 'nona');
      const H = comp.horas[menor];
      const elegir = h('div', { class: 'chips', role: 'group', 'aria-label': 'Hora menor' }, Object.entries(comp.horas).map(([k, v]) =>
        h('button', { type: 'button', class: 'chip', 'aria-pressed': String(k === menor), onclick: () => { estado.menor = k; vistaOficio(fechaISO, horaId, forzado); } }, v.nombre)));
      const salmos = (esDomingo && p.grado === 'S') ? comp.domingo_I.salmos : H.salmos;
      cuerpo = [elegir, R('Himno'), ...estrofas(H.himnos[0]),
        R('Salmodia' + (salmos === H.salmos ? ' complementaria' : ' · domingo I')), ...salmos.flatMap((s) => salmo(s))];
    } else if (hora.id === 'laudes' && (p.grado === 'S' || p.grado === 'F' || (esDomingo && t.salterio === 1))) {
      const ld = await json('data/salterio/' + pref.idioma + '/laudes-domingo-1.json');
      const ants = (propio && propio.ant_laudes) || [];
      cuerpo = [R('Himno'), pend('Himno ' + (propio ? (propio.comun ? 'del común' : 'propio') : 'del domingo I') + '. En preparación.'),
        R('Salmodia · domingo I'), ants.length ? null : ind('Antífonas del propio o del común (en preparación).'),
        ...ld.salmos.flatMap((s, i) => salmo(s, ants[i]))];
    } else {
      cuerpo = [R('Himno'), pend('Himno — ' + (propio ? (propio.comun || 'del común') : 'del salterio') + '. En preparación.'),
        R('Salmodia'), pend('Antífonas y salmos — ' + salterio + '. En preparación.')];
    }

    if (hora.id === 'lectura') {
      cuerpo.push(R('Primera lectura'), pend('Lectura bíblica del propio del tiempo. En preparación.'));
      if (propio && propio.lectura && propio.lectura.length) cuerpo.push(...bloques(propio.lectura));
      else cuerpo.push(R('Segunda lectura'), pend('Lectura del propio del tiempo. En preparación.'));
      if (L.dow(fecha) === 0 || p.grado === 'S' || p.grado === 'F') cuerpo.push(R('Te Deum'), pend('Himno Te Deum. En preparación.'));
    } else if (hora.id === 'laudes' || hora.id === 'visperas') {
      const esL = hora.id === 'laudes';
      const ant = propio && (esL ? propio.ant_benedictus : propio.ant_magnificat);
      cuerpo.push(R('Lectura breve y responsorio'), pend('Del ' + (propio ? 'común' : 'salterio') + '. En preparación.'),
        R(esL ? 'Cántico evangélico · Benedictus (Lc 1, 68-79)' : 'Cántico evangélico · Magníficat (Lc 1, 46-55)'),
        ant ? verso('Ant. ' + ant) : ind('Antífona del día (en preparación).'),
        ...parrafos(esL ? BENEDICTUS : MAGNIFICAT), h('p', {}, GLORIA),
        R('Preces'), pend('Preces del día. En preparación.'),
        R('Padre nuestro'), h('p', {}, PADRENUESTRO));
    } else if (hora.id === 'intermedia') {
      cuerpo.push(R('Lectura breve'), pend('Lectura breve y versículo del día. En preparación.'));
    } else {
      cuerpo.push(R('Lectura breve, responsorio y cántico de Simeón'), pend('En preparación.'));
    }

    cuerpo.push(R('Oración'));
    if (propio && propio.oracion && hora.id !== 'completas') cuerpo.push(h('p', {}, propio.oracion), verso('R. Amén.'));
    else cuerpo.push(pend('Oración ' + (hora.id === 'completas' ? 'de Completas' : 'del día') + '. En preparación.'));

    if (hora.id === 'completas') cuerpo.push(R('Bendición'), h('p', {}, 'El Señor todopoderoso nos conceda una noche tranquila y una santa muerte. Amén.'),
      R('Antífona final de la Virgen'), pend('Salve u otra antífona mariana. En preparación.'));
    else if (hora.id === 'laudes' || hora.id === 'visperas') cuerpo.push(R('Conclusión'), h('p', {}, 'El Señor nos bendiga, nos guarde de todo mal y nos lleve a la vida eterna.'), verso('R. Amén.'));

    const herramientas = h('div', { class: 'herramientas' },
      h('button', { class: 'icono-boton borde', type: 'button', 'aria-label': 'Achicar letra', onclick: () => cambiarTexto(-2) }, 'A−'),
      h('button', { class: 'icono-boton borde', type: 'button', 'aria-label': 'Agrandar letra', onclick: () => cambiarTexto(2) }, 'A+'),
      h('button', { class: 'icono-boton borde', type: 'button', 'aria-label': 'Cambiar entre modo claro y oscuro', onclick: alternarTema }, icono('luna')));

    pintar(
      h('div', { class: 'cabecera-simple' },
        h('a', { class: 'icono-boton', href: '#/dia/' + fechaISO, 'aria-label': 'Volver' }, icono('atras')),
        h('h1', {}, hora.nombre, h('span', { class: 'sub' }, mayus(r.fechaTexto))), herramientas),
      h('nav', { class: 'pestanas', 'aria-label': 'Horas' }, HORAS.map((x) =>
        h('a', { href: '#/oficio/' + fechaISO + '/' + x.id + (elegido ? '/' + forzado : ''), 'aria-current': x.id === hora.id ? 'page' : null }, x.nombre))),
      h('article', { class: 'oficio' },
        h('header', {},
          h('span', { class: 'rubrica' }, (p.grado ? GR[p.grado] : t.nombre) + (p.origen === 'ocd' ? ' · Propio OCD' : '')),
          h('h2', {}, p.nombre),
          propio && propio.comun ? h('p', { class: 'indicacion' }, propio.comun) : null,
          elegido && r.principal.nombre !== elegido.nombre ? h('p', { class: 'indicacion' }, 'Ese día la liturgia celebra ' + r.principal.nombre + '. Este oficio propio queda para el rezo privado.') : null),
        ...inicio, ...cuerpo)
    );
  }
  function cambiarTexto(delta) {
    pref.texto = Math.min(28, Math.max(15, pref.texto + delta));
    aplicarPref(pref); guardarPref(pref);
  }
  function alternarTema() {
    const oscuroAhora = pref.tema === 'oscuro' || (pref.tema === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    pref.tema = oscuroAhora ? 'claro' : 'oscuro';
    aplicarPref(pref); guardarPref(pref);
  }

  // ---------- Vista: Ajustes ----------
  async function vistaAjustes() {
    await cargarDatos();
    const rango = h('input', { type: 'range', id: 'tam', min: 15, max: 28, step: 1, value: pref.texto,
      oninput: (e) => { pref.texto = Number(e.target.value); aplicarPref(pref); guardarPref(pref); } });
    const temas = [['auto', 'Automático'], ['claro', 'Claro'], ['oscuro', 'Oscuro']];
    const grupoTema = h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'tema' });
    const grupoAviso = h('div', { class: 'chips', role: 'group', 'aria-labelledby': 'aviso' });
    function render() {
      grupoTema.replaceChildren(...temas.map(([v, n]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(pref.tema === v),
        onclick: () => { pref.tema = v; aplicarPref(pref); guardarPref(pref); render(); } }, n)));
      grupoAviso.replaceChildren(...[['manana', '7:00 del día'], ['vispera', '19:00 de la víspera']].map(([v, n]) => h('button', { type: 'button', class: 'chip', 'aria-pressed': String(pref.aviso === v),
        onclick: () => { pref.aviso = v; guardarPref(pref); render(); } }, n)));
    }
    render();
    pintar(
      cabeceraSimple(tx('ajustes')),
      h('section', { class: 'seccion' },
        h('div', { class: 'ajuste' }, h('label', { for: 'tam' }, 'Tamaño del texto de los oficios'), rango,
          h('p', { class: 'muestra' }, 'Señor, ábreme los labios, y mi boca proclamará tu alabanza.')),
        h('div', { class: 'ajuste' }, h('span', { id: 'tema', class: 'etiqueta' }, 'Apariencia'), grupoTema),
        h('div', { class: 'ajuste' }, h('span', { id: 'aviso', class: 'etiqueta' }, tx('horaRecordatorios')), grupoAviso),
        h('div', { class: 'ajuste' }, h('label', { for: 'pais', class: 'etiqueta' }, tx('pais')),
          h('select', { id: 'pais', class: 'buscar', onchange: async (e) => { pref.pais = e.target.value; guardarPref(pref); await cargarDatos(); } },
            Object.entries(estado.regiones.paises).map(([k, v]) => h('option', { value: k, selected: k === pref.pais }, v.nombre))),
          h('p', { class: 'nota' }, tx('paisNota'))),
        h('div', { class: 'ajuste' }, h('label', { for: 'idioma', class: 'etiqueta' }, tx('idioma')),
          h('select', { id: 'idioma', class: 'buscar', onchange: async (e) => { pref.idioma = e.target.value; guardarPref(pref); await cargarIdioma(); vistaAjustes(); } },
            IDIOMAS.map(([k, n]) => h('option', { value: k, selected: k === pref.idioma }, n))),
          h('p', { class: 'nota' }, tx('idiomaNota')))),
      h('section', { class: 'seccion' },
        h('h2', { class: 'etiqueta' }, tx('privacidad')),
        h('p', { class: 'nota' }, 'Esta app no tiene cuentas, publicidad ni estadísticas. No envía datos personales a ningún lado: sus preferencias quedan solo en este dispositivo.'),
        h('button', { class: 'boton punteado', type: 'button', onclick: () => { try { localStorage.removeItem(PREF); } catch (e) {} pref = leerPref(); aplicarPref(pref); vistaAjustes(); } }, 'Borrar mis preferencias')),
      h('section', { class: 'seccion' },
        h('h2', { class: 'etiqueta' }, tx('acerca')),
        h('p', { class: 'nota' }, 'Calendario: Calendario propio de la Orden de los Hermanos Descalzos de la B. V. M. del Monte Carmelo (Curia General OCD). El cálculo del día sigue las normas universales; ante la duda prevalece el Ordo de la Orden.'),
        h('p', { class: 'nota' }, tx('version') + ' 0.3'))
    );
  }

  // ---------- Comunes ----------
  function cabeceraSimple(titulo, sub) {
    return h('div', { class: 'cabecera-simple' },
      h('a', { class: 'icono-boton', href: '#/hoy', 'aria-label': 'Ir a Hoy' }, icono('atras')),
      h('h1', {}, titulo, sub ? h('span', { class: 'sub' }, sub) : null));
  }
  function noEncontrado() {
    pintar(cabeceraSimple('No encontrado'), h('section', { class: 'seccion' }, h('p', { class: 'nota' }, 'Esa página no existe.'), h('a', { class: 'boton', href: '#/hoy' }, 'Ir a hoy')));
  }
  function marcarSeccion(nombre) {
    for (const a of document.querySelectorAll('.barra a')) {
      if (a.dataset.seccion === nombre) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current');
    }
  }

  // ---------- Rutas ----------
  const ISO = /^\d{4}-\d{2}-\d{2}$/, MMDD = /^\d{2}-\d{2}$/;
  async function rutear() {
    const partes = (location.hash || '#/hoy').replace(/^#\/?/, '').split('/');
    const [v, a, b] = partes;
    try {
      if (!v || v === 'hoy') { marcarSeccion('hoy'); await vistaHoy(); }
      else if (v === 'dia' && ISO.test(a)) { marcarSeccion('hoy'); await vistaHoy(a); }
      else if (v === 'indice') { marcarSeccion('indice'); vistaIndice(); }
      else if (v === 'calendario') { marcarSeccion('calendario'); await vistaCalendario(/^\d{2}$/.test(a || '') ? a : null); }
      else if (v === 'santo' && MMDD.test(a)) { marcarSeccion('calendario'); await vistaSanto(a); }
      else if (v === 'oficio' && ISO.test(a)) { marcarSeccion('hoy'); await vistaOficio(a, b, MMDD.test(partes[3] || '') ? partes[3] : null); }
      else if (v === 'ajustes') { marcarSeccion('ajustes'); await vistaAjustes(); }
      else noEncontrado();
    } catch (e) {
      pintar(h('p', { class: 'aviso' }, 'No se pudieron cargar los datos. Revise la conexión e intente de nuevo.'));
      console.error(e);
    }
  }
  window.addEventListener('hashchange', rutear);
  cargarIdioma().catch(() => {}).then(rutear);

  // ---------- Modo sin conexión ----------
  if ('serviceWorker' in navigator && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  }
})();
