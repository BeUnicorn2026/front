import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("billing creates a server-priced order before opening Toss and confirms the redirect", async () => {
  const source = await readFile(new URL("../src/features/billing/BillingPage.jsx", import.meta.url), "utf8");
  const createOrder = source.indexOf('postJson("/api/billing/orders"');
  const openToss = source.indexOf("loadTossPayments");
  assert.ok(createOrder > openToss, "the module import appears first");
  assert.ok(source.indexOf("await loadTossPayments", createOrder) > createOrder);
  assert.match(source, /postJson\("\/api\/billing\/confirm", \{ paymentKey, orderId, amount \}\)/);
  assert.match(source, /successUrl: `\$\{window\.location\.origin\}\/billing\/success`/);
  assert.match(source, /failUrl: `\$\{window\.location\.origin\}\/billing\/fail`/);
});

test("billing UI uses Astryx layout primitives without hand-built layout elements", async () => {
  const source = await readFile(new URL("../src/features/billing/BillingPage.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(source, /<(?:div|span)(?:\s|>)/);
  assert.match(source, /<Grid columns=\{\{ minWidth: 260, max: 3, repeat: "fit" \}\}/);
  assert.match(source, /\(billing\?\.plans \|\| \[\]\)\.map/);
  assert.match(source, /subscription\.planId/);
  assert.doesNotMatch(source, /TOSS_CLIENT_KEY|TOSS_SECRET_KEY|결제 설정 필요|테스트 키가 필요/);
});
