/* YouTube and Maps only connect after an explicit user action. */
const EmbedMedia={
 videoUrl(raw){
  const value=String(raw||'').trim(),list=value.match(/[?&]list=([a-zA-Z0-9_-]{10,100})/),video=value.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  if(list)return 'https://www.youtube-nocookie.com/embed/videoseries?list='+list[1];
  if(video)return 'https://www.youtube-nocookie.com/embed/'+video[1];
  if(/^PL[a-zA-Z0-9_-]{8,98}$/.test(value))return 'https://www.youtube-nocookie.com/embed/videoseries?list='+value;
  return '';
 },
 mapUrl(raw){try{const u=new URL(raw);return u.protocol==='https:'&&['www.google.com','maps.google.com'].includes(u.hostname)&&u.pathname.startsWith('/maps/embed')?u.href:'';}catch(e){return '';}},
 prepare(container,kind,src){
  if(!container)return;if(container.dataset.embedSrc===src&&container.dataset.embedKind===kind&&container.childElementCount)return;
  container.dataset.embedSrc=src;container.dataset.embedKind=kind;container.dataset.loaded='false';
  const title=kind==='map'?'Cargar mapa de ubicación':'Ver presentación de Nenu',note=kind==='map'?'Conectar con Google Maps':'El video se carga al reproducirlo';
  container.innerHTML='<button type="button" class="embed-facade" onclick="EmbedMedia.load(this.parentElement)"><span class="embed-facade-symbol" aria-hidden="true">'+(kind==='map'?'↗':'▶')+'</span><strong>'+title+'</strong><span>'+note+'</span></button>';
 },
 load(container){
  const kind=container.dataset.embedKind,raw=container.dataset.embedSrc,src=kind==='map'?this.mapUrl(raw):this.videoUrl(raw);if(!src)return;
  const frame=document.createElement('iframe');frame.title=kind==='map'?'Ubicación del punto de pago de Nenu':'Presentación de Contenido Digital Nenu';frame.src=src;frame.allowFullscreen=true;frame.referrerPolicy='strict-origin-when-cross-origin';if(kind==='video')frame.allow='encrypted-media; picture-in-picture; fullscreen';
  container.replaceChildren(frame);container.dataset.loaded='true';
 }
};
