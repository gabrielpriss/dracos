// Roteamento por host: ladrillos.dracossuramerica.com abre a pagina de ladrillos na raiz.
// Qualquer outro host (maquinas.dracossuramerica.com, dracos.pages.dev) segue o fluxo normal.
// O _routes.json limita a execucao desta funcao ao caminho "/", entao o resto do site continua estatico.
const HOST_LADRILLOS = 'ladrillos.dracossuramerica.com';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === HOST_LADRILLOS && url.pathname === '/') {
    return context.env.ASSETS.fetch(new Request(new URL('/ladrillos/', url), context.request));
  }
  return context.next();
}
