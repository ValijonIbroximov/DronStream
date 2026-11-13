/* DronStream qo'llanmasi: interfeys skripti (3D sahna + qidiruv + mundarija + nusxalash).
   Hech qanday tarmoq so'rovi yubormaydi, hech narsani o'zi bajarmaydi, server sozlamalarini o'qimaydi.
   Skriptsiz ham sahifa to'liq o'qiladi: hamma matn va buyruq kartalari oddiy HTML.
   Holat aylantirish jarayonidan (T) hisoblanadi; aylantirish o'g'irlanmaydi (native scroll). */
import { createWorld } from './scene3d.js'

/* global __SCENES__ */
const DATA = __SCENES__
const doc = document
const root = doc.documentElement
const $ = (id) => doc.getElementById(id)
const clamp = (v, a, b) => Math.max(a, Math.min(b, v))
const store = {
  get: (k) => { try { return window.localStorage.getItem('ds-guide-' + k) } catch (e) { return null } },
  set: (k, v) => { try { window.localStorage.setItem('ds-guide-' + k, v) } catch (e) { /* file:// may forbid storage */ } },
}
const mm = (q) => (window.matchMedia ? window.matchMedia(q) : { matches: false, addEventListener() {} })
const mqReduce = mm('(prefers-reduced-motion: reduce)')
const mqMobile = mm('(max-width: 760px)')
const barH = () => $('bar').offsetHeight

// deep link: #scene=<id>&beat=<n>&open=<section>&quality=high|light&os=windows|linux&plain=1&perf=1
const params = {}
if (window.location.hash.indexOf('=') > 0) {
  window.location.hash.slice(1).split('&').forEach((kv) => {
    const i = kv.indexOf('=')
    if (i > 0) params[decodeURIComponent(kv.slice(0, i))] = decodeURIComponent(kv.slice(i + 1))
  })
}

root.classList.add('js')

// ---------- toast ----------
let toastTimer = 0
function toast(msg) {
  const t = $('toast')
  t.textContent = msg
  t.hidden = false
  clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { t.hidden = true }, 4200)
}

// ---------- code blocks: placeholder highlight, copy with manual fallback ----------
function markPlaceholders(code) {
  const text = code.textContent
  const re = /<[A-Z][A-Z0-9_]*>/g
  if (!re.test(text)) return false
  re.lastIndex = 0
  const frag = doc.createDocumentFragment()
  let last = 0
  let m
  while ((m = re.exec(text))) {
    frag.appendChild(doc.createTextNode(text.slice(last, m.index)))
    const s = doc.createElement('span')
    s.className = 'ph'
    s.textContent = m[0]
    frag.appendChild(s)
    last = m.index + m[0].length
  }
  frag.appendChild(doc.createTextNode(text.slice(last)))
  code.textContent = ''
  code.appendChild(frag)
  return true
}
function selectNode(node) {
  const sel = window.getSelection()
  const r = doc.createRange()
  r.selectNodeContents(node)
  sel.removeAllRanges()
  sel.addRange(r)
}
function copyCode(code, hasPh) {
  const text = code.textContent
  const okMsg = hasPh ? 'Nusxalandi. Diqqat: <…> ko‘rinishidagi joylarni o‘z qiymatlaringiz bilan almashtiring.' : 'Nusxalandi.'
  const manual = () => {
    selectNode(code)
    let done = false
    try { done = doc.execCommand('copy') } catch (e) { done = false }
    toast(done ? okMsg : 'Avtomatik nusxalab bo‘lmadi. Kod belgilandi — Ctrl+C (Mac: ⌘C) bosing.')
  }
  if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
    navigator.clipboard.writeText(text).then(() => toast(okMsg), manual)
  } else {
    manual()
  }
}
doc.querySelectorAll('pre.code').forEach((pre) => {
  const code = pre.querySelector('code')
  const hasPh = markPlaceholders(code)
  const tools = doc.createElement('div')
  tools.className = 'code-tools'
  const lang = doc.createElement('span')
  lang.className = 'lang'
  lang.textContent = pre.getAttribute('data-lang') || ''
  const bSel = doc.createElement('button')
  bSel.type = 'button'
  bSel.textContent = 'Belgilash'
  bSel.title = 'Kodni belgilaydi (keyin Ctrl+C)'
  bSel.addEventListener('click', () => { autoStop(); selectNode(code); toast('Kod belgilandi — Ctrl+C (Mac: ⌘C) bosing.') })
  const bCopy = doc.createElement('button')
  bCopy.type = 'button'
  bCopy.textContent = 'Nusxalash'
  bCopy.addEventListener('click', () => { autoStop(); copyCode(code, hasPh) })
  tools.appendChild(lang)
  tools.appendChild(bSel)
  tools.appendChild(bCopy)
  pre.parentNode.insertBefore(tools, pre.nextSibling)
})

