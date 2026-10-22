const http=require('node:http');
const fs=require('node:fs');
const path=require('node:path');
const {equal,upload}=require('./integration.cjs');
function createServer(config,ledger,fetcher=fetch) {
  let busy=false;
  return http.createServer(async(req,res)=>{
    const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));};
    const origin=req.headers.origin;
    if(origin && origin!==config.allowedOrigin) return send(403,{error:'Origin is not allowed.'});
    if(origin) {res.setHeader('Access-Control-Allow-Origin',origin);res.setHeader('Vary','Origin');}
    if(req.method==='OPTIONS') {res.setHeader('Access-Control-Allow-Headers','Content-Type,Authorization');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS');return send(204,{});}
    if(req.url!=='/api/upload'||req.method!=='POST') return send(404,{error:'Not found.'});
    if(!equal(req.headers.authorization,'Bearer '+config.accessToken)||!config.accessToken||config.accessToken.length<32) return send(401,{error:'Server access token required.'});
    if(!String(req.headers['content-type']).startsWith('application/json')) return send(415,{error:'Send application/json.'});
    if(busy) return send(429,{error:'One upload is already in progress. No automatic retry.'});
    busy=true;
    try {
      let raw='';let size=0;
      for await (const chunk of req) {size+=chunk.length;if(size>512000){send(413,{error:'Design exceeds 500 KB.'});return;}raw+=chunk;}
      let body;try{body=JSON.parse(raw);}catch{return send(400,{error:'Invalid JSON.'});}
      const result=await upload(body,config,ledger,fetcher);send(200,result);
    } catch(e) {send(e.status||500,{error:e.status?e.message:'Server could not complete the request. Check Klaviyo before retrying.'});}
    finally {busy=false;}
  });
}
function diskLedger(directory) {
  fs.mkdirSync(directory,{recursive:true,mode:0o700});
  const filename=path.join(directory,'requests.json');
  const entries=fs.existsSync(filename)?JSON.parse(fs.readFileSync(filename,'utf8')):{};
  return {get:k=>Object.hasOwn(entries,k)?entries[k]:undefined,set(k,v){if(Object.keys(entries).length>=10000&&!Object.hasOwn(entries,k))throw new Error('Ledger maintenance required.');entries[k]=v;fs.writeFileSync(filename+'.tmp',JSON.stringify(entries),{mode:0o600});fs.renameSync(filename+'.tmp',filename);}};
}
if(require.main===module) {
  const env=process.env;
  if(!env.SERVER_ACCESS_TOKEN||env.SERVER_ACCESS_TOKEN.length<32) throw new Error('Set a random SERVER_ACCESS_TOKEN of at least 32 characters in your protected server environment.');
  const config={accessToken:env.SERVER_ACCESS_TOKEN,allowedOrigin:env.ALLOWED_ORIGIN||'null',allowWrite:env.ALLOW_KLAVIYO_WRITE==='true',klaviyoKey:env.KLAVIYO_PRIVATE_KEY,paddleApiKey:env.PADDLE_API_KEY,paddlePriceId:env.PADDLE_PRICE_ID,paddleCustomerId:env.PADDLE_CUSTOMER_ID,paddleSandbox:env.PADDLE_SANDBOX==='true',licensePublicKey:env.LICENSE_PUBLIC_KEY_FILE?fs.readFileSync(env.LICENSE_PUBLIC_KEY_FILE):null};
  const server=createServer(config,diskLedger(env.DATA_DIR||path.join(__dirname,'../.data')));
  server.requestTimeout=20000;server.headersTimeout=10000;
  server.listen(Number(env.PORT||8799),'127.0.0.1',()=>console.log('Figma2Klaviyo server listening on loopback. Upload '+(config.allowWrite?'enabled':'disabled')+'.'));
}
module.exports={createServer,diskLedger};
