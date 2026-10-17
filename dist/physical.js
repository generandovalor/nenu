/* Productos físicos de Nenu: proyección pública/privada, detalle y límites del carrito. */
const Physical = {
  escape(value) { return String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); },
  yes(value) { return value===true || ['SI','SÍ','TRUE','1'].includes(String(value??'').trim().toUpperCase()); },
  url(value) { try {const u=new URL(String(value||'').trim(),location.origin);return /^https?:$/.test(u.protocol)&&String(value||'').trim()?u.href:'';}catch(e){return '';} },
  hydrate() {
    if(!STATE.isWholesale){document.getElementById('mayorista-physical-grid')?.replaceChildren();document.getElementById('mayorista-accordion')?.replaceChildren();}
    STATE.physicalServices=(STATE.db.productosFisicos||[]).filter(p=>this.yes(p.Disponible)).map(p=>{
      const id='FISICO:'+encodeURIComponent(String(p.ID_Producto)).replace(/'/g,'%27');
      const s={...p,_physical:true,ID_Servicio:id,Precio_Sugerido_Mes_COP:p.Precio_Publico_COP,Precio_Mayorista_Mes_COP:p.Precio_Mayorista_COP};
      STATE.serviciosMap[id]=s;return s;
    });
  },
  inventoryType(s) {return String(s.Tipo_Inventario||'').trim().toUpperCase();},
  supplierStatus(s) {return String(s.Disponibilidad_Proveedor||'').trim().toUpperCase();},
  controlled(s) {return this.inventoryType(s)!=='DROPSHIPPING'&&this.yes(s.Controla_Inventario);},
  pending(s) {return this.yes(s.Requiere_Confirmacion)||this.inventoryType(s)==='DROPSHIPPING'&&this.supplierStatus(s)!=='DISPONIBLE';},
  unavailable(s) {return this.inventoryType(s)==='DROPSHIPPING'&&this.supplierStatus(s)==='AGOTADO';},
  variants(s) {const key=String(s.ID_Grupo||'').trim();return key?(STATE.physicalServices||[]).filter(p=>String(p.ID_Grupo||'').trim()===key):[s];},
  variantLabel(s) {return [['Color',s.Color],['Talla',s.Talla],['Sabor',s.Sabor],['Contenido',s.Contenido_Neto]].filter(x=>String(x[1]||'').trim()).map(x=>x[0]+': '+x[1]).join(' · ')||String(s.Presentacion||s.Nombre_Producto);},
  orderLabel(s) {return s.Nombre_Producto+' [Ref. '+String(s.SKU||s.ID_Producto)+']'+([s.Color,s.Talla,s.Sabor,s.Contenido_Neto].some(Boolean)?' — '+this.variantLabel(s):'');},
  canBuy(s) {
    if(!s?._physical)return !!s;
    const price=Catalog.parseVal(STATE.isWholesale?s.Precio_Mayorista_COP:s.Precio_Publico_COP);
    return this.yes(s.Aplica_Carrito)&&s.Permite_Compra!==false&&price>0&&!this.unavailable(s)&&(!this.controlled(s)||Number(s.Stock)>0);
  },
  maxQty(s) { return s?._physical&&this.controlled(s)?Math.max(0,Math.floor(Number(s.Stock)||0)):99999; },
  status(s) {
    if(this.unavailable(s)||this.controlled(s)&&this.maxQty(s)===0)return 'Agotado';
    if(!this.yes(s.Aplica_Carrito))return 'Consulta con un asesor';
    if(Catalog.parseVal(STATE.isWholesale?s.Precio_Mayorista_COP:s.Precio_Publico_COP)<=0)return 'Precio por confirmar';
    if(this.pending(s))return 'Disponibilidad por confirmar';
    return this.controlled(s)?this.maxQty(s)+' disponibles':'Disponible';
  },
  price(s,publicMode=false) {const p=Catalog.getPrice(s);return publicMode?p.publicCurr:STATE.isWholesale?p.wholesaleCurr:p.publicCurr;},
  setView(view) { STATE.catalogView=['all','digital','physical'].includes(view)?view:'all';Catalog.render('streaming');if(STATE.isWholesale)Catalog.render('mayorista'); },
  render(section='streaming') {
    const prefix=section==='mayorista'?'mayorista':'streaming',grid=document.getElementById(prefix+'-physical-grid');
    if(!grid)return;
    const view=STATE.catalogView||'all';
    document.getElementById(prefix+'-digital-block').hidden=view==='physical';
    document.getElementById(prefix+'-physical-block').hidden=view==='digital';
    document.querySelectorAll('[data-catalog-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.catalogView===view)));
    const query=(document.getElementById(prefix==='mayorista'?'mayorista-search':'cat-search')?.value||'').toLowerCase().trim();
    const groups=new Map();
    (STATE.physicalServices||[]).forEach(s=>{const key=String(s.ID_Grupo||'').trim()||s.ID_Servicio;if(!groups.has(key))groups.set(key,[]);groups.get(key).push(s);});
    const products=[...groups.values()].filter(rows=>rows.some(s=>[s.Nombre_Producto,s.Nombre_Grupo,s.Categoria,s.Marca,s.Descripcion_Corta,s.SKU,s.Color,s.Talla,s.Sabor].some(v=>String(v||'').toLowerCase().includes(query)))).map(rows=>rows.slice().sort((a,b)=>Number(!this.canBuy(a))-Number(!this.canBuy(b))||(this.price(a)||Infinity)-(this.price(b)||Infinity))[0]).sort((a,b)=>Number(a.Orden??9999)-Number(b.Orden??9999));
    const count=document.getElementById(prefix+'-physical-count');if(count)count.textContent=products.length+' productos';
    grid.innerHTML=products.length?products.map(s=>this.card(s)).join(''):'<p class="physical-empty">No encontramos productos físicos con esta búsqueda.</p>';
  },
  card(s) {
    const e=this.escape,id=s.ID_Servicio,img=this.url(s.URL_Imagen)||'/logo.webp',price=this.price(s),status=this.status(s),variants=this.variants(s),multiple=variants.length>1,name=multiple?s.Nombre_Grupo||s.Nombre_Producto:s.Nombre_Producto;
    const action=multiple?"Physical.showDetails('"+id+"')":this.canBuy(s)?"Cart.add('"+id+"')":"Physical.consult('"+id+"')";
    return '<article class="physical-card" data-product-id="'+e(s.ID_Producto)+'">'+
      '<button type="button" class="physical-image-button" onclick="Physical.showDetails(\''+id+'\')" aria-label="Ver '+e(name)+'"><img src="'+e(img)+'" alt="'+e(name)+'" loading="lazy" decoding="async" width="400" height="400" onerror="this.onerror=null;this.src=\'/logo.webp\'">'+
      (this.yes(s.Destacado)?'<span class="physical-badge">Destacado</span>':'')+'</button>'+
      '<div class="physical-card-body"><p class="physical-category">'+e(s.Categoria||'Productos físicos')+'</p><h3>'+e(name)+'</h3><p class="physical-presentation">'+e(multiple?variants.length+' opciones disponibles':s.Presentacion||s.Descripcion_Corta)+'</p>'+
      '<p class="physical-stock '+(this.canBuy(s)?'in-stock':'')+'">'+e(status)+'</p><p class="physical-price">'+(price>0?(multiple?'Desde ':'')+e(Catalog.format(price)):'Consultar precio')+'</p>'+
      (STATE.isWholesale?'<p class="physical-public-price">Público: '+e(Catalog.format(this.price(s,true)))+'</p>':'')+
      '<div class="physical-card-actions"><button type="button" onclick="Physical.showDetails(\''+id+'\')">Ver detalle</button><button type="button" class="physical-add" onclick="'+e(action)+'">'+(multiple?'Elegir opción':this.canBuy(s)?'Añadir':'Consultar')+'</button></div></div></article>';
  },
  consult(id) {
    const s=STATE.serviciosMap[id];if(!s?._physical)return;
    Destinations.open(STATE.isWholesale?'distribuidor':'streaming','Hola Nenu, quisiera consultar disponibilidad, entrega y precio de '+this.orderLabel(s)+'.');
  },
  selectVariant(id) {if(!id)return;this.showDetails(id,true);document.getElementById('physical-variant')?.focus();},

  list(value) {return String(value||'').split(/\r?\n|\s*\|\s*/).map(s=>s.trim()).filter(Boolean);},
  textBlock(title,value,list=false) {
    if(!String(value||'').trim())return '';
    const e=this.escape;
    return '<section class="physical-detail-section"><h3>'+e(title)+'</h3>'+(list?'<ul>'+this.list(value).map(v=>'<li>'+e(v)+'</li>').join('')+'</ul>':'<p>'+e(value).replace(/\r?\n/g,'<br>')+'</p>')+'</section>';
  },
  video(value) {
    const raw=this.url(value);if(!raw)return '';
    const u=new URL(raw);let id='';
    if(u.hostname==='youtu.be')id=u.pathname.split('/')[1]||'';
    else if(/(^|\.)youtube\.com$/.test(u.hostname)||u.hostname==='www.youtube-nocookie.com')id=u.searchParams.get('v')||u.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]||'';
    if(/^[a-zA-Z0-9_-]{11}$/.test(id))return '<div class="physical-video"><iframe title="Video del producto" src="https://www.youtube-nocookie.com/embed/'+id+'" loading="lazy" allow="fullscreen; picture-in-picture" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>';
    if(/\.(mp4|webm)$/i.test(u.pathname))return '<video class="physical-direct-video" controls preload="metadata" src="'+this.escape(raw)+'"></video>';
    return '';
  },
  showDetails(id,selected=false) {
    const s=STATE.serviciosMap[id];if(!s?._physical)return;
    const e=this.escape,variants=this.variants(s),multiple=variants.length>1,needsChoice=multiple&&!selected;
    const variantControl=multiple?'<label class="physical-variant-label" for="physical-variant">Elige tu opción</label><select id="physical-variant" class="physical-variant-select" onchange="Physical.selectVariant(this.value)"><option value="" disabled '+(needsChoice?'selected':'')+'>Selecciona una variante</option>'+variants.map(v=>'<option value="'+e(v.ID_Servicio)+'" '+(!needsChoice&&v.ID_Servicio===id?'selected':'')+'>'+e(this.variantLabel(v)+' — '+this.status(v))+'</option>').join('')+'</select>':this.textBlock('Presentación',this.variantLabel(s));
    this.images=[...new Set([s.URL_Imagen,s.Imagen_1,s.Imagen_2,s.Imagen_3].map(v=>this.url(v)).filter(Boolean))];
    if(!this.images.length)this.images=['/logo.webp'];
    const modal=document.getElementById('modal-container');if(!modal.contains(document.activeElement))modal._returnFocus=document.activeElement;
    modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-label','Detalle de '+s.Nombre_Producto);
    const price=this.price(s),status=this.status(s);
    document.getElementById('modal-content').innerHTML=
      '<div class="physical-detail"><div class="physical-detail-toolbar"><span>PRODUCTO FÍSICO</span><button type="button" onclick="hideModal()" aria-label="Cerrar detalle" id="physical-close">×</button></div>'+
      '<div class="physical-detail-scroll"><div class="physical-gallery"><img id="physical-main-image" src="'+e(this.images[0])+'" alt="'+e(s.Nombre_Producto)+'" width="700" height="700" onerror="this.onerror=null;this.src=\'/logo.webp\'"></div>'+
      (this.images.length>1?'<div class="physical-thumbs">'+this.images.map((u,i)=>'<button type="button" onclick="Physical.selectImage('+i+')" aria-label="Ver imagen '+(i+1)+'"><img src="'+e(u)+'" alt="" loading="lazy"></button>').join('')+'</div>':'')+
      this.video(s.URL_Video)+'<div class="physical-detail-copy"><p class="physical-category">'+e(s.Categoria)+'</p><h2>'+e(multiple?s.Nombre_Grupo||s.Nombre_Producto:s.Nombre_Producto)+'</h2><p class="physical-presentation">'+e(s.Marca)+' · '+e(s.Presentacion)+'</p>'+
      variantControl+this.textBlock('Resumen',s.Descripcion_Corta)+this.textBlock('Descripción',s.Descripcion_Larga)+this.textBlock('Beneficios y características',s.Beneficios,true)+
      this.textBlock('Incluye',s.Incluye,true)+this.textBlock('Modo de uso',s.Modo_Uso)+this.textBlock('Garantía',s.Garantia)+this.textBlock('Entrega',s.Condiciones_Entrega)+this.textBlock('Plazo estimado',s.Plazo_Entrega)+this.textBlock('Destinos',this.list(s.Paises_Entrega).map(c=>({VE:'Venezuela',CO:'Colombia'}[c]||c)).join(' · '))+
      (s.FAQ_Producto?'<section class="physical-detail-section"><h3>Preguntas frecuentes</h3>'+this.list(s.FAQ_Producto).map(item=>{const m=item.match(/^(.+?\?)\s*(.*)$/);return m?'<details><summary>'+e(m[1])+'</summary><p>'+e(m[2])+'</p></details>':'<p>'+e(item)+'</p>';}).join('')+'</section>':'')+
      '<p class="physical-order-note">La disponibilidad, el plazo y el costo de envío se confirman por WhatsApp. Para Colombia, consulta cobertura antes de pagar. Añadir al pedido no reserva unidades.</p></div></div>'+
      '<div class="physical-detail-buy"><div><span>'+e(needsChoice?'Selecciona una opción':status)+'</span><strong>'+(price>0?e(Catalog.format(price)):'Consultar precio')+'</strong></div><button type="button" onclick="'+(this.canBuy(s)?'Cart.add':'Physical.consult')+'(\''+id+'\')" '+(needsChoice?'disabled':'')+'>'+(needsChoice?'Elige una opción':this.canBuy(s)?'Añadir al pedido':'Consultar por WhatsApp')+'</button></div></div>';
    showModal();document.getElementById('physical-close').focus();
  },
  selectImage(index) {const image=document.getElementById('physical-main-image');if(image&&this.images[index])image.src=this.images[index];},
  reconcile() {
    let changed=false;
    Object.keys(STATE.cart).forEach(id=>{
      const s=STATE.serviciosMap[id],it=STATE.cart[id],qty=Math.floor(Number(it?.qty));
      if(!s||!Number.isFinite(qty)||qty<1||(s._physical&&!this.canBuy(s))){delete STATE.cart[id];changed=true;return;}
      const allowed=s._physical?Math.min(qty,this.maxQty(s)):qty;
      if(it.qty!==allowed){it.qty=allowed;changed=true;}
    });
    if(changed)STATE.selectedPrize=null;
    return changed;
  },
  hasPhysical() {return Object.keys(STATE.cart).some(id=>STATE.serviciosMap[id]?._physical);}
};
const nenuDigitalRender=Catalog.render.bind(Catalog);
Catalog.render=function(section='streaming'){nenuDigitalRender(section);Physical.render(section);};
Catalog.setView=view=>Physical.setView(view);
const nenuDigitalDetails=Catalog.showDetails.bind(Catalog);
Catalog.showDetails=function(id){return STATE.serviciosMap[id]?._physical?Physical.showDetails(id):nenuDigitalDetails(id);};
const nenuCouponPrice=Catalog.getPriceWithCoupon.bind(Catalog);
Catalog.getPriceWithCoupon=function(s,price,currency){return s?._physical?price:nenuCouponPrice(s,price,currency);};
const nenuCartAdd=Cart.add.bind(Cart);
Cart.add=function(id){
 const s=STATE.serviciosMap[id];if(!s)return;
 if(s._physical&&(!Physical.canBuy(s)||(STATE.cart[id]?.qty||0)>=Physical.maxQty(s)))return App.notify('No hay más unidades disponibles para este pedido.');
 return nenuCartAdd(id);
};
const nenuCartQty=Cart.qty.bind(Cart);
Cart.qty=function(id,delta){
 const s=STATE.serviciosMap[id];
 if(delta>0&&s?._physical&&(!Physical.canBuy(s)||(STATE.cart[id]?.qty||0)+delta>Physical.maxQty(s)))return App.notify('La cantidad supera el stock disponible.');
 return nenuCartQty(id,delta);
};
const nenuCartUpdate=Cart.update.bind(Cart);
Cart.update=function(){Physical.reconcile();return nenuCartUpdate();};
const nenuCartOpen=Cart.open.bind(Cart);
Cart.open=function(){
 Physical.reconcile();nenuCartOpen();
 if(Physical.hasPhysical()){
  const note=document.createElement('p');note.className='physical-cart-note';note.textContent='Productos físicos: envío por confirmar. El pedido no reserva inventario.';
  document.getElementById('modal-content').firstElementChild.prepend(note);
 }
};
const nenuSendOrder=WhatsApp.sendPedido.bind(WhatsApp);
WhatsApp.sendPedido=function(forcePublicMode=false,currency=STATE.currency,targetRow=null){
 if(Physical.reconcile()){Cart.update();Cart.open();return App.notify('La disponibilidad cambió. Revisa las cantidades del pedido.');}
 if(Physical.hasPhysical()&&STATE.isWholesale&&Date.now()-(STATE.wholesaleLiveAt||0)>300000)return App.notify('Vuelve a entrar con tu clave para actualizar las tarifas mayoristas.');
 return nenuSendOrder(forcePublicMode,currency,targetRow);
};
const nenuHideModal=hideModal;
hideModal=function(){
 const modal=document.getElementById('modal-container');
 modal.querySelectorAll('iframe,video').forEach(v=>{if(v.tagName==='VIDEO')v.pause();v.removeAttribute('src');});
 const focus=modal._returnFocus;modal._returnFocus=null;
 nenuHideModal();if(focus?.isConnected)focus.focus();
};
document.addEventListener('keydown',event=>{
 const modal=document.getElementById('modal-container');
 if(event.key!=='Tab'||modal.style.display==='none'||modal.classList.contains('hidden'))return;
 const nodes=[...modal.querySelectorAll('button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),[tabindex="0"]')].filter(n=>!n.closest('[hidden]'));
 if(!nodes.length)return;
 if(event.shiftKey&&document.activeElement===nodes[0]){event.preventDefault();nodes.at(-1).focus();}
 else if(!event.shiftKey&&document.activeElement===nodes.at(-1)){event.preventDefault();nodes[0].focus();}
});
const nenuShowModal=showModal;
showModal=function(){
 const modal=document.getElementById('modal-container');
 modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');
 const heading=document.querySelector('#modal-content h2');
 modal.setAttribute('aria-label',heading?.textContent?.trim()||'Información de Nenu');
 return nenuShowModal();
};
