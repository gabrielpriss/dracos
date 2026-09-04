/* ==========================================================================
   Draco's Sur América — Formulario de cotización (ES / PT-BR)
   --------------------------------------------------------------------------
   Sustituye el envío directo a WhatsApp por un formulario corto con identidad
   visual de WhatsApp. Al enviar:
     1. registra el lead en el CRM del cliente (Google Sheets vía Apps Script);
     2. dispara el evento `generate_lead` en el dataLayer (GTM-WM4T2Q42);
     3. abre WhatsApp con el resumen de las respuestas ya escrito.

   Configuración: ver CONFIG abajo y apps-script/Codigo.gs.
   ========================================================================== */
(function () {
  'use strict';

  var CONFIG = {
    // URL del Web App de Google Apps Script (ver apps-script/Codigo.gs).
    // Mientras esté vacía, el formulario sigue funcionando y abre WhatsApp,
    // pero el lead NO se escribe en la planilla.
    endpoint: '',
    // Debe coincidir con TOKEN en apps-script/Codigo.gs.
    token: 'dracos-lp',
    whatsapp: '5511981936423',
    // Ventana de atribución de primer toque (días).
    attributionDays: 30
  };

  var IS_PT = (document.documentElement.getAttribute('lang') || '').toLowerCase().indexOf('pt') === 0;

  /* ---------------------------------------------------------------- textos */

  var T = IS_PT ? {
    name: "Draco's Sur América",
    status: 'Online · costuma responder em minutos',
    close: 'Fechar',
    back: 'Voltar',
    q_buscando: 'Olá! 👋 Para te atender melhor: o que você está buscando?',
    q_invertir: 'E quanto você pretende investir na máquina?',
    q_cantidad: 'Quantos tijolos você precisa?',
    q_contato: 'Perfeito! Só falta saber com quem falamos. 😊',
    presets: {
      'Máquina para fabricar ladrillos': 'Quero cotar {x}.',
      'Comprar ladrillos': 'Quero comprar tijolos.',
      'Solo más información': 'Quero mais informações.'
    },
    preset_maquina_generica: 'uma máquina para fabricar tijolos',
    preset_maquina_modelo: 'a {modelo}',
    l_nome: 'Seu nome',
    l_fone: 'WhatsApp (com DDI)',
    l_pais: 'País',
    ph_nome: 'Ex.: João Silva',
    ph_fone: '+55 11 99999 9999',
    ph_pais: 'Selecione seu país',
    submit: 'Enviar e abrir o WhatsApp',
    sending: 'Enviando…',
    legal: 'Ao enviar, você concorda em ser contatado por WhatsApp sobre esta cotação.',
    err_nome: 'Escreva seu nome.',
    err_fone: 'Escreva um WhatsApp válido com DDI.',
    err_pais: 'Selecione seu país.',
    ok_title: 'Recebemos seus dados!',
    ok_text: 'Estamos abrindo o WhatsApp para você falar com a nossa equipe. Se não abrir sozinho, toque no botão abaixo.',
    ok_btn: 'Abrir o WhatsApp',
    // Os valores (v) são os do CRM e não devem mudar: as abas de resumo contam
    // exatamente estas strings. Só os rótulos (l) são traduzidos.
    buscando: [
      { v: 'Máquina para fabricar ladrillos', l: 'Uma máquina para fabricar tijolos' },
      { v: 'Comprar ladrillos', l: 'Comprar tijolos prontos' },
      { v: 'Solo más información', l: 'Só quero mais informações' }
    ],
    invertir: [
      { v: 'Hasta S/ 26,000 – Fabrica 800 ladrillos/día', l: 'Até S/ 26.000 — fabrica 800 tijolos/dia' },
      { v: 'De S/ 26,000 a S/ 70,000 – Fabrica 2,000 ladrillos/día', l: 'De S/ 26.000 a S/ 70.000 — fabrica 2.000 tijolos/dia' },
      { v: 'Más de S/ 70,000 – Personaliza tu fábrica', l: 'Mais de S/ 70.000 — fábrica personalizada' }
    ],
    cantidad: [
      { v: 'Hasta 5,000 ladrillos', l: 'Até 5.000 tijolos' },
      { v: '5,000 a 20,000 ladrillos', l: 'De 5.000 a 20.000 tijolos' },
      { v: 'Más de 20,000 ladrillos', l: 'Mais de 20.000 tijolos' },
      { v: 'Todavía no lo sé', l: 'Ainda não sei' }
    ],
    wa_intro: 'Olá! Sou {nome}, de {pais}.',
    wa_labels: { busca: 'Procuro', modelo: 'Modelo', invertir: 'Investimento', cantidad: 'Quantidade' },
    wa_busca: {
      'Máquina para fabricar ladrillos': 'uma máquina para fabricar tijolos',
      'Comprar ladrillos': 'comprar tijolos',
      'Solo más información': 'mais informações'
    },
    wa_end: 'Enviei meus dados pelo site.'
  } : {
    name: "Draco's Sur América",
    status: 'En línea · suele responder en minutos',
    close: 'Cerrar',
    back: 'Volver',
    q_buscando: '¡Hola! 👋 Para atenderte mejor: ¿qué estás buscando?',
    q_invertir: '¿Y cuánto piensas invertir en la máquina?',
    q_cantidad: '¿Cuántos ladrillos necesitas?',
    q_contato: '¡Listo! Solo falta saber con quién hablamos. 😊',
    presets: {
      'Máquina para fabricar ladrillos': 'Quiero cotizar {x}.',
      'Comprar ladrillos': 'Quiero comprar ladrillos.',
      'Solo más información': 'Quiero más información.'
    },
    preset_maquina_generica: 'una máquina para fabricar ladrillos',
    preset_maquina_modelo: 'la {modelo}',
    l_nome: 'Tu nombre',
    l_fone: 'WhatsApp (con código de país)',
    l_pais: 'País',
    ph_nome: 'Ej.: Carlos Ramírez',
    ph_fone: '+51 999 999 999',
    ph_pais: 'Selecciona tu país',
    submit: 'Enviar y abrir WhatsApp',
    sending: 'Enviando…',
    legal: 'Al enviar, aceptas que te contactemos por WhatsApp sobre esta cotización.',
    err_nome: 'Escribe tu nombre.',
    err_fone: 'Escribe un WhatsApp válido con código de país.',
    err_pais: 'Selecciona tu país.',
    ok_title: '¡Recibimos tus datos!',
    ok_text: 'Estamos abriendo WhatsApp para que hables con nuestro equipo. Si no abre solo, toca el botón de abajo.',
    ok_btn: 'Abrir WhatsApp',
    buscando: [
      { v: 'Máquina para fabricar ladrillos', l: 'Una máquina para fabricar ladrillos' },
      { v: 'Comprar ladrillos', l: 'Comprar ladrillos listos' },
      { v: 'Solo más información', l: 'Solo más información' }
    ],
    invertir: [
      { v: 'Hasta S/ 26,000 – Fabrica 800 ladrillos/día', l: 'Hasta S/ 26,000 — fabrica 800 ladrillos/día' },
      { v: 'De S/ 26,000 a S/ 70,000 – Fabrica 2,000 ladrillos/día', l: 'De S/ 26,000 a S/ 70,000 — fabrica 2,000 ladrillos/día' },
      { v: 'Más de S/ 70,000 – Personaliza tu fábrica', l: 'Más de S/ 70,000 — personaliza tu fábrica' }
    ],
    cantidad: [
      { v: 'Hasta 5,000 ladrillos', l: 'Hasta 5,000 ladrillos' },
      { v: '5,000 a 20,000 ladrillos', l: 'De 5,000 a 20,000 ladrillos' },
      { v: 'Más de 20,000 ladrillos', l: 'Más de 20,000 ladrillos' },
      { v: 'Todavía no lo sé', l: 'Todavía no lo sé' }
    ],
    wa_intro: '¡Hola! Soy {nome}, de {pais}.',
    wa_labels: { busca: 'Busco', modelo: 'Modelo', invertir: 'Inversión', cantidad: 'Cantidad' },
    wa_busca: {
      'Máquina para fabricar ladrillos': 'una máquina para fabricar ladrillos',
      'Comprar ladrillos': 'comprar ladrillos',
      'Solo más información': 'más información'
    },
    wa_end: 'Envié mis datos por el sitio web.'
  };

  var PAISES = [
    'Perú', 'Brasil', 'Bolivia', 'Colombia', 'Ecuador', 'Chile', 'Argentina',
    'Paraguay', 'Uruguay', 'Venezuela', 'México', 'Guatemala', 'Honduras',
    'El Salvador', 'Nicaragua', 'Costa Rica', 'Panamá', 'República Dominicana',
    'Estados Unidos', IS_PT ? 'Outro país' : 'Otro país'
  ];

  var WA_ICON = '<svg viewBox="0 0 448 512" width="20" height="20" fill="currentColor" aria-hidden="true"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zM223.9 438.7c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.4-5-3.8-10.5-6.6z"/></svg>';

  /* ------------------------------------------------------------ utilidades */

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function now() {
    var d = new Date();
    return ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
  }

  function store(key, value) {
    try {
      if (value === undefined) return JSON.parse(localStorage.getItem(key) || 'null');
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) { /* modo privado / storage bloqueado */ }
    return null;
  }

  /* ------------------------------------------------- atribución de tráfico */

  var TRACK_KEYS = [
    'utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'utm_id',
    'gclid', 'gbraid', 'wbraid', 'fbclid', 'msclkid', 'ttclid',
    'keyword', 'matchtype', 'network', 'device', 'placement', 'target',
    'campaignid', 'adgroupid', 'creative', 'adposition', 'loc_physical_ms'
  ];

  // Lee los parámetros de la URL actual (incluidos los ValueTrack de Google Ads).
  function readParams() {
    var out = {};
    var q;
    try { q = new URLSearchParams(window.location.search); } catch (e) { return out; }
    TRACK_KEYS.forEach(function (k) {
      var v = q.get(k);
      if (v) out[k] = String(v).slice(0, 300);
    });
    return out;
  }

  // Atribución: la última visita con parámetros manda y se guarda; la navegación
  // interna (o una vuelta directa) reutiliza la que ya estaba guardada.
  function attribution() {
    var current = readParams();
    var saved = store('dracos_attr');
    var maxAge = CONFIG.attributionDays * 86400000;
    if (saved && saved.ts && Date.now() - saved.ts > maxAge) saved = null;

    if (Object.keys(current).length > 0) {
      saved = {
        ts: Date.now(),
        data: current,
        landing: location.href.slice(0, 500),
        referrer: (document.referrer || '').slice(0, 300)
      };
      store('dracos_attr', saved);
    } else if (!saved) {
      saved = {
        ts: Date.now(),
        data: {},
        landing: location.href.slice(0, 500),
        referrer: (document.referrer || '').slice(0, 300)
      };
      store('dracos_attr', saved);
    }

    var p = saved.data || {};
    var out = {};
    Object.keys(p).forEach(function (k) { out[k] = p[k]; });

    out.plataforma = plataforma(out, saved.referrer);
    out.termo_busca = out.keyword || out.utm_term || '';
    out.grupo_anuncio = out.utm_content || out.adgroupid || '';
    out.campanha = out.utm_campaign || out.campaignid || '';
    out.landing = saved.landing || location.href.slice(0, 500);
    out.referrer = saved.referrer || '';
    out.pagina = location.pathname;
    out.idioma = IS_PT ? 'pt-BR' : 'es';
    return out;
  }

  // Nombre legible de la plataforma. Los valores salen SIEMPRE en portugués,
  // sin importar el idioma de la página, para que el CRM no acumule dos
  // etiquetas distintas para el mismo canal. Laila pidió separar Facebook de
  // Instagram (reunión 11/08/2026).
  function plataforma(p, referrer) {
    var src = (p.utm_source || '').toLowerCase();
    var med = (p.utm_medium || '').toLowerCase();
    var plc = (p.placement || '').toLowerCase();

    if (p.gclid || p.gbraid || p.wbraid || src.indexOf('google') === 0) {
      var net = (p.network || '').toLowerCase();
      if (net === 'd') return 'Google Ads - Display';
      if (net === 'u' || net === 'ytv') return 'Google Ads - YouTube';
      if (net === 's' || net === 'g') return 'Google Ads - Pesquisa';
      if (med.indexOf('cpc') > -1 || p.gclid || p.gbraid || p.wbraid) return 'Google Ads';
      return 'Google Orgânico';
    }
    if (p.msclkid || src.indexOf('bing') > -1) return 'Microsoft Ads';

    var meta = src + ' ' + plc;
    if (p.fbclid || src.indexOf('meta') > -1 || src.indexOf('facebook') > -1 ||
        src.indexOf('instagram') > -1 || src === 'fb' || src === 'ig') {
      if (meta.indexOf('instagram') > -1 || /(^|[^a-z])ig([^a-z]|$)/.test(meta)) return 'Meta - Instagram';
      if (meta.indexOf('facebook') > -1 || /(^|[^a-z])fb([^a-z]|$)/.test(meta)) return 'Meta - Facebook';
      if (meta.indexOf('audience') > -1) return 'Meta - Audience Network';
      if (meta.indexOf('messenger') > -1) return 'Meta - Messenger';
      return 'Meta';
    }
    if (src) return p.utm_source;

    var ref = (referrer || document.referrer || '').toLowerCase();
    if (!ref) return 'Direto';
    if (ref.indexOf('google.') > -1) return 'Google Orgânico';
    if (ref.indexOf('instagram.') > -1) return 'Instagram Orgânico';
    if (ref.indexOf('facebook.') > -1) return 'Facebook Orgânico';
    if (ref.indexOf('youtube.') > -1) return 'YouTube Orgânico';
    if (ref.indexOf(location.hostname) > -1) return 'Direto';
    return 'Referência: ' + ref.replace(/^https?:\/\//, '').split('/')[0];
  }

  /* ------------------------------------------------------------ el widget  */

  var state = null;
  var overlay = null;
  var chat = null;
  var bar = null;

  function build() {
    overlay = document.createElement('div');
    overlay.id = 'dlf-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', T.name);
    overlay.innerHTML =
      '<div class="dlf-panel">' +
        '<div class="dlf-head">' +
          '<div class="dlf-avatar"><img src="/images/logo.png" alt="" /></div>' +
          '<div class="dlf-head-txt">' +
            '<div class="dlf-head-name">' + esc(T.name) + '</div>' +
            '<div class="dlf-head-status"><span class="dlf-dot"></span>' + esc(T.status) + '</div>' +
          '</div>' +
          '<button type="button" class="dlf-close" aria-label="' + esc(T.close) + '">' +
            '<svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M5 5l10 10M15 5L5 15"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="dlf-progress"><div class="dlf-progress-bar"></div></div>' +
        '<div class="dlf-chat" id="dlf-chat"></div>' +
      '</div>';
    document.body.appendChild(overlay);

    chat = overlay.querySelector('#dlf-chat');
    bar = overlay.querySelector('.dlf-progress-bar');

    overlay.querySelector('.dlf-close').addEventListener('click', close);
    overlay.addEventListener('mousedown', function (e) { if (e.target === overlay) close(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('dlf-visible')) close();
    });
  }

  function say(html, out) {
    var row = document.createElement('div');
    row.className = 'dlf-row' + (out ? ' dlf-out' : '');
    row.innerHTML = '<div class="dlf-bubble ' + (out ? 'dlf-out-bubble' : 'dlf-in-bubble') + '">' +
      html + '<span class="dlf-time">' + now() + '</span></div>';
    chat.appendChild(row);
    scroll();
    return row;
  }

  function typing(cb) {
    var row = document.createElement('div');
    row.className = 'dlf-row';
    row.innerHTML = '<div class="dlf-bubble dlf-in-bubble"><span class="dlf-typing"><span></span><span></span><span></span></span></div>';
    chat.appendChild(row);
    scroll();
    setTimeout(function () { row.remove(); cb(); }, 420);
  }

  function options(list, onPick) {
    var box = document.createElement('div');
    box.className = 'dlf-options';
    list.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'dlf-opt';
      b.textContent = o.l;
      b.addEventListener('click', function () {
        box.remove();
        say(esc(o.l), true);
        onPick(o);
      });
      box.appendChild(b);
    });
    if (state.history.length > 1) {
      var back = document.createElement('button');
      back.type = 'button';
      back.className = 'dlf-back';
      back.textContent = '↩ ' + T.back;
      back.addEventListener('click', undo);
      box.appendChild(back);
    }
    chat.appendChild(box);
    scroll();
  }

  function scroll() {
    requestAnimationFrame(function () { chat.scrollTop = chat.scrollHeight; });
  }

  function progress(step, total) {
    bar.style.width = Math.round((step / total) * 100) + '%';
  }

  /* ------------------------------------------------------------ el guion   */

  function open(opts) {
    opts = opts || {};
    state = {
      buscando: opts.buscando || '',
      modelo: opts.modelo || '',
      invertir: '',
      cantidad: '',
      origen: opts.origen || '',
      history: [],
      total: 3,
      step: 0
    };

    if (!overlay) build();
    chat.innerHTML = '';
    progress(0, state.total);

    overlay.classList.add('dlf-visible');
    requestAnimationFrame(function () { overlay.classList.add('dlf-in'); });
    document.documentElement.style.overflow = 'hidden';

    push({
      event: 'lead_form_open',
      form_buscando: state.buscando || 'sin_definir',
      form_modelo: state.modelo || '',
      form_origen: state.origen
    });

    if (state.buscando) {
      // Vino de un CTA de modelo/sección: la primera pregunta ya está respondida.
      state.history.push({
        fn: askBuscando,
        snapshot: '',
        data: { buscando: '', modelo: '', invertir: '', cantidad: '', step: 0 }
      });
      var frase = T.presets[state.buscando] || T.presets['Solo más información'];
      if (frase.indexOf('{x}') > -1) {
        frase = frase.replace('{x}', state.modelo
          ? T.preset_maquina_modelo.replace('{modelo}', state.modelo)
          : T.preset_maquina_generica);
      }
      say(esc(frase), true);
      state.step = 1;
      progress(1, state.total);
      depoisDeBuscando();
    } else {
      askBuscando();
    }
  }

  function close() {
    if (!overlay) return;
    overlay.classList.remove('dlf-in');
    document.documentElement.style.overflow = '';
    setTimeout(function () { overlay.classList.remove('dlf-visible'); }, 220);
  }

  // Cada pregunta guarda el estado del chat ANTES de formularse, para poder volver.
  function checkpoint(fn) {
    state.history.push({
      fn: fn,
      snapshot: chat.innerHTML,
      data: {
        buscando: state.buscando, modelo: state.modelo,
        invertir: state.invertir, cantidad: state.cantidad, step: state.step
      }
    });
  }

  function undo() {
    state.history.pop();                 // descarta la pregunta actual
    var prev = state.history.pop();      // vuelve a la anterior
    if (!prev) return;
    chat.innerHTML = prev.snapshot;
    Object.keys(prev.data).forEach(function (k) { state[k] = prev.data[k]; });
    progress(state.step, state.total);
    prev.fn();
  }

  function ask(fn, question, list, onPick) {
    checkpoint(fn);
    typing(function () {
      say(esc(question));
      options(list, onPick);
    });
  }

  function askBuscando() {
    ask(askBuscando, T.q_buscando, T.buscando, function (o) {
      state.buscando = o.v;
      state.step = 1;
      progress(1, state.total);
      depoisDeBuscando();
    });
  }

  // Solo el camino de la máquina recibe la pregunta de inversión — es la que el
  // CRM ya usa para calificar. Quien pide "solo más información" va directo al
  // contacto: la Laila pidió el camino más corto posible.
  function depoisDeBuscando() {
    if (state.buscando === 'Máquina para fabricar ladrillos') askInvertir();
    else if (state.buscando === 'Comprar ladrillos') askCantidad();
    else { state.step = 2; progress(2, state.total); askContacto(); }
  }

  function askInvertir() {
    ask(askInvertir, T.q_invertir, T.invertir, function (o) {
      state.invertir = o.v;
      state.step = 2;
      progress(2, state.total);
      askContacto();
    });
  }

  function askCantidad() {
    ask(askCantidad, T.q_cantidad, T.cantidad, function (o) {
      state.cantidad = o.v;
      state.step = 2;
      progress(2, state.total);
      askContacto();
    });
  }

  function askContacto() {
    checkpoint(askContacto);
    typing(function () {
      say(esc(T.q_contato));

      var box = document.createElement('div');
      box.className = 'dlf-options';
      box.innerHTML =
        '<form class="dlf-form" novalidate>' +
          '<div class="dlf-field">' +
            '<label class="dlf-label" for="dlf-nome">' + esc(T.l_nome) + '</label>' +
            '<input class="dlf-input" id="dlf-nome" name="nome" type="text" autocomplete="name" placeholder="' + esc(T.ph_nome) + '" />' +
          '</div>' +
          '<div class="dlf-field">' +
            '<label class="dlf-label" for="dlf-fone">' + esc(T.l_fone) + '</label>' +
            '<input class="dlf-input" id="dlf-fone" name="fone" type="tel" inputmode="tel" autocomplete="tel" placeholder="' + esc(T.ph_fone) + '" />' +
          '</div>' +
          '<div class="dlf-field">' +
            '<label class="dlf-label" for="dlf-pais">' + esc(T.l_pais) + '</label>' +
            '<select class="dlf-input" id="dlf-pais" name="pais">' +
              '<option value="">' + esc(T.ph_pais) + '</option>' +
              PAISES.map(function (p) { return '<option value="' + esc(p) + '">' + esc(p) + '</option>'; }).join('') +
            '</select>' +
          '</div>' +
          '<p class="dlf-msg" id="dlf-msg"></p>' +
          '<button type="submit" class="dlf-submit">' + WA_ICON + '<span>' + esc(T.submit) + '</span></button>' +
          '<p class="dlf-legal">' + esc(T.legal) + '</p>' +
        '</form>' +
        '<button type="button" class="dlf-back">↩ ' + esc(T.back) + '</button>';

      chat.appendChild(box);
      scroll();
      box.querySelector('.dlf-back').addEventListener('click', undo);
      box.querySelector('form').addEventListener('submit', function (e) {
        e.preventDefault();
        submit(box);
      });
    });
  }

  /* ------------------------------------------------------------- el envío  */

  function submit(box) {
    var nome = box.querySelector('#dlf-nome');
    var fone = box.querySelector('#dlf-fone');
    var pais = box.querySelector('#dlf-pais');
    var msg = box.querySelector('#dlf-msg');
    var btn = box.querySelector('.dlf-submit');

    [nome, fone, pais].forEach(function (f) { f.classList.remove('dlf-error'); });
    msg.textContent = '';

    var digits = (fone.value || '').replace(/\D/g, '');
    if (!nome.value.trim() || nome.value.trim().length < 2) {
      nome.classList.add('dlf-error'); msg.textContent = T.err_nome; nome.focus(); return;
    }
    if (digits.length < 8 || digits.length > 15) {
      fone.classList.add('dlf-error'); msg.textContent = T.err_fone; fone.focus(); return;
    }
    if (!pais.value) {
      pais.classList.add('dlf-error'); msg.textContent = T.err_pais; pais.focus(); return;
    }

    btn.disabled = true;
    btn.querySelector('span').textContent = T.sending;

    var attr = attribution();
    var lead = {
      token: CONFIG.token,
      id: 'DLF-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).slice(2, 6).toUpperCase(),
      nome: nome.value.trim(),
      telefone: fone.value.trim(),
      telefone_digits: digits,
      pais: pais.value,
      idioma: attr.idioma,
      // Valores canónicos del CRM (no traducir: las abas de resumen los cuentan).
      buscando: state.buscando,
      invertir: state.invertir,
      cantidad: state.cantidad,
      modelo: state.modelo,
      origem_cta: state.origen,
      plataforma: attr.plataforma,
      termo_busca: attr.termo_busca,
      grupo_anuncio: attr.grupo_anuncio,
      campanha: attr.campanha,
      utm_source: attr.utm_source || '',
      utm_medium: attr.utm_medium || '',
      utm_campaign: attr.utm_campaign || '',
      utm_content: attr.utm_content || '',
      utm_term: attr.termo_busca,
      gclid: attr.gclid || attr.gbraid || attr.wbraid || '',
      fbclid: attr.fbclid || '',
      msclkid: attr.msclkid || '',
      matchtype: attr.matchtype || '',
      network: attr.network || '',
      dispositivo: attr.device || '',
      pagina: attr.pagina,
      landing: attr.landing,
      referrer: attr.referrer,
      enviado_em: new Date().toISOString()
    };

    send(lead);

    push({
      event: 'generate_lead',
      lead_id: lead.id,
      form_buscando: lead.buscando,
      form_modelo: lead.modelo,
      form_invertir: lead.invertir,
      form_cantidad: lead.cantidad,
      form_pais: lead.pais,
      form_plataforma: lead.plataforma,
      form_termo_busca: lead.termo_busca,
      form_grupo_anuncio: lead.grupo_anuncio,
      form_campanha: lead.campanha
    });

    var url = waUrl(lead);
    success(url);
    openWhats(url);
  }

  function send(lead) {
    if (!CONFIG.endpoint) {
      if (window.console) console.warn('[Draco\'s] CONFIG.endpoint vacío: el lead no se envió al CRM.', lead);
      return;
    }
    var body = JSON.stringify(lead);
    // text/plain evita el preflight CORS que Apps Script no responde.
    try {
      if (navigator.sendBeacon && navigator.sendBeacon(CONFIG.endpoint, new Blob([body], { type: 'text/plain;charset=UTF-8' }))) return;
    } catch (e) { /* sigue al fetch */ }
    try {
      fetch(CONFIG.endpoint, {
        method: 'POST',
        mode: 'no-cors',
        keepalive: true,
        headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
        body: body
      })['catch'](function () {});
    } catch (e) { /* sin red: el lead sigue llegando por WhatsApp */ }
  }

  function waUrl(lead) {
    var L = T.wa_labels;
    var parts = [T.wa_intro.replace('{nome}', lead.nome).replace('{pais}', lead.pais)];
    parts.push(L.busca + ': ' + (T.wa_busca[lead.buscando] || lead.buscando) + '.');
    if (lead.modelo) parts.push(L.modelo + ': ' + lead.modelo + '.');
    if (lead.invertir) parts.push(L.invertir + ': ' + lead.invertir + '.');
    if (lead.cantidad) parts.push(L.cantidad + ': ' + lead.cantidad + '.');
    parts.push(T.wa_end);
    return 'https://wa.me/' + CONFIG.whatsapp + '?text=' + encodeURIComponent(parts.join(' '));
  }

  function openWhats(url) {
    push({ event: 'whatsapp_click', wa_location: 'formulario', wa_href: url });
    var w = null;
    try { w = window.open(url, '_blank', 'noopener'); } catch (e) { /* bloqueado */ }
    if (!w) setTimeout(function () { window.location.href = url; }, 900);
  }

  function success(url) {
    chat.innerHTML = '';
    progress(state.total, state.total);
    var box = document.createElement('div');
    box.className = 'dlf-success';
    box.innerHTML =
      '<div class="dlf-success-icon">' +
        '<svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 12.5l5 5L20 6.5"/></svg>' +
      '</div>' +
      '<p style="font-family:Archivo,system-ui,sans-serif;font-weight:800;font-size:18px;color:#211b10">' + esc(T.ok_title) + '</p>' +
      '<p style="margin-top:6px;font-size:14px;line-height:1.5;color:rgba(33,27,16,.62)">' + esc(T.ok_text) + '</p>' +
      '<a class="dlf-submit" style="margin-top:16px;text-decoration:none" href="' + esc(url) + '" target="_blank" rel="noopener">' + WA_ICON + '<span>' + esc(T.ok_btn) + '</span></a>';
    chat.appendChild(box);
    scroll();
  }

  function push(obj) {
    window.dataLayer = window.dataLayer || [];
    try { window.dataLayer.push(obj); } catch (e) { /* noop */ }
  }

  /* ------------------------------------ intercepta los CTA de WhatsApp ---- */

  function init() {
    document.addEventListener('click', function (e) {
      var a = e.target.closest('a[href*="wa.me"], a[href*="api.whatsapp.com"]');
      if (!a || a.hasAttribute('data-wa-direct')) return;
      e.preventDefault();
      e.stopPropagation();
      open({
        buscando: a.getAttribute('data-lead-buscando') || '',
        modelo: a.getAttribute('data-lead-modelo') || '',
        origen: a.getAttribute('data-lead-origen') || a.getAttribute('aria-label') || (a.textContent || '').trim().slice(0, 60) || 'link'
      });
    }, true);

    // Guarda la atribución en la primera carga, aunque no se abra el formulario.
    attribution();

    // Permite abrir el formulario desde cualquier parte: dracosLeadForm.open({...})
    window.dracosLeadForm = { open: open, close: close, config: CONFIG };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
