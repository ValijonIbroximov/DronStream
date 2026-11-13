// DronStream qo'llanmasini hosil qiladi. Yagona manba: guide/src/guide.md (+ uslub, skript, shablon).
//
//   node guide/build.mjs            -> info.html (mustaqil, hammasi ichida)
//                                      backend/internal/webui/help/{index.html,guide.css,guide.js} (admin yordam)
//   node guide/build.mjs --check    -> hosil qilingan fayllar manba bilan mos ekanini tekshiradi (mos bo'lmasa 1)
//
// Tashqi bog'liqlik yo'q (faqat Node standart kutubxonasi). Chiqishda tashqi resurs bo'lmasligi tekshiriladi.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..')
const SRC = join(HERE, 'src')
const read = (p) => readFileSync(p, 'utf8').replace(/\r\n/g, '\n')
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// ---------- inline markup: everything is escaped first, then a few safe forms are turned into tags ----------
function inline(s) {
  let out = esc(s)
  out = out.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
  out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  out = out.replace(/\[\[#([a-z0-9-]+)\|([^\]]+)\]\]/g, '<a href="#$1">$2</a>')
  return out
}

const CMD_KIND = {
  diag: ['Diagnostika — faqat o‘qiydi', 'k-diag'],
  setup: ['Sozlash — tizimni o‘zgartiradi', 'k-setup'],
  undo: ['Bekor qilish', 'k-undo'],
}
const CMD_META = [
  ['where', 'Qayerda bajariladi'],
  ['does', 'Nima qiladi'],
  ['expect', 'Kutiladigan natija'],
  ['onerror', 'Xato bo‘lsa'],
  ['undo', 'Bekor qilish'],
]

function parseAttrs(s) {
  const a = {}
  for (const m of s.matchAll(/([a-z]+)=("([^"]*)"|\S+)/g)) a[m[1]] = m[3] !== undefined ? m[3] : m[2]
  return a
}

// ---------- block parser ----------
function parse(md) {
  const lines = md.split('\n')
  const story = []
  const toc = [] // {type:'part'|'sec', id, title}
  let html = ''
  let i = 0
  let secOpen = false
  const ids = new Set()
  const fail = (msg) => {
    throw new Error(`guide.md:${i + 1}: ${msg}`)
  }
  const closeSec = () => {
    if (secOpen) html += '</section>\n'
    secOpen = false
  }
  const heading = (line) => {
    const m = /^(#{1,4}) (.+?)(?: \{#([a-z0-9-]+)\})?$/.exec(line)
    if (!m) fail('sarlavha formati')
    return { level: m[1].length, title: m[2], id: m[3] }
  }
  const fence = () => {
    const lang = lines[i].slice(3).trim()
    const buf = []
    i++
    while (i < lines.length && !lines[i].startsWith('```')) buf.push(lines[i++])
    if (i >= lines.length) fail('kod bloki yopilmagan')
    i++
    return `<pre class="code" data-lang="${esc(lang)}"><code>${esc(buf.join('\n'))}</code></pre>\n`
  }
  // parses blocks until a line equal to `stop` (or EOF); used for the document and for :::note bodies
  const blocks = (stop) => {
    let out = ''
    while (i < lines.length) {
      const line = lines[i]
      if (stop && line === stop) {
        i++
        return out
      }
      if (line.startsWith('#! ') || line.trim() === '') {
        i++
        continue
      }
      if (line.startsWith('```')) {
        out += fence()
        continue
      }
      if (/^#{1,4} /.test(line)) {
        const h = heading(line)
        i++
        if (h.level <= 2) {
          if (stop) fail('blok ichida bo‘lim sarlavhasi')
          if (!h.id) fail('bo‘lim sarlavhasida {#id} kerak')
          if (ids.has(h.id)) fail('takroriy id: ' + h.id)
          ids.add(h.id)
          html += out
          out = ''
          closeSec()
          if (h.level === 1) {
            toc.push({ type: 'part', id: h.id, title: h.title })
            html += `<div class="part" id="${h.id}"><h1>${inline(h.title)}</h1></div>\n`
          } else {
            toc.push({ type: 'sec', id: h.id, title: h.title })
            html += `<section class="sec" id="${h.id}" data-title="${esc(h.title)}">\n<h2>${inline(h.title)}</h2>\n`
            secOpen = true
          }
        } else {
          out += `<h${h.level}${h.id ? ` id="${h.id}"` : ''}>${inline(h.title)}</h${h.level}>\n`
        }
        continue
      }
      if (line.startsWith(':::')) {
        const [name, ...rest] = line.slice(3).split(' ')
        const attrs = rest.join(' ')
        i++
        if (name === 'story') {
          while (i < lines.length && lines[i] !== ':::') {
            const m = /^(\d)\. (.+?) \| (.+)$/.exec(lines[i])
            if (!m) fail('story qatori: "N. Sarlavha | matn"')
            story.push({ n: Number(m[1]), title: m[2], text: m[3] })
            i++
          }
          i++
          continue
        }
        if (name === 'note') {
          const kind = ['info', 'warn', 'ok'].includes(attrs.trim()) ? attrs.trim() : 'info'
          out += `<div class="note ${kind}">\n${blocks(':::')}</div>\n`
          continue
        }
        if (name === 'cmd') {
          const a = parseAttrs(attrs)
          if (!a.title || !CMD_KIND[a.kind] || !['windows', 'linux', 'any'].includes(a.os)) fail('cmd: title, kind (diag|setup|undo), os (windows|linux|any) kerak')
          const meta = {}
          while (i < lines.length && !lines[i].startsWith('```') && lines[i] !== ':::') {
            const m = /^([a-z]+): (.+)$/.exec(lines[i])
            if (m && CMD_META.some(([k]) => k === m[1])) meta[m[1]] = m[2]
            else if (lines[i].trim() !== '') fail('cmd meta qatori: "kalit: matn"')
            i++
          }
          for (const k of ['where', 'does', 'expect', 'onerror']) if (!meta[k]) fail(`cmd "${a.title}": ${k} yo‘q`)
          if (!lines[i] || !lines[i].startsWith('```')) fail('cmd ichida kod bloki kerak')
          const code = fence()
          if (lines[i] !== ':::') fail('cmd yopilmagan (:::)')
          i++
          const [kLabel, kClass] = CMD_KIND[a.kind]
          const who = a.admin === 'yes' ? (a.os === 'linux' ? 'root (sudo) kerak' : 'Administrator kerak') : 'Oddiy foydalanuvchi'
          out +=
            `<div class="cmd ${kClass}" data-os="${a.os}">\n<div class="cmd-h"><span class="cmd-t">${inline(a.title)}</span>` +
            `<span class="chip">${esc(a.shell || '')}</span><span class="chip ${a.admin === 'yes' ? 'c-admin' : ''}">${who}</span><span class="chip ${kClass}">${kLabel}</span></div>\n` +
            `<dl class="cmd-meta">${CMD_META.filter(([k]) => meta[k]).map(([k, l]) => `<dt>${l}</dt><dd>${inline(meta[k])}</dd>`).join('')}</dl>\n` +
            code +
            '</div>\n'
          continue
        }
        fail('noma‘lum blok: ' + name)
      }
      if (line.startsWith('|')) {
        const rows = []
        while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++])
        if (rows.length < 2 || !/^\|[-| ]+\|$/.test(rows[1])) fail('jadval formati')
        const cells = (r) => r.slice(1, -1).split('|').map((c) => inline(c.trim()))
        out += '<div class="tbl"><table><thead><tr>' + cells(rows[0]).map((c) => `<th>${c}</th>`).join('') + '</tr></thead><tbody>\n'
        for (const r of rows.slice(2)) out += '<tr>' + cells(r).map((c) => `<td>${c}</td>`).join('') + '</tr>\n'
        out += '</tbody></table></div>\n'
        continue
      }
      if (/^(- |\d+\. )/.test(line)) {
        const ordered = /^\d+\. /.test(line)
        const items = []
        while (i < lines.length && (/^(- |\d+\. )/.test(lines[i]) || /^ {2,}\S/.test(lines[i]))) {
          if (/^ {2,}\S/.test(lines[i])) items[items.length - 1] += ' ' + lines[i].trim()
          else items.push(lines[i].replace(/^(- |\d+\. )/, ''))
          i++
        }
        out += `<${ordered ? 'ol' : 'ul'}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>\n`
        continue
      }
      const para = []
      while (i < lines.length && lines[i].trim() !== '' && !/^(#{1,4} |```|:::|\||- |\d+\. )/.test(lines[i]) && !(stop && lines[i] === stop)) para.push(lines[i++])
      out += `<p>${inline(para.join(' '))}</p>\n`
    }
    if (stop) fail('blok yopilmagan: ' + stop)
    return out
  }
  const rest = blocks(null) // blocks() appends finished sections to html itself; read html only afterwards
  html += rest
  closeSec()
  if (story.length !== 6) throw new Error('guide.md: :::story blokida aynan 6 bosqich bo‘lishi kerak')
  return { html, toc, story }
}

function tocHtml(toc) {
  let out = ''
  let open = false
  for (const t of toc) {
    if (t.type === 'part') {
      if (open) out += '</ol>\n'
      out += `<div class="toc-part"><a href="#${t.id}">${inline(t.title)}</a></div>\n<ol>\n`
      open = true
    } else {
      if (!open) {
        out += '<ol>\n'
        open = true
      }
      out += `<li><a href="#${t.id}">${inline(t.title)}</a></li>\n`
    }
  }
  if (open) out += '</ol>\n'
  return out
}

function render() {
  const meta = JSON.parse(read(join(SRC, 'meta.json')))
  const { html, toc, story } = parse(read(join(SRC, 'guide.md')))
  const css = read(join(SRC, 'guide.css'))
  const js = read(join(SRC, 'guide.js'))
  const tpl = read(join(SRC, 'template.html'))
  const storyCaptions = story.map((s) => `<li class="cap" data-step="${s.n}"><span class="cap-n">${s.n}</span><div><strong>${inline(s.title)}</strong><p>${inline(s.text)}</p></div></li>`).join('\n')
  const fill = (variant) => {
    const head =
      variant === 'standalone'
        ? // No network access at all: the browser itself enforces "nothing external".
          `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">\n<style>\n${css}</style>`
        : '<link rel="stylesheet" href="guide.css">'
    const tail = variant === 'standalone' ? `<script>\n${js.replace(/<\/script/g, '<\\/script')}</script>` : '<script src="guide.js"></script>'
    const map = { HEAD: head, TAIL: tail, VARIANT: variant, TOC: tocHtml(toc), CONTENT: html, STORY: storyCaptions, VERSION: esc(meta.version), DATE: esc(meta.date) }
    return tpl.replace(/\{\{([A-Z]+)\}\}/g, (m, k) => {
      if (!(k in map)) throw new Error('template: noma‘lum o‘rin: ' + k)
      return map[k]
    })
  }
  const outputs = {
    'info.html': fill('standalone'),
    'backend/internal/webui/help/index.html': fill('admin'),
    'backend/internal/webui/help/guide.css': css,
    'backend/internal/webui/help/guide.js': js,
  }
  // Guard: nothing may be loaded from the network, and the admin variant must satisfy script-src/style-src 'self'.
  for (const [name, text] of Object.entries(outputs)) {
    const bad = [/<script[^>]+src=["']?(https?:)?\/\//i, /<link[^>]+href=["']?(https?:)?\/\//i, /@import/i, /url\(\s*["']?(https?:)?\/\//i, /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\s*\(/, /<iframe|<object|<embed/i]
    for (const re of bad) if (re.test(text)) throw new Error(`${name}: tashqi resurs yoki tarmoq chaqiruvi topildi (${re})`)
    if (name.endsWith('help/index.html') && (/<style[\s>]/i.test(text) || /\sstyle="/i.test(text) || /<script(?![^>]*\ssrc=)/i.test(text) || /\son[a-z]+="/i.test(text))) {
      throw new Error(`${name}: inline style/script/handler bor (admin CSP 'self' buni bloklaydi)`)
    }
  }
  return outputs
}

const outputs = render()
const check = process.argv.includes('--check')
let stale = 0
for (const [rel, text] of Object.entries(outputs)) {
  const p = join(REPO, rel)
  if (check) {
    const cur = existsSync(p) ? read(p) : null
    if (cur !== text) {
      console.error(`ESKIRGAN: ${rel} (qayta hosil qiling: node guide/build.mjs)`)
      stale++
    }
  } else {
    mkdirSync(dirname(p), { recursive: true })
    writeFileSync(p, text)
    console.log(`yozildi: ${rel} (${Math.round(Buffer.byteLength(text) / 1024)} KB)`)
  }
}
if (check) {
  if (stale) process.exit(1)
  console.log('Qo‘llanma: hosil qilingan fayllar manba bilan mos.')
}
