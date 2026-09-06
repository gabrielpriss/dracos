/**
 * Draco's Sur América — recepção dos leads da landing page no CRM
 * ---------------------------------------------------------------------------
 * Planilha: "CRM - Dracos Sur América 2025"
 * https://docs.google.com/spreadsheets/d/1L_Yusjd0V0ng_SPm7Adr0tBUICuTAgLCp59WfPeZ8lw/edit
 *
 * Onde colar: abrir a planilha → Extensões → Apps Script → colar este arquivo →
 * Implantar → Nova implantação → tipo "App da Web" → Executar como: eu →
 * Quem pode acessar: qualquer pessoa. Copiar a URL gerada e colar em
 * CONFIG.endpoint, no arquivo assets/lead-form.js.
 *
 * Cada envio grava em duas abas:
 *
 *   LEADS   formato comercial que a equipe já usa. Preenche as colunas que a
 *           planilha tem (ENTRADA, MÊS, NOME, WHATSAPP, O QUE ESTÁ BUSCANDO,
 *           DISPOSTO A INVESTIR, STATUS, OBSERVAÇÕES, UTM SOURCE/CAMPAIGN/
 *           CONTENT/TERM, DATA DASHBOARD) e cria no fim só PAÍS, MODELO,
 *           PLATAFORMA, GCLID, PÁGINA e ID DO LEAD, se ainda não existirem.
 *
 *   LOG LP  aba técnica criada por este script, com o payload completo do
 *           formulário (fbclid, msclkid, matchtype, rede, dispositivo,
 *           referrer, landing, campanha, grupo). Amarrada à aba LEADS pelo
 *           ID DO LEAD. Grava mesmo quando a gravação comercial falha (com o
 *           erro na coluna STATUS DA GRAVAÇÃO), para nenhum lead se perder.
 */

// ---------------------------------------------------------------- configuração

var TOKEN = 'dracos-lp';        // precisa ser igual ao CONFIG.token do lead-form.js
var ABA = 'LEADS';              // aba comercial; vazio = detecta sozinho
var ABA_LOG = 'LOG LP';         // aba técnica; criada na primeira gravação
var LINHA_CABECALHO = 0;        // 0 = detecta sozinho (procura "NOME" nas 10 primeiras linhas)
var STATUS_INICIAL = 'Não iniciado';   // primeiro status da cadência da Dracos
var STATUS_DUPLICADO = 'Duplicado';
var FUSO = 'America/Sao_Paulo';
var JANELA_DUPLICADO_MIN = 30;  // mesmo WhatsApp dentro desse intervalo = "Duplicado"

var MESES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
             'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

// Cabeçalhos da planilha (normalizados) → campo lógico do lead.
var SINONIMOS = {
  'entrada': 'entrada', 'data': 'entrada', 'datahora': 'entrada',
  'mes': 'mes',
  'nome': 'nome', 'nombre': 'nome',
  'email': 'email',
  'whatsapp': 'telefone', 'celular': 'telefone', 'telefone': 'telefone', 'telefono': 'telefone',
  'oqueestabuscando': 'buscando',
  'dispostoainvestir': 'invertir',
  'empregados': 'empregados',
  'empresa': 'empresa', 'cargo': 'cargo', 'cidade': 'cidade',
  'status': 'status',
  'proximocontato': 'proximocontato',
  'observacoes': 'observacoes',
  'orcamento': 'orcamento',
  'utmsource': 'utm_source', 'utmcampaign': 'utm_campaign',
  'utmcontent': 'utm_content', 'utmterm': 'utm_term', 'utmmedium': 'utm_medium',
  'datadashboard': 'datadashboard',
  // colunas que este script pode criar
  'pais': 'pais',
  'modelo': 'modelo',
  'plataforma': 'plataforma',
  'gclid': 'gclid',
  'pagina': 'pagina',
  'idioma': 'idioma',
  'iddolead': 'id'
};

