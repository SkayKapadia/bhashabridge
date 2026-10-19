The test calls the real payment API because `chargeCard` is imported directly inside `checkout.ts`. Your mock is created after the module has already loaded, so it never replaces the real function.

With Vitest, declare the mock at the top of the test file:

```ts
import { vi, test, expect } from "vitest";
vi.mock("./payments", () => ({ chargeCard: vi.fn().mockResolvedValue({ ok: true }) }));

import { checkout } from "./checkout";

test("checkout charges the card once", async () => {
  await checkout(cart);
  expect(chargeCard).toHaveBeenCalledTimes(1);
});
```

`vi.mock` calls are hoisted, so the mock is in place before `checkout` is imported.
