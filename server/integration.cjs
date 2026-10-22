const crypto = require('node:crypto');
const {render} = require('../src/export.cjs');
class IntegrationError extends Error {
  constructor(status, message) {super(message);this.status=status;}
}
const deny = (status,message) => {throw new IntegrationError(status,message);};
function equal(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || !a || !b) return false;
  const x=Buffer.from(a),y=Buffer.from(b);
  return x.length===y.length && crypto.timingSafeEqual(x,y);
}
function verifyLicense(token, config) {
  if (!config.licensePublicKey) deny(503,'Licensing is not configured. Free HTML export remains available.');
  if (typeof token !== 'string' || token.length>8192) deny(403,'Invalid license.');
  const parts=token.split('.');
  if(parts.length!==2) deny(403,'Invalid license.');
  let claims;
  try {
    if (!crypto.verify(null,Buffer.from(parts[0]),config.licensePublicKey,Buffer.from(parts[1],'base64url'))) throw 0;
    claims=JSON.parse(Buffer.from(parts[0],'base64url').toString());
  } catch {deny(403,'Invalid license signature.');}
  if (claims.product!=='figma2klaviyo' || !Number.isSafeInteger(claims.exp) || claims.exp<=Date.now()/1000 || claims.exp>Date.now()/1000+32*86400 || !/^txn_[a-z0-9]{26}$/.test(claims.transaction) || claims.customer!==config.paddleCustomerId) deny(403,'License expired or belongs to another account.');
  return claims;
}
async function paidTransaction(transaction, config, fetcher=fetch) {
  if (!config.paddleApiKey || !config.paddlePriceId || !config.paddleCustomerId) deny(503,'Paddle account verification is not configured.');
  const host=config.paddleSandbox ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
  let response;
  try {response=await fetcher(host+'/transactions/'+encodeURIComponent(transaction)+'?include=adjustments',{headers:{Authorization:'Bearer '+config.paddleApiKey},signal:AbortSignal.timeout(8000),redirect:'error'});} catch {deny(503,'Payment verification unavailable. No upload attempted.');}
  if(!response.ok) deny(503,'Payment verification unavailable. No upload attempted.');
  let data;
  try{data=(await response.json()).data;}catch{deny(503,'Payment verification returned an invalid response.');}
  if (!data || data.id!==transaction || data.status!=='completed' || data.customer_id!==config.paddleCustomerId || data.subscription_id || !data.items?.some(i=>i.price?.id===config.paddlePriceId) || !Array.isArray(data.adjustments) || data.adjustments.some(a=>a.action==='refund'||a.action==='chargeback'||a.action==='chargeback_warning')) deny(403,'No eligible one-time payment, or payment refunded/disputed.');
  return data;
}
async function upload(input, config, ledger, fetcher=fetch) {
  if (!config.allowWrite) deny(503,'Klaviyo uploads are disabled on this server. Use the free HTML download.');
  if (input?.consent!==true) deny(400,'Explicit design transfer consent is required.');
  if (!/^[a-f0-9-]{36}$/i.test(input.requestId||'')) deny(400,'Invalid request identifier.');
  if (typeof input.title!=='string' || !input.title.trim() || input.title.length>100) deny(400,'Use a template name of 1–100 characters.');
  const claims=verifyLicense(input.license,config);
  let result;
  try{result=render(input.tree,{title:input.title,maxNodes:40});}catch(e){deny(400,e.message);}
  if (!config.klaviyoKey) deny(503,'Klaviyo account is not connected on this server.');
  await paidTransaction(claims.transaction,config,fetcher);
  const payload={data:{type:'template',attributes:{name:input.title.trim(),editor_type:'CODE',html:result.html}}};
  const digest=crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
  const prior=ledger.get(input.requestId);
  if (prior) {
    if(prior.digest!==digest) deny(409,'Request identifier already used for another design. Export again.');
    if(prior.state==='complete') return {id:prior.id,replayed:true};
    deny(409,'Previous upload outcome needs review. Check Klaviyo before exporting again.');
  }
  // Persist before the non-idempotent POST. Never automatically retry an uncertain create.
  ledger.set(input.requestId,{digest,state:'pending'});
  let response;
  try {response=await fetcher('https://a.klaviyo.com/api/templates',{method:'POST',headers:{Authorization:'Klaviyo-API-Key '+config.klaviyoKey,revision:'2026-10-15','Content-Type':'application/vnd.api+json',Accept:'application/vnd.api+json'},body:JSON.stringify(payload),signal:AbortSignal.timeout(10000),redirect:'error'});} catch {deny(502,'Upload outcome unknown. Check Klaviyo before exporting again.');}
  if(!response.ok) {
    ledger.set(input.requestId,{digest,state:'failed',status:response.status});
    if(response.status===401||response.status===403) deny(502,'Klaviyo rejected the server credential. Check templates:write permission.');
    if(response.status===429) deny(429,'Klaviyo rate limit reached. No automatic retry; wait before exporting again.');
    deny(502,'Klaviyo rejected the template. Review the HTML and account template limit.');
  }
  let id;
  try{id=(await response.json()).data.id;}catch{deny(502,'Upload outcome unknown. Check Klaviyo before exporting again.');}
  if(typeof id!=='string'||!id||id.length>128) deny(502,'Upload outcome unknown. Check Klaviyo before exporting again.');
  ledger.set(input.requestId,{digest,state:'complete',id});
  return {id};
}
module.exports={IntegrationError,equal,verifyLicense,paidTransaction,upload};