// ---------- scenes and the flattened beat list ("holds") ----------
const holds = []
const S = Array.from(doc.querySelectorAll('main .scene')).map((el, i) => {
  const d = DATA.scenes[i]
  const first = holds.length
  d.beats.forEach((b, k) => {
    const set = {}
    b.state.forEach((s) => { if (s.endsWith('~')) set[s.slice(0, -1)] = [0, 1]; else set[s] = [1, 1] })
    holds.push({ scene: i, beat: k, cam: b.cam, set, labels: b.labels })
  })
  return {
    i, el, id: d.id, first, count: d.beats.length, sectionBeats: d.sectionBeats || {},
    stage: el.querySelector('.stage'), panel: el.querySelector('.panel'), details: el.querySelector('.details'),
    more: el.querySelector('.more'), beats: Array.from(el.querySelectorAll('.beat')), nav: Array.from(el.querySelectorAll('.beat-nav button')),
    toggles: Array.from(el.querySelectorAll('.seg [data-beat]')), secs: Array.from(el.querySelectorAll('.details .sec')),
    open: false, y0: 0, y1: 1, yd: 1,
  }
})
const NH = holds.length
const sceneOfHold = (h) => S[holds[clamp(h, 0, NH - 1)].scene]

// ---------- modes ----------
let plain = params.plain === '1' || store.get('plain') === '1'
let animOn = store.get('anim') !== null ? store.get('anim') === '1' : true
const reduced = () => mqReduce.matches || !animOn
let osPick = params.os || store.get('os') || 'windows'
let gl = false
let noWebGL = false

// ---------- scroll → T mapping (pure function of the layout and scroll position) ----------
let segs = []
function measure() {
  if (!gl) return
  const sy = window.scrollY, vh = window.innerHeight, bh = barH(), mobile = mqMobile.matches
  const top = (e) => e.getBoundingClientRect().top + sy
  S.forEach((s) => {
    const st = top(s.stage), sb = st + s.stage.offsetHeight, ph = s.panel.offsetHeight
    let y0, y1
    if (mobile) { y0 = st + ph - vh; y1 = sb - vh }
    else { const stick = bh + 16; y0 = st - stick; y1 = sb - stick - ph }
    if (y1 < y0 + 40) y1 = y0 + 40
    s.y0 = y0
    s.y1 = y1
    s.t0 = s.first + 0.2
    s.t1 = s.first + s.count - 0.2
  })
  // in order: the scene's own beats, its open details (one fixed state per section), then the flight to the next scene
  segs = []
  S.forEach((s, i) => {
    segs.push({ y0: s.y0, y1: s.y1, t0: s.t0, t1: s.t1 })
    let yd = s.y1
    if (s.open) {
      const def = s.first + s.count - 0.5
      let y = s.y1, tcur = def
      s.secs.forEach((sec) => {
        const ys = Math.max(y, top(sec) - bh - vh * 0.3)
        if (ys > y) segs.push({ y0: y, y1: ys, t0: tcur, t1: tcur })
        y = ys
        const b = s.sectionBeats[sec.id]
        tcur = b === undefined ? def : s.first + b + 0.5
      })
      yd = Math.max(y, top(s.details) + s.details.offsetHeight - vh * 0.5)
      if (yd > y) segs.push({ y0: y, y1: yd, t0: tcur, t1: tcur })
    }
    s.yd = yd
    if (i + 1 < S.length) {
      const n = S[i + 1]
      segs.push({ y0: yd, y1: Math.max(yd + 1, n.y0), t0: s.t1, t1: n.t0 })
    }
  })
}
function tAt(y) {
  if (!segs.length) return 0.2
  if (y <= segs[0].y0) return segs[0].t0
  let last = segs[0]
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i]
    if (y < g.y0) return last.t1
    if (y <= g.y1) return g.y1 > g.y0 ? g.t0 + ((g.t1 - g.t0) * (y - g.y0)) / (g.y1 - g.y0) : g.t1
    last = g
  }
  return last.t1
}
function yAtT(T) {
  for (let i = 0; i < segs.length; i++) {
    const g = segs[i]
    if (g.t1 > g.t0 && T >= g.t0 && T <= g.t1) return g.y0 + ((T - g.t0) / (g.t1 - g.t0)) * (g.y1 - g.y0)
  }
  return T <= 0.2 ? 0 : null
}
function yOfHold(h) {
  const s = sceneOfHold(h)
  const T = clamp(h + 0.5, s.t0, s.t1)
  return s.y0 + ((T - s.t0) / Math.max(1e-6, s.t1 - s.t0)) * (s.y1 - s.y0)
}
function goHold(h) {
  if (!gl) {
    const s = sceneOfHold(h)
    const el = s.beats[h - s.first] || s.el
    scrollToEl(el)
    return
  }
  window.scrollTo(0, Math.max(0, Math.round(yOfHold(h)) + 1))
}
function scrollToEl(el) {
  const y = el.getBoundingClientRect().top + window.scrollY - barH() - 12
  window.scrollTo(0, Math.max(0, y))
}

