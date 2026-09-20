// Checks every .mdx page: required frontmatter (title, description, icon),
// a docs.json navigation entry, and that internal /links resolve to a page.
// Run: node scripts/check-links.mjs [path ...]   (no args = whole repo)
import { readFileSync, readdirSync } from 'node:fs'
import { join, relative } from 'node:path'

const root = process.cwd()
const nav = new Set()

const collect = (node) => {
  if (Array.isArray(node)) return node.forEach(collect)
  if (!node || typeof node !== 'object') return
  for (const [key, value] of Object.entries(node)) {
    if (key === 'pages' && Array.isArray(value)) {
      for (const page of value) {
        if (typeof page === 'string') nav.add(page)
        else collect(page)
      }
    } else collect(value)
  }
}
collect(JSON.parse(readFileSync(join(root, 'docs.json'), 'utf8')).navigation)

const pages = []
const walk = (dir) => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue
    const full = join(dir, entry.name)
    if (entry.isDirectory()) walk(full)
    else if (entry.name.endsWith('.mdx')) pages.push(full)
  }
}
walk(root)

const slugOf = (file) => relative(root, file).replace(/\\/g, '/').replace(/\.mdx$/, '')
const known = new Set(pages.map(slugOf))

const targets = process.argv.slice(2)
const selected = targets.length
  ? pages.filter((file) => targets.some((t) => slugOf(file).includes(t.replace(/\\/g, '/'))))
  : pages

let problems = 0
const fail = (slug, message) => {
  console.log(`  ${slug}: ${message}`)
  problems += 1
}

for (const file of selected) {
  const slug = slugOf(file)
  const text = readFileSync(file, 'utf8')

  // Snippets are included into pages, so they carry neither frontmatter nor a
  // navigation entry of their own — only their links are worth checking.
  const isSnippet = slug.startsWith('snippets/')

  if (!isSnippet) {
    const frontmatter = text.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    if (!frontmatter) fail(slug, 'no frontmatter block')
    else {
      for (const key of ['title', 'description', 'icon']) {
        if (!new RegExp(`^${key}:`, 'm').test(frontmatter[1])) fail(slug, `frontmatter missing "${key}"`)
      }
    }

    if (!nav.has(slug)) fail(slug, 'not listed in docs.json navigation')
  }

  // Unbalanced components are the usual way a page breaks. Count outside of
  // fenced code blocks, and ignore self-closing tags.
  const body = text.replace(/```[\s\S]*?```/g, '')
  const components = [
    'Steps', 'Step', 'Tabs', 'Tab', 'CodeGroup', 'AccordionGroup', 'Accordion',
    'CardGroup', 'Card', 'ParamField', 'ResponseField', 'Note', 'Warning',
    'Info', 'Tip', 'Frame', 'Expandable',
  ]
  for (const name of components) {
    const open = (body.match(new RegExp(`<${name}(?=[\\s/>])(?:[^>]*?)(?<!/)>`, 'g')) || []).length
    const close = (body.match(new RegExp(`</${name}>`, 'g')) || []).length
    if (open !== close) fail(slug, `<${name}> unbalanced: ${open} open, ${close} closing`)
  }

  // Internal markdown links: [text](/path) and href="/path"
  const links = [
    ...text.matchAll(/\]\((\/[^)\s#]+)/g),
    ...text.matchAll(/href="(\/[^"#]+)"/g),
  ]
  for (const [, href] of links) {
    const target = href.replace(/^\//, '')
    if (target.startsWith('images/') || target.startsWith('logo/')) continue
    if (!known.has(target)) fail(slug, `dead link -> ${href}`)
  }
}

console.log(
  problems
    ? `\n${problems} problem(s) in ${selected.length} page(s)`
    : `OK: ${selected.length} page(s), frontmatter + nav + internal links clean`,
)
process.exit(problems ? 1 : 0)
