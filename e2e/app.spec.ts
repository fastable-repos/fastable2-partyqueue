import { test, expect, Page } from '@playwright/test'
import { captureScreenshot } from './helpers'

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createSession(
  page: Page,
  sessionName: string,
  hostName: string
): Promise<string> {
  await page.goto('/')
  await page.getByTestId('session-name-input').fill(sessionName)
  await page.getByTestId('host-name-input').fill(hostName)
  await page.getByTestId('create-party-btn').click()
  await page.waitForURL(/\/session\//)

  // Extract session code from URL or badge
  const code = page.url().split('/session/')[1]
  return code
}

async function addSong(page: Page, title: string, artist: string): Promise<void> {
  await page.getByTestId('song-title-input').fill(title)
  await page.getByTestId('song-artist-input').fill(artist)
  await page.getByTestId('add-song-btn').click()
}

// ─── Tests ──────────────────────────────────────────────────────────────────

test.describe('PartyQueue', () => {
  test.beforeEach(async ({ page }) => {
    // Clear all localStorage before each test to ensure isolation
    await page.goto('/')
    await page.evaluate(() => {
      for (const key of Object.keys(localStorage)) {
        if (key.startsWith('partyqueue_')) {
          localStorage.removeItem(key)
        }
      }
    })
  })

  // ─── Screenshot: Landing Page ──────────────────────────────────────────
  test('screenshot: landing page', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByTestId('session-name-input')).toBeVisible()
    await captureScreenshot(page, 'landing-page')
  })

  // ─── 1. Happy Path: Create Session ────────────────────────────────────
  test('create session - navigates to queue screen with session code', async ({ page }) => {
    await page.goto('/')

    await expect(page.getByTestId('session-name-input')).toBeVisible()
    await expect(page.getByTestId('host-name-input')).toBeVisible()
    await expect(page.getByTestId('create-party-btn')).toBeVisible()
    await expect(page.getByTestId('join-code-input')).toBeVisible()
    await expect(page.getByTestId('join-name-input')).toBeVisible()
    await expect(page.getByTestId('join-party-btn')).toBeVisible()

    await page.getByTestId('session-name-input').fill('Friday Night')
    await page.getByTestId('host-name-input').fill('Alice')
    await page.getByTestId('create-party-btn').click()

    // Should navigate to session page
    await page.waitForURL(/\/session\//)

    // Session name is shown
    await expect(page.getByTestId('session-name')).toHaveText('Friday Night')

    // Session code badge is visible
    await expect(page.getByTestId('session-code-badge')).toBeVisible()
    const codeBadge = await page.getByTestId('session-code-badge').textContent()
    expect(codeBadge?.trim().length).toBeGreaterThan(0)

    // Host badge is visible
    await expect(page.getByTestId('host-badge')).toBeVisible()

    // Now Playing banner is present
    await expect(page.getByTestId('now-playing-banner')).toBeVisible()

    // Queue is empty
    await expect(page.getByTestId('empty-queue-msg')).toBeVisible()

    // Play Next button is disabled (empty queue)
    const playBtn = page.getByTestId('play-next-btn')
    await expect(playBtn).toBeVisible()
    await expect(playBtn).toBeDisabled()

    await captureScreenshot(page, 'queue-screen-empty')
  })

  // ─── 2. Happy Path: Add and Vote on Songs ─────────────────────────────
  test('add songs and vote - queue re-sorts by net score', async ({ page }) => {
    const code = await createSession(page, 'Test Party', 'Alice')

    // Add first song
    await addSong(page, 'Bohemian Rhapsody', 'Queen')
    // Song should appear in queue
    await expect(page.locator('[data-testid^="song-card-"]').first()).toBeVisible()
    const firstSongTitle = await page.locator('[data-testid^="song-title-"]').first().textContent()
    expect(firstSongTitle).toBe('Bohemian Rhapsody')

    // Get the first song's id
    const firstCard = page.locator('[data-testid^="song-card-"]').first()
    const firstCardId = (await firstCard.getAttribute('data-testid'))!.replace('song-card-', '')

    // Upvote the first song
    await page.getByTestId(`upvote-${firstCardId}`).click()

    // Net score should become +1
    await expect(page.getByTestId(`net-score-${firstCardId}`)).toHaveText('+1')

    // Add second song
    await addSong(page, 'Stairway to Heaven', 'Led Zeppelin')

    // There should be 2 songs
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(2)

    // Find the second song
    const secondCard = page.locator('[data-testid^="song-card-"]').nth(1)
    const secondCardId = (await secondCard.getAttribute('data-testid'))!.replace('song-card-', '')

    // Downvote the second song
    await page.getByTestId(`downvote-${secondCardId}`).click()

    // Second song should have score -1
    await expect(page.getByTestId(`net-score-${secondCardId}`)).toHaveText('-1')

    // First song (score +1) should be ranked #1 (first in list)
    const firstCardInList = page.locator('[data-testid^="song-card-"]').first()
    const firstTitle = await firstCardInList.locator('[data-testid^="song-title-"]').textContent()
    expect(firstTitle).toBe('Bohemian Rhapsody')

    await captureScreenshot(page, 'queue-with-songs-voted')
  })

  // ─── 3. Happy Path: Play Next Song ────────────────────────────────────
  test('play next - top song moves to Now Playing and appears in history', async ({ page }) => {
    await createSession(page, 'Test Party', 'Alice')

    // Add two songs
    await addSong(page, 'Song A', 'Artist A')
    await addSong(page, 'Song B', 'Artist B')

    // Upvote Song A to ensure it's top
    const firstCard = page.locator('[data-testid^="song-card-"]').first()
    const firstId = (await firstCard.getAttribute('data-testid'))!.replace('song-card-', '')
    await page.getByTestId(`upvote-${firstId}`).click()

    // Remember the top song title
    const topTitle = await page.locator('[data-testid^="song-title-"]').first().textContent()

    // Click Play Next
    await page.getByTestId('play-next-btn').click()

    // Now Playing banner should show the top song
    await expect(page.getByTestId('now-playing-title')).toHaveText(topTitle!)

    // That song should no longer be in the queue
    const queueTitles = await page.locator('[data-testid^="song-title-"]').allTextContents()
    expect(queueTitles).not.toContain(topTitle)

    // Queue should now have 1 song (was 2)
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(1)

    // Play the last song to move it to history
    await page.getByTestId('play-next-btn').click()

    // Queue should be empty
    await expect(page.getByTestId('empty-queue-msg')).toBeVisible()

    // History should contain the songs
    await expect(page.getByTestId('history-section')).toBeVisible()
    const historyItems = page.locator('[data-testid^="history-item-"]')
    await expect(historyItems).toHaveCount(1) // The first "now playing" moved to history when second was played

    await captureScreenshot(page, 'now-playing-with-history')
  })

  // ─── 4. Happy Path: Join Session ──────────────────────────────────────
  test('join session - second user sees same queue', async ({ page, context }) => {
    // Create session and add songs as host
    const code = await createSession(page, 'Party Night', 'Alice')
    await addSong(page, 'Billie Jean', 'Michael Jackson')
    await addSong(page, 'Purple Rain', 'Prince')

    // Get song id to check score
    const firstCard = page.locator('[data-testid^="song-card-"]').first()
    const firstId = (await firstCard.getAttribute('data-testid'))!.replace('song-card-', '')
    await page.getByTestId(`upvote-${firstId}`).click()

    // Open a new browser context (second user)
    const page2 = await context.newPage()
    await page2.goto('/')

    // Join the session
    await page2.getByTestId('join-code-input').fill(code)
    await page2.getByTestId('join-name-input').fill('Bob')
    await page2.getByTestId('join-party-btn').click()

    // Should navigate to the same session
    await page2.waitForURL(`**/session/${code}`)

    // Should see session name
    await expect(page2.getByTestId('session-name')).toHaveText('Party Night')

    // Should NOT see host badge
    await expect(page2.getByTestId('host-badge')).not.toBeVisible()

    // Should see the songs in queue (at least 2)
    await expect(page2.locator('[data-testid^="song-card-"]')).toHaveCount(2)

    // Should see correct titles
    const titles = await page2.locator('[data-testid^="song-title-"]').allTextContents()
    expect(titles).toContain('Billie Jean')
    expect(titles).toContain('Purple Rain')

    await captureScreenshot(page2, 'join-session-second-user')
    await page2.close()
  })

  // ─── 5. Edge Case: Duplicate Vote Prevention ──────────────────────────
  test('duplicate vote prevention - cannot upvote twice, can switch votes', async ({ page }) => {
    await createSession(page, 'Test Party', 'Alice')
    await addSong(page, 'Test Song', 'Test Artist')

    const card = page.locator('[data-testid^="song-card-"]').first()
    const songId = (await card.getAttribute('data-testid'))!.replace('song-card-', '')

    // First upvote
    await page.getByTestId(`upvote-${songId}`).click()
    await expect(page.getByTestId(`net-score-${songId}`)).toHaveText('+1')

    // Try to upvote again — score should NOT change, toast should show
    await page.getByTestId(`upvote-${songId}`).click()
    await expect(page.getByTestId(`net-score-${songId}`)).toHaveText('+1')

    // A toast/indicator should appear
    await expect(page.locator('[data-testid="toast-info"]')).toBeVisible()

    // Now switch to downvote — score should go to -1 (+1 removed, -1 added)
    await page.getByTestId(`downvote-${songId}`).click()
    await expect(page.getByTestId(`net-score-${songId}`)).toHaveText('-1')
  })

  // ─── 6. Edge Case: Empty Queue Play ───────────────────────────────────
  test('empty queue - play next button is disabled', async ({ page }) => {
    await createSession(page, 'Empty Party', 'Alice')

    // Queue is empty
    await expect(page.getByTestId('empty-queue-msg')).toBeVisible()

    // Play next button should be disabled
    const playBtn = page.getByTestId('play-next-btn')
    await expect(playBtn).toBeDisabled()

    // Clicking disabled button should not crash
    // (clicking disabled buttons is a no-op, but we verify no error)
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(0)
  })

  // ─── 7. Edge Case: Song Removal by Host ───────────────────────────────
  test('host can remove songs, non-host cannot see remove button', async ({ page, context }) => {
    const code = await createSession(page, 'Party', 'Alice')
    await addSong(page, 'Remove Me', 'Test Artist')

    const card = page.locator('[data-testid^="song-card-"]').first()
    const songId = (await card.getAttribute('data-testid'))!.replace('song-card-', '')

    // Host sees remove button
    await expect(page.getByTestId(`remove-song-${songId}`)).toBeVisible()

    // Host removes song
    await page.getByTestId(`remove-song-${songId}`).click()

    // Song should be gone
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(0)
    await expect(page.getByTestId('empty-queue-msg')).toBeVisible()

    // Add another song for non-host test
    await addSong(page, 'Keep Me', 'Artist')

    // Second user (non-host) joins
    const page2 = await context.newPage()
    await page2.goto('/')
    await page2.getByTestId('join-code-input').fill(code)
    await page2.getByTestId('join-name-input').fill('Bob')
    await page2.getByTestId('join-party-btn').click()
    await page2.waitForURL(`**/session/${code}`)

    // Non-host should NOT see remove button
    const card2 = page2.locator('[data-testid^="song-card-"]').first()
    const songId2 = (await card2.getAttribute('data-testid'))!.replace('song-card-', '')
    await expect(page2.getByTestId(`remove-song-${songId2}`)).not.toBeVisible()

    await page2.close()
  })

  // ─── 8. Data Persistence ──────────────────────────────────────────────
  test('data persists after page refresh', async ({ page }) => {
    const code = await createSession(page, 'Persist Party', 'Alice')

    // Add songs and vote
    await addSong(page, 'Persistent Song', 'Persistent Artist')
    const card = page.locator('[data-testid^="song-card-"]').first()
    const songId = (await card.getAttribute('data-testid'))!.replace('song-card-', '')
    await page.getByTestId(`upvote-${songId}`).click()

    // Play a song to get something in history
    await page.getByTestId('play-next-btn').click()
    await addSong(page, 'Queue Song', 'Another Artist')

    // Reload the page
    await page.reload()

    // Should still be on session page
    await page.waitForURL(`**/session/${code}`)

    // Now Playing should still show the played song
    await expect(page.getByTestId('now-playing-title')).toHaveText('Persistent Song')

    // Queue should still have the second song
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(1)
    const queueTitles = await page.locator('[data-testid^="song-title-"]').allTextContents()
    expect(queueTitles).toContain('Queue Song')
  })

  // ─── 9. Clear Queue with Confirmation ─────────────────────────────────
  test('clear queue shows confirmation dialog and empties queue', async ({ page }) => {
    await createSession(page, 'Party', 'Alice')

    // Add multiple songs
    await addSong(page, 'Song 1', 'Artist 1')
    await addSong(page, 'Song 2', 'Artist 2')
    await addSong(page, 'Song 3', 'Artist 3')

    // Play one song to add to history
    await page.getByTestId('play-next-btn').click()

    // Now there are 2 songs in queue and 1 in history
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(2)

    // Click Clear All
    await page.getByTestId('clear-queue-btn').click()

    // Confirmation dialog should appear
    await expect(page.getByTestId('clear-confirm-dialog')).toBeVisible()

    // Cancel — queue should be unchanged
    await page.getByTestId('clear-cancel-btn').click()
    await expect(page.getByTestId('clear-confirm-dialog')).not.toBeVisible()
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(2)

    // Click Clear All again and confirm
    await page.getByTestId('clear-queue-btn').click()
    await expect(page.getByTestId('clear-confirm-dialog')).toBeVisible()
    await page.getByTestId('clear-confirm-btn').click()

    // Queue should be empty
    await expect(page.getByTestId('empty-queue-msg')).toBeVisible()
    await expect(page.locator('[data-testid^="song-card-"]')).toHaveCount(0)

    // History should remain
    await expect(page.getByTestId('history-section')).toBeVisible()
    const historyItems = page.locator('[data-testid^="history-item-"]')
    await expect(historyItems).toHaveCount(1)

    await captureScreenshot(page, 'clear-queue-confirmed')
  })

  // ─── Screenshot: Full Active Queue Screen ─────────────────────────────
  test('screenshot: active queue screen', async ({ page }) => {
    await createSession(page, 'Friday Night Vibes', 'DJ Alice')
    await addSong(page, 'Blinding Lights', 'The Weeknd')
    await addSong(page, 'Levitating', 'Dua Lipa')
    await addSong(page, 'Stay', 'The Kid LAROI')

    // Upvote first song
    const firstCard = page.locator('[data-testid^="song-card-"]').first()
    const firstId = (await firstCard.getAttribute('data-testid'))!.replace('song-card-', '')
    await page.getByTestId(`upvote-${firstId}`).click()

    // Play first song to show Now Playing
    await page.getByTestId('play-next-btn').click()

    await captureScreenshot(page, 'active-queue-screen')
  })
})
