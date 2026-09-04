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
 * O script escreve nas colunas que a planilha JÁ tem (ENTRADA, MÊS, NOME,
 * WHATSAPP, O QUE ESTÁ BUSCANDO, DISPOSTO A INVESTIR, STATUS, OBSERVAÇÕES,
 * UTM SOURCE/CAMPAIGN/CONTENT/TERM, DATA DASHBOARD) e cria no fim só as poucas
 * que ainda não existem (PAÍS, MODELO, PLATAFORMA, GCLID, PÁGINA, ID DO LEAD).
 */

// ---------------------------------------------------------------- configuração

var TOKEN = 'dracos-lp';        // precisa ser igual ao CONFIG.token do lead-form.js
var ABA = '';                   // nome da aba de leads; vazio = detecta sozinho
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

// Criadas no fim da aba quando ainda não existem.
var EXTRAS = [
  ['PAÍS', 'pais'],
  ['MODELO', 'modelo'],
  ['PLATAFORMA', 'plataforma'],
  ['GCLID', 'gclid'],
  ['PÁGINA', 'pagina'],
  ['ID DO LEAD', 'id']
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
    if (!dados.nome && !dados.telefone) return json({ ok: false, erro: 'vazio' });
    var linha = gravar(dados);
    return json({ ok: true, linha: linha });
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

function gravar(d) {
  var aba = abaLeads();
  var cabecalhoEm = linhaCabecalho(aba);
  var cabecalhos = aba.getRange(cabecalhoEm, 1, 1, Math.max(aba.getLastColumn(), 1)).getValues()[0];

  var valores = montarValores(d);

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
 * para a primeira, então descartamos a que tem CARGO.
 */
function abaLeads() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ABA) {
    var escolhida = ss.getSheetByName(ABA);
    if (escolhida) return escolhida;
    throw new Error('Aba "' + ABA + '" não encontrada.');
  }
  var abas = ss.getSheets();
  var reserva = null;
  for (var i = 0; i < abas.length; i++) {
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
  for (var linha = ultima; linha > cabecalhoEm; linha--) {
    if (String(aba.getRange(linha, coluna).getValue()).trim() !== '') return linha + 1;
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
  var corte = Date.now() - JANELA_DUPLICADO_MIN * 60000;
  for (var i = 0; i < telefones.length; i++) {
    var outro = String(telefones[i][0]).replace(/\D/g, '');
    if (outro.length < 8 || outro.slice(-9) !== digitos.slice(-9)) continue;
    if (!datas) return true;
    var quando = paraData(datas[i][0]);
    if (!quando || quando.getTime() >= corte) return true;
  }
  return false;
}

function paraData(valor) {
  if (valor instanceof Date) return valor;
  var texto = String(valor || '').trim();
  var iso = texto.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):?(\d{2})?/);
  if (iso) return new Date(+iso[1], +iso[2] - 1, +iso[3], +iso[4], +iso[5], +(iso[6] || 0));
  var br = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})[ T]?(\d{2})?:?(\d{2})?:?(\d{2})?/);
  if (br) return new Date(+br[3], +br[2] - 1, +br[1], +(br[4] || 0), +(br[5] || 0), +(br[6] || 0));
  return null;
}

function normalizar(valor) {
  return String(valor || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Rodar uma vez no editor para conferir a integração sem depender do site.
 * Depois é só apagar a linha de teste da planilha.
 */
function testarGravacao() {
  var linha = gravar({
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
    origem_cta: 'Cotizar este modelo',
    utm_source: 'Google', utm_medium: 'cpc',
    utm_campaign: 'rede-de-pesquisa', utm_content: 'maquinas-ladrillos',
    utm_term: 'maquina para fabricar ladrillos lego',
    gclid: 'TESTE-GCLID',
    pagina: '/', id: 'DLF-TESTE'
  });
  Logger.log('Gravado na linha ' + linha + ' da aba "' + abaLeads().getName() + '"');
}

/**
 * Mostra no log qual aba e quais colunas o script vai usar. Rodar antes do
 * testarGravacao() se quiser conferir sem escrever nada.
 */
function conferirMapeamento() {
  var aba = abaLeads();
  var linha = linhaCabecalho(aba);
  Logger.log('Aba: ' + aba.getName() + ' | cabeçalho na linha ' + linha);
  Logger.log(JSON.stringify(camposDoCabecalho(aba, linha), null, 1));
}
