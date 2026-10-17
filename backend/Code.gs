/** NENU API 5.4 · Sheet original, sin modificar su estructura.
 * Instalar este archivo en el proyecto Apps Script existente y publicar NUEVA VERSION.
 * Público: ?type=bootstrap (compatibles catalogo/config/remesas/all).
 * 5.3: agrega grupos, variantes, origen y confirmación de disponibilidad. ID_Proveedor permanece interno. 5.4 incorpora promociones públicas sin Costo_Real.
 * El inventario se informa para el frontend: no hay reservas ni ventas automáticas.
 * Mayorista: POST text/plain {action:'login', password:'...'}; nunca devuelve claves.
 */
const SPREADSHEET_ID = '1OPG_a-qeny8dknlG-evgs-pFkbC18DtkBF6iDJ7P5zk';
const CACHE_TTL = 21600;
const CACHE_CHUNK_SIZE = 22000; // Hasta 88 KB UTF-8 por fragmento, incluso con caracteres de 4 bytes.
const API_VERSION = '5.4.0';
const CACHE_KEY = 'nenu_public_v54';
const MAX_DATA_AGE_MS = 10 * 60 * 1000;
let REQUEST_ROWS = Object.create(null);
const PUBLIC_SERVICE_FIELDS = ['ID_Servicio','ID_Promo','ID_Acompañante','Fecha_Finalizacion','Dias','Disponible','Nombre_Producto','Categoria','Costo_Precio_Sugerido_Dia','Precio_Sugerido_Mes_COP','Precio_Sugerido_Conversion_Pais','Costo_Precio_Sugerido_Dia_Conversion_Pais','Detalle','URL_Imagen','Destacado','Cupon','Descuento_Cupon','Descuento_Valor_Fijo','Aplica_Descuento','Aplica_Premios'];
// El precio mayorista se agrega solo tras validar el acceso en login_.
const PUBLIC_PHYSICAL_FIELDS = ['ID_Producto','Disponible','Nombre_Producto','Categoria','Marca','Presentacion','Precio_Publico_COP','Controla_Inventario','Stock','Destacado','URL_Imagen','URL_Video','Imagen_1','Imagen_2','Imagen_3','Descripcion_Corta','Descripcion_Larga','Beneficios','Incluye','Modo_Uso','Garantia','Condiciones_Entrega','FAQ_Producto','Aplica_Carrito','Aplica_Descuento','Aplica_Premios','Orden','ID_Grupo','Nombre_Grupo','SKU','Color','Talla','Sabor','Contenido_Neto','Tipo_Inventario','Pais_Despacho','Paises_Entrega','Disponibilidad_Proveedor','Plazo_Entrega','Requiere_Confirmacion'];
function onOpen(){ SpreadsheetApp.getUi().createMenu('Nenu Admin').addItem('Reconstruir caché','rebuildAllCache').addItem('Instalar actualización automática','instalarActualizacionAutomatica').addItem('Actualizar monedas','triggerActualizarMonedas').addItem('Prorrateo diario','triggerProrrateoDiario').addItem('Generar premios PGE','triggerGenerarPremios').addToUi(); }
function triggerActualizarMonedas(){SpreadsheetApp.getUi().alert(actualizarTasasMonedas());}
function triggerProrrateoDiario(){SpreadsheetApp.getUi().alert(actualizarProrrateoDiario());}
function triggerGenerarPremios(){SpreadsheetApp.getUi().alert(generarCatalogoAvanzado());}
function doGet(e){
 try {
  const type = String(e && e.parameter && e.parameter.type || 'bootstrap').toLowerCase();
  if(type === 'health') return json({ok:true,apiVersion:API_VERSION});
  if(type === 'auth') return json({ok:false,error:'USE_POST_LOGIN'});
  if(!['bootstrap','catalogo','config','remesas','all'].includes(type)) return json({ok:false,error:'UNKNOWN_TYPE'});
  return ContentService.createTextOutput(getBootstrapJson_()).setMimeType(ContentService.MimeType.JSON);
 } catch(err){console.error(err);return json({ok:false,error:'TEMPORARILY_UNAVAILABLE'});}
}
function doPost(e){
 try{
  const b=JSON.parse(e && e.postData && e.postData.contents || '{}');
  if(b.action !== 'login') return json({ok:false,error:'UNKNOWN_ACTION'});
  return json(login_(b.password));
 }catch(err){console.error(err);return json({ok:false,error:'REQUEST_FAILED'});}
}
// El camino habitual no consulta Sheets, no accede a Drive y no usa gzip.
function getBootstrapJson_(){
 const start=Date.now();
 let text=getCachedText_(CACHE_KEY);
 if(text){logTiming_('cache',start);return text;}
 text=readSnapshot_();
 if(text){putCachedText_(CACHE_KEY,text);logTiming_('drive',start);return text;}
 text=rebuildPublic_(false);logTiming_('sheet',start);return text;
}
function getBootstrap_(){return JSON.parse(getBootstrapJson_());}
function logTiming_(source,start){console.log(JSON.stringify({api:API_VERSION,source:source,elapsedMs:Date.now()-start}));}
function rebuildPublic_(force){
 const lock=LockService.getScriptLock();
 if(!lock.tryLock(1000)){
  const fallback=getCachedText_(CACHE_KEY)||readSnapshot_();
  if(fallback)return fallback;
  throw new Error('REBUILD_BUSY');
 }
 try{
  if(!force){const cached=getCachedText_(CACHE_KEY);if(cached)return cached;}
  REQUEST_ROWS=Object.create(null);
  const sheets=SpreadsheetApp.openById(SPREADSHEET_ID).getSheets();
  const text=JSON.stringify(buildPublic_(sheets));
  putCachedText_(CACHE_KEY,text);
  try{writeSnapshot_(text);}catch(err){console.warn('No se pudo actualizar el respaldo privado de Drive: '+String(err));}
  return text;
 }finally{lock.releaseLock();}
}
function snapshotId_(){return PropertiesService.getScriptProperties().getProperty('NENU_PUBLIC_SNAPSHOT_ID');}
function readSnapshot_(){
 try{
  const id=snapshotId_();if(!id)return null;
  const file=DriveApp.getFileById(id);
  if(Date.now()-file.getLastUpdated().getTime()>MAX_DATA_AGE_MS)return null;
  const text=file.getBlob().getDataAsString();
  const data=JSON.parse(text);
  if(data.apiVersion!==API_VERSION||!Array.isArray(data.servicios)||!Array.isArray(data.productosFisicos)||!data.timestamp||Date.now()-Date.parse(data.timestamp)>MAX_DATA_AGE_MS)return null;
  return text;
 }catch(err){console.warn('Respaldo ausente o no utilizable');return null;}
}
function writeSnapshot_(text){
 const props=PropertiesService.getScriptProperties(),id=props.getProperty('NENU_PUBLIC_SNAPSHOT_ID');
 if(id){DriveApp.getFileById(id).setContent(text);return;}
 const file=DriveApp.createFile('nenu_public_catalog.json',text,MimeType.PLAIN_TEXT);
 // Respaldo privado: no se cambia el permiso de compartir del archivo.
 props.setProperty('NENU_PUBLIC_SNAPSHOT_ID',file.getId());
}
function pick_(row,fields){const out={};fields.forEach(k=>{if(Object.prototype.hasOwnProperty.call(row,k))out[k]=row[k];});return out;}
function safeBusiness_(rows){return rows.filter(r=>String(r.ID_Informacion).toLowerCase()!=='info0002'&&!/clave|password|secreto|token/i.test(String(r.Nombre_Informacion||'')+' '+String(r.TIPO_INFORMACION||''))).map(r=>pick_(r,['ID_Informacion','Nombre_Informacion','Dato_Informacion','Disponible','Whatsapp_Remesas','Whatsapp_Streaming','Whatsapp_Distribuidor']));}
function buildPublic_(sheets){
 return {ok:true,apiVersion:API_VERSION,timestamp:new Date().toISOString(),
 servicios:readSheet(sheets,'Servicios').filter(r=>String(r.Disponible).trim().toUpperCase()==='SI').map(r=>pick_(r,PUBLIC_SERVICE_FIELDS)),
 premios:readSheet(sheets,'Catalogo_PGE'),reglas:readSheet(sheets,'Reglas').map(r=>pick_(r,['Apps_Combo','Descuento'])),
 monedas:readSheet(sheets,'Monedas'),redes:readSheet(sheets,'Redes_Sociales'),systemRules:readSheet(sheets,'_System_Rules'),
 datosNegocio:safeBusiness_(readSheet(sheets,'Datos_Negocio')),configRemesas:readSheet(sheets,'Config_Remesas'),
 productoDetalle:readSheet(sheets,'Producto_Detalle'),crosselling:readSheet(sheets,'Crosselling'),
 promociones:readSheet(sheets,'Promociones').filter(r=>String(r.ID_Promo||'').trim()).map(r=>pick_(r,['ID_Promo','Nombre_Promo','Precio_Promo','Precio_Real','Detalle_Promo'])),
 productosFisicos:buildPhysicalProducts_(sheets,false)};
}
// No altera ni descuenta existencias: prepara una proyección para el frontend.
// La hoja es opcional: si no existe, productosFisicos será [].
function physicalYes_(value){
 return value===true || ['SI','SÍ','TRUE','1'].includes(String(value===undefined||value===null?'':value).trim().toUpperCase());
}
function buildPhysicalProducts_(sheets,isWholesale){
 const rows=readSheet(sheets,'Productos_Fisicos'),seen=Object.create(null),products=[];
 rows.forEach(row=>{
  if(!physicalYes_(row.Disponible))return;
  const id=String(row.ID_Producto||'').trim(),name=String(row.Nombre_Producto||'').trim();
  if(!id||!name){console.warn('Productos_Fisicos: fila omitida por falta de ID o nombre.');return;}
  if(seen[id]){console.warn('Productos_Fisicos: ID duplicado omitido: '+id);return;}
  seen[id]=true;
  const fields=isWholesale?PUBLIC_PHYSICAL_FIELDS.concat(['Precio_Mayorista_COP']):PUBLIC_PHYSICAL_FIELDS;
  const product=pick_(row,fields);
  fields.forEach(key=>{if(!Object.prototype.hasOwnProperty.call(product,key))product[key]='';});
  product.ID_Producto=id;product.Nombre_Producto=name;product.Tipo_Producto='FISICO';
  ['Disponible','Controla_Inventario','Destacado','Aplica_Carrito','Aplica_Descuento','Aplica_Premios','Requiere_Confirmacion'].forEach(key=>{
   product[key]=physicalYes_(row[key])?'SI':'NO';
  });
  product.Precio_Publico_COP=Math.max(0,parseMoney(row.Precio_Publico_COP));
  if(isWholesale)product.Precio_Mayorista_COP=Math.max(0,parseMoney(row.Precio_Mayorista_COP));
  const rawStock=row.Stock;
  const stock=typeof rawStock==='number'?rawStock:Number(String(rawStock===undefined||rawStock===null?'':rawStock).trim().replace(',','.'));
  product.Stock=Number.isFinite(stock)?Math.max(0,Math.floor(stock)):0;
  const order=Number(String(row.Orden===undefined||row.Orden===null?'':row.Orden).trim());
  product.Orden=String(row.Orden===undefined||row.Orden===null?'':row.Orden).trim()!==''&&Number.isFinite(order)?order:9999;
  product.Tipo_Inventario=String(row.Tipo_Inventario||'').trim().toUpperCase();
  product.Disponibilidad_Proveedor=String(row.Disponibilidad_Proveedor||'').trim().toUpperCase();
  if(product.Tipo_Inventario==='DROPSHIPPING'){product.Controla_Inventario='NO';product.Stock=0;}
  product.Agotado=(product.Controla_Inventario==='SI'&&product.Stock<=0)||(product.Tipo_Inventario==='DROPSHIPPING'&&product.Disponibilidad_Proveedor==='AGOTADO');
  const price=isWholesale?product.Precio_Mayorista_COP:product.Precio_Publico_COP;
  product.Permite_Compra=product.Aplica_Carrito==='SI'&&!product.Agotado&&price>0;
  products.push(product);
 });
 return products.sort((a,b)=>a.Orden-b.Orden||a.Nombre_Producto.localeCompare(b.Nombre_Producto,'es'));
}
function login_(password){
 REQUEST_ROWS=Object.create(null);
 const pass=String(password||'').trim(); if(!pass||pass.length>256)return {ok:false,error:'INVALID_CREDENTIALS'};
 const cache=CacheService.getScriptCache();
 const key='attempt:'+Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256,pass));
 const lock=LockService.getScriptLock(); if(!lock.tryLock(3000))return {ok:false,error:'RETRY_LATER'};
 try{const n=Number(cache.get(key)||0);if(n>=5)return {ok:false,error:'RETRY_LATER'};cache.put(key,String(n+1),300);}finally{lock.releaseLock();}
 const sheets=SpreadsheetApp.openById(SPREADSHEET_ID).getSheets();
 const user=readSheet(sheets,'panel_usuarios').find(r=>String(r.CLAVE||'').trim()===pass&&String(r.ESTADO||'').trim().toUpperCase()==='ACTIVO');
 const global=readSheet(sheets,'Datos_Negocio').find(r=>String(r.ID_Informacion).toLowerCase()==='info0002');
 if(!user && !(global && String(global.Dato_Informacion||'').trim()===pass))return {ok:false,error:'INVALID_CREDENTIALS'};
 const data=buildPublic_(sheets);
 // Solo tarifas de venta mayorista; no costos reales ni credenciales.
 const extra=['Precio_Mayorista_Mes_COP','Precio_Mayorista_Conversion_Pais','Costo_Precio_Mayorista_Dia','Costo_Precio_Mayorista_Dia_Conversion_Pais'];
 data.servicios=readSheet(sheets,'Servicios').filter(r=>String(r.Disponible).toUpperCase()==='SI').map(r=>pick_(r,PUBLIC_SERVICE_FIELDS.concat(extra)));
 data.reglas=readSheet(sheets,'Reglas');
 data.productosFisicos=buildPhysicalProducts_(sheets,true);
 return {ok:true,user:String(user?user.NOMBRE_USUARIO:'Mayorista'),data:data};
}
// Guarda el texto que se entregará, sin parsear ni descomprimir en cada visita.
function putCachedText_(key,text){
 const cache=CacheService.getScriptCache(),gen=Utilities.getUuid(),batch={};
 let count=0,start=0;
 while(start<text.length){let end=Math.min(start+CACHE_CHUNK_SIZE,text.length);const c=text.charCodeAt(end-1);if(end<text.length&&c>=0xD800&&c<=0xDBFF)end--;batch[key+':'+gen+':'+count++]=text.slice(start,end);start=end;}
 const parsedTime=Date.parse(JSON.parse(text).timestamp||'');const builtAt=Number.isFinite(parsedTime)?parsedTime:Date.now();
 cache.putAll(batch,CACHE_TTL);
 cache.put(key+':manifest',JSON.stringify({gen:gen,count:count,builtAt:builtAt}),CACHE_TTL);
}
function getCachedText_(key){
 try{
  const cache=CacheService.getScriptCache(),raw=cache.get(key+':manifest');if(!raw)return null;
  const m=JSON.parse(raw);if(Date.now()-m.builtAt>MAX_DATA_AGE_MS)return null;
  const keys=Array.from({length:m.count},(_,i)=>key+':'+m.gen+':'+i),parts=cache.getAll(keys);
  if(keys.some(k=>parts[k]===undefined||parts[k]===null))return null;
  return keys.map(k=>parts[k]).join('');
 }catch(err){return null;}
}
function putLargeCache(key,value){putCachedText_(key,JSON.stringify(value));}
function getLargeCache(key){const text=getCachedText_(key);return text?JSON.parse(text):null;}
function clearLargeCache(key){CacheService.getScriptCache().remove(key+':manifest');}
// No borrar la última copia útil al editar: el activador reconstruye en <=5 min aprox.
function invalidarCacheNenu(){console.log('Cambio registrado: se publicará en la próxima reconstrucción programada. Para inmediato, ejecuta rebuildAllCache.');}
function onEdit(e){invalidarCacheNenu();}
function instalarActualizacionAutomatica(){
 const ss=SpreadsheetApp.openById(SPREADSHEET_ID),triggers=ScriptApp.getProjectTriggers();
 if(!triggers.some(t=>t.getHandlerFunction()==='calentarCacheNenu'))ScriptApp.newTrigger('calentarCacheNenu').timeBased().everyMinutes(5).create();
 rebuildAllCache();
}
function calentarCacheNenu(){const start=Date.now();rebuildPublic_(true);logTiming_('scheduled_rebuild',start);}
function rebuildAllCache(){const start=Date.now();const text=rebuildPublic_(true);logTiming_('manual_rebuild',start);return {ok:true,apiVersion:API_VERSION,bytes:text.length,snapshotConfigured:!!snapshotId_()};}
function getCatalogo(){return getBootstrap_();}
function getConfig(){return getBootstrap_();}
function getRemesas(){return getBootstrap_();}
function getAll(){return getBootstrap_();}
function readSheet(sheets,name){
 if(Object.prototype.hasOwnProperty.call(REQUEST_ROWS,name))return REQUEST_ROWS[name];
 const sheet=getSheetFlexible_(sheets,name);if(!sheet||sheet.getLastRow()<2||!sheet.getLastColumn())return [];
 const raw=sheet.getRange(1,1,sheet.getLastRow(),sheet.getLastColumn()).getValues(),headers=raw.shift().map(h=>String(h).trim().replace('Dia_ Conversion','Dia_Conversion'));
 return REQUEST_ROWS[name]=raw.filter(r=>r.some(v=>v!==''&&v!==null)).map(r=>{const o={};headers.forEach((h,i)=>{if(h)o[h]=r[i] instanceof Date?r[i].toISOString():r[i];});return o;});
}
function getSheetFlexible_(sheets,name){const norm=v=>String(v).trim().toLowerCase().replace(/[\s_-]/g,'');return sheets.find(s=>norm(s.getName())===norm(name))||null;}
function parseMoney(val){
 if(typeof val==='number')return Number.isFinite(val)?val:0;
 let s=String(val||'').replace(/[^\d.,-]/g,'');if(!s)return 0;
 if(s.includes(',')&&s.includes('.'))s=s.lastIndexOf(',')>s.lastIndexOf('.')?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'');
 else if(s.includes(','))s=/^-?\d{1,3}(,\d{3})+$/.test(s)?s.replace(/,/g,''):s.replace(',','.');
 else if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'');
 return Number(s)||0;
}
function json(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}

