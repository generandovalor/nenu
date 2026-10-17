// Same Sheet/backend. Never cache credentials or authenticated responses.
const types = new Set(['bootstrap', 'catalogo', 'config', 'remesas', 'all', 'health']);
const headers = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'Netlify-CDN-Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff'
};
const fail = (status, error) => new Response(JSON.stringify({ok:false,error}), {status,headers});

export function createHandler({fetchImpl = globalThis.fetch, getUrl = () => process.env.NENU_GAS_URL, timeoutMs = 12000} = {}) {
  return async request => {
    if (!['GET','POST'].includes(request.method)) {
      const response = fail(405, 'METHOD_NOT_ALLOWED');
      response.headers.set('Allow', 'GET, POST');
      return response;
    }
    let upstream;
    try {
      upstream = new URL(getUrl());
      if (upstream.protocol !== 'https:' || upstream.hostname !== 'script.google.com' ||
          !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(upstream.pathname) ||
          upstream.username || upstream.password || upstream.port || upstream.search || upstream.hash) throw Error();
    } catch { return fail(503, 'BACKEND_NOT_CONFIGURED'); }
    const options = {method:request.method,redirect:'follow'};
    if (request.method === 'GET') {
      const query = new URL(request.url).searchParams;
      if ([...query.keys()].some(key => key !== 'type') || query.getAll('type').length > 1) return fail(400, 'INVALID_QUERY');
      const type = query.get('type') || 'bootstrap';
      if (!types.has(type)) return fail(400, 'UNKNOWN_TYPE');
      upstream.searchParams.set('type',type);
    } else {
      const length = Number(request.headers.get('content-length') || 0);
      if (length > 8192) return fail(413, 'REQUEST_TOO_LARGE');
      let body;
      try {
        const text = await request.text();
        if (Buffer.byteLength(text) > 8192) return fail(413, 'REQUEST_TOO_LARGE');
        body = JSON.parse(text);
      } catch { return fail(400, 'INVALID_JSON'); }
      if (!body || body.action !== 'login' || typeof body.password !== 'string' ||
          !body.password || body.password.length > 2048) return fail(400, 'INVALID_LOGIN');
      options.headers = {'Content-Type':'text/plain;charset=utf-8'};
      options.body = JSON.stringify({action:'login',password:body.password});
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(),timeoutMs);
    options.signal = controller.signal;
    try {
      const response = await fetchImpl(upstream.toString(),options);
      if (!response.ok) return fail(502, 'BACKEND_UNAVAILABLE');
      const body = await response.text();
      const data = JSON.parse(body);
      if (!data || typeof data !== 'object' || Array.isArray(data)) return fail(502, 'INVALID_BACKEND_RESPONSE');
      return new Response(body,{status:200,headers});
    } catch {
      return fail(controller.signal.aborted ? 504 : 502,
        controller.signal.aborted ? 'BACKEND_TIMEOUT' : 'BACKEND_UNAVAILABLE');
    } finally { clearTimeout(timer); }
  };
}
export default createHandler();
export const config = {path:'/api/catalogo'};
