# Formulário de cotação da LP Dracos

A LP existe agora em **duas versões**, no mesmo domínio:

| URL | CTAs vão para | Uso |
| --- | --- | --- |
| `maquinas.dracossuramerica.com/` · `/pt/` | **WhatsApp direto** | página principal, indexada |
| `maquinas.dracossuramerica.com/form/` · `/form/pt/` | **formulário** → CRM → WhatsApp | destino das campanhas de Google e Meta |

Mesmo conteúdo, mesma copy, mesmas imagens — muda só o destino do clique. A
versão `/form` é `noindex,follow` e fica fora do sitemap, para não competir com a
principal na busca orgânica. A coluna **PÁGINA** no CRM grava `/form/` ou
`/form/pt/`, então dá para comparar as duas na planilha.

> **As páginas de `/form` são geradas, não editadas à mão.** Alterou a LP
> principal? Rode `node build-form.mjs` para as duas versões não se descolarem.

O formulário atende a decisão da reunião de **11/08/2026** com a Laila
([transcrição, min. 26](https://app.tactiq.io/api/2/u/m/r/WeXKomZZchy9g6DIS27a?o=mcp&t=1578)),
gravando na planilha [CRM - Dracos Sur América 2025](https://docs.google.com/spreadsheets/d/1L_Yusjd0V0ng_SPm7Adr0tBUICuTAgLCp59WfPeZ8lw/edit).

| Combinado com a Laila | Como ficou |
| --- | --- |
| "aplicação do formulário para que quando o pessoal clicar ele caia no formulário antes, caia direto no teu CRM" | Em `/form`, os 24 CTAs de WhatsApp abrem o formulário; ao enviar, o lead vai para a planilha **e** o WhatsApp abre com o resumo escrito |
| "formulário bem gente boa… não é aquele formulário chato" | No máximo 2 toques + nome, WhatsApp e país. Quem clica num modelo responde 1 toque só |
| "monte de pergunta… que não é da sua conta, que importa quantos funcionários eu tenho" | A coluna **EMPREGADOS** ficou de fora |
| "tem a opção do WhatsApp e também é mais rápido" | O WhatsApp continua abrindo no fim — o formulário antecede a conversa, não a substitui |
| "importante ver quais que são do Google" / "identificar se veio do Facebook ou do Instagram" | Coluna **PLATAFORMA** preenchida sozinha: `Google Ads - Pesquisa`, `Meta - Instagram`, `Meta - Facebook` |

## As perguntas são as que o CRM já usa

Tiradas direto das colunas e das abas de resumo da planilha — **os valores
gravados são idênticos aos que já estão lá**, então as abas de resumo continuam
contando sem precisar de fórmula nova.

**1. O QUE ESTÁ BUSCANDO** — os três valores que a planilha já contabiliza
(517 leads):

| Valor gravado | Histórico |
| --- | --- |
| `Máquina para fabricar ladrillos` | 450 leads · 87,0% |
| `Comprar ladrillos` | 9 leads · 1,7% |
| `Solo más información` | 58 leads · 11,2% |

**2. DISPOSTO A INVESTIR** — só no caminho da máquina (87% dos leads), com as
faixas exatas do resumo:

- `Hasta S/ 26,000 – Fabrica 800 ladrillos/día` (317 leads · 77,3%)
- `De S/ 26,000 a S/ 70,000 – Fabrica 2,000 ladrillos/día` (76 · 18,5%)
- `Más de S/ 70,000 – Personaliza tu fábrica` (17 · 4,2%)

**Quem escolhe "comprar ladrillos"** responde quantidade em vez de investimento
(não faz sentido perguntar preço de máquina a quem quer tijolo pronto), e a
resposta vai para OBSERVAÇÕES. **Quem escolhe "solo más información"** vai direto
para o contato.

**3. Nome + WhatsApp + País.** Sem e-mail: no formulário do Meta ele vinha
preenchido de graça, aqui custa um campo a mais. Se quiser o e-mail de volta, é
só descomentar — mas aí o formulário deixa de ser o "gente boa".

**EMPREGADOS ficou de fora.** As três opções (`Autônomo`, `1 a 5 funcionários`,
`Mais de 5 funcionários`) estão zeradas em todos os meses na aba de resumo — a
pergunta já tinha sido desativada. E há um lead registrado com a observação
*"Lead não gostou da pergunta sobre quntia de funcionários"*, que é exatamente a
reclamação que a Laila trouxe na reunião.

## Estrutura dos arquivos

| Arquivo | O quê |
| --- | --- |
| `index.html` · `pt/index.html` | LP principal — **não tem formulário**, CTAs vão direto para o WhatsApp |
| `build-form.mjs` | gera as páginas de `/form` a partir das principais |
| `form/index.html` · `form/pt/index.html` | **gerados** — não editar à mão |
| `assets/lead-form.js` · `.css` | o formulário |
| `apps-script/Codigo.gs` | receptor que grava na planilha |

Para regerar depois de mexer na LP:

```bash
node build-form.mjs
```

O script marca cada CTA de WhatsApp com a resposta que o formulário já deve trazer
pronta (22 dos 24 — os 2 restantes são o número de telefone no rodapé, que abre o
formulário em branco), tira o `whatsapp_click` antigo, injeta o CSS e o JS, e
ajusta canonical, `noindex` e o seletor de idioma para continuar dentro de `/form`.

## Ativar a gravação no CRM

**Já está ligado** desde 05/09/2026. O Apps Script vive dentro da própria planilha
(projeto "Receptor de leads da LP /form (Conceito Prime)"), o App da Web está
publicado executando como `feedxe321@gmail.com` com acesso "qualquer pessoa", e a
URL do `/exec` já está em `CONFIG.endpoint`, em
[`assets/lead-form.js`](assets/lead-form.js).

Cada envio grava duas linhas: a comercial na aba **LEADS** e a técnica na aba
**LOG LP**, com `STATUS DA GRAVAÇÃO` e `LINHA NA ABA`. Quando um lead não aparecer
na LEADS, o motivo está na LOG LP.

> **Ao mexer no `Codigo.gs`, gerar sempre uma nova versão da implantação**
> (Implantar → Gerenciar implantações → lápis → Versão: Nova versão). Salvar o
> código não muda o que o App da Web executa. Editando a implantação existente a
> URL continua a mesma; criando uma implantação nova, a URL muda e o
> `CONFIG.endpoint` precisa ser atualizado junto.

> **A planilha é pesada** (RESUMO, SIMULAÇÃO e CENÁRIOS recalculam a cada escrita).
> Toda leitura no `Codigo.gs` tem que ser em bloco (`getValues`). A versão antiga
> procurava a primeira linha livre lendo célula a célula num laço e estourava o
> limite de 6 minutos do Apps Script: nenhum lead entrava.

Se um dia precisar refazer a implantação do zero:

1. Abrir a planilha → *Extensões → Apps Script*.
2. Colar o conteúdo de [`apps-script/Codigo.gs`](apps-script/Codigo.gs).
3. Rodar `conferirMapeamento()` — o log mostra qual aba e quais colunas ele vai
   usar. A planilha tem duas abas de leads (a da LP e a do ebook, que tem EMPRESA,
   CARGO e CIDADE); o script escolhe a da LP. Se escolher errado, preencher `ABA`
   com o nome da aba certa.
4. Rodar `testarGravacao()` e conferir a linha de teste na planilha (depois apagar).
5. *Implantar → Nova implantação → App da Web* · Executar como: **eu** · Quem pode
   acessar: **qualquer pessoa**.
6. Copiar a URL e colar em `CONFIG.endpoint`, em
   [`assets/lead-form.js`](assets/lead-form.js).

### Onde cada resposta cai

| Coluna que já existe | O que entra |
| --- | --- |
| ENTRADA | `2026-09-02 14:13:07` — mesmo formato das linhas atuais |
| MÊS | `Setembro26` |
| NOME · WHATSAPP | do formulário |
| O QUE ESTÁ BUSCANDO | um dos 3 valores canônicos |
| DISPOSTO A INVESTIR | uma das 3 faixas canônicas |
| STATUS | `Não iniciado` (ou `Duplicado`, se o mesmo WhatsApp repetir em 30 min) |
| OBSERVAÇÕES | `Modelo: … \| Cantidad: … \| País: … \| Origem: … \| Termo: … \| CTA: …` |
| UTM SOURCE / CAMPAIGN / CONTENT / TERM | direto da URL |
| DATA DASHBOARD | `02/09/2026` |

Criadas no fim da aba, se ainda não existirem: **PAÍS, MODELO, PLATAFORMA,
GCLID, PÁGINA, ID DO LEAD**. E-MAIL, EMPREGADOS, PRÓXIMO CONTATO e ORÇAMENTO
ficam em branco, para a equipe preencher.

## URLs das campanhas

A aba de UTMs da planilha já tem o padrão; só falta aplicá-lo no Google, onde
hoje 26 de 145 leads chegaram com UTM SOURCE vazio.

**Importante:** as campanhas devem apontar para **`/form`**, não para a raiz.

**Google Ads** — como URL final do anúncio, ou no sufixo do URL final:

```
https://maquinas.dracossuramerica.com/form/?utm_source=Google&utm_medium=cpc&utm_campaign={_campanha}&utm_content={_grupo}&utm_term={keyword}&keyword={keyword}&matchtype={matchtype}&network={network}&device={device}
```

Trocar `{_campanha}` e `{_grupo}` por `{campaignid}`/`{adgroupid}` ou pelos nomes
fixos, como já está na aba de UTMs. Se usar *Modelo de acompanhamento* com
`{lpurl}`, confira que o URL final de cada anúncio já é o `/form/`.

**Meta Ads** — em *Parâmetros de URL* do anúncio, exatamente como está na aba:

```
utm_source=meta-{{placement}}&utm_medium=cpc&utm_campaign={{campaign.name}}&utm_content={{adset.name}}&utm_term={{ad.name}}
```

O `{{placement}}` é o que separa Instagram de Facebook na coluna PLATAFORMA.

### Sobre "trazer o termo de busca"

O que o navegador entrega é a **palavra-chave que disparou o anúncio**
(`{keyword}`), não o termo exato digitado — esse o Google não expõe na URL. Fica
gravado o `{keyword}` em UTM TERM e o **GCLID** na coluna própria; com o GCLID dá
para cruzar com o relatório de termos de pesquisa e chegar no termo real. É o
máximo possível sem importação de conversões offline.

## Medição

Eventos no dataLayer (GTM-WM4T2Q42):

- `lead_form_open` — abriu o formulário;
- `generate_lead` — **enviou** (buscando, investimento, modelo, país, plataforma, termo, grupo, campanha);
- `whatsapp_click` — o WhatsApp abriu de fato.

A conversão do Google Ads e do Meta deve passar a usar **`generate_lead`**. O
`whatsapp_click` antigo, que disparava em qualquer clique de link, foi removido da
página — ele contava cliques, não contatos, e era a diferença entre o relatório e
o que chegava no WhatsApp da Laila.

## Pontos a resolver com o cliente / na conta

1. **Domínio das campanhas.** A aba de UTMs da planilha ainda aponta para
   `lp.dracossuramerica.com/maquina-ladrillos`. Trocar para
   `https://maquinas.dracossuramerica.com/form/` — senão os anúncios continuam
   levando para a LP antiga e nada disso entra em uso.
2. **`{utm_source}` literal.** Vários leads de abril/26 chegaram com
   `{utm_source}`, `{utm_campaign}`, `{utm_content}`, `{utm_term}` escritos como
   texto: a macro usada não existe. Também há 5 linhas com `meta-{{placement}}` sem
   renderizar. Revisar os parâmetros nos anúncios do Meta.
3. **Faixas de investimento.** As linhas antigas usam `S/ 50,000`, o resumo conta
   `S/ 70,000`. O formulário grava a versão de **70,000** (a que o resumo soma). Se
   a faixa correta hoje for outra, é trocar em `T.invertir` nos dois idiomas.
4. **Serviço de construção.** Não é um dos 3 valores do CRM, então esse CTA abre o
   formulário sem resposta pronta e a origem fica em OBSERVAÇÕES (`CTA: Servicio de
   construcción`). Se a Dracos quiser esse funil separado, dá para virar um quarto
   valor — mas aí precisa de mais uma linha na aba de resumo.

## Mexer nas perguntas depois

Tudo em [`assets/lead-form.js`](assets/lead-form.js), no objeto `T` (bloco `IS_PT`
para português, o outro para espanhol): `buscando`, `invertir`, `cantidad`. Em
cada opção, **`v` é o valor gravado no CRM e `l` é o rótulo mostrado** — traduza
só o rótulo, nunca o valor, ou as abas de resumo param de contar.

Para preencher um modelo automaticamente num CTA novo:

```html
<a href="https://wa.me/..." data-lead-buscando="Máquina para fabricar ladrillos" data-lead-modelo="Premium IV">
```

Um link com `data-wa-direct` continua indo direto para o WhatsApp, sem formulário.

## Testar local

```bash
node serve.mjs
```