// Motores operativos conservados del original.
function actualizarTasasMonedas(){
  const apiKey = PropertiesService.getScriptProperties().getProperty('EXCHANGE_RATE_API_KEY');
  if(!apiKey) return 'Configura EXCHANGE_RATE_API_KEY en Propiedades del script.';
  const url = 'https://v6.exchangerate-api.com/v6/' + encodeURIComponent(apiKey) + '/latest/COP';
  try {
    const opciones = { method: "get", muteHttpExceptions: true };
    const res = UrlFetchApp.fetch(url, opciones);
    const responseCode = res.getResponseCode();
    
    if (responseCode !== 200) return "❌ Error de API: " + res.getContentText();
    
    const data = JSON.parse(res.getContentText());
    if(data.result !== "success") return "❌ Formato incorrecto.";

    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    let sheet = getSheetFlexible_(sheets, "Monedas");
    if (!sheet) {
        sheet = ss.insertSheet("Monedas");
        sheet.appendRow(["Moneda", "Tasa_vs_COP", "Ultima_Actualizacion"]);
    }

    const monedas = ["COP","USD","EUR","PEN","MXN","VES","CLP"];
    const rows = [];
    monedas.forEach(m=>{ rows.push([m,data.conversion_rates[m],new Date().toLocaleString()]); });

    if (sheet.getLastRow() > 1) sheet.getRange(2, 1, sheet.getLastRow() - 1, 3).clearContent();
    sheet.getRange(2,1,rows.length,3).setValues(rows);
    sheet.getRange(2, 2, rows.length, 1).setNumberFormat("0.00000000");

    rebuildAllCache();
    return "✅ Tasas actualizadas a 8 decimales y caché recompilado.";
  } catch (e) {
    return "❌ Error interno: " + e.toString();
  }
}

