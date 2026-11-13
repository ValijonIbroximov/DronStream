// Qo'llanmani headless Chrome'da ochib tekshiradi (faqat ishlab chiquvchi uchun; CI ishlatmaydi).
//
//   node guide/tools/preview.mjs                 skrinshotlar -> docs/guide-preview/*.png
//   node guide/tools/preview.mjs --only mobile   faqat nomida "mobile" bo'lganlari
//   node guide/tools/preview.mjs --perf          + skriptli aylantirishda kadr vaqtlari (#perf rejimi)
//   node guide/tools/preview.mjs --checks        o'zaro ta'sir tekshiruvlari (deterministik holat, bo'sh turganda kadr yo'q,
//                                                mundarija/qidiruv, avto namoyish pauzasi, nusxalash, oddiy rejim,
//                                                reduced-motion, chop etish, WebGL'siz)
//   Qo'shimcha: --chrome <yo'l> --out <papka> --port <raqam>
//
// Chrome DevTools protokoli Node'ning o'z WebSocket'i orqali ishlatiladi (Puppeteer yo'q). Sahifa file:// dan ochiladi,
// DNS butunlay o'chiriladi (--host-resolver-rules), sahifaning har bir tarmoq so'rovi yozib boriladi; file:// dan
// boshqa so'rov bo'lsa chiqish kodi 2. SwiftShader — dasturiy renderer: o'lchangan vaqtlar haqiqiy GPU emas.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const REPO = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const arg = (k, d) => {
  const i = process.argv.indexOf(k)
  return i > 0 ? process.argv[i + 1] : d
}
const has = (k) => process.argv.includes(k)
const CHROME = arg('--chrome', process.platform === 'win32' ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe' : 'google-chrome')
const OUT = join(REPO, arg('--out', 'docs/guide-preview'))
const PORT = Number(arg('--port', '9333'))
const ONLY = arg('--only', '')
const PAGE = pathToFileURL(join(REPO, 'info.html')).href
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const DESK = { width: 1440, height: 900, mobile: false }
const PHONE = { width: 390, height: 844, mobile: true }
const SHOTS = [
  ['desktop-01-hero', DESK, 'scene=olam&beat=0&quality=high'],
  ['desktop-02-pult-server', DESK, 'scene=xavfsizlik&beat=0&quality=high'],
  ['desktop-03-server-ichida', DESK, 'scene=xavfsizlik&beat=1&quality=high'],
  ['desktop-04-reja-amalga-oshirilmagan', DESK, 'scene=xavfsizlik&beat=3&quality=high'],
  ['desktop-05-ornatish-qatlamlar', DESK, 'scene=ornatish&beat=1&quality=high'],
  ['desktop-06-ornatish-linux', DESK, 'scene=ornatish&beat=2&os=linux&quality=high'],
  ['desktop-07-tarmoq-udp', DESK, 'scene=tarmoq&beat=3&quality=high'],
  ['desktop-08-pult-efirda', DESK, 'scene=pult&beat=3&quality=high'],
  ['desktop-09-havola-tasdiq', DESK, 'scene=havola&beat=2&quality=high'],
  ['desktop-10-havola-nusxa', DESK, 'scene=havola&beat=3&quality=high'],
  ['desktop-11-revoke', DESK, 'scene=revoke&beat=2&quality=high'],
  ['desktop-12-backup-standby', DESK, 'scene=backup&beat=2&quality=high'],
  ['desktop-13-diag-port', DESK, 'scene=diag&beat=1&quality=high'],
  ['desktop-14-diag-batafsil', DESK, 'scene=diag&beat=0&open=x-video&quality=high'],
  ['desktop-15-qabul', DESK, 'scene=qabul&beat=0&quality=high'],
  ['desktop-16-oddiy-rejim', DESK, 'scene=diag&plain=1'],
  ['mobile-01-hero', PHONE, 'scene=olam&beat=1'],
  ['mobile-02-pult-server', PHONE, 'scene=xavfsizlik&beat=0'],
  ['mobile-03-havola-tasdiq', PHONE, 'scene=havola&beat=2'],
  ['mobile-04-ornatish', PHONE, 'scene=ornatish&beat=1'],
  ['mobile-05-revoke', PHONE, 'scene=revoke&beat=2'],
  ['mobile-06-diag-buyruq', PHONE, 'scene=diag&beat=0'],
  ['mobile-07-oddiy-rejim', PHONE, 'scene=havola&plain=1'],
]

async function launch(extraFlags) {
  const profile = mkdtempSync(join(tmpdir(), 'ds-guide-'))
  const chrome = spawn(CHROME, [
    '--headless=new', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--host-resolver-rules=MAP * ~NOTFOUND',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${PORT}`, '--no-first-run', '--no-default-browser-check',
    '--hide-scrollbars', '--disable-extensions', '--disable-background-networking', '--disable-component-update', ...extraFlags, 'about:blank',
  ], { stdio: 'ignore' })
  let list = null
  for (let i = 0; i < 50 && !list; i++) {
    await sleep(200)
    try { list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json() } catch { list = null }
  }
  const page = list && list.find((t) => t.type === 'page')
  if (!page) throw new Error('Chrome DevTools topilmadi')
  const ws = new WebSocket(page.webSocketDebuggerUrl)
  await new Promise((r, j) => { ws.onopen = r; ws.onerror = j })
  let id = 0
  const pending = new Map()
  const events = []
  ws.onmessage = (m) => {
    const msg = JSON.parse(m.data)
    if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id) } else events.push(msg)
  }
  const send = (method, params = {}) => new Promise((r) => { const k = ++id; pending.set(k, r); ws.send(JSON.stringify({ id: k, method, params })) })
  await send('Network.enable')
  await send('Page.enable')
  await send('Runtime.enable')
  const requests = []
  const errors = []
  const drain = () => {
    while (events.length) {
      const e = events.shift()
      if (e.method === 'Network.requestWillBeSent') requests.push(e.params.request.url.slice(0, 120))
      if (e.method === 'Runtime.exceptionThrown') errors.push(e.params.exceptionDetails.exception ? e.params.exceptionDetails.exception.description : e.params.exceptionDetails.text)
      if (e.method === 'Runtime.consoleAPICalled' && (e.params.type === 'error' || e.params.type === 'warning')) errors.push(e.params.type + ': ' + e.params.args.map((a) => a.value || a.description || '').join(' ').slice(0, 300))
    }
  }
  const evaluate = async (expression) => {
    const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
    if (r.result.exceptionDetails) throw new Error('evaluate: ' + JSON.stringify(r.result.exceptionDetails).slice(0, 300))
    return r.result.result.value
  }
  const open = async (vp, hash, wait) => {
    await send('Emulation.setDeviceMetricsOverride', { width: vp.width, height: vp.height, deviceScaleFactor: 1, mobile: vp.mobile })
    await send('Emulation.setTouchEmulationEnabled', { enabled: vp.mobile })
    await send('Page.navigate', { url: 'about:blank' })
    await sleep(300)
    await send('Page.navigate', { url: PAGE + '#' + hash })
    await sleep(wait)
    drain()
  }
  const shot = async (name) => {
    const r = await send('Page.captureScreenshot', { format: 'png' })
    writeFileSync(join(OUT, name + '.png'), Buffer.from(r.result.data, 'base64'))
  }
  const close = async () => {
    try { ws.close() } catch { /* closed */ }
    chrome.kill()
    await sleep(800)
    try { rmSync(profile, { recursive: true, force: true }) } catch { /* Chrome may still hold files */ }
  }
  return { send, evaluate, open, shot, drain, close, requests, errors }
}

