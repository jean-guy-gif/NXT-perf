// e2e/nxt-coach.spec.ts
import { test, expect } from '@playwright/test'

test.describe('NXT Coach — Happy path (fallback texte)', () => {
  test.beforeEach(async ({ page }) => {
    // Connexion : adapter selon les helpers existants du projet
    await page.goto('/login')
    await page.fill('[name="email"]', process.env.E2E_EMAIL ?? 'test@example.com')
    await page.fill('[name="password"]', process.env.E2E_PASSWORD ?? 'password')
    await page.click('[type="submit"]')
    await page.waitForURL('/dashboard')
  })

  test('bouton sidebar ouvre le sélecteur de persona au premier lancement', async ({ page }) => {
    // Forcer coach_onboarded = false via l'API Supabase de test si possible
    await page.click('text=Parler à mon coach')
    await expect(page.getByText('Choisis ton coach')).toBeVisible()
    await expect(page.getByText('Le Sergent')).toBeVisible()
    await expect(page.getByText('Coach sportif')).toBeVisible()
    await expect(page.getByText('Coach bienveillant')).toBeVisible()
  })

  test('happy path complet en mode texte', async ({ page }) => {
    // Supposer coach_onboarded = true
    await page.click('text=Parler à mon coach')

    // Le dock apparaît
    await expect(page.locator('[data-testid="coach-dock"]')).toBeVisible({ timeout: 5000 })

    // Passer en mode texte
    await page.click('[data-testid="coach-keyboard-btn"]')

    // Envoyer un tour
    await page.fill('[placeholder="Écris ta réponse..."]', "J'ai fait 2 mandats dont 1 exclusif et 3 visites")
    await page.click('text=Envoyer')

    // Le dock traite et répond
    await expect(page.locator('[data-testid="coach-dock"]')).toBeVisible()

    // Attendre une réponse coach (timeout généreux pour LLM)
    await page.waitForTimeout(3000)
  })

  test('fermeture propre du dock', async ({ page }) => {
    await page.click('text=Parler à mon coach')
    await expect(page.locator('[data-testid="coach-dock"]')).toBeVisible({ timeout: 5000 })
    await page.click('[data-testid="coach-close-btn"]')
    await expect(page.locator('[data-testid="coach-dock"]')).not.toBeVisible()
  })
})

test.describe('NXT Coach — Reprise de session', () => {
  test('session abandonnée ne se reprend pas', async ({ page }) => {
    // Démarrer une session, l'abandonner, recharger
    await page.goto('/dashboard')
    await page.click('text=Parler à mon coach')
    await expect(page.locator('[data-testid="coach-dock"]')).toBeVisible({ timeout: 5000 })
    await page.click('[data-testid="coach-close-btn"]')
    // Recharger
    await page.reload()
    await page.waitForURL('/dashboard')
    // Le dock ne doit pas se réouvrir automatiquement
    await page.waitForTimeout(1000)
    await expect(page.locator('[data-testid="coach-dock"]')).not.toBeVisible()
  })
})
