/**
 * Prepara a LP principal e gera as páginas /form/ e /form/pt/ a partir dela.
 *
 *   node build-form.mjs
 *
 * Desde 27/09/2026 nenhum CTA da LP vai direto para o WhatsApp: tanto a raiz
 * (maquinas.dracossuramerica.com/ e /pt/) quanto /form abrem o formulário de
 * cotação, que grava no CRM e só depois abre a conversa. Por isso o script faz
 * duas coisas:
 *
 *   1. na raiz (index.html e pt/index.html), marca cada CTA de WhatsApp com a
 *      resposta pronta, remove o whatsapp_click antigo e inclui o CSS/JS do
 *      formulário. É idempotente: rodar de novo não duplica nada;
 *   2. gera /form a partir da raiz, só trocando caminhos, canonical e noindex.
 *
 * Sempre que a LP principal mudar, rode este script de novo para as versões não
 * se descolarem. Não edite form/index.html à mão.
 */
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = dirname(fileURLToPath(import.meta.url));
const BASE = 'https://maquinas.dracossuramerica.com';

/** CTA → resposta já preenchida no formulário. Os valores de `buscando` são os
 *  do CRM (aba de resumo conta exatamente estas strings) e não devem mudar. */
const REGRAS = [
  [/prensa s[uú]per econ[oôó]mica iii\./, 'maquina', 'S III'],
  [/prensa s[uú]per econ[oôó]mica ii\./, 'maquina', 'S II'],
  [/prensa s[uú]per econ[oôó]mica i\./, 'maquina', 'S I'],
  [/prensa premium vi\./, 'maquina', 'Premium VI'],
  [/prensa premium iv\./, 'maquina', 'Premium IV'],
  [/prensa premium ii\./, 'maquina', 'Premium II'],
  [/equipos auxiliares|equipamentos auxiliares/, 'maquina', 'AUX'],
  [/l[ií]nea s[uú]per econ[oôó]mica\.|linha s[uú]per econ[oôó]mica\./, 'maquina', 'LINEA S'],
  [/l[ií]nea premium\.|linha premium\./, 'maquina', 'LINEA P'],
  [/no s[eé] si me conviene|n[aã]o sei se a linha/, 'maquina', ''],
  [/modelos de ladrillo|modelos de tijolo/, 'maquina', ''],
  [/precios de ladrillos|pre[cç]os de tijolos/, 'ladrillos', ''],
  // O serviço de construção não é um dos 3 valores do CRM: abre o formulário
  // sem resposta pronta e a origem fica registrada nas observações.
  [/servicio de construcci[oó]n|servi[cç]o de constru[cç][aã]o/, 'obra', ''],
  [/asesor[ií]a inicial|consultoria inicial/, 'maquina', ''],
  [/montar mi producci[oó]n|montar minha produ[cç][aã]o/, 'maquina', ''],
  [/m[aá]quina/, 'maquina', ''],
];

const MODELOS = {
  es: {
    'S I': 'Súper Económica I', 'S II': 'Súper Económica II', 'S III': 'Súper Económica III',
    'Premium II': 'Premium II', 'Premium IV': 'Premium IV', 'Premium VI': 'Premium VI',
    AUX: 'Equipos auxiliares', 'LINEA S': 'Línea Súper Económica', 'LINEA P': 'Línea Premium',
  },
  pt: {
    'S I': 'Súper Econômica I', 'S II': 'Súper Econômica II', 'S III': 'Súper Econômica III',
    'Premium II': 'Premium II', 'Premium IV': 'Premium IV', 'Premium VI': 'Premium VI',
    AUX: 'Equipamentos auxiliares', 'LINEA S': 'Linha Súper Econômica', 'LINEA P': 'Linha Premium',
  },
};

const BUSCANDO = {
  maquina: 'Máquina para fabricar ladrillos',
  ladrillos: 'Comprar ladrillos',
};

const ORIGEM_OBRA = { es: 'Servicio de construcción', pt: 'Serviço de construção' };

const PAGINAS = [
  { origem: 'index.html', destino: 'form/index.html', lang: 'es', url: `${BASE}/form/` },
  { origem: 'pt/index.html', destino: 'form/pt/index.html', lang: 'pt', url: `${BASE}/form/pt/` },
];

