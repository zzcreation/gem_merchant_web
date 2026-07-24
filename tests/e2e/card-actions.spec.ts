import { expect, test, type Page } from '@playwright/test'

/**
 * Deterministic local-mock market (seed `local-mock`, 3 players):
 * L1[0] = l1-green-005 cost { white: 2, blue: 1 }
 */

test('captures a deterministic mobile market snapshot', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openLocalGame(page)
  await expect(page.locator('.market')).toBeVisible()
  await expect(page.locator('.market')).toHaveScreenshot('mobile-market-390.png', {
    animations: 'disabled',
  })
})

test('buys a market card with exact normal tokens', async ({ page }) => {
  await openLocalGame(page)

  // Collect { white: 2, blue: 1 } across turns, then buy on the following 阿岚 turn
  // (local mock advances the turn immediately after each action).
  await takeTokens(page, ['white', 'white'])
  await expect(page.getByTestId('status-message')).toContainText('阿岚 拿取宝石')
  await passFillerTurns(page)

  await takeTokens(page, ['blue', 'green', 'red'])
  await expect(page.getByTestId('player-token-阿岚-white')).toHaveText('2')
  await expect(page.getByTestId('player-token-阿岚-blue')).toHaveText('1')
  await passFillerTurns(page)

  await expect(page.getByTestId('current-player')).toContainText('阿岚')
  const target = levelOneCards(page).first()
  await expect(target).toHaveClass(/afford-normal/)
  await target.click()
  await expect(page.getByTestId('payment-plan')).toBeVisible()
  await expect(page.getByRole('button', { name: '购买市场卡' })).toBeEnabled()
  await page.getByRole('button', { name: '购买市场卡' }).click()

  await expect(page.getByTestId('status-message')).toContainText('阿岚 购买了市场卡')
  await expect(page.getByTestId('status-message')).toHaveAttribute('data-status-tone', 'success')
})

test('reserves a market card then buys it with gold substitution', async ({ page }) => {
  await openLocalGame(page)

  const target = levelOneCards(page).first()
  await target.click()
  await expect(page.getByRole('button', { name: '预留市场卡' })).toBeEnabled()
  await page.getByRole('button', { name: '预留市场卡' }).click()
  await expect(page.getByTestId('status-message')).toContainText('阿岚 预留了市场卡')
  await expect(page.getByTestId('player-token-阿岚-gold')).toHaveText('1')
  // Local mock advances the turn after reserve; action-list follows the current player.
  await expect(page.locator('.player-panel').filter({ hasText: '阿岚' }).locator('.reserved-pill')).toHaveCount(1)

  // p2 / p3 filler
  await passFillerTurns(page)

  // p1 now has gold:1; bank white is 5 — take white+blue and use gold for the 2nd white
  await takeTokens(page, ['white', 'blue', 'green'])
  await expect(page.getByTestId('player-token-阿岚-white')).toHaveText('1')
  await expect(page.getByTestId('player-token-阿岚-blue')).toHaveText('1')
  await expect(page.getByTestId('player-token-阿岚-gold')).toHaveText('1')

  // Turn cycles p2/p3 again before p1 can buy
  await passFillerTurns(page)

  await expect(page.getByTestId('current-player')).toContainText('阿岚')
  const reserved = page.locator('.reserved-action-list .reserved-buy-pill').first()
  await expect(reserved).toBeVisible()
  await reserved.click()
  await expect(page.getByTestId('payment-plan')).toContainText('预留卡支付')
  await expect(page.getByTestId('payment-plan')).toContainText('支付刚好覆盖成本')
  // Auto plan must use gold for the missing white
  await expect(page.getByLabel('白金币支付')).toContainText('金 1')

  await expect(page.getByRole('button', { name: '购买预留卡' })).toBeEnabled()
  await page.getByRole('button', { name: '购买预留卡' }).click()
  await expect(page.getByTestId('status-message')).toContainText('阿岚 购买了预留卡')
  await expect(page.locator('.player-panel').filter({ hasText: '阿岚' }).locator('.reserved-pill')).toHaveCount(0)
})

async function openLocalGame(page: Page) {
  await page.goto('/')
  await page.getByRole('button', { name: '本地试玩' }).click()
  // On narrow viewports the action panel may be below the fold; market is always present.
  await expect(page.locator('.market-row')).toHaveCount(3)
}

function levelOneCards(page: Page) {
  // Market rows render L3, L2, L1 — L1 is last.
  return page.locator('.market-row').last().locator('.dev-card:not(.empty)')
}

async function takeTokens(page: Page, colors: Array<'white' | 'blue' | 'green' | 'red' | 'black'>) {
  for (const color of colors) {
    await page.getByTestId(`bank-token-${color}`).click()
  }
  await page.getByRole('button', { name: '拿所选宝石' }).click()
  await expect(page.getByTestId('status-message')).toHaveAttribute('data-status-tone', 'success')
}

async function passFillerTurns(page: Page) {
  await takeTokens(page, ['red', 'blue', 'green'])
  await takeTokens(page, ['red', 'blue', 'black'])
}