function report(c) {
  c.drain()
  const foreign = c.requests.filter((u) => !u.startsWith('file:') && !u.startsWith('about:') && !u.startsWith('data:'))
  console.log('requests:', c.requests.length, 'non-file:', foreign.length, foreign.slice(0, 5))
  console.log('errors:', c.errors.length ? c.errors.slice(0, 10) : 'none')
  if (foreign.length) process.exitCode = 2
}

async function shots(c) {
  for (const [name, vp, hash] of SHOTS) {
    if (ONLY && !name.includes(ONLY)) continue
    await c.open(vp, hash, 5000)
    await c.shot(name)
    const st = await c.evaluate('JSON.stringify({gl: document.documentElement.classList.contains("gl"), y: Math.round(scrollY), labels: Array.from(document.querySelectorAll(".lbl")).filter(l => +l.style.opacity > 0.5).map(l => l.textContent.slice(0, 40))})')
    console.log(name, st)
  }
}

async function perf(c) {
  for (const [label, vp, q] of [['desktop 1440x900 high', DESK, 'quality=high'], ['desktop 1440x900 light', DESK, 'quality=light'], ['mobile 390x844 auto', PHONE, '']]) {
    await c.open(vp, 'perf=1&dur=20000' + (q ? '&' + q : ''), 1000)
    let out = ''
    for (let i = 0; i < 90 && !out; i++) {
      await sleep(500)
      out = await c.evaluate('(document.getElementById("perf-out") && !document.getElementById("perf-out").hidden) ? document.getElementById("perf-out").textContent : ""')
    }
    console.log('PERF', label, out)
  }
}

