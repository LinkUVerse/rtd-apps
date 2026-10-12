import { expect, it } from 'vitest';
import { accountSigningFeatures } from './signing-features';
it.each(['mnemonic-derived', 'imported'])('advertises enabled local signing for %s', (type) => {
  expect(accountSigningFeatures(type)).toEqual(['rtd:signTransaction', 'rtd:signAndExecuteTransaction', 'rtd:signPersonalMessage']);
});
it.each(['qredo', 'zkLogin', 'ledger', 'future-account'])('does not advertise signing for %s', (type) => {
  expect(accountSigningFeatures(type)).toEqual([]);
});