// ---------- render loop: on demand only ----------
const R = { world: null, T: 0.2, Tt: 0.2, raf: 0, last: 0, amb: 0, ambUntil: 0, visible: !doc.hidden, onscreen: true, free: { x: 0, y: 0, w: 1, h: 1 }, renderMs: [], frames: 0, lost: false, quality: '' }
const AMBIENT_MS = 6000
function want() {
  if (!R.world || !R.visible || !R.onscreen || R.raf) return
  R.raf = window.requestAnimationFrame(frame)
}
function wake() {
  R.ambUntil = performance.now() + AMBIENT_MS
  want()
}
function frame(now) {
  R.raf = 0
  if (!R.world) return
  const dt = R.last ? Math.min(0.1, (now - R.last) / 1000) : 0.016
  R.last = now
  if (auto.on) autoStep(dt)
  R.Tt = tAt(window.scrollY)
  const still = reduced()
  if (still) R.T = clamp(Math.floor(R.Tt - 0.2) + 0.5 + (R.Tt - 0.2 - Math.floor(R.Tt - 0.2) > 0.5 ? 1 : 0), 0.5, NH - 0.5)
  else {
    R.T += (R.Tt - R.T) * (1 - Math.exp(-dt * 7))
    if (Math.abs(R.Tt - R.T) < 0.0004) R.T = R.Tt
  }
  const ambient = !still && now < R.ambUntil
  if (ambient) R.amb += dt
  R.world.update(R.T, R.amb, osPick)
  const t0 = performance.now()
  R.world.render()
  const ms = performance.now() - t0
  R.frames++
  if (R.renderMs.length < 400) R.renderMs.push(ms)
  if (R.frames === 24) adaptQuality()
  placeLabels()
  updatePanels()
  const target = still ? R.T : R.Tt
  if (R.T !== target || ambient || auto.on) want()
  else R.last = 0
}
function adaptQuality() {
  const a = R.renderMs.slice(4).sort((x, y) => x - y)
  const med = a[a.length >> 1] || 0
  if (med > 30 && R.quality === 'high') {
    R.world.setShadows(false)
    R.quality = 'high-noshadow'
    resize()
  }
}

