import {expect,it} from 'vitest';
import {Transaction} from 'rtd-typescript/transactions';
import {unsupportedSponsorExecution} from './transaction-sponsorship';
it('single signer execution rejects an explicit external gas owner without mutating the request',()=>{const tx=new Transaction();tx.setGasOwner('0x8');const before=tx.getData();expect(unsupportedSponsorExecution(tx,'0x7',false)).toBe(true);expect(tx.getData()).toEqual(before);});
it('sign-only retains external gas owner authorization',()=>{const tx=new Transaction();tx.setGasOwner('0x8');expect(unsupportedSponsorExecution(tx,'0x7',true)).toBe(false);});
it('default or normalized sender-owned gas remains executable',()=>{const tx=new Transaction();expect(unsupportedSponsorExecution(tx,'0x7',false)).toBe(false);tx.setGasOwner('0x7');expect(unsupportedSponsorExecution(tx,'0x'+'7'.padStart(64,'0'),false)).toBe(false);});