function classificar(texto, lang) {
  const t = texto.toLowerCase();
  for (const [padrao, alvo, chave] of REGRAS) {
    if (padrao.test(t)) return { alvo, modelo: MODELOS[lang][chave] || '' };
  }
  return { alvo: '', modelo: '' };
}

/** Passos que valem para a raiz e para /form: CTA abre o formulário. */
function prepararHome(html, lang) {
  let s = html;

  // Cada CTA de WhatsApp abre o formulário, com a resposta já preenchida.
  let marcados = 0;
  s = s.replace(/<a\s[^>]*href="(https:\/\/wa\.me\/[^"]*)"[^>]*>/g, (tag, href) => {
    if (tag.includes('data-lead-')) return tag;
    const bruto = href.includes('?text=') ? href.split('?text=')[1] : '';
    const texto = decodeURIComponent(bruto);
    const { alvo, modelo } = classificar(texto, lang);
    if (!alvo) return tag;
    let extra = alvo === 'obra'
      ? ` data-lead-origen="${ORIGEM_OBRA[lang]}"`
      : ` data-lead-buscando="${BUSCANDO[alvo]}"`;
    if (modelo) extra += ` data-lead-modelo="${modelo}"`;
    marcados++;
    return tag.slice(0, -1) + extra + '>';
  });

  // O whatsapp_click antigo disparava em qualquer clique de link. Agora quem
  // dispara é o formulário, no momento em que o WhatsApp abre de fato.
  s = s.replace(/\n    \/\/ Rastreamento de cliques no WhatsApp[\s\S]*?\n    \}\)\(\);\n/, '\n');

  // Assets do formulário (caminho absoluto: serve para a raiz e para /form).
  if (!s.includes('/assets/lead-form.css')) {
    s = s.replace('  <style>\n', '  <link rel="stylesheet" href="/assets/lead-form.css" />\n\n  <style>\n');
  }
  if (!s.includes('/assets/lead-form.js')) {
    s = s.replace('</body>', '  <script src="/assets/lead-form.js" defer></script>\n</body>');
  }

  return { html: s, marcados };
}

function transformar(html, { lang, url }) {
  let s = html;

  // Caminhos absolutos: /form/ e /form/pt/ estão em outra profundidade.
  s = s.replace(/(src|href)="images\//g, '$1="/images/');
  s = s.replace(/(src|href)="\.\.\/images\//g, '$1="/images/');

  // Página de campanha: fora do índice, para não competir com a LP principal.
  s = s.replace('  <title>', '  <meta name="robots" content="noindex,follow" />\n  <title>');
  s = s.replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${url}" />`);
  s = s.replace(/\n  <link rel="alternate" hreflang="[^"]*" href="[^"]*" \/>/g, '');
  s = s.replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${url}" />`);
  s = s.replace(/\n  <script type="application\/ld\+json">[\s\S]*?<\/script>\n/, '\n');

  // O seletor de idioma continua dentro de /form.
  s = lang === 'es'
    ? s.replace('href="/pt/" id="lang-to-pt"', 'href="/form/pt/" id="lang-to-pt"')
    : s.replace('href="/" id="lang-to-es"', 'href="/form/" id="lang-to-es"');

  return { html: s };
}

for (const pagina of PAGINAS) {
  const original = await readFile(join(raiz, pagina.origem), 'utf8');
  const { html: home, marcados } = prepararHome(original, pagina.lang);
  if (home !== original) await writeFile(join(raiz, pagina.origem), home, 'utf8');

  const { html } = transformar(home, pagina);
  await mkdir(dirname(join(raiz, pagina.destino)), { recursive: true });
  await writeFile(join(raiz, pagina.destino), html, 'utf8');

  const total = (home.match(/href="https:\/\/wa\.me\//g) || []).length;
  const comResposta = (home.match(/<a\s[^>]*href="https:\/\/wa\.me\/[^"]*"[^>]*data-lead-/g) || []).length;
  console.log(`${pagina.origem} e ${pagina.destino}: ${comResposta}/${total} CTAs com resposta pronta (${marcados} marcados agora)`);
}

console.log('\nPronto. Raiz e /form abrem o formulário em todos os CTAs de WhatsApp.');
