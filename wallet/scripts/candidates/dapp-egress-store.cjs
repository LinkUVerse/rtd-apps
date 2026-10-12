// Copyright (c) LinkU Labs, Inc.
// SPDX-License-Identifier: Apache-2.0
// Uninstalled candidate. Test namespace only; never opens an existing wallet DB.
(function (root) {
  'use strict';
  const stores = ['admission-v1', 'egress-context-v1', 'egress-ticket-v1'];
  const keys = ['bindingKey', 'key', 'id'];
  const hex = /^[a-f0-9]{64}$/;
  const bindingFields = ['origin', 'tabId', 'frameId', 'documentId', 'requestId', 'account', 'profileBinding', 'gateOwner'];
  function fail() { throw new Error('Egress candidate refused'); }
  function object(value, fields) {
    if (!value || Object.getPrototypeOf(value) !== Object.prototype || Object.getOwnPropertySymbols(value).length ||
        Object.getOwnPropertyNames(value).length !== fields.length || fields.some(k => !Object.hasOwn(value, k) || !Object.hasOwn(Object.getOwnPropertyDescriptor(value, k), 'value'))) fail();
    return value;
  }
  function integer(value) { if (!Number.isSafeInteger(value) || value < 0) fail(); return value; }
  function text(value, limit = 256) { if (typeof value !== 'string' || !value || new TextEncoder().encode(value).length > limit || /[\u0000-\u001f\u007f]/.test(value)) fail(); return value; }
  function random() { return Array.from(root.crypto.getRandomValues(new Uint8Array(32)), n => n.toString(16).padStart(2, '0')).join(''); }
  function validateBinding(value) {
    const v = object(value, bindingFields);
    const url = new URL(text(v.origin, 2048));
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== v.origin) fail();
    integer(v.tabId); integer(v.frameId);
    for (const k of ['documentId', 'requestId']) text(v[k]);
    if (!/^0x[a-f0-9]{64}$/.test(v.account) || !hex.test(v.gateOwner)) fail();
    text(v.profileBinding, 65536);
    return Object.freeze(Object.fromEntries(bindingFields.map(k => [k, v[k]])));
  }
  function context(value) {
    const v = object(value, ['key', 'schemaVersion', 'epoch', 'revision', 'pending']);
    if (v.key !== 'global' || v.schemaVersion !== 1 || !hex.test(v.epoch) || !Array.isArray(v.pending) || v.pending.length > 64) fail();
    integer(v.revision);
    if (new Set(v.pending).size !== v.pending.length || v.pending.some(id => !hex.test(id))) fail();
    return structuredClone(v);
  }
  function equal(a, b) { return bindingFields.every(k => a[k] === b[k]); }
  function ticket(value) {
    const v = object(value, ['id', 'schemaVersion', 'binding', 'epoch', 'revision', 'createdAt', 'expiresAt', 'payload']);
    if (!hex.test(v.id) || v.schemaVersion !== 1 || !hex.test(v.epoch)) fail();
    validateBinding(v.binding); integer(v.revision); integer(v.createdAt); integer(v.expiresAt);
    if (v.expiresAt <= v.createdAt || v.expiresAt - v.createdAt > 30000 || typeof v.payload !== 'string' || new TextEncoder().encode(v.payload).length > 131072) fail();
    return structuredClone(v);
  }
  // Negative admission only. Candidate conservatively blocks every scope and an absent row.
  // Promotion must use the product's full canonical admission validator and reviewed profile.
  function clear(value, binding) {
    const v = object(value, ['schemaVersion', 'bindingKey', 'faults', 'pending']);
    if (v.schemaVersion !== 1 || v.bindingKey !== binding || !Array.isArray(v.faults) || !Array.isArray(v.pending) || v.faults.length || v.pending.length) fail();
  }
  class CandidateEgressStore {
    #receipts = new WeakMap();
    #leases = new WeakMap();
    constructor(name, factory = root.indexedDB, timeoutMs = 2000) {
      if (typeof name !== 'string' || !/^RtdWallet NetworkAdmission:test:egress-[a-z0-9-]{1,80}$/.test(name) || !factory || !Number.isSafeInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 5000) fail();
      this.name = name; this.factory = factory; this.timeout = timeoutMs;
    }
    async open(deadline) {
      return new Promise((resolve, reject) => {
        let done = false; let r;
        const bad = () => { if (done) return; done = true; clearTimeout(timer); try { r?.transaction?.abort(); } catch {} reject(new Error('Egress candidate refused')); };
        const timer = setTimeout(bad, Math.max(0, deadline - performance.now()));
        try {
          r = this.factory.open(this.name, 2);
          r.onerror = bad; r.onblocked = bad;
          r.onupgradeneeded = e => {
            if (done || ![0, 1].includes(e.oldVersion) || performance.now() >= deadline) {
              // onblocked rejected earlier, but IDB may start its upgrade after the
              // held connection closes. Abort this newly created transaction too.
              try { r.transaction.abort(); } catch {}
              return bad();
            }
            try {
              if (e.oldVersion === 1) {
                const old = r.transaction.objectStore(stores[0]);
                if (r.result.objectStoreNames.length !== 1 || old.keyPath !== keys[0] || old.autoIncrement || old.indexNames.length) fail();
              }
              if (e.oldVersion === 0) r.result.createObjectStore(stores[0], { keyPath: keys[0] });
              // v1 admission rows are neither scanned, rewritten nor cleared.
              r.result.createObjectStore(stores[1], { keyPath: keys[1] });
              r.result.createObjectStore(stores[2], { keyPath: keys[2] });
            } catch { bad(); }
          };
          r.onsuccess = () => {
            const db = r.result;
            if (done || performance.now() >= deadline || db.version !== 2 || db.objectStoreNames.length !== 3 || stores.some(n => !db.objectStoreNames.contains(n))) { db.close(); return bad(); }
            done = true; clearTimeout(timer); db.onversionchange = () => db.close(); resolve(db);
          };
        } catch { bad(); }
      });
    }
    async transaction(mode, reads, change) {
      const deadline = performance.now() + this.timeout, db = await this.open(deadline);
      return new Promise((resolve, reject) => {
        let done = false, filled = false, tx, result;
        const close = () => { clearTimeout(timer); db.close(); };
        const bad = () => { if (done) return; done = true; try { tx?.abort(); } catch {} close(); reject(new Error('Egress candidate refused')); };
        const timer = setTimeout(bad, Math.max(0, deadline - performance.now()));
        try {
          tx = db.transaction(stores, mode, mode === 'readwrite' ? { durability: 'strict' } : undefined);
          tx.onabort = bad; tx.onerror = bad;
          tx.oncomplete = () => { if (done) return; if (!filled || performance.now() >= deadline) return bad(); done = true; close(); resolve(result); };
          if (mode === 'readwrite' && tx.durability !== 'strict') return bad();
          const os = stores.map((n, i) => { const s = tx.objectStore(n); if (s.keyPath !== keys[i] || s.autoIncrement || s.indexNames.length) fail(); return s; });
          const values = []; let remaining = reads.length;
          if (!remaining) fail();
          reads.forEach(([index, key, operation], i) => {
            const r = operation === 'count' ? os[index].count() : os[index].get(key); r.onerror = bad;
            r.onsuccess = () => {
              if (done) return; values[i] = r.result;
              if (--remaining) return;
              if (performance.now() >= deadline) return bad();
              try { result = change(values, os); filled = true; } catch { bad(); }
            };
          });
        } catch { bad(); }
      });
    }
    // A new worker invalidates every old epoch before accepting any request.
    startEpoch() {
      return this.transaction('readwrite', [[1, 'global']], ([old], os) => {
        const previous = old === undefined ? undefined : context(old);
        // Crash-interrupted external mutations stay unknown, including across worker epochs.
        const next = { key: 'global', schemaVersion: 1, epoch: random(), revision: 0, pending: previous?.pending ?? [] };
        os[1].put(next); os[2].clear(); return Object.freeze(next);
      });
    }
    beginMutation() {
      return this.transaction('readwrite', [[1, 'global']], ([value], os) => {
        const c = context(value), id = random();
        if (c.revision === Number.MAX_SAFE_INTEGER || c.pending.length >= 64) fail();
        c.revision++; c.pending.push(id); os[1].put(c); os[2].clear();
        return Object.freeze({ id, epoch: c.epoch, revision: c.revision });
      });
    }
    finishMutation(token) {
      object(token, ['id', 'epoch', 'revision']);
      return this.transaction('readwrite', [[1, 'global']], ([value], os) => {
        const c = context(value);
        if (c.epoch !== token.epoch || !c.pending.includes(token.id) || !Number.isSafeInteger(token.revision) || token.revision > c.revision) fail();
        c.pending = c.pending.filter(id => id !== token.id); os[1].put(c);
      });
    }
    async mutate(operation) {
      if (typeof operation !== 'function') fail();
      const token = await this.beginMutation();
      // No operation can start before strict barrier completion. Failures keep
      // pending: external Chrome storage/Dexie writes cannot be rolled back by IDB.
      const result = await operation();
      await this.finishMutation(token);
      return result;
    }
    async capture(input) {
      const b = validateBinding(input);
      const state = await this.transaction('readonly', [[1, 'global'], [0, b.profileBinding]], ([value, negative]) => {
        const c = context(value); clear(negative, b.profileBinding); if (c.pending.length) fail();
        return { binding: b, epoch: c.epoch, revision: c.revision, capturedAt: Date.now() };
      });
      const lease = Object.freeze({}); this.#leases.set(lease, state); return lease;
    }
    async issue(lease, payload, ttlMs = 10000) {
      const state = this.#leases.get(lease); this.#leases.delete(lease);
      if (!state) fail(); const b = state.binding;
      if (!Number.isSafeInteger(ttlMs) || ttlMs < 1 || ttlMs > 30000 || typeof payload !== 'string' || new TextEncoder().encode(payload).length > 131072) fail();
      const id = random(), now = Date.now();
      return this.transaction('readwrite', [[1, 'global'], [0, b.profileBinding], [2, undefined, 'count']], ([value, negative, count], os) => {
        const c = context(value); clear(negative, b.profileBinding);
        if (c.pending.length || count >= 64 || c.epoch !== state.epoch || c.revision !== state.revision || now < state.capturedAt || now >= state.capturedAt + 30000) fail();
        const next = ticket({ id, schemaVersion: 1, binding: b, epoch: state.epoch, revision: state.revision, createdAt: now, expiresAt: Math.min(now + ttlMs, state.capturedAt + 30000), payload });
        os[2].add(next); return id;
      });
    }
    async consume(id, input) {
      if (!hex.test(id)) fail(); const b = validateBinding(input);
      const row = await this.transaction('readwrite', [[1, 'global'], [0, b.profileBinding], [2, id]], ([value, negative, raw], os) => {
        const c = context(value), t = ticket(raw); clear(negative, b.profileBinding);
        const now = Date.now();
        if (c.pending.length || c.epoch !== t.epoch || c.revision !== t.revision || !equal(t.binding, b) || now < t.createdAt || now >= t.expiresAt) fail();
        os[2].delete(id); return t;
      });
      // Receipts cannot be serialized or borrowed by another gate instance.
      const receipt = Object.freeze({}); this.#receipts.set(receipt, row); return receipt;
    }
    async deliver(receipt, input, synchronousPost) {
      const row = this.#receipts.get(receipt); this.#receipts.delete(receipt);
      if (!row || typeof synchronousPost !== 'function' || Object.getPrototypeOf(synchronousPost) !== Function.prototype) fail();
      const b = validateBinding(input);
      if (!equal(row.binding, b)) fail();
      return this.transaction('readonly', [[1, 'global'], [0, b.profileBinding]], ([value, negative]) => {
        const c = context(value); clear(negative, b.profileBinding); const now = Date.now();
        if (c.pending.length || c.epoch !== row.epoch || c.revision !== row.revision || now < row.createdAt || now >= row.expiresAt) fail();
        // Actual postMessage must happen here. Returning an async callback is invalid.
        const result = synchronousPost(row.payload);
        if (result !== undefined) fail();
      });
    }
  }
  const api = { CandidateEgressStore, validateBinding };
  if (typeof module !== 'undefined') module.exports = api; else root.RtdEgressCandidate = api;
})(globalThis);
