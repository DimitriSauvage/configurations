# Playwright Test Template

```ts
import { test, expect } from "@playwright/test";

test.describe("Feature - Name", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(process.env.DEV_URL ?? "http://localhost:3000");
  });

  test("happy path", async ({ page }) => {
    await test.step("perform action", async () => {
      // interactions
    });

    await test.step("verify result", async () => {
      await expect(page.getByRole("main")).toBeVisible();
    });
  });
});
```

Checklist:

- Semantic locators only
- No hard waits
- Verify at least one user-visible outcome
- Add negative or empty-state test where relevant
