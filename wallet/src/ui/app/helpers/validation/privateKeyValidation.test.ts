import { act, createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { describe, expect, it } from 'vitest';
import type { UseFormReturn } from 'react-hook-form';
import { Ed25519Keypair } from 'rtd-typescript/keypairs/ed25519';
import { useZodForm, z } from 'rtd-apps-core/src/hooks/useZodForm';
import { privateKeyValidation } from './privateKeyValidation';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

describe('私钥表单与共享resolver的实际契约', () => {
  it('空值与无效格式成为字段错误，合法输入可继续，不抛未处理Zod异常', async () => {
    const schema = z.object({ privateKey: privateKeyValidation });
    let form!: UseFormReturn<{ privateKey: string }>;
    function Consumer() {
      form = useZodForm({ schema, defaultValues: { privateKey: '' } });
      return null;
    }
    const root = createRoot(document.createElement('div'));
    try {
      await act(async () => root.render(createElement(Consumer)));
      for (const value of ['', 'invalid-test-key']) {
        await act(async () => {
          form.setValue('privateKey', value);
          expect(await form.trigger()).toBe(false);
        });
        expect(form.getFieldState('privateKey').error?.message).toBeTruthy();
      }
      await act(async () => {
        form.setValue('privateKey', Ed25519Keypair.fromSecretKey(new Uint8Array(32).fill(7)).getSecretKey());
        expect(await form.trigger()).toBe(true);
      });
      expect(form.getFieldState('privateKey').error).toBeUndefined();
    } finally {
      await act(async () => root.unmount());
    }
  });
});