// Criadas no fim da aba LEADS quando ainda não existem.
var EXTRAS = [
  ['PAÍS', 'pais'],
  ['MODELO', 'modelo'],
  ['PLATAFORMA', 'plataforma'],
  ['GCLID', 'gclid'],
  ['PÁGINA', 'pagina'],
  ['ID DO LEAD', 'id']
];

// Aba técnica: uma coluna por campo, na ordem em que são gravadas.
var LOG_COLUNAS = [
  ['ID DO LEAD', 'id'],
  ['ENVIADO EM', 'enviado_em'],
  ['ENTRADA', 'entrada'],
  ['NOME', 'nome'],
  ['WHATSAPP', 'telefone'],
  ['PAÍS', 'pais'],
  ['IDIOMA', 'idioma'],
  ['BUSCANDO', 'buscando'],
  ['INVERTIR', 'invertir'],
  ['CANTIDAD', 'cantidad'],
  ['MODELO', 'modelo'],
  ['ORIGEM CTA', 'origem_cta'],
  ['PLATAFORMA', 'plataforma'],
  ['TERMO BUSCA', 'termo_busca'],
  ['GRUPO ANUNCIO', 'grupo_anuncio'],
  ['CAMPANHA', 'campanha'],
  ['UTM SOURCE', 'utm_source'],
  ['UTM MEDIUM', 'utm_medium'],
  ['UTM CAMPAIGN', 'utm_campaign'],
  ['UTM CONTENT', 'utm_content'],
  ['UTM TERM', 'utm_term'],
  ['GCLID', 'gclid'],
  ['FBCLID', 'fbclid'],
  ['MSCLKID', 'msclkid'],
  ['MATCHTYPE', 'matchtype'],
  ['NETWORK', 'network'],
  ['DISPOSITIVO', 'dispositivo'],
  ['PAGINA', 'pagina'],
  ['LANDING', 'landing'],
  ['REFERRER', 'referrer'],
  ['LINHA NA ABA LEADS', 'linha_leads'],
  ['STATUS DA GRAVAÇÃO', 'status_gravacao']
];

