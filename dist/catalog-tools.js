/* Destinos de WhatsApp y detalle de servicios administrados desde Sheets. */
const Destinations = {
  yes(value) {return String(value??'').trim().toUpperCase()==='SI';},
  phone(row) {const raw=String(row?.Dato_Informacion??'').trim();if(!/^[+\d().\s-]+$/.test(raw))return '';const digits=raw.replace(/\D/g,'');return /^\d{8,15}$/.test(digits)?digits:'';},
  field(kind) {return {remesas:'Whatsapp_Remesas',streaming:'Whatsapp_Streaming',distribuidor:'Whatsapp_Distribuidor'}[kind];},
  contacts() {return (STATE.db.datosNegocio||[]).filter(row=>this.yes(row.Disponible)&&this.phone(row));},
  enabled(kind) {return this.contacts().filter(row=>this.yes(row[this.field(kind)]));},
  resolve(kind,rowId=null) {
    const row=rowId===null?this.enabled(kind)[0]:this.contacts().find(r=>String(r.ID_Informacion).trim().toLowerCase()===String(rowId).trim().toLowerCase());
    return row&&this.yes(row[this.field(kind)])?this.phone(row):'';
  },
  open(kind,message,rowId=null,forceShare=false) {
    const phone=forceShare?'':this.resolve(kind,rowId);
    window.open('https://wa.me/'+(phone||'')+'?text='+encodeURIComponent(message),'_blank','noopener');
  },
  action(method,args) {return Physical.escape(method+'('+args.map(v=>JSON.stringify(v)).join(',')+')');},
  buttons(kind) {
    const esc=Physical.escape;
    const direct=this.enabled(kind).map(row=>{
      const label=String(row.Nombre_Informacion||'Asesor').trim(),id=String(row.ID_Informacion);
      const action=kind==='remesas'?this.action('WhatsApp.sendRemesa',[id]):this.action('WhatsApp.sendPedido',[false,STATE.currency,id]);
      return '<button type="button" class="nenu-contact-button" onclick="'+action+'">'+esc(kind==='remesas'?label:'Pedir a '+label.replace(/^asesor(?:a)?\s+/i,''))+'</button>';
    }).join('');
    const generic=kind==='remesas'?this.action('WhatsApp.sendRemesa',['Generico']):this.action('WhatsApp.sendPedido',[false,STATE.currency,'']);
    return '<div class="nenu-contact-buttons">'+direct+'<button type="button" class="nenu-contact-button nenu-contact-share" onclick="'+generic+'">Elegir chat en WhatsApp</button></div>';
  }
};
const ServiceDetail = {
  e: value=>Physical.escape(value),
  list(value) {return String(value||'').split(/\r?\n|\s*\|\s*/).map(v=>v.trim()).filter(Boolean);},
  related(s) {
    if(!ruleEnabled('MODULO_CROSS_SELLING'))return [];
    const rows=STATE.db.crosselling||STATE.db.Crosselling||[];
    const ids=rows.filter(r=>String(r.id_servicio||r.ID_Servicio||'').trim()===String(s.ID_Servicio)).flatMap(r=>[r.relacionado_1,r.relacionado_2,r.relacionado_3]);
    return [...new Set(ids.map(id=>String(id||'').trim()))].map(id=>STATE.serviciosMap[id]).filter(p=>p&&!p._physical&&p.ID_Servicio!==s.ID_Servicio&&String(p.Disponible||'').trim().toUpperCase()==='SI');
  },
  promo(s) {
    if(!ruleEnabled('MODULO_PROMOCIONES'))return '';
    const id=String(s.ID_Promo||'').trim();if(!id)return '';
    const p=(STATE.db.promociones||STATE.db.Promociones||[]).find(p=>String(p.ID_Promo||'').trim()===id);if(!p)return '';
    const convert=v=>Catalog.roundPrice(Catalog.parseVal(v)/(STATE.rates.COP||1)*(STATE.rates[STATE.currency]||1),STATE.currency);
    const hasPrice=p.Precio_Promo!==''&&p.Precio_Promo!==null&&p.Precio_Promo!==undefined&&Number.isFinite(Number(p.Precio_Promo))&&Number(p.Precio_Promo)>=0;
    const price=hasPrice?'<p class="nenu-promo-price">Precio promocional: '+this.e(Catalog.format(convert(p.Precio_Promo)))+'</p>':'<p>Precio promocional por confirmar.</p>';
    return '<section class="nenu-service-promo"><p class="physical-category">Promoción disponible</p><h3>'+this.e(p.Nombre_Promo)+'</h3><p>'+this.e(p.Detalle_Promo)+'</p>'+price+'<small>Confirma con el asesor los requisitos de la promoción y el total antes de pagar.</small></section>';
  },
  cross(s) {
    const items=this.related(s);if(!items.length)return '';
    return '<section class="physical-detail-section nenu-related"><h3>Complementa tu pedido</h3><p>Servicios que también puedes elegir.</p><div class="nenu-related-grid">'+items.map(item=>{
      const id=String(item.ID_Servicio),p=Catalog.getPrice(item),price=STATE.isWholesale?p.wholesaleCurr:Catalog.getPriceWithCoupon(item,p.publicCurr),img=Physical.url(item.URL_Imagen)||'/logo.webp';
      return '<article class="nenu-related-card"><img src="'+this.e(img)+'" alt="'+this.e(item.Nombre_Producto)+'" loading="lazy" width="180" height="180" onerror="this.onerror=null;this.src=\'/logo.webp\'"><h4>'+this.e(item.Nombre_Producto)+'</h4><strong>'+this.e(Catalog.format(price))+'</strong><div>'+(STATE.productoDetalleMap[id]?'<button type="button" onclick="'+Destinations.action('Catalog.showDetails',[id])+'">Ver detalle</button>':'')+'<button type="button" onclick="'+Destinations.action('Cart.add',[id])+'">Añadir</button></div></article>';
    }).join('')+'</div></section>';
  },
  media(s,d) {
    const raw=Physical.url(d.video_youtube||d.Video_Youtube||'');
    let video=Physical.video(raw);
    if(!video&&raw){const u=new URL(raw),list=u.searchParams.get('list');if(/(^|\.)youtube\.com$/.test(u.hostname)&&/^[a-zA-Z0-9_-]{10,100}$/.test(list||''))video='<div class="physical-video"><iframe title="Videos del servicio" src="https://www.youtube-nocookie.com/embed/videoseries?list='+list+'" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';}
    const images=[...new Set([s.URL_Imagen,d.imagen_1||d.Imagen_1,d.imagen_2||d.Imagen_2,d.imagen_3||d.Imagen_3].map(v=>Physical.url(v)).filter(Boolean))];
    return video+'<div class="nenu-service-images">'+images.map(url=>'<img src="'+this.e(url)+'" alt="'+this.e(s.Nombre_Producto)+'" loading="lazy" decoding="async" width="500" height="500" onerror="this.onerror=null;this.src=\'/logo.webp\'">').join('')+'</div>';
  },
  faq(value) {
    const text=String(value||'').trim();if(!text)return '';
    const rows=text.split(/\r?\n|\s+(?=\d+\.\s*[¿])/).filter(Boolean);
    return '<section class="physical-detail-section"><h3>Preguntas frecuentes</h3>'+rows.map(row=>{
      const pair=row.includes('|')?row.split('|'):row.match(/^(.*?\?)\s*(.*)$/)?.slice(1);
      return pair&&pair.length>1?'<details><summary>'+this.e(pair[0].trim())+'</summary><p>'+this.e(pair.slice(1).join(' | ').trim())+'</p></details>':'<p>'+this.e(row)+'</p>';
    }).join('')+'</section>';
  },
  show(id) {
    const s=STATE.serviciosMap[id];if(!s||s._physical||!ruleEnabled('MODULO_PRODUCTO_DETALLE'))return;
    const d=STATE.productoDetalleMap[id]||{},modal=document.getElementById('modal-container');
    if(!modal.contains(document.activeElement))modal._returnFocus=document.activeElement;
    const p=Catalog.getPrice(s),price=STATE.isWholesale?p.wholesaleCurr:Catalog.getPriceWithCoupon(s,p.publicCurr);
    const field=(low,upper)=>d[low]||d[upper]||'';
    document.getElementById('modal-content').innerHTML='<div class="physical-detail nenu-service-detail"><div class="physical-detail-toolbar"><span>SERVICIO DIGITAL</span><button type="button" id="service-close" onclick="hideModal()" aria-label="Cerrar detalle">×</button></div><div class="physical-detail-scroll"><div class="physical-detail-copy"><p class="physical-category">'+this.e(s.Categoria)+'</p><h2>'+this.e(s.Nombre_Producto)+'</h2>'+Physical.textBlock('Resumen',field('descripcion_corta','Descripcion_Corta')||s.Detalle)+this.media(s,d)+Physical.textBlock('Sobre este servicio',field('descripcion_larga','Descripcion_Larga'))+Physical.textBlock('Qué incluye',field('incluye','Incluye'),true)+Physical.textBlock('Beneficios',field('beneficios','Beneficios'),true)+Physical.textBlock('Garantía del servicio',field('garantia','Garantia'))+this.faq(d.faq_producto||d.FAQ_Producto||d.faq||d.Faq)+this.promo(s)+this.cross(s)+'</div></div><div class="physical-detail-buy"><div><span>Precio del servicio</span><strong>'+this.e(Catalog.format(price))+'</strong></div><button type="button" onclick="'+Destinations.action('ServiceDetail.add',[id])+'">Añadir al pedido</button></div></div>';
    showModal();document.getElementById('service-close').focus();
  },
  add(id) {if(!STATE.serviciosMap[id])return;Cart.add(id);hideModal();}
};
Catalog.showDetails=function(id){return STATE.serviciosMap[id]?._physical?Physical.showDetails(id):ServiceDetail.show(id);};
const nenuToolsShowModal=showModal;
showModal=function(){document.body.classList.add('nenu-modal-open');return nenuToolsShowModal();};
const nenuToolsHideModal=hideModal;
hideModal=function(){document.body.classList.remove('nenu-modal-open');return nenuToolsHideModal();};
