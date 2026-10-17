import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const root=new URL('../',import.meta.url);
const read=path=>readFileSync(new URL(path,root));
const manifest=JSON.parse(read('SOURCE-MANIFEST.json'));
const original=read('.env.example').toString().match(/^NENU_GAS_URL=(.+)$/m)[1];
test('all original public assets retained, HTML differs only in API address',()=>{
  for(const [path,hash] of Object.entries(manifest.files)){
    let bytes=read('dist/'+path);
    if(path.endsWith('.html')){
      const text=bytes.toString();
      assert.equal((text.match(/GAS_URL: "\/api\/catalogo"/g)||[]).length,1);
      bytes=Buffer.from(text.replace('GAS_URL: "/api/catalogo"','GAS_URL: "'+original+'"'));
    }
    assert.equal(createHash('sha256').update(bytes).digest('hex'),hash,path+' must preserve original UX assets');
  }
});
test('four direct routes and SEO resources are included',()=>{
  for(const p of ['index.html','catalogo/index.html','remesas/index.html','mayoristas/index.html','sitemap.xml','robots.txt','404.html']){
    assert(existsSync(new URL('dist/'+p,root)),p);
  }
  assert(!read('dist/sitemap.xml').toString().includes('/mayoristas/'));
  for(const path of ['index.html','catalogo/index.html','remesas/index.html','mayoristas/index.html']){
    const html=read('dist/'+path).toString();
    assert(html.includes('name="viewport"'));
    assert(html.includes('data-nenu-theme'));
    assert(html.includes('id="nenu-initial"'));
    assert(!/googletagmanager|google-analytics\.com/.test(html));
  }
});
