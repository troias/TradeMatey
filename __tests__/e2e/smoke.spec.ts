// Placeholder to avoid Jest attempting to run Playwright tests in the same
// test tree. Real Playwright tests are in `/e2e` and should be invoked with
// `npx playwright test`.

describe.skip('e2e smoke placeholder', () => {
  test('playwright tests live in /e2e', () => {
    expect(true).toBe(true);
  });
});
