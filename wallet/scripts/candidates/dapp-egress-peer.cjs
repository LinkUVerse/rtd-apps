// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Uninstalled, fixture-only native sender pairing. No account/approval authority.
(function (root) {
  'use strict';
  const random = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), v => v.toString(16).padStart(2, '0')).join('');
  const refuse = () => { throw new Error('Native peer refused'); };
  const exact = (v, fields) => v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === fields.length && fields.every(k => Object.hasOwn(v, k));
  function frameSender(sender, id, url) {
    if (sender?.id !== id || !Number.isSafeInteger(sender.tab?.id) || sender.tab.id < 0 || !Number.isSafeInteger(sender.frameId) || sender.frameId < 0 ||
        typeof sender.documentId !== 'string' || !sender.documentId || sender.documentId.length > 128 || /[\u0000-\u001f\u007f]/.test(sender.documentId) || sender.documentLifecycle !== 'active' || typeof sender.origin !== 'string' || typeof sender.url !== 'string') refuse();
    if (url && sender.url !== url) refuse();
    return { tabId: sender.tab.id, frameId: sender.frameId, documentId: sender.documentId, origin: sender.origin, url: sender.url };
  }
  async function boundedFrame(claim) {
    let timer;
    try {
      const result = await Promise.race([chrome.webNavigation.getFrame({ tabId: claim.tabId, frameId: claim.frameId, documentId: claim.documentId }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Native peer refused')), 2000); })]);
      if (root.fixtureNativePeerDebug) {
        const observation = { frameId: claim.frameId, scheme: new URL(claim.url).protocol, present: !!result, keys: result ? Object.keys(result) : [], documentMatches: result?.documentId === claim.documentId, lifecycle: result?.documentLifecycle, urlMatches: result?.url === claim.url };
        root.fixtureNativePeerDebug.lastFrame = observation;
        root.fixtureNativePeerDebug.frames = [...(root.fixtureNativePeerDebug.frames || []), observation].slice(-4);
      }
      if (!result || result.documentId !== claim.documentId || result.documentLifecycle !== 'active' || result.url !== claim.url) refuse();
      return result;
    } finally { clearTimeout(timer); }
  }
  async function boundedContext(claim) {
    let timer;
    try {
      const contexts = await Promise.race([
        chrome.runtime.getContexts({ documentIds: [claim.documentId], tabIds: [claim.tabId], frameIds: [claim.frameId], documentUrls: [claim.url] }),
        new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Native peer refused')), 2000); }),
      ]);
      if (root.fixtureNativePeerDebug) root.fixtureNativePeerDebug.extensionContext = { count: contexts.length, types: contexts.map(c => c.contextType), exactDocument: contexts.length === 1 && contexts[0].documentId === claim.documentId, exactOrigin: contexts.length === 1 && contexts[0].documentOrigin === claim.origin };
      if (contexts.length !== 1 || contexts[0].contextType !== 'TAB' || contexts[0].documentId !== claim.documentId ||
          contexts[0].tabId !== claim.tabId || contexts[0].frameId !== claim.frameId || contexts[0].documentUrl !== claim.url || contexts[0].documentOrigin !== claim.origin) refuse();
      return contexts[0];
    } finally { clearTimeout(timer); }
  }
  class CandidatePeerBroker {
    constructor(store) {
      this.store = store; this.peers = new Map(); this.gatePorts = new Set();
      this.counts = { contentAccepted: 0, gatesPaired: 0, refused: 0, uiAccepted: 0, uiRefused: 0, ticketsIssued: 0 };
      this.ready = store.startEpoch(); void this.ready.catch(() => undefined);
      chrome.runtime.onConnect.addListener(port => {
        const lifetime = { closed: false, queued: [], handler: undefined };
        // Register synchronously: the initial gate claim may arrive while the
        // epoch/readiness promise is pending. Retain at most one such message.
        port.onMessage.addListener(message => {
          if (lifetime.closed) return;
          if (lifetime.handler) { lifetime.handler(message); return; }
          if (port.name !== 'fixture-gate' || lifetime.queued.length) {
            lifetime.closed = true; lifetime.queued.length = 0; this.counts.refused++;
            try { port.disconnect(); } catch {} return;
          }
          lifetime.queued.push(message);
        });
        lifetime.listen = handler => {
          lifetime.handler = handler;
          const queued = lifetime.queued.splice(0);
          for (const message of queued) if (!lifetime.closed) handler(message);
        };
        port.onDisconnect.addListener(() => { lifetime.closed = true; lifetime.queued.length = 0; });
        void this.accept(port, lifetime).catch(() => { this.counts.refused++; try { port.disconnect(); } catch {} });
      });
    }
    async accept(port, lifetime) {
      if (root.fixtureNativePeerDebug) root.fixtureNativePeerDebug.lastStep = 'await-ready';
      await this.ready;
      if (lifetime.closed) refuse();
      const id = chrome.runtime.id, extensionOrigin = chrome.runtime.getURL('').slice(0, -1);
      if (root.fixtureNativePeerDebug) {
        const s = port.sender;
        root.fixtureNativePeerDebug.lastStep = 'native-sender';
        root.fixtureNativePeerDebug.lastSender = { channel: port.name, idMatches: s?.id === id, tabIdType: typeof s?.tab?.id, frameId: s?.frameId, documentIdType: typeof s?.documentId, documentLength: s?.documentId?.length, lifecycle: s?.documentLifecycle, originType: typeof s?.origin, urlType: typeof s?.url };
      }
      if (port.name === 'fixture-ui') {
        try {
          const s = frameSender(port.sender, id, chrome.runtime.getURL('ui.html'));
          if (s.origin !== extensionOrigin || s.frameId !== 0) refuse();
          await boundedContext(s); if (lifetime.closed) refuse(); this.counts.uiAccepted++; port.postMessage({ kind: 'fixture-ui-accepted' });
        } catch { this.counts.uiRefused++; refuse(); }
        return;
      }
      if (port.name === 'fixture-content') {
        const s = frameSender(port.sender, id);
        const url = new URL(s.url);
        if (s.frameId !== 0 || url.origin !== s.origin || !['http:', 'https:'].includes(url.protocol) || this.peers.size >= 32) refuse();
        await boundedFrame(s);
        if (lifetime.closed) refuse();
        const peer = { id: random(), cap: random(), source: s, port, closed: false, gate: undefined, expiresAt: Date.now() + 30000 };
        this.peers.set(peer.id, peer); this.counts.contentAccepted++;
        port.onDisconnect.addListener(() => { void this.revoke(peer).catch(() => undefined); });
        lifetime.listen(message => {
          void (async () => {
            const pending = peer.provisional;
            if (peer.closed || lifetime.closed || peer.gate || !pending || pending.closed() || pending.confirming || Date.now() >= peer.expiresAt ||
                !exact(message, ['kind', 'session', 'challenge']) || message.kind !== 'fixture-channel-confirm' ||
                message.session !== peer.id || message.challenge !== pending.challenge) refuse();
            pending.confirming = true;
            await Promise.all([boundedFrame(peer.source), boundedContext(pending.source)]);
            if (peer.closed || lifetime.closed || pending.closed() || Date.now() >= peer.expiresAt) refuse();
            pending.challenge = undefined; peer.gate = pending; peer.provisional = undefined;
            this.counts.gatesPaired++;
            pending.port.postMessage({ kind: 'fixture-gate-paired', parentOrigin: peer.source.origin });
          })().catch(() => { this.counts.refused++; try { port.disconnect(); } catch {} void this.revoke(peer).catch(() => undefined); });
        });
        port.postMessage({ kind: 'fixture-private-init', session: peer.id, cap: peer.cap });
        peer.timer = setTimeout(() => { void this.revoke(peer).catch(() => undefined); }, 30000);
        return;
      }
      if (port.name !== 'fixture-gate' || this.gatePorts.size >= 32) refuse();
      const s = frameSender(port.sender, id, chrome.runtime.getURL('gate.html'));
      if (s.origin !== extensionOrigin || s.frameId <= 0) refuse();
      if (lifetime.closed) refuse();
      this.gatePorts.add(port); let claimed = false;
      const claimTimer = setTimeout(() => { try { port.disconnect(); } catch {} }, 30000);
      const closed = () => lifetime.closed;
      port.onDisconnect.addListener(() => { clearTimeout(claimTimer); this.gatePorts.delete(port); });
      lifetime.listen(message => {
        void (async () => {
          if (root.fixtureNativePeerDebug) root.fixtureNativePeerDebug.lastStep = 'claim-shape';
          if (closed() || claimed || !exact(message, ['kind', 'session', 'cap', 'parentOrigin']) || message.kind !== 'fixture-gate-claim') refuse();
          // Latch before the first await: a concurrent duplicate claim cannot win.
          claimed = true;
          const peer = this.peers.get(message.session);
          if (root.fixtureNativePeerDebug) root.fixtureNativePeerDebug.claim = {
            peerPresent: !!peer, closed: peer?.closed, alreadyPaired: !!peer?.gate,
            capMatches: !!peer && peer.cap === message.cap,
            originMatches: peer?.source.origin === message.parentOrigin,
            sameTab: peer?.source.tabId === s.tabId, expired: !peer || Date.now() >= peer.expiresAt,
          };
          if (!peer || peer.closed || peer.gate || peer.provisional || peer.cap !== message.cap || peer.source.origin !== message.parentOrigin || Date.now() >= peer.expiresAt || peer.source.tabId !== s.tabId) refuse();
          await Promise.all([boundedContext(s), boundedFrame(peer.source)]);
          if (root.fixtureNativePeerDebug) root.fixtureNativePeerDebug.lastStep = 'claim-relation';
          if (closed() || peer.closed || peer.gate || Date.now() >= peer.expiresAt) refuse();
          if (peer.provisional) refuse();
          peer.provisional = { port, source: s, closed, owner: random(), challenge: random(), confirming: false }; peer.cap = undefined;
          port.onDisconnect.addListener(() => { void this.revoke(peer).catch(() => undefined); });
          port.postMessage({ kind: 'fixture-gate-challenge', challenge: peer.provisional.challenge });
        })().catch(() => { this.counts.refused++; try { port.disconnect(); } catch {} });
      });
    }
    async revoke(peer) {
      if (peer.closed) return; peer.closed = true; clearTimeout(peer.timer);
      // Remove the source only after the durable invalidation barrier starts.
      await this.store.mutate(() => { this.peers.delete(peer.id); try { (peer.gate || peer.provisional)?.port.disconnect(); } catch {} });
    }
    async issueForPeer(id, hold = false) {
      const peer = this.peers.get(id);
      if (!peer || peer.closed || !peer.gate || peer.gate.closed() || Date.now() >= peer.expiresAt) refuse();
      const gate = peer.gate;
      await Promise.all([boundedFrame(peer.source), boundedContext(gate.source)]);
      if (peer.closed || gate.closed()) refuse();
      const binding = { origin: peer.source.origin, tabId: peer.source.tabId, frameId: peer.source.frameId, documentId: peer.source.documentId,
        requestId: random(), account: '0x' + 'a'.repeat(64), profileBinding: 'fixture-only-independent-binding', gateOwner: gate.owner };
      const lease = await this.store.capture(binding), ticket = await this.store.issue(lease, 'public-peer-fixture-dummy');
      if (peer.closed || gate.closed()) refuse();
      gate.port.postMessage({ kind: 'fixture-deliver', ticket, binding, hold }); this.counts.ticketsIssued++;
      return { requestId: binding.requestId };
    }
  }
  const api = { CandidatePeerBroker };
  if (typeof module !== 'undefined') module.exports = api; else root.RtdEgressPeerCandidate = api;
})(globalThis);