// ---------- labels: flat HTML callouts projected from 3D anchors ----------
const LBL = []
const svgNS = 'http://www.w3.org/2000/svg'
function makeLabels() {
  const host = $('labels'), lines = $('leaders')
  for (let i = 0; i < 10; i++) {
    const el = doc.createElement('div')
    el.className = 'lbl'
    const b = doc.createElement('b')
    const s = doc.createElement('span')
    el.appendChild(b)
    el.appendChild(s)
    host.appendChild(el)
    const ln = doc.createElementNS(svgNS, 'line')
    const dot = doc.createElementNS(svgNS, 'circle')
    dot.setAttribute('r', '3')
    lines.appendChild(ln)
    lines.appendChild(dot)
    LBL.push({ el, b, s, ln, dot, key: '', w: 0, h: 0 })
  }
}
const pt = { x: 0, y: 0, behind: false, hidden: false }
function holdWeight(h, T) {
  const a = h + 0.2, b = h + 0.8
  if (T >= a && T <= b) return 1
  return clamp(1 - (T < a ? a - T : T - b) / 0.4, 0, 1)
}
function placeLabels() {
  const T = R.T, F = R.free, placed = []
  let n = 0
  if (root.classList.contains('no-labels')) { hideLabels(0); return }
  for (let h = Math.max(0, Math.floor(T) - 1); h <= Math.min(NH - 1, Math.floor(T) + 1); h++) {
    const w = holdWeight(h, T)
    if (w < 0.04) continue
    for (const l of holds[h].labels) {
      if (n >= LBL.length) break
      if (l[4] && l[4] !== osPick) continue
      if (!R.world.project(l[0], pt) || pt.behind || pt.hidden) continue
      if (pt.x < F.x + 4 || pt.x > F.x + F.w - 4 || pt.y < F.y + 4 || pt.y > F.y + F.h - 4) continue
      const L = LBL[n]
      const key = l[1] + '|' + l[2] + '|' + (l[3] || '')
      if (L.key !== key) {
        L.key = key
        L.b.textContent = l[1]
        L.s.textContent = l[2] || ''
        L.s.hidden = !l[2]
        L.el.className = 'lbl' + (l[3] ? ' t-' + l[3] : '')
        L.w = L.el.offsetWidth
        L.h = L.el.offsetHeight
      }
      const cands = [[22, -L.h - 20], [-22 - L.w, -L.h - 20], [22, 16], [-22 - L.w, 16], [-L.w / 2, -L.h - 46], [-L.w / 2, 30]]
      let spot = null
      for (const [dx, dy] of cands) {
        const r = { x: pt.x + dx, y: pt.y + dy, w: L.w, h: L.h }
        if (r.x < F.x + 6 || r.y < F.y + 6 || r.x + r.w > F.x + F.w - 6 || r.y + r.h > F.y + F.h - 6) continue
        if (placed.some((p) => r.x < p.x + p.w + 6 && r.x + r.w + 6 > p.x && r.y < p.y + p.h + 6 && r.y + r.h + 6 > p.y)) continue
        spot = r
        break
      }
      if (!spot) continue
      placed.push(spot)
      L.el.style.transform = 'translate(' + Math.round(spot.x) + 'px,' + Math.round(spot.y) + 'px)'
      L.el.style.opacity = w.toFixed(3)
      const ex = clamp(pt.x, spot.x, spot.x + spot.w), ey = clamp(pt.y, spot.y, spot.y + spot.h)
      L.ln.setAttribute('x1', pt.x.toFixed(1))
      L.ln.setAttribute('y1', pt.y.toFixed(1))
      L.ln.setAttribute('x2', ex.toFixed(1))
      L.ln.setAttribute('y2', ey.toFixed(1))
      L.ln.setAttribute('class', 'ld' + (l[3] ? ' t-' + l[3] : ''))
      L.ln.setAttribute('opacity', (0.85 * w).toFixed(3))
      L.dot.setAttribute('cx', pt.x.toFixed(1))
      L.dot.setAttribute('cy', pt.y.toFixed(1))
      L.dot.setAttribute('class', 'ld' + (l[3] ? ' t-' + l[3] : ''))
      L.dot.setAttribute('opacity', w.toFixed(3))
      n++
    }
  }
  hideLabels(n)
}
function hideLabels(from) {
  for (let i = from; i < LBL.length; i++) {
    const L = LBL[i]
    L.el.style.opacity = '0'
    L.ln.setAttribute('opacity', '0')
    L.dot.setAttribute('opacity', '0')
  }
}

