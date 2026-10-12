import { expect, it, vi } from 'vitest';
import { CustomProfileReviews, profilePermissionOrigins } from './custom-profile-review';
import { profileFixture } from './profile-fixture';
import { networkBindingKey, validateNetworkProfile } from './profile';
function setup() {
  let time = 1000, sequence = 0;
  const inspect = vi.fn(async (profile: ReturnType<typeof validateNetworkProfile>) => ({
    state: 'identity-verified' as const, bindingKey: networkBindingKey(profile), observedAt: time,
    endpoints: (['fullnode', 'graphql', 'archive'] as const).map(role => ({
      role, state: 'verified' as const, genesisDigest: profile.expectedGenesisDigest,
    })),
  }));
  return { inspect, advance: () => { time += 300_000; }, reviews: new CustomProfileReviews(inspect, () => time, () => `token-${++sequence}`) };
}
it('pins exact configuration, reports extra service limits and consumes once', async () => {
  const { reviews } = setup();
  const input = profileFixture();
  const preview = await reviews.prepare(input, 'prior');
  input.expectedGenesisDigest = 'changed';
  preview.profile.endpoints.fullnodeGrpcWeb; // Returned data is separate from the stored binding.
  (preview.profile as any).generation = 'tampered';
  expect(preview.additionalServices).toHaveLength(1);
  expect(reviews.consume(preview.token, 'prior').generation).toBe('dev-1');
  expect(() => reviews.consume(preview.token, 'prior')).toThrow();
});
it('expires confirmation after five minutes', async () => {
  const { reviews, advance } = setup();
  const p = await reviews.prepare(profileFixture(), 'prior'); advance();
  expect(() => reviews.consume(p.token, 'prior')).toThrow();
});
it('network changes invalidate confirmation and burn the token', async () => {
  const { reviews } = setup(); const p = await reviews.prepare(profileFixture(), 'prior');
  expect(() => reviews.consume(p.token, 'other')).toThrow();
  expect(() => reviews.consume(p.token, 'prior')).toThrow();
});
it('bounds outstanding reviews', async () => {
  const { reviews } = setup(); const first = await reviews.prepare(profileFixture(), 'prior');
  for (let i = 0; i < 8; i++) await reviews.prepare(profileFixture(), 'prior');
  expect(() => reviews.consume(first.token, 'prior')).toThrow();
});
it.each(['fullnode', 'graphql', 'archive'])('requires configured %s identity, not any one successful endpoint', async (role) => {
  const { reviews, inspect } = setup();
  inspect.mockImplementationOnce(async (profile) => ({ state: 'identity-verified', bindingKey: networkBindingKey(profile), observedAt: 0,
    endpoints: (['fullnode', 'graphql', 'archive'] as const).filter(r => r !== role).map(r => ({ role: r, state: 'verified', genesisDigest: profile.expectedGenesisDigest })),
  }));
  await expect(reviews.prepare(profileFixture(), 'prior')).rejects.toThrow(role);
});
it('requires matching H0 and binding', async () => {
  const { reviews, inspect } = setup();
  inspect.mockResolvedValueOnce({ state: 'identity-verified', bindingKey: 'wrong', observedAt: 0, endpoints: [] });
  await expect(reviews.prepare(profileFixture(), 'prior')).rejects.toThrow('绑定');
});
it('permission scope includes only explicitly configured service origins', () => {
  const profile = validateNetworkProfile({ ...profileFixture(), faucetUrl: 'http://127.0.0.1:9123' });
  expect(profilePermissionOrigins(profile)).toEqual(['http://127.0.0.1:9000/*', 'https://localhost:9001/*', 'http://127.0.0.1:9123/*']);
});
