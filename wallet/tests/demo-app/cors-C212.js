// Development-only browser CORS observation. Do not proxy or override Origin.
const h0 = 'BkuLHhdtnoK7yLxo2eQuvcjHtdyipE7MMyxgTJiyHGg4';
const cases = [
  ['native', 'http://127.0.0.1:41750/rtd.rpc.v2.LedgerService/GetServiceInfo', null],
  ['archive', 'http://127.0.0.1:41958/archive/rtd.rpc.v2.LedgerService/GetServiceInfo', null],
  ['graphql', 'http://127.0.0.1:41957/graphql', {query:'query DemoGenesis { checkpoint(sequenceNumber: 0) { digest } }'}],
  ['account', 'http://127.0.0.1:41959/account/graphql', {query:'query DemoCoverage($chain: String!) { accountHistoryCoverage(chainId: $chain) { chainId checkpointLo checkpointHi checkpointDigest allAccountActivityCertified } }',variables:{chain:h0}}],
];
document.querySelector('#run').addEventListener('click', async () => {
  document.querySelector('#run').disabled = true;
  const results = [];
  for (const [role, url, query] of cases) {
    try {
      const response = await fetch(url, {
        method:'POST', mode:'cors', credentials:'omit', redirect:'error',
        headers:query ? {'Content-Type':'application/json'} : {'Content-Type':'application/grpc-web+proto','X-Grpc-Web':'1'},
        body:query ? JSON.stringify(query) : new Uint8Array(5),
        signal:AbortSignal.timeout(15000),
      });
      const body = new Uint8Array(await response.arrayBuffer());
      results.push({role, status:response.status, readable:true, responseBytes:body.length, responseType:response.type});
    } catch (error) {
      results.push({role, readable:false, errorName:error.name, errorMessage:error.message});
    }
    document.querySelector('#result').textContent = JSON.stringify({origin:location.origin, credentials:'omit', results}, null, 2);
  }
});