// ------------------------------------------------------------------- endpoints

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(20000);
  } catch (err) {
    return json({ ok: false, erro: 'ocupado' });
  }
  try {
    var dados = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (TOKEN && dados.token !== TOKEN) return json({ ok: false, erro: 'token' });
    // Honeypot: campo invisível do formulário. Só robô preenche.
    if (dados.website) return json({ ok: true, ignorado: 'spam' });
    if (!dados.nome && !dados.telefone) return json({ ok: false, erro: 'vazio' });

    // O mesmo ID pode chegar duas vezes (retentativa do site, fila de reenvio
    // ou sendBeacon disparado no fechamento da página). Grava uma vez só.
    var repetido = jaGravado(dados.id);
    if (repetido) return json({ ok: true, id: dados.id, linha: repetido.linha, log: repetido.log, repetido: true });

    var r = gravar(dados);
    return json({ ok: true, id: dados.id || '', linha: r.linha, log: r.log });
  } catch (err) {
    console.error(err);
    return json({ ok: false, erro: String(err) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json({ ok: true, servico: "Draco's Sur América — receptor de leads" });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --------------------------------------------------------------------- gravação

/**
 * Grava nas duas abas. A aba técnica recebe a linha mesmo quando a gravação
 * comercial falha: perder lead é o único erro que não pode acontecer.
 */
function gravar(d) {
  var valores = montarValores(d);
  var linha = 0;
  var status = 'ok';

  try {
    linha = gravarLeads(d, valores);
  } catch (err) {
    console.error(err);
    status = 'ERRO na aba ' + (ABA || 'LEADS') + ': ' + String(err);
  }

  var log = 0;
  try {
    log = gravarLog(d, valores, linha, status);
  } catch (err2) {
    console.error(err2);
    if (!linha) throw err2;   // as duas falharam: o site precisa saber
  }

  return { linha: linha, log: log, status: status };
}

function gravarLeads(d, valores) {
  var aba = abaLeads();
  var cabecalhoEm = linhaCabecalho(aba);
  var cabecalhos = aba.getRange(cabecalhoEm, 1, 1, Math.max(aba.getLastColumn(), 1)).getValues()[0];

  var indice = {};
  for (var i = 0; i < cabecalhos.length; i++) {
    var campo = SINONIMOS[normalizar(cabecalhos[i])];
    if (campo && indice[campo] === undefined) indice[campo] = i;
  }

  var largura = cabecalhos.length;
  for (var j = 0; j < EXTRAS.length; j++) {
    var titulo = EXTRAS[j][0], chave = EXTRAS[j][1];
    if (indice[chave] !== undefined) continue;
    if (valores[chave] === undefined || valores[chave] === '') continue;
    largura++;
    aba.getRange(cabecalhoEm, largura).setValue(titulo).setFontWeight('bold');
    indice[chave] = largura - 1;
  }

  var linha = new Array(largura).fill('');
  for (var chave2 in indice) {
    if (valores[chave2] !== undefined) linha[indice[chave2]] = valores[chave2];
  }

  if (indice.status !== undefined && indice.telefone !== undefined && duplicado(aba, cabecalhoEm, indice, d)) {
    linha[indice.status] = STATUS_DUPLICADO;
  }

  var destino = primeiraLinhaLivre(aba, cabecalhoEm, indice);
  aba.getRange(destino, 1, 1, largura).setValues([linha]);
  return destino;
}

function gravarLog(d, valores, linhaLeads, status) {
  var aba = abaLog();
  var dados = {
    id: d.id || '',
    enviado_em: d.enviado_em || '',
    entrada: valores.entrada,
    nome: d.nome || '',
    telefone: d.telefone || '',
    pais: d.pais || '',
    idioma: d.idioma || '',
    buscando: d.buscando || '',
    invertir: d.invertir || '',
    cantidad: d.cantidad || '',
    modelo: d.modelo || '',
    origem_cta: d.origem_cta || '',
    plataforma: d.plataforma || '',
    termo_busca: d.termo_busca || '',
    grupo_anuncio: d.grupo_anuncio || '',
    campanha: d.campanha || '',
    utm_source: d.utm_source || '',
    utm_medium: d.utm_medium || '',
    utm_campaign: d.utm_campaign || '',
    utm_content: d.utm_content || '',
    utm_term: d.utm_term || '',
    gclid: d.gclid || '',
    fbclid: d.fbclid || '',
    msclkid: d.msclkid || '',
    matchtype: d.matchtype || '',
    network: d.network || '',
    dispositivo: d.dispositivo || '',
    pagina: d.pagina || '',
    landing: d.landing || '',
    referrer: d.referrer || '',
    linha_leads: linhaLeads || '',
    status_gravacao: status || ''
  };

  var linha = LOG_COLUNAS.map(function (col) { return dados[col[1]] === undefined ? '' : dados[col[1]]; });
  var destino = aba.getLastRow() + 1;
  aba.getRange(destino, 1, 1, linha.length).setValues([linha]);
  return destino;
}

function montarValores(d) {
  var agora = new Date();

  // O que não tem coluna própria na planilha vai para OBSERVAÇÕES, no mesmo
  // estilo das anotações que a Laila já faz à mão.
  var obs = [];
  if (d.modelo) obs.push('Modelo: ' + d.modelo);
  if (d.cantidad) obs.push('Cantidad: ' + d.cantidad);
  if (d.pais) obs.push('País: ' + d.pais);
  if (d.plataforma) obs.push('Origem: ' + d.plataforma);
  if (d.termo_busca) obs.push('Termo: ' + d.termo_busca);
  if (d.origem_cta) obs.push('CTA: ' + d.origem_cta);

  return {
    // A planilha usa "2026-04-09 03:34:04" na coluna ENTRADA.
    entrada: Utilities.formatDate(agora, FUSO, 'yyyy-MM-dd HH:mm:ss'),
    datadashboard: Utilities.formatDate(agora, FUSO, 'dd/MM/yyyy'),
    mes: MESES[agora.getMonth()] + Utilities.formatDate(agora, FUSO, 'yy'),
    nome: d.nome || '',
    email: d.email || '',
    telefone: d.telefone || '',
    buscando: d.buscando || '',
    invertir: d.invertir || '',
    status: STATUS_INICIAL,
    observacoes: obs.join(' | '),
    pais: d.pais || '',
    modelo: d.modelo || '',
    plataforma: d.plataforma || '',
    utm_source: d.utm_source || '',
    utm_medium: d.utm_medium || '',
    utm_campaign: d.utm_campaign || '',
    utm_content: d.utm_content || '',
    utm_term: d.utm_term || '',
    gclid: d.gclid || '',
    pagina: d.pagina || '',
    idioma: d.idioma || '',
    id: d.id || ''
  };
}

// ------------------------------------------------------------------ auxiliares

/**
 * A planilha tem duas abas de leads: a da LP/WhatsApp e a do ebook (que tem
 * EMPRESA, CARGO e CIDADE, vindas do formulário do Meta). Os leads do site vão
 * para a primeira. Com ABA preenchida, usa a aba nomeada; a detecção fica só
 * como reserva, caso alguém renomeie a aba.
 */
function abaLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ABA) {
    var escolhida = ss.getSheetByName(ABA);
    if (escolhida) return escolhida;
    console.warn('Aba "' + ABA + '" não encontrada; caindo para a detecção automática.');
  }
  var abas = ss.getSheets();
  var reserva = null;
  for (var i = 0; i < abas.length; i++) {
    if (abas[i].getName() === ABA_LOG) continue;
    var linha = linhaCabecalho(abas[i], true);
    if (!linha) continue;
    var campos = camposDoCabecalho(abas[i], linha);
    if (campos.nome === undefined || campos.buscando === undefined) continue;
    if (campos.cargo === undefined) return abas[i];
    if (!reserva) reserva = abas[i];
  }
  if (reserva) return reserva;
  throw new Error('Nenhuma aba de leads encontrada. Preencha a variável ABA.');
}

/** Aba técnica. Criada com cabeçalho em negrito e primeira linha congelada. */
function abaLog() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA_LOG);
  if (aba) return aba;
  aba = ss.insertSheet(ABA_LOG);
  var titulos = LOG_COLUNAS.map(function (col) { return col[0]; });
  aba.getRange(1, 1, 1, titulos.length).setValues([titulos]).setFontWeight('bold');
  aba.setFrozenRows(1);
  aba.getRange(1, 1, 1, titulos.length).setBackground('#efefef');
  return aba;
}

