import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createHandler, config} from '../netlify/functions/catalogo.mjs';
const upstream = 'https://script.google.com/macros/s/TEST_ID/exec';
const req = (path='', options={}) => new Request('https://tienda.example/api/catalogo'+path, options);
const make = fetchImpl => createHandler({getUrl:()=>upstream,fetchImpl});
test('route, public GET and no cache/credential forwarding',async()=>{
  assert.equal(config.path,'/api/catalogo');
  const handler=make(async(url,options)=>{
    assert.equal(url,upstream+'?type=bootstrap');
    assert.equal(options.redirect,'follow');
    assert.equal(options.headers,undefined);
    return Response.json({apiVersion:'5.4.0',productosFisicos:[]});
  });
  const response=await handler(req('?type=bootstrap',{headers:{Cookie:'private=1'}}));
  assert.equal(response.status,200);
  assert.equal(response.headers.get('Cache-Control'),'no-store');
  assert.equal(response.headers.get('Netlify-CDN-Cache-Control'),'no-store');
  assert.equal((await response.json()).apiVersion,'5.4.0');
});
test('login preserves password exactly and excludes arbitrary input',async()=>{
  const handler=make(async(url,options)=>{
    assert.equal(url,upstream);
    assert.equal(options.method,'POST');
    assert.deepEqual(options.headers,{'Content-Type':'text/plain;charset=utf-8'});
    assert.deepEqual(JSON.parse(options.body),{action:'login',password:' TEST contraseña '});
    return Response.json({ok:true,user:'TEST',data:{productosFisicos:[]}});
  });
  const r=await handler(req('',{method:'POST',body:JSON.stringify({action:'login',password:' TEST contraseña ',url:'https://example.com',admin:true})}));
  assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
  assert.equal(r.headers.get('Cache-Control'),'no-store');
});
test('reject invalid methods, queries and POSTs before calling backend',async()=>{
  const handler=make(()=>{throw Error('must not fetch');});
  for(const [path,options,status] of [
    ['',{method:'DELETE'},405],
    ['?url=https://example.com',{},400],
    ['?type=auth',{},400],
    ['?type=config&type=bootstrap',{},400],
    ['',{method:'POST',body:'{'},400],
    ['',{method:'POST',body:'{"action":"erase","password":"x"}'},400],
    ['',{method:'POST',body:'{"action":"login","password":""}'},400],
    ['',{method:'POST',body:'x'.repeat(8193)},413]
  ]) assert.equal((await handler(req(path,options))).status,status);
});
test('server configuration cannot act as an open proxy',async()=>{
  for(const url of [undefined,'http://script.google.com/macros/s/x/exec','https://example.com/','https://script.google.com/macros/s/x/exec?password=x']){
    const h=createHandler({getUrl:()=>url});
    assert.equal((await h(req())).status,503);
  }
});
test('backend failures and HTML responses return generic errors',async()=>{
  for(const fetcher of [
    async()=>new Response('<html>Sign in</html>'),
    async()=>new Response('secret upstream message',{status:403}),
    async()=>{throw Error('secret upstream message');},
    async()=>Response.json([])
  ]){
    const r=await make(fetcher)(req());assert.equal(r.status,502);
    assert(!(await r.text()).includes('secret'));
  }
});
test('timeout is bounded and returns no credentials',async()=>{
  const h=createHandler({getUrl:()=>upstream,timeoutMs:5,fetchImpl:(_,options)=>new Promise((resolve,reject)=>options.signal.addEventListener('abort',()=>reject(Error('aborted'))))});
  const r=await h(req());assert.equal(r.status,504);
  assert.equal((await r.json()).error,'BACKEND_TIMEOUT');
});
