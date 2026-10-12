import { beforeEach, expect, it, vi } from 'vitest';
const m = vi.hoisted(() => ({
  accounts: vi.fn(), recover: vi.fn(), alarmGet: vi.fn(), alarmCreate: vi.fn(),
  alarm: vi.fn(), startup: vi.fn(), connect: vi.fn(), network: vi.fn(), accountsOn: vi.fn(),
}));
vi.mock('webextension-polyfill', () => ({ default: {
  alarms: { get: m.alarmGet, create: m.alarmCreate, onAlarm: { addListener: m.alarm } },
  runtime: { onStartup: { addListener: m.startup }, onConnect: { addListener: m.connect } },
} }));
vi.mock('./accounts', () => ({ getAllAccounts: m.accounts }));
vi.mock('./accounts/events', () => ({ accountsEvents: { on: m.accountsOn } }));
vi.mock('./execution', () => ({ recoverWalletExecution: m.recover }));
vi.mock('./NetworkEnv', () => ({ default: { on: m.network } }));
import { createRecoveryWakeup, recoverSelectedWalletExecution, installExecutionRecoveryWakeups, executionRecoveryAlarm } from './execution-recovery-wakeup';
const flush = async () => { for (let i = 0; i < 20; i++) await Promise.resolve(); };
const account = (id: string, selected: boolean) => ({ id, toUISerialized: async () => ({ selected, isLocked: true }) });
beforeEach(() => {
  vi.resetAllMocks(); m.accounts.mockResolvedValue([]); m.recover.mockResolvedValue(null);
  m.alarmGet.mockResolvedValue(undefined); m.alarmCreate.mockResolvedValue(undefined);
});
it('recovers the selected locked account without unlocking it', async () => {
  m.accounts.mockResolvedValue([account('other', false), account('selected', true)]);
  await recoverSelectedWalletExecution(); expect(m.recover).toHaveBeenCalledExactlyOnceWith('selected');
});
it('does not guess an absent or ambiguous selection', async () => {
  for (const accounts of [[], [account('a', false)], [account('a', true), account('b', true)]]) {
    m.accounts.mockResolvedValue(accounts); await recoverSelectedWalletExecution();
  }
  expect(m.recover).not.toHaveBeenCalled();
});
it('coalesces events during recovery and rereads after a switch', async () => {
  let release!: () => void;
  const operation = vi.fn().mockImplementationOnce(() => new Promise<void>(resolve => { release = resolve; })).mockResolvedValue(undefined);
  const wake = createRecoveryWakeup(operation); const first = wake(); wake(); wake();
  expect(operation).toHaveBeenCalledTimes(1); release(); await first;
  expect(operation).toHaveBeenCalledTimes(2);
});
it('a failed recovery does not prevent a later wakeup', async () => {
  const operation = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
  const wake = createRecoveryWakeup(operation); await wake(); await wake(); expect(operation).toHaveBeenCalledTimes(2);
});
it('registers listeners synchronously and recovers on evaluation and lifecycle events', async () => {
  installExecutionRecoveryWakeups(); expect(m.alarm).toHaveBeenCalledOnce(); expect(m.startup).toHaveBeenCalledOnce(); expect(m.connect).toHaveBeenCalledOnce();
  expect(m.network).toHaveBeenCalledWith('changed', expect.any(Function));
  expect(m.accountsOn.mock.calls.map(c => c[0])).toEqual(['activeAccountChanged', 'accountsChanged', 'accountStatusChanged']);
  await flush(); expect(m.alarmCreate).toHaveBeenCalledWith(executionRecoveryAlarm, { periodInMinutes: 1 }); expect(m.accounts).toHaveBeenCalledOnce();
  m.alarm.mock.calls[0][0]({ name: 'unrelated' }); await flush(); expect(m.accounts).toHaveBeenCalledOnce();
  m.alarm.mock.calls[0][0]({ name: executionRecoveryAlarm }); await flush(); expect(m.accounts).toHaveBeenCalledTimes(2);
  m.connect.mock.calls[0][0]({}); await flush(); expect(m.accounts).toHaveBeenCalledTimes(3);
  m.startup.mock.calls[0][0](); await flush(); expect(m.accounts).toHaveBeenCalledTimes(4);
});
it('preserves an existing alarm and still wakes when alarm setup fails', async () => {
  m.alarmGet.mockResolvedValueOnce({ name: executionRecoveryAlarm }); installExecutionRecoveryWakeups(); await flush(); expect(m.alarmCreate).not.toHaveBeenCalled();
  m.alarmGet.mockRejectedValueOnce(new Error('unavailable')); installExecutionRecoveryWakeups(); await flush(); expect(m.accounts).toHaveBeenCalledTimes(2);
});