/** Procura o ID nas últimas linhas da aba técnica, para não gravar duas vezes. */
function jaGravado(id) {
  if (!id) return null;
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var aba = ss.getSheetByName(ABA_LOG);
  if (!aba) return null;
  var ultima = aba.getLastRow();
  if (ultima < 2) return null;
  var limite = Math.max(2, ultima - 500);
  var altura = ultima - limite + 1;
  var ids = aba.getRange(limite, 1, altura, 1).getValues();
  var colunaLinha = 0;
  for (var c = 0; c < LOG_COLUNAS.length; c++) if (LOG_COLUNAS[c][1] === 'linha_leads') colunaLinha = c + 1;
  for (var i = ids.length - 1; i >= 0; i--) {
    if (String(ids[i][0]).trim() !== String(id).trim()) continue;
    var linhaLog = limite + i;
    var linhaLeads = colunaLinha ? aba.getRange(linhaLog, colunaLinha).getValue() : '';
    return { log: linhaLog, linha: linhaLeads };
  }
  return null;
}

function camposDoCabecalho(aba, linha) {
  var cabecalhos = aba.getRange(linha, 1, 1, Math.max(aba.getLastColumn(), 1)).getValues()[0];
  var out = {};
  for (var i = 0; i < cabecalhos.length; i++) {
    var campo = SINONIMOS[normalizar(cabecalhos[i])];
    if (campo && out[campo] === undefined) out[campo] = i;
  }
  return out;
}

