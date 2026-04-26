import { test, expect } from '@playwright/test';

test('minimal test that /api/webhooks/stripe POST returns 200', async ({ page }) => {
  const response = await page.request.post('/api/webhooks/stripe', {
    data: {
      type: 'checkout.session.completed',
      data: { object: { customer: 'cus_test', subscription: 'sub_test', metadata: {} } },
    },
    headers: { 'Content-Type': 'application/json' },
  });

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty('received', true);
});