async function checks(c) {
  let fails = 0
  const ok = (cond, msg, extra) => {
    console.log((cond ? 'OK   ' : 'FAIL ') + msg + (extra !== undefined ? '  ' + JSON.stringify(extra) : ''))
    if (!cond) fails++
  }
  const st = () => c.evaluate('window.__dsGuide.state()')
  await c.open(DESK, 'debug=1', 2500)
  let s = await st()
  ok(s.gl && s.frames > 0, '3D yoqildi va kadr chizildi', { quality: s.quality, frames: s.frames })
  await sleep(7500)
  const f1 = (await st()).frames
  await sleep(2500)
  s = await st()
  ok(s.frames === f1 && !s.rendering, 'bo‘sh turganda kadr chizilmaydi (render on demand)', { before: f1, after: s.frames })
  // determinism: the same scroll position gives the same state, also after visiting the end
  await c.evaluate('scrollTo(0, 5200)')
  await sleep(3500)
  const a = await st()
  await c.evaluate('scrollTo(0, document.documentElement.scrollHeight)')
  await sleep(3000)
  await c.evaluate('scrollTo(0, 5200)')
  await sleep(3500)
  const b = await st()
  ok(a.Tt === b.Tt && Math.abs(a.T - b.T) < 1e-9, 'orqaga aylantirilganda holat aynan tiklanadi', { a, b })
  // table of contents: a section inside "Batafsil" opens it and puts the scene in the mapped state
  await c.evaluate('document.querySelector(\'#toc a[href="#x-limit"]\').click()')
  await sleep(3500)
  s = await st()
  const pos = await c.evaluate('document.getElementById("scene-pos").textContent')
  const top = await c.evaluate('Math.round(document.getElementById("x-limit").getBoundingClientRect().top)')
  ok(s.open.includes('diag') && pos.startsWith('11') && top > 40 && top < 140, 'mundarija: x-limit ochildi (11-sahna, Batafsil ochiq)', { open: s.open, pos, top, T: s.T, reading: s.reading })
  ok(s.reading && Math.abs(s.T - (s.T | 0) - 0.5) < 1e-9, 'Batafsil o‘qilayotganda: bo‘limga mos holat (bosqich markazi), belgilar yashirin', { T: s.T })
  // search: a hit inside closed details opens them
  await c.evaluate('(() => { const d = document.querySelector("#d-hisob"); return d.classList.contains("open") })()').then((v) => ok(v === false, 'hisob batafsil yopiq (qidiruvdan oldin)'))
  await c.evaluate('(() => { const q = document.getElementById("q"); q.value = "faol sessiyalar"; q.dispatchEvent(new Event("input")); })()')
  await sleep(400)
  const cnt = await c.evaluate('document.getElementById("results-count").textContent')
  await c.evaluate('document.getElementById("q").dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))')
  await sleep(2500)
  s = await st()
  ok(/topildi/.test(cnt) && s.open.includes('hisob'), 'qidiruv: natija topildi va Batafsil ochildi', { cnt, open: s.open })
  // auto demo: plays on the same timeline, stops on wheel
  await c.evaluate('document.querySelectorAll(".details.open .less").forEach(b => b.click()); scrollTo(0, 0)')
  await sleep(1500)
  await c.evaluate('document.getElementById("btn-auto").click()')
  await sleep(3000)
  s = await st()
  ok(s.auto && s.y > 50, 'avto namoyish aylantiradi', { y: s.y, T: s.T })
  await c.evaluate('window.dispatchEvent(new WheelEvent("wheel", { deltaY: 10 }))')
  await sleep(300)
  s = await st()
  ok(!s.auto, 'g‘ildirak avto namoyishni to‘xtatadi')
  await c.evaluate('document.getElementById("btn-auto").click()')
  await sleep(800)
  await c.evaluate('document.dispatchEvent(new Event("copy"))')
  await sleep(200)
  ok(!(await st()).auto, 'nusxalash avto namoyishni to‘xtatadi')
  await c.evaluate('document.getElementById("btn-auto").click()')
  await sleep(500)
  await c.evaluate('document.querySelector(".scene.current .more").click()')
  await sleep(300)
  ok(!(await st()).auto, 'Batafsil ochilganda avto namoyish to‘xtaydi')
  // copy: the clipboard may be refused in headless; the fallback selects the code and says so
  await c.evaluate('[...document.querySelectorAll(".code-tools button")].find(b => b.textContent === "Nusxalash" && b.offsetParent).click()')
  await sleep(800)
  const toast = await c.evaluate('document.getElementById("toast").hidden ? "" : document.getElementById("toast").textContent')
  const sel = await c.evaluate('String(getSelection()).length')
  ok(/Nusxalandi|belgilandi/.test(toast), 'nusxalash: natija yoki qo‘lda belgilash xabari', { toast: toast.slice(0, 60), selected: sel })
  // plain mode toggles the renderer off and back on
  await c.evaluate('document.getElementById("btn-plain").click()')
  await sleep(800)
  s = await st()
  const canvasShown = await c.evaluate('getComputedStyle(document.getElementById("stage3d")).display')
  ok(!s.gl && canvasShown === 'none', 'oddiy rejim: 3D o‘chdi, canvas yashirin', { canvasShown })
  await c.evaluate('document.getElementById("btn-plain").click()')
  await sleep(1500)
  ok((await st()).gl, 'oddiy rejimdan 3D ga qaytish')
  // reduced motion: states jump between beats, no ambient animation
  await c.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] })
  await c.open(DESK, 'debug=1', 2500)
  await c.evaluate('scrollTo(0, 7300)')
  await sleep(1500)
  s = await st()
  const f2 = s.frames
  await sleep(1500)
  const s2 = await st()
  ok(Math.abs(s.T - Math.round(s.T - 0.5) - 0.5) < 1e-9 && s2.frames === f2, 'prefers-reduced-motion: holatlar sakraydi, ambient yo‘q', { T: s.T, frames: [f2, s2.frames] })
  await c.send('Emulation.setEmulatedMedia', { features: [] })
  // print: everything readable, no canvas
  await c.open(DESK, 'debug=1', 2000)
  await c.send('Emulation.setEmulatedMedia', { media: 'print' })
  await sleep(500)
  const pr = await c.evaluate('JSON.stringify({ canvas: getComputedStyle(document.getElementById("stage3d")).display, details: [...document.querySelectorAll(".details")].every(d => getComputedStyle(d).display !== "none"), beats: [...document.querySelectorAll(".beat")].every(b => getComputedStyle(b).visibility === "visible") })')
  ok(JSON.parse(pr).canvas === 'none' && JSON.parse(pr).details && JSON.parse(pr).beats, 'chop etish: canvas yo‘q, barcha matn ko‘rinadi', pr)
  await c.shot('desktop-17-chop-etish')
  await c.send('Emulation.setEmulatedMedia', { media: '' })
  const pdf = await c.send('Page.printToPDF', { printBackground: false })
  const pages = pdf.result ? (Buffer.from(pdf.result.data, 'base64').toString('latin1').match(/\/Type\s*\/Page[^s]/g) || []).length : 0
  ok(pages > 10, 'PDF ga chop etish ishlaydi', { pages })
  // the admin overlay removes the frame: pagehide must dispose without errors
  await c.send('Page.navigate', { url: 'about:blank' })
  await sleep(600)
  c.drain()
  ok(c.errors.length === 0, 'sahifadan chiqishda (pagehide) xato yo‘q', c.errors.slice(0, 3))
  return fails
}

