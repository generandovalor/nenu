/* Keep server-provided SEO metadata consistent on the existing client router. */
const NenuSEO = {
  apply(section) {
    const route=ROUTES[section];if(!route)return;
    const url='https://contenidodigitalnenu.com'+route.path;
    const set=(selector,value)=>document.querySelector(selector)?.setAttribute('content',value);
    set('meta[name="robots"]',section==='mayorista'?'noindex,follow':'index,follow,max-image-preview:large');
    set('meta[property="og:title"]',route.title);set('meta[property="og:description"]',route.description);set('meta[property="og:url"]',url);
    set('meta[name="twitter:title"]',route.title);set('meta[name="twitter:description"]',route.description);
    const script=document.getElementById('nenu-seo-schema');
    try{
      const data=JSON.parse(script.textContent),page=data['@graph'].find(item=>item['@id']?.endsWith('#webpage'));
      if(page){page['@type']=section==='streaming'?'CollectionPage':'WebPage';page['@id']=url+'#webpage';page.url=url;page.name=section==='home'?'Contenido Digital Nenu':section==='streaming'?'Catálogo de servicios digitales y productos físicos':section==='remesas'?'Cotización de remesas internacionales':'Acceso para mayoristas';page.description=route.description;}
      script.textContent=JSON.stringify(data).replace(/</g,'\\u003c');
    }catch(e){/* The catalog remains usable if metadata is missing. */}
  }
};
const nenuNavigateWithSEO=App.navigate.bind(App);
App.navigate=function(section,updateHistory=true){const result=nenuNavigateWithSEO(section,updateHistory);if(document.getElementById('section-'+section)?.classList.contains('active'))NenuSEO.apply(section);return result;};