// ---------- panels: active beat, scene position, toggles ----------
let activeHold = -1
const scenePos = $('scene-pos')
const tocScene = {}
doc.querySelectorAll('#toc a[data-scene]').forEach((a) => { tocScene[a.getAttribute('data-scene')] = a })
function updatePanels() {
  const T = gl ? R.T : 0.5
  const h = clamp(Math.round(T - 0.5), 0, NH - 1)
  if (h === activeHold) return
  const prev = activeHold >= 0 ? holds[activeHold] : null
  activeHold = h
  const cur = holds[h]
  const s = S[cur.scene]
  if (!prev || prev.scene !== cur.scene) {
    S.forEach((x) => x.el.classList.toggle('current', x === s))
    scenePos.textContent = cur.scene + 1 + ' / ' + S.length
    Object.keys(tocScene).forEach((k) => tocScene[k].classList.toggle('active', k === s.id))
  }
  s.beats.forEach((b, k) => b.classList.toggle('on', k === cur.beat))
  s.nav.forEach((b, k) => { if (k === cur.beat) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current') })
  s.toggles.forEach((b) => {
    const list = (b.getAttribute('data-beats') || '').split(',').map(Number)
    b.setAttribute('aria-pressed', list.indexOf(cur.beat) >= 0 ? 'true' : 'false')
  })
}
S.forEach((s) => {
  s.nav.concat(s.toggles).forEach((b) => b.addEventListener('click', () => { autoStop(); goHold(s.first + Number(b.getAttribute('data-beat'))) }))
  if (s.more) s.more.addEventListener('click', () => setOpen(s, !s.open, true))
  const less = s.details.querySelector('.less')
  if (less) less.addEventListener('click', () => { setOpen(s, false, false); goHold(s.first + s.count - 1); s.more.focus() })
})
function setOpen(s, open, jump) {
  if (s.open === open) return
  s.open = open
  s.details.classList.toggle('open', open)
  s.more.setAttribute('aria-expanded', open ? 'true' : 'false')
  s.more.querySelector('.more-t').textContent = open ? 'Batafsilni yopish' : 'Batafsil'
  if (open) autoStop()
  measure()
  if (open && jump) scrollToEl(s.details)
  if (gl) want()
}

// ---------- OS switch (Windows / Linux) ----------
const osBtns = Array.from(doc.querySelectorAll('[data-os-pick]'))
function applyOs() {
  root.setAttribute('data-os', osPick)
  osBtns.forEach((b) => b.setAttribute('aria-pressed', b.getAttribute('data-os-pick') === osPick ? 'true' : 'false'))
}
osBtns.forEach((b) => b.addEventListener('click', () => {
  osPick = b.getAttribute('data-os-pick')
  store.set('os', osPick)
  applyOs()
  wake()
}))

// ---------- table of contents, reading progress, hash navigation ----------
const secs = Array.from(doc.querySelectorAll('main .sec'))
const tocBtn = $('btn-toc')
const toc = $('toc')
tocBtn.addEventListener('click', () => {
  const open = toc.classList.toggle('open')
  tocBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
})
function closeToc() {
  toc.classList.remove('open')
  tocBtn.setAttribute('aria-expanded', 'false')
}
function goToId(id) {
  const el = id && $(id)
  if (!el || !root.contains(el)) return false
  autoStop()
  const sc = el.closest('.scene')
  const s = sc ? S.find((x) => x.el === sc) : null
  if (s && gl) {
    if (el.closest('.details')) {
      setOpen(s, true, false)
      scrollToEl(el)
    } else if (el === sc) goHold(s.first)
    else goHold(s.first + Math.max(0, Number(el.getAttribute('data-beat') || 0)))
  } else scrollToEl(el)
  return true
}
doc.addEventListener('click', (e) => {
  const a = e.target.closest ? e.target.closest('a[href^="#"]') : null
  if (!a) return
  const id = a.getAttribute('href').slice(1)
  if (!id || id.indexOf('=') >= 0) return
  if (goToId(id)) {
    e.preventDefault()
    if (toc.contains(a)) closeToc()
    if (window.history && window.history.replaceState) window.history.replaceState(null, '', '#' + id)
  }
})
window.addEventListener('hashchange', () => { const id = window.location.hash.slice(1); if (id.indexOf('=') < 0) goToId(id) })
function updateProgress() {
  const max = root.scrollHeight - window.innerHeight
  const p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
  $('progress').style.transform = 'scaleX(' + p.toFixed(4) + ')'
}
function plainActive() {
  if (gl) return
  const line = barH() + 80
  let cur = S[0]
  for (const s of S) { if (s.el.getBoundingClientRect().top <= line) cur = s; else break }
  const keep = cur.first
  if (keep !== activeHoldPlain) {
    activeHoldPlain = keep
    activeHold = keep
    scenePos.textContent = cur.i + 1 + ' / ' + S.length
    Object.keys(tocScene).forEach((k) => tocScene[k].classList.toggle('active', k === cur.id))
  }
}
let activeHoldPlain = -1

// ---------- search (local text only) ----------
const norm = (s) => s.toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ')
const index = secs.map((s) => ({ el: s, title: s.getAttribute('data-title') || '', text: norm(s.textContent) }))
const q = $('q')
const results = $('results')
let qTimer = 0
function closeResults() { results.hidden = true }
function runSearch() {
  const term = norm(q.value.trim())
  const list = $('results-list')
  list.textContent = ''
  if (term.length < 2) { closeResults(); return }
  let n = 0
  index.forEach((it) => {
    const at = it.text.indexOf(term)
    if (at < 0) return
    n++
    const li = doc.createElement('li')
    const a = doc.createElement('a')
    a.href = '#' + it.el.id
    const sc = it.el.closest('.scene')
    const s = sc ? S.find((x) => x.el === sc) : null
    a.textContent = it.title
    const where = doc.createElement('span')
    where.className = 'where'
    where.textContent = s ? ' · ' + (s.i + 1) + '-sahna' : ''
    const snip = doc.createElement('span')
    snip.className = 'snip'
    const from = Math.max(0, at - 50)
    snip.appendChild(doc.createTextNode((from > 0 ? '…' : '') + it.text.slice(from, at)))
    const mk = doc.createElement('mark')
    mk.textContent = it.text.slice(at, at + term.length)
    snip.appendChild(mk)
    snip.appendChild(doc.createTextNode(it.text.slice(at + term.length, at + term.length + 70) + '…'))
    li.appendChild(a)
    li.appendChild(where)
    li.appendChild(snip)
    list.appendChild(li)
  })
  $('results-count').textContent = n ? n + ' ta bo‘limda topildi' : 'Hech narsa topilmadi'
  results.hidden = false
}
q.addEventListener('input', () => { clearTimeout(qTimer); qTimer = setTimeout(runSearch, 120) })
q.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') { q.value = ''; closeResults() }
  if (e.key === 'Enter') {
    runSearch()
    const first = doc.querySelector('#results-list a')
    if (first) { first.click(); closeResults() }
  }
})
$('results-close').addEventListener('click', closeResults)
$('results-list').addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a')) closeResults() })
doc.addEventListener('keydown', (e) => {
  const tag = (e.target.tagName || '').toLowerCase()
  if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea') { e.preventDefault(); q.focus() }
})

