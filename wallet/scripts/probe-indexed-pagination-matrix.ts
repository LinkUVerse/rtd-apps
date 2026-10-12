import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync, writeFileSync} from 'node:fs';
import {WalletIndexedLists} from '../src/shared/rpc/indexed-lists';
import {WalletReadSession} from '../src/shared/rpc/session';
import {validateNetworkProfile} from '../src/shared/rpc/profile';

const sha = (value: string) => createHash('sha256').update(value).digest('hex');
type Wire = {request: {query: string; variables: any}; status: number; body: any};
async function main() {
  const [profileFile, sender, output] = process.argv.slice(2);
  assert(output && !output.includes('..'));
  const profile = validateNetworkProfile(JSON.parse(readFileSync(profileFile, 'utf8')));
  assert.equal(new URL(profile.endpoints.graphqlUrl!).hostname, '127.0.0.1');
  const upper = 586007;
  const actual: Record<string, Wire[]> = {};
  const results: any[] = [];
  for (const field of ['transactions', 'events'] as const) {
    const values: Record<string, any> = {};
    for (const order of ['ascending', 'descending'] as const) {
      const trace: Wire[] = [];
      const session = new WalletReadSession(profile);
      const reader = new WalletIndexedLists(session, async (input, init) => {
        assert.equal(String(input), profile.endpoints.graphqlUrl);
        const request = JSON.parse(String(init?.body));
        // Test transport page size only. The product retains its authored size of 50.
        request.query = request.query.replace(/(first|last): 50/g, '$1: 1');
        await new Promise(resolve => setTimeout(resolve, 150));
        init?.signal?.throwIfAborted();
        const response = await fetch(input, {...init, body: JSON.stringify(request)});
        const text = await response.clone().text();
        let body: any;
        try { body = JSON.parse(text); } catch { body = {nonJsonBody: text}; }
        trace.push({request, status: response.status, body});
        return response;
      });
      try {
        values[order] = await (field === 'transactions'
          ? reader.sentTransactions(sender, {lower: 0, upper, order})
          : reader.events({module: '0x3'}, {lower: 0, upper, order}));
        assert.equal(values[order].snapshot.checkpoint, String(upper));
        assert(values[order].value.length > 1, `${field} needs actual multiple pages`);
        assert(trace.every(w => w.status === 200 && !w.body.errors?.length && !w.body.nonJsonBody), 'positive fixture requires complete accepted actual wires');
        const pages = trace.filter(w => w.request.query.includes('WalletSnapshotRead'));
        assert(pages.length >= values[order].value.length);
        assert.equal(pages.reduce((n, w) => n + w.body.data.walletSnapshot.query[field].nodes.length, 0), values[order].value.length);
        actual[`${field}-${order}`] = trace;
      } catch (error) {
        writeFileSync(`${output}.${field}-${order}.failed-wire.json`, JSON.stringify(trace, null, 2)+'\n', {flag: 'wx'});
        throw error;
      } finally {session.close();}
    }
    const key = (x: any) => field === 'transactions' ? x.digest : `${x.transactionDigest}:${x.sequenceNumber}`;
    assert.deepEqual(values.descending.value.map(key), values.ascending.value.map(key).reverse());
    assert.equal(values.ascending.snapshot.digest, values.descending.snapshot.digest);
    results.push({field, mode: 'actual-service', items: values.ascending.value.length,
      ascendingKeys: values.ascending.value.map(key), descendingKeys: values.descending.value.map(key),
      snapshot: values.ascending.snapshot,
      pages: Object.fromEntries(['ascending', 'descending'].map(order => [order, actual[`${field}-${order}`].filter(w => w.request.query.includes('WalletSnapshotRead')).map(w => ({items: w.body.data.walletSnapshot.query[field].nodes.length, pageInfo: w.body.data.walletSnapshot.query[field].pageInfo}))])),
      eventTypes: field === 'events' ? [...new Set(values.ascending.value.map((x: any) => x.type))] : undefined});
  }
  // Persist the independent, unmodified actual wire fixture before exercising mutations.
  writeFileSync(`${output}.actual-wire.json`, JSON.stringify(actual, null, 2)+'\n', {flag: 'wx'});
  for (const field of ['transactions', 'events'] as const) {
    for (const mode of ['empty-progress', 'empty-terminal', 'duplicate', 'cursor-stalled', 'scan-limit-partial', 'timeout-page', 'session-cancel', 'page-budget', 'bad-cursor-actual-server', 'pre-abort'] as const) {
      const original = actual[`${field}-ascending`];
      const session = new WalletReadSession(profile);
      const controller = new AbortController();
      let i = 0, pages = 0, inserted = false, published = false, physical = 0, timeoutSettled = false;
      let previous: any;
      const fetchFn: typeof fetch = async (input, init) => {
        physical++;
        const request = JSON.parse(String(init?.body));
        let wire = original[i++];
        assert(wire, 'fixture request budget exceeded');
        assert.equal(request.query.includes('WalletSnapshotRead'), wire.request.query.includes('WalletSnapshotRead'));
        let body = structuredClone(wire.body);
        if (request.query.includes('WalletSnapshotRead')) {
          pages++;
          const connection = body.data.walletSnapshot.query[field];
          if (mode === 'bad-cursor-actual-server' && pages === 2) {
            request.variables.cursor = 'QA-A12-invalid-cursor';
            request.query = request.query.replace(/first: 50/g, 'first: 1');
            const response = await fetch(input, {...init, body: JSON.stringify(request)});
            const rejected = await response.clone().json();
            assert(rejected.errors?.length, 'actual server must reject bad cursor');
            results.push({field, mode: 'bad-cursor-server-response', status: response.status, errors: rejected.errors});
            return response;
          }
          if (mode === 'empty-progress' && !inserted) {
            inserted = true; i--; connection.nodes = [];
            connection.pageInfo.hasNextPage = true;
            connection.pageInfo.endCursor = 'QA-A12-fixture-progress';
          }
          if (mode === 'empty-terminal') {
            connection.nodes = []; connection.pageInfo.hasNextPage = false;
            // Skip remaining pages, but preserve actual terminal proof revalidation.
            i = original.length - 1;
          }
          if (mode === 'duplicate' && pages === 2) connection.nodes = [previous];
          if (mode === 'cursor-stalled' && pages === 2) {
            connection.nodes = []; connection.pageInfo.hasNextPage = true;
            connection.pageInfo.endCursor = original.find(w => w.request.query.includes('WalletSnapshotRead'))!.body.data.walletSnapshot.query[field].pageInfo.endCursor;
          }
          if (mode === 'scan-limit-partial' && pages === 2) body.errors = [{message: 'finite QA fixture scan limit', extensions: {code: 'SCAN_LIMIT_EXCEEDED'}}];
          if (mode === 'timeout-page' && pages === 2) {
            const signal = init!.signal!;
            setTimeout(() => controller.abort(new DOMException('finite QA fixture deadline', 'TimeoutError')), 15);
            return await new Promise<Response>((_, reject) => {
              const settle = () => {timeoutSettled = true; reject(signal.reason);};
              signal.addEventListener('abort', settle, {once: true});
              if (signal.aborted) settle();
            });
          }
          if (mode === 'session-cancel' && pages === 2) session.close();
          previous = connection.nodes[0];
        }
        return new Response(JSON.stringify(body), {status: wire.status, headers: {'content-type': 'application/json'}});
      };
      const reader = new WalletIndexedLists(session, fetchFn);
      if (mode === 'pre-abort') controller.abort(new DOMException('finite QA fixture abort', 'AbortError'));
      const options = {lower: 0, upper, order: 'ascending' as const, signal: controller.signal,
        ...(mode === 'page-budget' ? {maxPages: 1} : {})};
      try {
        const call = field === 'transactions' ? reader.sentTransactions(sender, options) : reader.events({module: '0x3'}, options);
        if (mode === 'empty-progress' || mode === 'empty-terminal') {
          const value = await call; published = true;
          assert.equal(value.value.length, mode === 'empty-terminal' ? 0 : results.find(x => x.field === field && x.mode === 'actual-service').items);
          assert.equal(i, original.length);
          results.push({field, mode, passed: true, fixture: true, pages, returnedItems: value.value.length});
        } else {
          let rejection: any;
          await assert.rejects(call.then(() => {published = true;}), error => {rejection = error; return true;});
          assert.equal(published, false);
          if (mode === 'pre-abort') assert.equal(physical, 0);
          if (mode === 'timeout-page') assert(timeoutSettled);
          results.push({field, mode, passed: true, fixture: mode !== 'bad-cursor-actual-server', pages, physical,
            error: {name: rejection.name, reason: rejection.reason ?? null}, partialPublished: false, timeoutSettled});
        }
      } finally {session.close();}
    }
  }
  const wireBytes = readFileSync(`${output}.actual-wire.json`, 'utf8');
  writeFileSync(output, JSON.stringify({observedAt: new Date().toISOString(), passed: true,
    h0: profile.expectedGenesisDigest, upper, results, actualWireSha256: sha(wireBytes),
    implementationSha256: sha(readFileSync('src/shared/rpc/indexed-lists.ts', 'utf8')),
    scriptSha256: sha(readFileSync('scripts/probe-indexed-pagination-matrix.ts', 'utf8')),
    simulated: 0, executed: 0, scope: 'Node public dev CA actual same-chain multipage positives and actual bad cursor rejection; explicitly separate bounded replay fault fixtures. No Chrome HTTPS acceptance.'}, null, 2)+'\n', {flag:'wx'});
  console.log(JSON.stringify({passed: true, cases: results.length, actual: results.filter(x => x.mode === 'actual-service').map(x => ({field:x.field, items:x.items}))}));
}
main().catch(error => {console.error(error);process.exitCode=1;});