async function noWebGL() {
  const c = await launch(['--disable-3d-apis'])
  try {
    await c.open(DESK, 'debug=1&scene=diag', 2500)
    const s = await c.evaluate('JSON.stringify({ cls: document.documentElement.className, canvas: getComputedStyle(document.getElementById("stage3d")).display, note: getComputedStyle(document.querySelector(".nogl-note")).display })')
    console.log('nowebgl', s)
    const v = JSON.parse(s)
    if (!(v.cls.includes('no-webgl') && v.cls.includes('plain') && v.canvas === 'none' && v.note !== 'none')) { console.log('FAIL WebGL yo‘q: 2D qo‘llanmaga o‘tmadi'); process.exitCode = 1 } else console.log('OK   WebGL yo‘q: avtomatik oddiy (2D) qo‘llanma')
    await c.shot('desktop-18-webgl-yoq')
    report(c)
  } finally { await c.close() }
}

async function main() {
  mkdirSync(OUT, { recursive: true })
  if (has('--nowebgl')) return noWebGL()
  const c = await launch([])
  try {
    if (has('--checks')) {
      const f = await checks(c)
      if (f) process.exitCode = 1
    } else if (has('--perf-only')) await perf(c)
    else {
      await shots(c)
      if (has('--perf')) await perf(c)
    }
    report(c)
  } finally { await c.close() }
}
main().catch((e) => { console.error(e); process.exit(1) })
