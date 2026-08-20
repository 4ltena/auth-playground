import { test, expect, type Page } from "@playwright/test";

async function solveCaptcha(page: Page) {
  const texts = await page.locator("svg text").allTextContents();
  await page.getByLabel("画像の文字を入力してください").fill(texts.join(""));
}

test("signup, login, view account, logout", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill("password123");
  await page.getByLabel("パスワード（確認用）").fill("password123");
  await page.getByLabel("上記の質問への答え").fill("fido");
  await solveCaptcha(page);
  await page.getByRole("button", { name: "登録する" }).click();

  await expect(page).toHaveURL(/\/login\?signedUp=1/);

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("password123");
  await page.getByRole("button", { name: "ログイン" }).click();

  await expect(page).toHaveURL(/\/account/);
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "ログアウト" }).click();
  await expect(page).toHaveURL(/\/login/);

  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount/);
});

test("password reset via security question", async ({ page }) => {
  const email = `e2e-reset-${Date.now()}@example.com`;

  await page.goto("/signup");
  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード", { exact: true }).fill("password123");
  await page.getByLabel("パスワード（確認用）").fill("password123");
  await page.getByLabel("上記の質問への答え").fill("fido");
  await solveCaptcha(page);
  await page.getByRole("button", { name: "登録する" }).click();
  await expect(page).toHaveURL(/\/login\?signedUp=1/);

  await page.getByRole("link", { name: "パスワードをお忘れですか？" }).click();
  await expect(page).toHaveURL(/\/password-reset/);

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByRole("button", { name: "次へ" }).click();

  await expect(page.getByText("初めて飼ったペットの名前は？")).toBeVisible();
  await page.locator('input[type="text"]').first().fill("fido");
  await page.getByLabel("新しいパスワード").fill("newpassword456");
  await page.getByRole("button", { name: "パスワードを再設定する" }).click();

  await expect(page).toHaveURL(/\/login\?resetDone=1/);

  await page.getByLabel("メールアドレス").fill(email);
  await page.getByLabel("パスワード").fill("newpassword456");
  await page.getByRole("button", { name: "ログイン" }).click();
  await expect(page).toHaveURL(/\/account/);
});
