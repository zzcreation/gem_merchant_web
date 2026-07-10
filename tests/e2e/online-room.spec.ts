import { expect, test } from '@playwright/test'

test('renders all market tiers in the mobile layout', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await page.getByRole('button', { name: '本地试玩' }).click()

  await expect(page.locator('.market-row')).toHaveCount(3)
  await expect(page.locator('.tier-label').filter({ hasText: 'L3' })).toBeInViewport()
  await expect(page.locator('.tier-label').filter({ hasText: 'L2' })).toBeInViewport()
  await expect(page.locator('.tier-label').filter({ hasText: 'L1' })).toBeInViewport()
  await expect.poll(() =>
    page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1),
  ).toBe(true)
})

test('keeps token selection legal when mixing colors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '本地试玩' }).click()

  await page.getByTestId('bank-token-white').click()
  await page.getByTestId('bank-token-white').click()
  await page.getByTestId('bank-token-blue').click()

  await expect(page.getByTestId('bank-token-white')).toContainText('1')
  await expect(page.getByTestId('bank-token-blue')).toContainText('1')
  await expect(page.getByRole('button', { name: '拿所选宝石' })).toBeEnabled()
})

test('syncs a token-taking action between two online players', async ({ browser }) => {
  const roomCode = `E2E-${Date.now().toString(36).toUpperCase()}`
  const sandboxContext = await browser.newContext()
  const hostContext = await browser.newContext()
  const sandbox = await sandboxContext.newPage()
  const host = await hostContext.newPage()

  try {
    await joinRoom(sandbox, roomCode, 'Sandbox')
    await expect(sandbox.getByTestId('room-status')).toContainText(`房间 ${roomCode}`)
    await expect(sandbox.getByTestId('lobby-roster')).toContainText('Sandbox')

    await joinRoom(host, roomCode, 'HostA')
    await expect(host.getByTestId('lobby-roster')).toContainText('Sandbox')
    await expect(host.getByTestId('lobby-roster')).toContainText('HostA')

    await sandbox.getByRole('button', { name: '准备' }).click()
    await host.getByRole('button', { name: '准备' }).click()
    await expect(host.getByTestId('lobby-roster')).toContainText('已准备')

    await host.getByRole('button', { name: '开始房间' }).click()
    await expect(sandbox.getByTestId('current-player')).toContainText('Sandbox 的回合')
    await expect(sandbox.getByTestId('turn-alert')).toContainText('轮到你了')
    await expect(host.getByTestId('turn-alert')).toContainText('等待 Sandbox 行动')

    await sandbox.getByTestId('bank-token-white').click()
    await sandbox.getByTestId('bank-token-blue').click()
    await sandbox.getByTestId('bank-token-green').click()
    await sandbox.getByRole('button', { name: '拿所选宝石' }).click()

    await expect(sandbox.getByTestId('status-message')).toContainText('Sandbox 拿取宝石。')
    await expect(sandbox.getByTestId('status-message')).toHaveAttribute('data-status-tone', 'success')
    await expect(host.getByTestId('current-player')).toContainText('HostA 的回合')
    await expect(host.getByTestId('player-token-Sandbox-white')).toHaveText('1')
    await expect(host.getByTestId('player-token-Sandbox-blue')).toHaveText('1')
    await expect(host.getByTestId('player-token-Sandbox-green')).toHaveText('1')
    await expect(host.getByTestId('bank-token-white')).toContainText('3')
    await expect(host.getByTestId('bank-token-blue')).toContainText('3')
    await expect(host.getByTestId('bank-token-green')).toContainText('3')
    await expect(host.getByTestId('action-log')).toContainText('Sandbox took tokens.')
  } finally {
    await hostContext.close()
    await sandboxContext.close()
  }
})

async function joinRoom(page: import('@playwright/test').Page, roomCode: string, nickname: string) {
  await page.goto('/')
  await page.getByRole('textbox', { name: '房间码' }).fill(roomCode)
  await page.getByRole('textbox', { name: '昵称' }).fill(nickname)
  await page.getByRole('button', { name: '加入房间' }).click()
}