// ---------- auto demo: the same timeline, off by default ----------
const auto = { on: false, T: 0.2, acc: 0 }
const bAuto = $('btn-auto')
const speedSel = $('auto-speed')
function autoStop(msg) {
  if (!auto.on) return
  auto.on = false
  bAuto.setAttribute('aria-pressed', 'false')
  bAuto.textContent = '▶ Avto namoyish'
  if (msg) toast(msg)
}
function autoStart() {
  if (!gl) return
  measure()
  auto.T = R.Tt >= NH - 0.25 ? 0.2 : R.Tt
  auto.acc = 0
  auto.on = true
  bAuto.setAttribute('aria-pressed', 'true')
  bAuto.textContent = '⏸ Pauza'
  wake()
}
function autoStep(dt) {
  const speed = parseFloat(speedSel.value) || 1
  if (reduced()) {
    auto.acc += dt * speed
    if (auto.acc < 4.5) return
    auto.acc = 0
    auto.T = Math.floor(auto.T - 0.2) + 1.5
  } else auto.T += (dt * speed) / 3.4
  if (auto.T >= NH - 0.2) {
    auto.T = NH - 0.2
    autoStop('Namoyish tugadi.')
  }
  const s = sceneOfHold(Math.floor(auto.T))
  if (s.open && auto.T > s.t1 - 0.05) { autoStop('“Batafsil” ochiq — avto namoyish to‘xtatildi.'); return }
  const y = yAtT(auto.T)
  if (y !== null) window.scrollTo(0, Math.round(y))
  R.ambUntil = performance.now() + AMBIENT_MS
}
bAuto.addEventListener('click', () => { if (auto.on) autoStop(); else autoStart() })
function jumpScene(d) {
  const cur = holds[clamp(activeHold, 0, NH - 1)].scene
  const s = S[clamp(cur + d, 0, S.length - 1)]
  if (gl) {
    goHold(s.first)
    if (auto.on) auto.T = s.t0
  } else scrollToEl(s.el)
}
$('scene-prev').addEventListener('click', () => jumpScene(-1))
$('scene-next').addEventListener('click', () => jumpScene(1))
const inAutoControls = (t) => t && t.closest && t.closest('.auto-group')
const userPause = (e) => { if (auto.on && !inAutoControls(e.target)) autoStop('Avto namoyish to‘xtatildi.') }
;['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, userPause, { passive: true }))
doc.addEventListener('selectionchange', () => {
  const s = window.getSelection()
  if (auto.on && s && !s.isCollapsed) autoStop('Avto namoyish to‘xtatildi.')
})
doc.addEventListener('copy', () => autoStop('Avto namoyish to‘xtatildi.'))

// ---------- 3D start / stop ----------
let canvas = $('gl')
// a canvas whose context was lost or released cannot host a new renderer: swap in a fresh element
function freshCanvas() {
  const c = doc.createElement('canvas')
  c.id = 'gl'
  canvas.parentNode.replaceChild(c, canvas)
  canvas = c
  canvas.addEventListener('webglcontextlost', onContextLost)
}
function pickQuality() {
  if (params.quality === 'high' || params.quality === 'light') return params.quality
  const small = Math.min(window.innerWidth, window.innerHeight) < 700 || mm('(pointer: coarse)').matches
  return small ? 'light' : 'high'
}
function start3d() {
  if (R.world) return true
  let q = pickQuality()
  let world = null
  try {
    world = createWorld(canvas, { quality: q, holds, strict: !params.quality })
  } catch (e) { world = null }
  if (!world) {
    try {
      freshCanvas()
      q = 'light'
      world = createWorld(canvas, { quality: 'light', holds, strict: false })
      R.software = true
    } catch (e) { world = null }
  }
  if (!world) return false
  R.world = world
  R.quality = q
  R.renderMs = []
  R.frames = 0
  R.lost = false
  if (!LBL.length) makeLabels()
  return true
}
function stop3d() {
  if (R.raf) window.cancelAnimationFrame(R.raf)
  R.raf = 0
  if (!R.world) return
  const w = R.world
  R.world = null
  R.disposing = true
  w.dispose()
  R.disposing = false
  hideLabels(0)
  freshCanvas()
}
function onContextLost(e) {
  if (R.disposing || !R.world) return
  e.preventDefault()
  R.world = null
  R.raf = 0
  noWebGL = true
  applyModes()
  toast('3D ko‘rinish to‘xtadi (grafika konteksti yo‘qoldi). Oddiy rejimga o‘tildi.')
}
canvas.addEventListener('webglcontextlost', onContextLost)

function resize() {
  root.style.setProperty('--bar-h', barH() + 'px')
  if (!gl || !R.world) return
  const w = window.innerWidth, h = window.innerHeight
  const cap = R.quality === 'light' ? (R.software ? 1 : 1.25) : R.quality === 'high-noshadow' ? 1.25 : 1.5
  R.world.resize(w, h, Math.min(window.devicePixelRatio || 1, cap), freeArea())
  measure()
  wake()
}
// the part of the screen not covered by the text panel (or by the open "Batafsil" text while it is read)
function freeArea() {
  const w = window.innerWidth, h = window.innerHeight, bh = barH()
  let free
  if (mqMobile.matches) free = { x: 0, y: bh + 34, w, h: Math.max(80, h - bh - 42 - S[0].panel.offsetHeight) }
  else {
    const ref = root.classList.contains('reading') ? S.find((s) => s.open) : null
    const p = (ref ? ref.details : S[0].panel).getBoundingClientRect()
    let x = Math.round(p.left + p.width + 12)
    if (w - x < 260) x = Math.round(S[0].panel.getBoundingClientRect().right + 12)
    free = { x, y: bh, w: Math.max(80, w - x), h: h - bh }
  }
  R.free = free
  return free
}

// ---------- modes: 3D, plain (no 3D), animation ----------
const bPlain = $('btn-plain')
const bAnim = $('btn-anim')
function applyModes() {
  const want3d = !plain && !noWebGL
  if (want3d && !gl) {
    if (start3d()) gl = true
    else {
      noWebGL = true
      root.classList.add('no-webgl')
    }
  } else if (!want3d && gl) {
    stop3d()
    gl = false
  }
  root.classList.toggle('gl', gl)
  root.classList.toggle('plain', !gl)
  root.classList.toggle('anim', !reduced())
  bPlain.setAttribute('aria-pressed', !gl ? 'true' : 'false')
  bPlain.disabled = noWebGL
  bPlain.title = noWebGL ? 'Bu brauzerda 3D (WebGL) mavjud emas — faqat oddiy rejim' : 'Sahnasiz, oddiy matnli ko‘rinish'
  bAnim.setAttribute('aria-pressed', animOn ? 'true' : 'false')
  bAnim.textContent = animOn ? 'Animatsiya: yoqilgan' : 'Animatsiya: o‘chirilgan'
  bAuto.disabled = !gl
  $('scene-prev').disabled = false
  if (!gl) autoStop()
  activeHold = -1
  activeHoldPlain = -1
  if (gl) {
    resize()
    R.T = R.Tt = tAt(window.scrollY)
    wake()
  }
  updatePanels()
  plainActive()
}
bPlain.addEventListener('click', () => {
  autoStop()
  const keep = holds[clamp(activeHold, 0, NH - 1)] ? S[holds[clamp(activeHold, 0, NH - 1)].scene] : S[0]
  plain = gl
  store.set('plain', plain ? '1' : '0')
  applyModes()
  if (gl) goHold(keep.first)
  else scrollToEl(keep.el)
})
bAnim.addEventListener('click', () => { animOn = !animOn; store.set('anim', animOn ? '1' : '0'); applyModes() })
if (mqReduce.addEventListener) mqReduce.addEventListener('change', applyModes)
$('btn-print').addEventListener('click', () => { autoStop(); window.print() })

// ---------- events: one scroll handler, throttled to animation frames ----------
let ticking = false
function uiFrame() {
  ticking = false
  updateProgress()
  if (gl) {
    const y = window.scrollY
    const t = tAt(y)
    if (t !== R.Tt) { R.Tt = t; wake() }
    // while the open "Batafsil" text is being read, the callouts step aside
    const reading = S.some((s) => s.open && y >= s.y1 - 2 && y < s.yd)
    if (reading !== root.classList.contains('reading')) {
      root.classList.toggle('reading', reading)
      if (R.world) { R.world.setFree(freeArea()); wake() }
    }
  } else plainActive()
}
window.addEventListener('scroll', () => { if (!ticking) { ticking = true; window.requestAnimationFrame(uiFrame) } }, { passive: true })
let rsTimer = 0
window.addEventListener('resize', () => { clearTimeout(rsTimer); rsTimer = setTimeout(resize, 80) })
if (window.ResizeObserver) {
  let roTimer = 0
  new window.ResizeObserver(() => { clearTimeout(roTimer); roTimer = setTimeout(() => { measure(); if (gl) wake() }, 60) }).observe($('content'))
}
doc.addEventListener('visibilitychange', () => {
  R.visible = !doc.hidden
  if (doc.hidden) autoStop()
  else if (gl) want()
})
if (window.IntersectionObserver) {
  new window.IntersectionObserver((en) => {
    R.onscreen = en[en.length - 1].isIntersecting
    if (R.onscreen && gl) want()
  }).observe($('stage3d'))
}
// the admin overlay removes the frame: free the GPU memory right away
window.addEventListener('pagehide', () => { autoStop(); stop3d(); gl = false })
window.addEventListener('pageshow', (e) => { if (e.persisted) applyModes() })
window.addEventListener('beforeprint', () => { S.forEach((s) => s.details.classList.add('print-open')) })
window.addEventListener('afterprint', () => { S.forEach((s) => s.details.classList.remove('print-open')) })

// ---------- inside the admin panel overlay: Escape asks the panel to close it ----------
if (root.getAttribute('data-variant') === 'admin' && window.parent !== window) {
  root.classList.add('embedded')
  doc.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && doc.activeElement !== q) window.parent.postMessage({ type: 'ds-help-close' }, window.location.origin)
  })
}