function linhaCabecalho(aba, silencioso) {
  if (LINHA_CABECALHO) return LINHA_CABECALHO;
  var limite = Math.min(10, aba.getLastRow());
  var largura = Math.max(aba.getLastColumn(), 1);
  if (limite < 1) { if (silencioso) return 0; throw new Error('Aba vazia.'); }
  var bloco = aba.getRange(1, 1, limite, largura).getValues();
  for (var i = 0; i < bloco.length; i++) {
    for (var j = 0; j < bloco[i].length; j++) {
      if (SINONIMOS[normalizar(bloco[i][j])] === 'nome') return i + 1;
    }
  }
  if (silencioso) return 0;
  throw new Error('Cabeçalho não encontrado. Preencha LINHA_CABECALHO.');
}

function primeiraLinhaLivre(aba, cabecalhoEm, indice) {
  var coluna = (indice.nome !== undefined ? indice.nome : 0) + 1;
  var ultima = aba.getLastRow();
  var _col = ultima > cabecalhoEm ? aba.getRange(cabecalhoEm + 1, coluna, ultima - cabecalhoEm, 1).getValues() : [];
  for (var linha = ultima; linha > cabecalhoEm; linha--) {
    if (String(_col[linha - cabecalhoEm - 1][0]).trim() !== '') return linha + 1;
  }
  return cabecalhoEm + 1;
}

function duplicado(aba, cabecalhoEm, indice, d) {
  var digitos = String(d.telefone_digits || d.telefone || '').replace(/\D/g, '');
  if (digitos.length < 8) return false;
  var ultima = aba.getLastRow();
  if (ultima <= cabecalhoEm) return false;
  var limite = Math.max(cabecalhoEm + 1, ultima - 300);
  var altura = ultima - limite + 1;
  var telefones = aba.getRange(limite, indice.telefone + 1, altura, 1).getValues();
  var datas = indice.entrada !== undefined
    ? aba.getRange(limite, indice.entrada + 1, altura, 1).getValues()
    : null;
  // A comparação é feita em texto no fuso da planilha, para não depender do
  // fuso configurado no projeto do Apps Script.
  var corte = Utilities.formatDate(new Date(Date.now() - JANELA_DUPLICADO_MIN * 60000), FUSO, 'yyyy-MM-dd HH:mm:ss');
  for (var i = 0; i < telefones.length; i++) {
    var outro = String(telefones[i][0]).replace(/\D/g, '');
    if (outro.length < 8 || outro.slice(-9) !== digitos.slice(-9)) continue;
    if (!datas) return true;
    var quando = carimbo(datas[i][0]);
    if (!quando || quando >= corte) return true;
  }
  return false;
}

/** Normaliza a data da planilha para "yyyy-MM-dd HH:mm:ss", comparável como texto. */
function carimbo(valor) {
  if (valor instanceof Date) return Utilities.formatDate(valor, FUSO, 'yyyy-MM-dd HH:mm:ss');
  var texto = String(valor || '').trim();
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?/);
  if (iso) return iso[1] + '-' + iso[2] + '-' + iso[3] + ' ' + iso[4] + ':' + iso[5] + ':' + (iso[6] || '00');
  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2})(?::(\d{2}))?)?/);
  if (br) return br[3] + '-' + br[2] + '-' + br[1] + ' ' + (br[4] || '00') + ':' + (br[5] || '00') + ':' + (br[6] || '00');
  return null;
}

