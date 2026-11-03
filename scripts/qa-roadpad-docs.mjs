import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const source = 'D:/Programmieren/vite_roadpad_src'
const phoneRequire = createRequire('D:/Programmieren/roadphone_dev/package.json')
const padRequire = createRequire(join(source, 'package.json'))
const { chromium } = phoneRequire('playwright')
const lua = padRequire('luaparse')
const pages = ['installation', 'updates', 'pairing', 'configuration', 'faq', 'custom-apps', 'fivemanage', 'api/client']
const output = join(tmpdir(), 'roadpad-docs-v3-qa')
const base = 'http://127.0.0.1:4517'
const proveFailure = process.argv.includes('--prove-failure')
const report = { base, fixtures: 'local Mintlify preview; no FiveM/backend test requests', snippets: 0, views: [] }
await mkdir(output, { recursive: true })

for (const slug of pages) {
  const text = await readFile(join(root, 'roadpad', `${slug}.mdx`), 'utf8')
  for (const block of text.matchAll(/```(lua|json) ([^\r\n]+)\r?\n([\s\S]*?)```/g)) {
    const [, language, name, content] = block
    if (language === 'json') JSON.parse(content)
    else lua.parse(name.endsWith('items.lua') ? `return {\n${content}\n}` : content, { luaVersion: '5.3' })
    report.snippets++
  }
}

const browser = await chromium.launch({
  executablePath: 'C:/Users/lggam/.cache/hyperframes/chrome/chrome-headless-shell/win64-152.0.7977.30/chrome-headless-shell-win64/chrome-headless-shell.exe',
  headless: true,
})
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport })
    let pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    for (const slug of pages) {
      pageErrors = []
      const response = await page.goto(`${base}/roadpad/${slug}`, { waitUntil: 'networkidle' })
      assert.equal(response.status(), 200, slug)
      await page.locator('h1').waitFor()
      await page.addStyleTag({ content: '*,*::before,*::after{animation:none!important;transition:none!important}' })
      await page.evaluate(() => { document.getAnimations().forEach(animation => animation.finish()) })
      const title = await page.locator('h1').innerText()
      assert.ok(title.trim(), `${slug}: empty title`)
      assert.ok((await page.locator('main').innerText()).length > 150, `${slug}: missing content`)
      assert.deepEqual(pageErrors, [], `${slug}: JavaScript errors`)
      const geometry = await page.evaluate(() => ({
        width: innerWidth,
        scrollWidth: document.documentElement.scrollWidth,
      }))
      assert.ok(geometry.scrollWidth <= geometry.width + 1, `${slug}: page overflows horizontally`)
      if (proveFailure) {
        await page.locator('main').evaluate(main => {
          const link = document.createElement('a')
          link.href = '#qa-deliberately-missing-anchor'
          main.append(link)
        })
      }
      const missingAnchors = await page.locator('main').evaluate(main => [...main.querySelectorAll('a[href^="#"]')]
        .map(link => link.getAttribute('href'))
        .filter(href => href.length > 1 && !document.getElementById(decodeURIComponent(href.slice(1)))))
      assert.deepEqual(missingAnchors, [], `${slug}: missing anchors`)
      const screenshot = join(output, `${slug.replaceAll('/', '-')}-${viewport.width}.png`)
      await page.screenshot({ path: screenshot, fullPage: true })
      if (slug === 'pairing') {
        const qbTab = page.getByRole('tab', { name: 'QBCore', exact: true })
        await qbTab.click()
        await page.getByText('qb-core/shared/items.lua', { exact: true }).waitFor()
        await page.screenshot({ path: join(output, `pairing-qb-${viewport.width}.png`) })
      }
      if (slug === 'faq') {
        await page.getByText('The tablet says it is no longer in my inventory', { exact: true }).click()
        assert.ok(await page.getByText('An older client could still display', { exact: false }).isVisible())
        await page.screenshot({ path: join(output, `faq-inventory-${viewport.width}.png`) })
      }
      report.views.push({ slug, viewport, title, ...geometry, screenshot, pageErrors: [...pageErrors] })
    }
    await page.close()
  }
} finally {
  await browser.close()
}
await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2) + '\n')
console.log(JSON.stringify({ pages: pages.length, snippets: report.snippets, views: report.views.length, errors: 0, output }, null, 2))
