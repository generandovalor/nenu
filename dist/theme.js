/* Preferencia explícita: claro por defecto, oscuro solo si el usuario lo elige. */
const NenuTheme = {
  key:'nenu_theme_v1',
  current:'light',
  apply(value,persist=false) {
    this.current=value==='dark'?'dark':'light';
    const root=document.documentElement;
    root.dataset.theme=this.current;
    root.classList.toggle('dark',this.current==='dark');
    root.style.colorScheme=this.current;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content',this.current==='dark'?'#101110':'#e4e6dc');
    if(persist){try{window.localStorage.setItem(this.key,this.current);}catch(e){}}
    this.updateControl();
  },
  updateControl() {
    const button=document.getElementById('theme-toggle');if(!button)return;
    const dark=this.current==='dark';button.setAttribute('aria-checked',String(dark));
    button.title=dark?'Activar modo claro':'Activar modo oscuro';
    button.querySelector('[data-theme-icon]').textContent=dark?'☾':'☀';
    button.querySelector('[data-theme-label]').textContent=dark?'Oscuro':'Claro';
  },
  toggle(){this.apply(this.current==='dark'?'light':'dark',true);}
};
let nenuSavedTheme='light';try{nenuSavedTheme=window.localStorage.getItem(NenuTheme.key)||'light';}catch(e){}
NenuTheme.apply(nenuSavedTheme);
document.addEventListener('DOMContentLoaded',()=>NenuTheme.updateControl());
window.addEventListener('storage',event=>{if(event.key===NenuTheme.key||event.key===null)NenuTheme.apply(event.key===null?'light':event.newValue);});
