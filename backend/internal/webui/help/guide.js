/* DronStream qo'llanmasi: interfeys skripti.
   Hech qanday tarmoq so'rovi yubormaydi, hech narsani o'zi bajarmaydi, server sozlamalarini o'qimaydi.
   Skriptsiz ham sahifa to'liq o'qiladi (namoyish oddiy ro'yxat bo'lib ko'rinadi). */
(function () {
  'use strict'
  var doc = document
  var root = doc.documentElement
  var $ = function (id) { return doc.getElementById(id) }
  var store = {
    get: function (k) { try { return window.localStorage.getItem('ds-guide-' + k) } catch (e) { return null } },
    set: function (k, v) { try { window.localStorage.setItem('ds-guide-' + k, v) } catch (e) { /* file:// may forbid storage */ } },
  }
  var reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  var barH = function () { return $('bar').offsetHeight }
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)) }

  // ---------- toast ----------
  var toastTimer = 0
  function toast(msg) {
    var t = $('toast')
    t.textContent = msg
    t.hidden = false
    clearTimeout(toastTimer)
    toastTimer = setTimeout(function () { t.hidden = true }, 4200)
  }

  // ---------- code blocks: placeholder highlight, copy with manual fallback ----------
  function markPlaceholders(code) {
    var text = code.textContent
    var re = /<[A-Z][A-Z0-9_]*>/g
    if (!re.test(text)) return false
    re.lastIndex = 0
    var frag = doc.createDocumentFragment()
    var last = 0
    var m
    while ((m = re.exec(text))) {
      frag.appendChild(doc.createTextNode(text.slice(last, m.index)))
      var s = doc.createElement('span')
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
    var sel = window.getSelection()
    var r = doc.createRange()
    r.selectNodeContents(node)
    sel.removeAllRanges()
    sel.addRange(r)
  }
  function copyCode(code, hasPh) {
    var text = code.textContent
    var okMsg = hasPh ? 'Nusxalandi. Diqqat: <…> ko‘rinishidagi joylarni o‘z qiymatlaringiz bilan almashtiring.' : 'Nusxalandi.'
    var manual = function () {
      selectNode(code)
      var done = false
      try { done = doc.execCommand('copy') } catch (e) { done = false }
      toast(done ? okMsg : 'Avtomatik nusxalab bo‘lmadi. Kod belgilandi — Ctrl+C (Mac: ⌘C) bosing.')
    }
    if (navigator.clipboard && navigator.clipboard.writeText && window.isSecureContext) {
      navigator.clipboard.writeText(text).then(function () { toast(okMsg) }, manual)
    } else {
      manual()
    }
  }
  Array.prototype.forEach.call(doc.querySelectorAll('pre.code'), function (pre) {
    var code = pre.querySelector('code')
    var hasPh = markPlaceholders(code)
    var tools = doc.createElement('div')
    tools.className = 'code-tools'
    var lang = doc.createElement('span')
    lang.className = 'lang'
    lang.textContent = pre.getAttribute('data-lang') || ''
    var bSel = doc.createElement('button')
    bSel.type = 'button'
    bSel.textContent = 'Belgilash'
    bSel.title = 'Kodni belgilaydi (keyin Ctrl+C)'
    bSel.addEventListener('click', function () { selectNode(code); toast('Kod belgilandi — Ctrl+C (Mac: ⌘C) bosing.') })
    var bCopy = doc.createElement('button')
    bCopy.type = 'button'
    bCopy.textContent = 'Nusxalash'
    bCopy.addEventListener('click', function () { copyCode(code, hasPh) })
    tools.appendChild(lang)
    tools.appendChild(bSel)
    tools.appendChild(bCopy)
    pre.parentNode.insertBefore(tools, pre.nextSibling)
  })

  // ---------- sections, table of contents, reading progress ----------
  var secs = Array.prototype.slice.call(doc.querySelectorAll('main .sec'))
  var tocLinks = {}
  Array.prototype.forEach.call(doc.querySelectorAll('#toc a'), function (a) { tocLinks[a.getAttribute('href').slice(1)] = a })
  var activeId = ''
  function currentSection() {
    var line = barH() + 60
    var cur = secs[0]
    for (var i = 0; i < secs.length; i++) {
      if (secs[i].getBoundingClientRect().top <= line) cur = secs[i]
      else break
    }
    return cur
  }
  function updateToc() {
    var cur = currentSection()
    if (!cur || cur.id === activeId) return
    if (tocLinks[activeId]) tocLinks[activeId].classList.remove('active')
    activeId = cur.id
    if (tocLinks[activeId]) tocLinks[activeId].classList.add('active')
  }
  function updateProgress() {
    var max = doc.documentElement.scrollHeight - window.innerHeight
    var p = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0
    $('progress').style.transform = 'scaleX(' + p.toFixed(4) + ')'
  }
  function goSection(delta) {
    var i = secs.indexOf(currentSection()) + delta
    if (i < 0 || i >= secs.length) return
    secs[i].scrollIntoView({ behavior: 'auto', block: 'start' })
  }
  $('sec-prev').addEventListener('click', function () { goSection(-1) })
  $('sec-next').addEventListener('click', function () { goSection(1) })
  $('sec-top').addEventListener('click', function () { window.scrollTo(0, 0) })
  var tocBtn = $('btn-toc')
  var toc = $('toc')
  tocBtn.addEventListener('click', function () {
    var open = toc.classList.toggle('open')
    tocBtn.setAttribute('aria-expanded', open ? 'true' : 'false')
  })
  toc.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') { toc.classList.remove('open'); tocBtn.setAttribute('aria-expanded', 'false') }
  })

  // ---------- search (local text only) ----------
  var norm = function (s) { return s.toLowerCase().replace(/[‘’ʻʼ`]/g, "'").replace(/\s+/g, ' ') }
  var index = secs.map(function (s) { return { el: s, title: s.getAttribute('data-title') || '', text: norm(s.textContent) } })
  var q = $('q')
  var results = $('results')
  var qTimer = 0
  function closeResults() { results.hidden = true }
  function runSearch() {
    var term = norm(q.value.trim())
    var list = $('results-list')
    list.textContent = ''
    if (term.length < 2) { closeResults(); return }
    var n = 0
    index.forEach(function (it) {
      var at = it.text.indexOf(term)
      if (at < 0) return
      n++
      var li = doc.createElement('li')
      var a = doc.createElement('a')
      a.href = '#' + it.el.id
      a.textContent = it.title
      var snip = doc.createElement('span')
      snip.className = 'snip'
      var from = Math.max(0, at - 50)
      snip.appendChild(doc.createTextNode((from > 0 ? '…' : '') + it.text.slice(from, at)))
      var mk = doc.createElement('mark')
      mk.textContent = it.text.slice(at, at + term.length)
      snip.appendChild(mk)
      snip.appendChild(doc.createTextNode(it.text.slice(at + term.length, at + term.length + 70) + '…'))
      li.appendChild(a)
      li.appendChild(snip)
      list.appendChild(li)
    })
    $('results-count').textContent = n ? n + ' ta bo‘limda topildi' : 'Hech narsa topilmadi'
    results.hidden = false
  }
  q.addEventListener('input', function () { clearTimeout(qTimer); qTimer = setTimeout(runSearch, 120) })
  q.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { q.value = ''; closeResults() }
    if (e.key === 'Enter') {
      runSearch()
      var first = doc.querySelector('#results-list a')
      if (first) { first.click(); closeResults() }
    }
  })
  $('results-close').addEventListener('click', closeResults)
  $('results-list').addEventListener('click', function (e) { if (e.target.tagName === 'A') closeResults() })
  doc.addEventListener('keydown', function (e) {
    var tag = (e.target.tagName || '').toLowerCase()
    if (e.key === '/' && tag !== 'input' && tag !== 'select' && tag !== 'textarea') { e.preventDefault(); q.focus() }
  })

  // ---------- story: native scroll drives a 6-step scene (no scroll hijacking) ----------
  var story = $('story')
  var stage = $('stage')
  var world = stage.querySelector('.world')
  var STEPS = 6
  var step = 1
  var animOn = store.get('anim') !== null ? store.get('anim') === '1' : !reduceMotion
  var plain = store.get('plain') === '1'
  function storyMetrics() {
    var r = story.getBoundingClientRect()
    var pinH = window.innerHeight - barH()
    var total = Math.max(1, story.offsetHeight - pinH)
    return { top: r.top - barH(), total: total }
  }
  function updateStory() {
    if (plain) return
    var m = storyMetrics()
    var p = clamp(-m.top / m.total, 0, 1)
    var s = clamp(Math.floor(p * STEPS) + 1, 1, STEPS)
    if (s !== step) {
      step = s
      stage.setAttribute('data-step', String(s))
      $('step-pos').textContent = s + ' / ' + STEPS
    }
    world.style.setProperty('--p', animOn ? p.toFixed(3) : '0.5')
    return p
  }
  function goStep(n) {
    n = clamp(n, 1, STEPS)
    var m = storyMetrics()
    var y = window.scrollY + m.top + ((n - 0.5) / STEPS) * m.total
    window.scrollTo({ top: y, behavior: animOn ? 'smooth' : 'auto' })
  }
  $('step-prev').addEventListener('click', function () { autoStop(); goStep(step - 1) })
  $('step-next').addEventListener('click', function () { autoStop(); goStep(step + 1) })

  // ---------- switches: animation, plain mode, print ----------
  var bAnim = $('btn-anim')
  var bPlain = $('btn-plain')
  var bAuto = $('btn-auto')
  function applyModes() {
    root.classList.toggle('anim', animOn && !plain)
    root.classList.toggle('plain', plain)
    root.classList.toggle('js-story', !plain)
    bAnim.setAttribute('aria-pressed', animOn ? 'true' : 'false')
    bAnim.textContent = animOn ? 'Animatsiya: yoqilgan' : 'Animatsiya: o‘chirilgan'
    bPlain.setAttribute('aria-pressed', plain ? 'true' : 'false')
    bAuto.disabled = plain
    updateStory()
  }
  bAnim.addEventListener('click', function () { animOn = !animOn; store.set('anim', animOn ? '1' : '0'); applyModes() })
  bPlain.addEventListener('click', function () {
    autoStop()
    var keep = currentSection()
    plain = !plain
    store.set('plain', plain ? '1' : '0')
    applyModes()
    if (keep) keep.scrollIntoView({ block: 'start' })
  })
  $('btn-print').addEventListener('click', function () { autoStop(); window.print() })

  // ---------- auto demo: off by default, starts only on the button, stops on any user action ----------
  var auto = { on: false, raf: 0, last: 0, acc: 0 }
  var speedSel = $('auto-speed')
  function autoStop(msg) {
    if (!auto.on) return
    auto.on = false
    cancelAnimationFrame(auto.raf)
    bAuto.setAttribute('aria-pressed', 'false')
    bAuto.textContent = '▶ Avto namoyish'
    if (msg) toast(msg)
  }
  function autoTick(ts) {
    if (!auto.on) return
    var dt = Math.min(100, ts - (auto.last || ts))
    auto.last = ts
    var speed = parseFloat(speedSel.value) || 1
    var p = updateStory()
    if (p >= 0.999) { autoStop('Namoyish tugadi.'); return }
    if (animOn) {
      window.scrollBy(0, (speed * 110 * dt) / 1000)
    } else {
      // reduced motion: no continuous movement, only a calm jump to the next step
      auto.acc += dt * speed
      if (auto.acc >= 4500) { auto.acc = 0; goStep(step + 1) }
    }
    auto.raf = requestAnimationFrame(autoTick)
  }
  function autoStart() {
    if (plain) return
    var m = storyMetrics()
    if (-m.top < 0 || -m.top >= m.total) window.scrollTo(0, window.scrollY + m.top + 1)
    auto.on = true
    auto.last = 0
    auto.acc = 0
    bAuto.setAttribute('aria-pressed', 'true')
    bAuto.textContent = '⏸ Pauza'
    auto.raf = requestAnimationFrame(autoTick)
  }
  bAuto.addEventListener('click', function () { if (auto.on) autoStop(); else autoStart() })
  var inAutoControls = function (t) { return t === bAuto || t === speedSel || (t && t.closest && t.closest('.tool-group')) }
  var userPause = function (e) { if (auto.on && !inAutoControls(e.target)) autoStop('Avto namoyish to‘xtatildi.') }
  ;['wheel', 'touchstart', 'pointerdown', 'keydown'].forEach(function (ev) { window.addEventListener(ev, userPause, { passive: true }) })
  doc.addEventListener('selectionchange', function () {
    var s = window.getSelection()
    if (auto.on && s && !s.isCollapsed) autoStop('Avto namoyish to‘xtatildi.')
  })
  doc.addEventListener('visibilitychange', function () { if (doc.hidden) autoStop() })

  // ---------- one scroll handler, throttled to animation frames ----------
  var ticking = false
  function frame() { ticking = false; updateProgress(); updateStory(); updateToc() }
  function onScroll() { if (!ticking) { ticking = true; requestAnimationFrame(frame) } }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll)

  // ---------- inside the admin panel overlay: Escape asks the panel to close it ----------
  if (root.getAttribute('data-variant') === 'admin' && window.parent !== window) {
    root.classList.add('embedded')
    doc.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && doc.activeElement !== q) window.parent.postMessage({ type: 'ds-help-close' }, window.location.origin)
    })
  }

  applyModes()
  frame()
})()
