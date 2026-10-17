from pathlib import Path
import re
import sys,types,subprocess
# Use the runtime's built-in Brotli codec without adding a production dependency.
codec=types.ModuleType('brotli');codec.MODE_FONT=2;codec.MODE_TEXT=1

def transform(data,compress=False,mode=2):
 script="const z=require('node:zlib');const a=[];process.stdin.on('data',c=>a.push(c));process.stdin.on('end',()=>process.stdout.write("+("z.brotliCompressSync(Buffer.concat(a),{params:{[z.constants.BROTLI_PARAM_MODE]:"+str(mode)+"}})" if compress else "z.brotliDecompressSync(Buffer.concat(a))")+"));"
 return subprocess.run(['node','-e',script],input=data,stdout=subprocess.PIPE,check=True).stdout
codec.decompress=lambda data:transform(data);codec.compress=lambda data,mode=2:transform(data,True,mode);sys.modules['brotli']=codec
from fontTools import subset
from fontTools.ttLib import TTFont
r=Path(__file__).resolve().parent.parent/'dist';css=(r/'icons/css/all.min.css').read_text()
texts='\n'.join(p.read_text() for p in r.rglob('*') if p.suffix in ['.html','.js'] )
used=set(re.findall(r'\bfa-[a-z0-9-]+',texts))
rules=list(re.finditer(r'([^{}]+)\{content:"\\([a-f0-9]+)"\}',css))
first=rules[0].start();selected=[];codepoints=set()
for m in rules:
 selectors=m[1].strip();names=set(re.findall(r'\.((?:fa-)[a-z0-9-]+)',selectors))
 if names&used:
  selected.append(m[0]);codepoints.add(int(m[2],16))
license='/*! Font Awesome Free 6.5.2; Fonticons, Inc.; Icons CC BY 4.0, fonts SIL OFL 1.1, code MIT. https://fontawesome.com/license/free */\n'
faces=''
for kind,weight,family in [('solid',900,'Free'),('regular',400,'Free'),('brands',400,'Brands')]:
 source=r/f'icons/webfonts/fa-{kind}-{weight}.woff2';dest=r/f'icons/webfonts/nenu-{kind}.woff2'
 font=TTFont(source);font.recalcTimestamp=False;options=subset.Options();options.flavor='woff2';options.name_IDs=['*'];options.name_legacy=True
 sub=subset.Subsetter(options=options);sub.populate(unicodes=codepoints);sub.subset(font)
 for rec in font['name'].names:
  if rec.nameID in [1,3,4,6,16,21]:
   name='NenuIcons'+kind.title();rec.string=name.encode(rec.getEncoding(),errors='replace')
 font.save(dest)
 faces+=f'@font-face{{font-family:"Font Awesome 6 {family}";font-style:normal;font-weight:{weight};font-display:swap;src:url(/icons/webfonts/nenu-{kind}.woff2) format("woff2")}}'
base=css[:first]
result=license+base+'\n'+''.join(selected)+faces+'.fa-solid,.fas{font-weight:900}.fa-regular,.far{font-weight:400}.fa-brands,.fab{font-weight:400}'
(r/'icons/css/nenu-icons.css').write_text(result)
print('Icon CSS:',len(css),'->',len(result),'bytes;',len(selected),'glyph rules;',len(used),'referenced icon classes')
print('Subset fonts:',sum((r/f'icons/webfonts/nenu-{k}.woff2').stat().st_size for k in ['solid','regular','brands']),'bytes')