/*
================================
MOTOR PRORRATEO
================================
*/
function actualizarProrrateoDiario(){
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheets = ss.getSheets();
  const sheet = getSheetFlexible_(sheets, "Servicios");
  if(!sheet) return "Error: Hoja Servicios no encontrada.";

  const data = sheet.getDataRange().getValues();
  if(data.length < 2) return "Hoja vacía.";

  const headers = data[0].map(h => String(h).trim());

  const colCategoria = headers.indexOf("Categoria");
  const colDisponible = headers.indexOf("Disponible");
  const colFechaFin = headers.indexOf("Fecha_Finalizacion");
  const colDias = headers.indexOf("Dias");
  const colCostoMayDia = headers.indexOf("Costo_Precio_Mayorista_Dia");
  const colPrecioMayMes = headers.indexOf("Precio_Mayorista_Mes_COP");
  const colCostoMayDiaConv = headers.indexOf("Costo_Precio_Mayorista_Dia_Conversion_Pais");
  const colPrecioMayConv = headers.indexOf("Precio_Mayorista_Conversion_Pais");
  const colCostoSugDia = headers.indexOf("Costo_Precio_Sugerido_Dia");
  const colPrecioSugMes = headers.indexOf("Precio_Sugerido_Mes_COP");
  const colCostoSugDiaConv = headers.findIndex(h => h.replace(/\s+/g, '') === "Costo_Precio_Sugerido_Dia_Conversion_Pais".replace(/\s+/g, ''));
  const colPrecioSugConv = headers.indexOf("Precio_Sugerido_Conversion_Pais");

  const required=[colCategoria,colDisponible,colFechaFin,colDias,colCostoMayDia,colPrecioMayMes,colCostoMayDiaConv,colPrecioMayConv,colCostoSugDia,colPrecioSugMes,colPrecioSugConv];
  if(required.some(i=>i<0))return 'Faltan encabezados de prorrateo: no se modificó la hoja.';
  const today = new Date();
  today.setHours(0,0,0,0);
  let actualizados = 0;

  for(let i=1;i<data.length;i++){
    let row = data[i];
    if (String(row[colCategoria]).trim() === "Categoria Servicios X Dia" && String(row[colDisponible]).trim().toUpperCase() === "SI") {
      let fechaFinValue = row[colFechaFin];
      let fechaFin = null;

      if (fechaFinValue instanceof Date) fechaFin = fechaFinValue;
      else if (typeof fechaFinValue === 'string') {
        let parts = fechaFinValue.split('/');
        if (parts.length === 3) fechaFin = new Date(parts[2], parts[1]-1, parts[0]);
        else fechaFin = new Date(fechaFinValue);
      }

      if(!fechaFin || isNaN(fechaFin.getTime())) continue;

      fechaFin.setHours(0,0,0,0);
      let diff = Math.ceil((fechaFin.getTime() - today.getTime())/(1000*60*60*24));
      
      if (diff <= 0) {
         diff = 0;
         sheet.getRange(i + 1, colDisponible + 1).setValue("NO");
      }

      sheet.getRange(i+1,colDias+1).setValue(diff);

      let costoMayDia = parseMoney(row[colCostoMayDia]);
      sheet.getRange(i + 1, colPrecioMayMes + 1).setValue(diff * costoMayDia);

      let costoMayDiaConv = parseMoney(row[colCostoMayDiaConv]);
      sheet.getRange(i + 1, colPrecioMayConv + 1).setValue(diff * costoMayDiaConv);

      let costoSugDia = parseMoney(row[colCostoSugDia]);
      sheet.getRange(i + 1, colPrecioSugMes + 1).setValue(diff * costoSugDia);

      if (colCostoSugDiaConv !== -1) {
         let costoSugDiaConvValor = parseMoney(row[colCostoSugDiaConv]);
         sheet.getRange(i + 1, colPrecioSugConv + 1).setValue(diff * costoSugDiaConvValor);
      }
      actualizados++;
    }
  }
  rebuildAllCache();
  return "✅ Prorrateo actualizado (" + actualizados + " servicios) y caché recompilado.";
}