function normalizar(valor) {
  return String(valor || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

// ----------------------------------------------------------------- conferência

/**
 * Rodar uma vez no editor para conferir a integração sem depender do site.
 * Depois rodar limparTesteGravacao() para apagar as linhas de teste.
 */
function testarGravacao() {
  var r = gravar({
    id: 'DLF-TESTE-' + Date.now().toString(36).toUpperCase(),
    enviado_em: new Date().toISOString(),
    nome: 'Teste Conceito Prime',
    telefone: '+51 999 000 111',
    telefone_digits: '51999000111',
    pais: 'Perú',
    idioma: 'es',
    buscando: 'Máquina para fabricar ladrillos',
    invertir: 'De S/ 26,000 a S/ 70,000 – Fabrica 2,000 ladrillos/día',
    modelo: 'Súper Económica III',
    plataforma: 'Google Ads - Pesquisa',
    termo_busca: 'maquina para fabricar ladrillos lego',
    grupo_anuncio: 'maquinas-ladrillos',
    campanha: 'rede-de-pesquisa',
    origem_cta: 'Cotizar este modelo',
    utm_source: 'Google', utm_medium: 'cpc',
    utm_campaign: 'rede-de-pesquisa', utm_content: 'maquinas-ladrillos',
    utm_term: 'maquina para fabricar ladrillos lego',
    gclid: 'TESTE-GCLID',
    matchtype: 'e', network: 'g', dispositivo: 'm',
    pagina: '/form/', landing: 'https://maquinas.dracossuramerica.com/form/?utm_source=Google',
    referrer: 'https://www.google.com/'
  });
  Logger.log('Aba "' + abaLeads().getName() + '": linha ' + r.linha +
             ' | Aba "' + ABA_LOG + '": linha ' + r.log + ' | status: ' + r.status);
}

/** Apaga as linhas de teste (ID começando em DLF-TESTE) das duas abas. */
function limparTesteGravacao() {
  var apagadas = { leads: 0, log: 0 };

  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_LOG);
  if (log && log.getLastRow() > 1) {
    var ids = log.getRange(2, 1, log.getLastRow() - 1, 1).getValues();
    for (var i = ids.length - 1; i >= 0; i--) {
      if (String(ids[i][0]).indexOf('DLF-TESTE') === 0) { log.deleteRow(i + 2); apagadas.log++; }
    }
  }

  var aba = abaLeads();
  var cabecalhoEm = linhaCabecalho(aba);
  var campos = camposDoCabecalho(aba, cabecalhoEm);
  if (campos.id !== undefined && aba.getLastRow() > cabecalhoEm) {
    var altura = aba.getLastRow() - cabecalhoEm;
    var col = aba.getRange(cabecalhoEm + 1, campos.id + 1, altura, 1).getValues();
    for (var j = col.length - 1; j >= 0; j--) {
      if (String(col[j][0]).indexOf('DLF-TESTE') === 0) { aba.deleteRow(cabecalhoEm + 1 + j); apagadas.leads++; }
    }
  }

  Logger.log('Linhas de teste apagadas: ' + apagadas.leads + ' em "' + aba.getName() +
             '" e ' + apagadas.log + ' em "' + ABA_LOG + '"');
}

/**
 * Mostra no log qual aba e quais colunas o script vai usar, sem escrever nada.
 */
function conferirMapeamento() {
  var aba = abaLeads();
  var linha = linhaCabecalho(aba);
  Logger.log('Aba comercial: ' + aba.getName() + ' | cabeçalho na linha ' + linha);
  Logger.log(JSON.stringify(camposDoCabecalho(aba, linha), null, 1));

  var log = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ABA_LOG);
  Logger.log('Aba técnica: ' + (log ? log.getName() + ' (já existe, ' + Math.max(0, log.getLastRow() - 1) + ' linhas)'
                                    : ABA_LOG + ' (será criada na primeira gravação)'));
  Logger.log('Colunas da aba técnica: ' + LOG_COLUNAS.map(function (c) { return c[0]; }).join(', '));
}
