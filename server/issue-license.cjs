// Operator-only CLI. Run on your server, never in a plugin or public route.
const fs=require('node:fs');
const crypto=require('node:crypto');
const {paidTransaction}=require('./integration.cjs');
async function main(){
  const [transaction,destination]=process.argv.slice(2),e=process.env;
  if(!/^txn_[a-z0-9]{26}$/.test(transaction||'')||!destination||!e.LICENSE_PRIVATE_KEY_FILE)throw new Error('Usage: node server/issue-license.cjs txn_ID protected-output-file; set LICENSE_PRIVATE_KEY_FILE.');
  await paidTransaction(transaction,{paddleApiKey:e.PADDLE_API_KEY,paddlePriceId:e.PADDLE_PRICE_ID,paddleCustomerId:e.PADDLE_CUSTOMER_ID,paddleSandbox:e.PADDLE_SANDBOX==='true'});
  const claims={product:'figma2klaviyo',transaction,customer:e.PADDLE_CUSTOMER_ID,exp:Math.floor(Date.now()/1000)+30*86400};
  const payload=Buffer.from(JSON.stringify(claims)).toString('base64url');
  const signature=crypto.sign(null,Buffer.from(payload),fs.readFileSync(e.LICENSE_PRIVATE_KEY_FILE)).toString('base64url');
  fs.writeFileSync(destination,payload+'.'+signature,{mode:0o600,flag:'wx'});
  console.log('Verified 30-day license saved to the requested protected file. No checkout or payment was created.');
}
main().catch(()=>{console.error('License not issued. Check the protected server configuration and eligible one-time Paddle payment.');process.exitCode=1;});