/*
================================
MOTOR PGE (COMBOS)
================================
*/
function generarCatalogoAvanzado(){
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheets = ss.getSheets();
    const sheetServicios = getSheetFlexible_(sheets, "Servicios");
    const sheetReglas = getSheetFlexible_(sheets, "Reglas");
    const sheetCatalogo = getSheetFlexible_(sheets, "Catalogo_PGE");

    if (!sheetServicios || !sheetReglas || !sheetCatalogo) return "Faltan hojas críticas.";

    const serviciosRaw = sheetServicios.getDataRange().getValues();
    const headersServ = serviciosRaw[0].map(h => String(h).trim());

    const colId = headersServ.indexOf("ID_Servicio");
    const colNombre = headersServ.indexOf("Nombre_Producto");
    const colCostoPremio = headersServ.indexOf("Costo_Premio"); 
    const colPrecioPublico = headersServ.indexOf("Precio_Sugerido_Mes_COP"); 
    const colDisp = headersServ.indexOf("Disponible");

    let inventario = [];
    for (let i = 1; i < serviciosRaw.length; i++) {
      const row = serviciosRaw[i];
      if (String(row[colDisp]).trim().toUpperCase() !== "SI") continue;
      const costoP = parseMoney(row[colCostoPremio]);
      const precioP = parseMoney(row[colPrecioPublico]);
      if (costoP > 0) inventario.push({ id: row[colId], nombre: row[colNombre], costo_regalo: costoP, valor_publico: precioP });
    }

    const reglasRaw = sheetReglas.getDataRange().getValues();
    const headersReglas = reglasRaw[0].map(h => String(h).trim());
    const idxNivel = headersReglas.indexOf("Apps_Combo");
    const idxPresupuesto = headersReglas.indexOf("Costo_Premio");

    let premiosFinales = [];
    let contadorGlobal = 1;

    for (let r = 1; r < reglasRaw.length; r++) {
      const nivel = reglasRaw[r][idxNivel];
      const presupuestoMax = parseMoney(reglasRaw[r][idxPresupuesto]);
      if (!nivel || presupuestoMax <= 0) continue;

      const combos = buscarCombos(inventario, presupuestoMax, 5, 0.6, parseInt(nivel) >= 5);
      combos.slice(0, 10).forEach(combo => {
        premiosFinales.push([ "PGE_" + nivel + "_" + (contadorGlobal++), combo.nombres.join(" + "), combo.valorTotalPublico, nivel, "Premios " + nivel + " Apps" ]);
      });
    }

    if (sheetCatalogo.getLastRow() > 1) sheetCatalogo.getRange(2, 1, sheetCatalogo.getLastRow() - 1, 5).clearContent();
    if (premiosFinales.length > 0) {
      sheetCatalogo.getRange(2, 1, premiosFinales.length, 5).setValues(premiosFinales);
      rebuildAllCache();
      return "✅ Catálogo PGE generado (" + premiosFinales.length + " combinaciones) y caché recompilado.";
    }
    rebuildAllCache();
    return "⚠️ No se generaron combinaciones (revisa presupuestos).";
  } catch(e) { return "❌ Error PGE: " + e.toString(); }
}

function buscarCombos(items, targetCosto, maxDepth, minRatio, allowRepeat) {
  var resultados = [];
  function backtrack(startIndex, currentCombo, currentCostoTotal, currentValorPublicoTotal) {
    if (currentCombo.length > 0 && currentCostoTotal <= targetCosto && currentCostoTotal >= targetCosto * minRatio) {
      resultados.push({ nombres: currentCombo.map(i => i.nombre), valorTotalPublico: currentValorPublicoTotal });
    }
    if (currentCombo.length >= maxDepth || resultados.length > 40) return;
    for (var i = startIndex; i < items.length; i++) {
      const item = items[i];
      if (currentCostoTotal + item.costo_regalo > targetCosto) continue;
      currentCombo.push(item);
      backtrack(allowRepeat ? i : i + 1, currentCombo, currentCostoTotal + item.costo_regalo, currentValorPublicoTotal + item.valor_publico);
      currentCombo.pop();
    }
  }
  backtrack(0, [], 0, 0);
  return resultados.sort((a, b) => b.valorTotalPublico - a.valorTotalPublico);
}

