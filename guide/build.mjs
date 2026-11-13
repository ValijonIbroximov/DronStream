// DronStream qo'llanmasini hosil qiladi. Yagona manba: guide/src/guide.md (matn) + guide/src/scenes.json (3D sahnalar)
// + uslub, skript, shablon.
//
//   node guide/build.mjs            -> info.html (mustaqil, hammasi ichida)
//                                      backend/internal/webui/help/{index.html,guide.css,guide.js} (admin yordam)
//   node guide/build.mjs --check    -> hosil qilingan fayllar manba bilan mos ekanini tekshiradi (mos bo'lmasa 1)
//
// Skript (guide/src/guide.js + scene3d.js + three.js'ning faqat ishlatilgan qismlari) esbuild bilan bitta IIFE ga
// yig'iladi. esbuild va three web/node_modules dan olinadi (versiyalar web/package-lock.json da qat'iy):
// avval  cd web && npm ci . Chiqishda tashqi resurs yoki tarmoq chaqiruvi bo'lmasligi tekshiriladi.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const HERE = dirname(fileURLToPath(import.meta.url))
const REPO = join(HERE, '..')
const SRC = join(HERE, 'src')
const WEB = join(REPO, 'web')
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

// ---------- block parser: returns every "## section" separately (the 3D scenes regroup them) ----------
function parse(md) {
  const lines = md.split('\n')
  const parts = [] // {id, title}
  const sections = [] // {id, title, part, html}
  const cmds = {} // title -> card html (the diagnostics scene shows some cards next to the failing spot)
  let cur = null
  let part = null
  let i = 0
  const ids = new Set()
  const fail = (msg) => {
    throw new Error(`guide.md:${i + 1}: ${msg}`)
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
  const flush = (out) => {
    if (!out) return
    if (!cur) fail('matn bo‘limdan (## … {#id}) tashqarida')
    cur.html += out
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
          flush(out)
          out = ''
          if (h.level === 1) {
            part = { id: h.id, title: h.title }
            parts.push(part)
            cur = null
          } else {
            cur = { id: h.id, title: h.title, part, html: '' }
            sections.push(cur)
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
          // the old 6-step 2D story; the 3D scenes (scenes.json) replace it, so it is accepted and not rendered
          while (i < lines.length && lines[i] !== ':::') i++
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
          const card =
            `<div class="cmd ${kClass}" data-os="${a.os}">\n<div class="cmd-h"><span class="cmd-t">${inline(a.title)}</span>` +
            `<span class="chip">${esc(a.shell || '')}</span><span class="chip ${a.admin === 'yes' ? 'c-admin' : ''}">${who}</span><span class="chip ${kClass}">${kLabel}</span></div>\n` +
            `<dl class="cmd-meta">${CMD_META.filter(([k]) => meta[k]).map(([k, l]) => `<dt>${l}</dt><dd>${inline(meta[k])}</dd>`).join('')}</dl>\n` +
            code +
            '</div>\n'
          cmds[a.title] = card
          out += card
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
  flush(blocks(null))
  return { parts, sections, cmds, ids }
}

// ---------- scenes.json: validation (every guide.md section exactly once) and HTML ----------
async function loadScenes(parsed) {
  const { CAMS, STATES, ANCHORS } = await import(pathToFileURL(join(SRC, 'keys.js')).href)
  const data = JSON.parse(read(join(SRC, 'scenes.json')))
  const fail = (msg) => {
    throw new Error('scenes.json: ' + msg)
  }
  const secById = new Map(parsed.sections.map((s) => [s.id, s]))
  const used = new Map()
  const sceneIds = new Set()
  const TONES = ['', 'ok', 'warn', 'bad', 'plan']
  if (!Array.isArray(data.scenes) || !data.scenes.length) fail('"scenes" ro‘yxati bo‘sh')
  data.scenes.forEach((s, n) => {
    const at = `sahna ${n + 1} (${s.id})`
    if (!/^[a-z0-9-]+$/.test(s.id || '') || sceneIds.has(s.id)) fail(`${at}: id noto‘g‘ri yoki takroriy`)
    sceneIds.add(s.id)
    for (const gen of ['s-' + s.id, 'd-' + s.id, 'h-' + s.id]) if (parsed.ids.has(gen)) fail(`${at}: "${gen}" id guide.md dagi id bilan to‘qnashadi`)
    if (!s.title || !s.text) fail(`${at}: title va text kerak`)
    if (!Array.isArray(s.beats) || !s.beats.length || s.beats.length > 6) fail(`${at}: 1–6 ta bosqich (beats) kerak`)
    s.beats.forEach((b, k) => {
      const bt = `${at}, bosqich ${k + 1}`
      if (!b.title || !b.text) fail(`${bt}: title va text kerak`)
      if (!CAMS[b.cam]) fail(`${bt}: noma‘lum kamera "${b.cam}" (guide/src/keys.js CAMS)`)
      for (const st of b.state || []) if (!STATES.includes(st.replace(/~$/, ''))) fail(`${bt}: noma‘lum holat "${st}" (keys.js STATES)`)
      for (const l of b.labels || []) {
        if (!Array.isArray(l) || l.length < 2 || !ANCHORS.includes(l[0])) fail(`${bt}: belgi noto‘g‘ri yoki noma‘lum langar "${l && l[0]}" (keys.js ANCHORS)`)
        if (l[3] !== undefined && !TONES.includes(l[3])) fail(`${bt}: belgi toni "${l[3]}"`)
        if (l[4] !== undefined && !['windows', 'linux'].includes(l[4])) fail(`${bt}: belgi os "${l[4]}"`)
      }
      if (b.open && !secById.has(b.open)) fail(`${bt}: "open" — noma‘lum bo‘lim "${b.open}"`)
      for (const t of b.cmds || []) if (!parsed.cmds[t]) fail(`${bt}: buyruq kartasi topilmadi: "${t}" (guide.md dagi :::cmd title bilan aynan bir xil bo‘lsin)`)
    })
    for (const id of s.sections || []) {
      if (!secById.has(id)) fail(`${at}: noma‘lum bo‘lim id "${id}"`)
      if (used.has(id)) fail(`${at}: "${id}" bo‘limi allaqachon "${used.get(id)}" sahnasida`)
      used.set(id, s.id)
    }
    for (const [id, b] of Object.entries(s.sectionBeats || {})) {
      if (!(s.sections || []).includes(id)) fail(`${at}: sectionBeats "${id}" bu sahnaning bo‘limi emas`)
      if (!(Number.isInteger(b) && b >= 0 && b < s.beats.length)) fail(`${at}: sectionBeats "${id}" bosqich raqami noto‘g‘ri`)
    }
    for (const t of s.toggle || []) if (!(t.label && Number.isInteger(t.beat) && t.beat < s.beats.length && (t.beats || []).every((x) => x < s.beats.length))) fail(`${at}: toggle noto‘g‘ri`)
  })
  const missing = parsed.sections.filter((s) => !used.has(s.id)).map((s) => s.id)
  if (missing.length) fail('bu guide.md bo‘limlari hech qaysi sahnaga biriktirilmagan: ' + missing.join(', '))
  return { data, secById }
}

const two = (n) => String(n).padStart(2, '0')
function scenesHtml(data, parsed, secById) {
  const total = data.scenes.length
  const partShown = new Set()
  return data.scenes
    .map((s, n) => {
      const nb = s.beats.length
      let h = `<section class="scene" id="s-${s.id}" aria-labelledby="h-${s.id}">\n<div class="stage b${nb}">\n<div class="panel">\n`
      h += `<p class="kicker"><span class="kn">${two(n + 1)}</span> / ${two(total)} · sahna</p>\n<h2 id="h-${s.id}">${inline(s.title)}</h2>\n<p class="lead">${inline(s.text)}</p>\n`
      if (s.toggle) {
        h += `<div class="seg" role="group" aria-label="Holatni tanlash">` + s.toggle.map((t) => `<button type="button" data-beat="${t.beat}" data-beats="${(t.beats || [t.beat]).join(',')}" aria-pressed="false"${t.beat > 0 ? ' class="seg-plan"' : ''}>${inline(t.label)}</button>`).join('') + '</div>\n'
      }
      if (s.os) {
        h += `<div class="seg" role="group" aria-label="Operatsion tizim"><button type="button" data-os-pick="windows" aria-pressed="true">Windows</button><button type="button" data-os-pick="linux" aria-pressed="false">Linux</button></div>\n`
      }
      if (nb > 1) h += `<ol class="beat-nav" aria-label="Bosqichlar">` + s.beats.map((b, k) => `<li><button type="button" data-beat="${k}"><span class="bn">${k + 1}</span>${inline(b.title)}</button></li>`).join('') + '</ol>\n'
      h += '<div class="beat-stack">\n'
      s.beats.forEach((b, k) => {
        h += `<div class="beat" data-beat="${k}" id="s-${s.id}-${k + 1}">\n<h3><span class="bn">${k + 1}</span>${inline(b.title)}</h3>\n<p>${inline(b.text)}</p>\n`
        if (b.check) h += `<div class="check"><strong>Tekshiring:</strong> ${inline(b.check)}</div>\n`
        for (const t of b.cmds || []) h += parsed.cmds[t]
        if (b.open) h += `<p class="beat-link"><a href="#${b.open}">To‘liq bo‘lim: ${inline(secById.get(b.open).title)} →</a></p>\n`
        if (b.done) h += `<div class="checks"><p class="ck-h ck-ok">Loyihada tekshirilgan</p><ul class="ck ck-ok">${b.done.map((x) => `<li>${inline(x)}</li>`).join('')}</ul>\n<p class="ck-h ck-todo">Hali tekshirilmagan — o‘zingiz sinab ko‘ring</p><ul class="ck ck-todo">${(b.todo || []).map((x) => `<li>${inline(x)}</li>`).join('')}</ul></div>\n`
        if (b.list) h += `<ol class="golive">${b.list.map((x) => `<li>${inline(x)}</li>`).join('')}</ol>\n`
        h += '</div>\n'
      })
      h += '</div>\n'
      h += `<button type="button" class="more" aria-expanded="false" aria-controls="d-${s.id}"><span class="more-t">Batafsil</span><span class="more-n"> · ${s.sections.length} bo‘lim</span></button>\n`
      h += '</div>\n</div>\n'
      h += `<div class="details" id="d-${s.id}" role="region" aria-label="Batafsil: ${esc(s.title)}">\n`
      for (const id of s.sections) {
        const sec = secById.get(id)
        if (sec.part && !partShown.has(sec.part.id)) {
          partShown.add(sec.part.id)
          h += `<p class="part-tag" id="${sec.part.id}">${inline(sec.part.title)}</p>\n`
        }
        h += `<section class="sec" id="${sec.id}" data-title="${esc(sec.title)}">\n<h2>${inline(sec.title)}</h2>\n${sec.html}</section>\n`
      }
      h += `<p class="less-row"><button type="button" class="less">Batafsilni yopish ↑</button></p>\n</div>\n<div class="gap" aria-hidden="true"></div>\n</section>\n`
      return h
    })
    .join('\n')
}

function tocHtml(data, secById) {
  let out = '<ol class="toc-scenes">\n'
  data.scenes.forEach((s, n) => {
    out += `<li><a href="#s-${s.id}" data-scene="${s.id}"><span class="tn">${two(n + 1)}</span>${inline(s.title)}</a>\n<ol>`
    out += s.sections.map((id) => `<li><a href="#${id}">${inline(secById.get(id).title)}</a></li>`).join('')
    out += '</ol></li>\n'
  })
  return out + '</ol>'
}

// ---------- script bundle: guide.js + scene3d.js + the used parts of three.js, one IIFE ----------
function bundle(runtime) {
  const req = createRequire(join(WEB, 'package.json'))
  let esbuild, threePkg, license
  try {
    esbuild = req('esbuild')
    threePkg = JSON.parse(read(join(WEB, 'node_modules', 'three', 'package.json')))
    license = read(join(WEB, 'node_modules', 'three', 'LICENSE')).trim()
  } catch (e) {
    throw new Error('esbuild yoki three topilmadi (web/node_modules). Avval:  cd web && npm ci   (' + e.message + ')')
  }
  const banner =
    '/*! DronStream qo‘llanmasi: interfeys va 3D sahna (manba: guide/src). Tarmoqqa ulanmaydi.\n' +
    ` * Ichida three.js ${threePkg.version} ning ishlatilgan qismlari bor. three.js litsenziyasi:\n * ` +
    license.split('\n').join('\n * ').replace(/ +\n/g, '\n') +
    '\n */'
  const res = esbuild.buildSync({
    entryPoints: [join(SRC, 'guide.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    write: false,
    target: ['es2022'],
    charset: 'ascii',
    legalComments: 'none',
    banner: { js: banner },
    define: { __SCENES__: JSON.stringify(runtime) },
    nodePaths: [join(WEB, 'node_modules')],
    absWorkingDir: REPO,
    logLevel: 'silent',
  })
  const js = res.outputFiles[0].text.replace(/\r\n/g, '\n')
  if (/<!--|<script/i.test(js)) throw new Error('guide.js: "<!--" yoki "<script" ichki skriptni buzadi')
  return { js, rev: threePkg.version.split('.')[1] }
}

async function render() {
  const meta = JSON.parse(read(join(SRC, 'meta.json')))
  const parsed = parse(read(join(SRC, 'guide.md')))
  const { data, secById } = await loadScenes(parsed)
  const css = read(join(SRC, 'guide.css'))
  const runtime = { scenes: data.scenes.map((s) => ({ id: s.id, sectionBeats: s.sectionBeats || {}, beats: s.beats.map((b) => ({ cam: b.cam, state: b.state || [], labels: b.labels || [] })) })) }
  const { js, rev } = bundle(runtime)
  const tpl = read(join(SRC, 'template.html'))
  const fill = (variant) => {
    const head =
      variant === 'standalone'
        ? // No network access at all: the browser itself enforces "nothing external".
          `<meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src 'unsafe-inline'; img-src data:; base-uri 'none'; form-action 'none'">\n<style>\n${css}</style>`
        : '<link rel="stylesheet" href="guide.css">'
    const tail = variant === 'standalone' ? `<script>\n${js.replace(/<\/script/gi, '<\\/script')}</script>` : '<script src="guide.js"></script>'
    const map = { HEAD: head, TAIL: tail, VARIANT: variant, TOC: tocHtml(data, secById), SCENES: scenesHtml(data, parsed, secById), VERSION: esc(meta.version), DATE: esc(meta.date), SCENECOUNT: String(data.scenes.length), THREEREV: rev }
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
  for (const call of ['eval(', 'new Function(', '.innerHTML', 'document.write', 'document.cookie']) {
    if (js.includes(call)) throw new Error(`guide.js: "${call}" topildi (dinamik kod yoki HTML kiritish taqiqlangan)`)
  }
  const kb = Buffer.byteLength(outputs['info.html']) / 1024
  if (kb > 1536) throw new Error(`info.html juda katta: ${Math.round(kb)} KB (chegara 1536 KB)`)
  return outputs
}

const outputs = await render()
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