// ---------- start ----------
applyOs()
if (params.labels === '0') root.classList.add('no-labels')
applyModes()
updateProgress()
{
  const sc = params.scene && S.find((s) => s.id === params.scene)
  if (sc) {
    if (params.open) {
      const el = $(params.open)
      if (el && sc.el.contains(el)) setOpen(sc, true, false)
    }
    if (params.open && $(params.open)) goToId(params.open)
    else goHold(sc.first + clamp(Number(params.beat || 0), 0, sc.count - 1))
  } else if (window.location.hash.length > 1 && window.location.hash.indexOf('=') < 0) {
    goToId(window.location.hash.slice(1))
  }
  if (gl) {
    R.Tt = R.T = tAt(window.scrollY)
    wake()
  }
}

// ---------- #debug=1: read-only state for the automated preview checks (guide/tools/preview.mjs) ----------
if (params.debug === '1') {
  window.__dsGuide = {
    state: () => ({ T: R.T, Tt: R.Tt, hold: activeHold, gl, frames: R.frames, rendering: !!R.raf, open: S.filter((s) => s.open).map((s) => s.id), auto: auto.on, quality: R.quality, reading: root.classList.contains('reading'), y: Math.round(window.scrollY) }),
  }
}

// ---------- #perf: a scripted scroll with honest frame timing, written into the DOM ----------
if (params.perf === '1') {
  const out = doc.createElement('pre')
  out.id = 'perf-out'
  out.hidden = true
  doc.body.appendChild(out)
  const stats = (a) => {
    const s = a.slice().sort((x, y) => x - y)
    const p = (k) => (s.length ? s[Math.min(s.length - 1, Math.floor(k * s.length))] : 0)
    return { n: s.length, median: +p(0.5).toFixed(2), p95: +p(0.95).toFixed(2), max: +(s[s.length - 1] || 0).toFixed(2) }
  }
  setTimeout(() => {
    const deltas = []
    const before = R.renderMs.length
    const max = root.scrollHeight - window.innerHeight
    const dur = Number(params.dur || 20000)
    let start = 0, last = 0
    const step = (now) => {
      if (!start) start = last = now
      else deltas.push(now - last)
      last = now
      const k = Math.min(1, (now - start) / dur)
      window.scrollTo(0, Math.round(k * max))
      if (k < 1) { window.requestAnimationFrame(step); return }
      const render = R.renderMs.slice(before)
      const framesAtEnd = R.frames
      setTimeout(() => {
        const idleStart = R.frames
        setTimeout(() => {
          out.textContent = JSON.stringify({
            quality: R.quality, software: !!R.software, gl, dpr: window.devicePixelRatio, viewport: [window.innerWidth, window.innerHeight],
            rafDeltaMs: stats(deltas), renderCpuMs: stats(render), framesDuringScroll: framesAtEnd,
            framesWhileIdle3s: R.frames - idleStart,
            info: R.world ? { calls: R.world.info.render.calls, triangles: R.world.info.render.triangles, geometries: R.world.info.memory.geometries, textures: R.world.info.memory.textures } : null,
          })
          out.hidden = false
        }, 3000)
      }, AMBIENT_MS + 1500)
    }
    window.requestAnimationFrame(step)
  }, 1500)
}
