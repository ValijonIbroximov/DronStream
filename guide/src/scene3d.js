/* DronStream qo'llanmasi: 3D sahna (three.js). Hamma model protsedural, stilizatsiyalangan sxema:
   DJI yoki Dell uskunasining aniq modeli emas. Hech qanday fayl yuklanmaydi, tarmoqqa murojaat yo'q.
   Holat = f(T): kamera, obyektlar va belgilar faqat T (aylantirish jarayoni) va OS tanlovidan hisoblanadi;
   "ambient" vaqt faqat bezak harakati (parraklar, paketlar) uchun. */
import {
  WebGLRenderer, Scene, PerspectiveCamera, Group, Object3D, Mesh, InstancedMesh, LineSegments,
  BoxGeometry, CylinderGeometry, SphereGeometry, TorusGeometry, RingGeometry, PlaneGeometry, CircleGeometry,
  ShapeGeometry, ExtrudeGeometry, TubeGeometry, OctahedronGeometry, IcosahedronGeometry, EdgesGeometry, BufferGeometry,
  Float32BufferAttribute, Shape, CatmullRomCurve3,
  MeshStandardMaterial, MeshPhysicalMaterial, MeshBasicMaterial, LineBasicMaterial, ShadowMaterial,
  DirectionalLight, HemisphereLight, PMREMGenerator, CanvasTexture, Color, Vector3, Matrix4, Quaternion, Fog,
  DoubleSide, AdditiveBlending, SRGBColorSpace, NeutralToneMapping, PCFShadowMap, GridHelper,
} from 'three'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { CAMS, STATES } from './keys.js'

const TAU = Math.PI * 2
const clamp01 = (x) => (x < 0 ? 0 : x > 1 ? 1 : x)
const mix = (a, b, t) => a + (b - a) * t
const ease = (t) => t * t * (3 - 2 * t)
const SI = {}
STATES.forEach((s, i) => { SI[s] = i })

const COL = {
  cyan: 0x22d3ee, blue: 0x3b82f6, sky: 0x60a5fa, amber: 0xf59e0b, red: 0xef4444, green: 0x34d399,
  violet: 0xa78bfa, white: 0xdbe7f7,
}

// Compiles the flattened beat list ("holds") into keyframes: hold h is still between T=h+0.2 and T=h+0.8.
export function compileHolds(holds) {
  const n = STATES.length
  const keys = []
  holds.forEach((h, i) => {
    const a = new Float32Array(n)
    const b = new Float32Array(n)
    for (const k in h.set) {
      a[SI[k]] = h.set[k][0]
      b[SI[k]] = h.set[k][1]
    }
    const cam = CAMS[h.cam]
    keys.push({ t: i + 0.2, v: a, cam, drift: 0 }, { t: i + 0.8, v: b, cam, drift: 1 })
  })
  return keys
}

export function createWorld(canvas, opts) {
  const light = opts.quality === 'light'
  const seg = (n) => Math.max(6, Math.round(light ? n * 0.55 : n))
  const renderer = new WebGLRenderer({ canvas, antialias: !light, alpha: true, powerPreference: 'high-performance', failIfMajorPerformanceCaveat: !!opts.strict })
  renderer.setClearColor(0x000000, 0)
  renderer.toneMapping = NeutralToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = !light
  renderer.shadowMap.type = PCFShadowMap

  const scene = new Scene()
  scene.fog = new Fog(0x060d1d, 38, 95)
  const pmrem = new PMREMGenerator(renderer)
  const room = new RoomEnvironment()
  const envRT = pmrem.fromScene(room, 0.04)
  room.dispose()
  scene.environment = envRT.texture
  scene.environmentIntensity = 0.45
  const camera = new PerspectiveCamera(30, 1, 0.1, 220)
  const keys = compileHolds(opts.holds)
  const textures = []

  // ---------- lights ----------
  scene.add(new HemisphereLight(0x9cc2ff, 0x060b16, 0.55))
  const key = new DirectionalLight(0xe4edff, 1.55)
  key.position.set(7, 15, 11)
  key.target.position.set(2, 0, 0)
  if (!light) {
    key.castShadow = true
    key.shadow.mapSize.set(2048, 2048)
    Object.assign(key.shadow.camera, { left: -15, right: 21, top: 13, bottom: -12, near: 2, far: 50 })
    key.shadow.bias = -0.0005
    key.shadow.normalBias = 0.02
  }
  scene.add(key, key.target)
  const rim = new DirectionalLight(0x3b82f6, 1.3)
  rim.position.set(-10, 7, -13)
  scene.add(rim)
  const fill = new DirectionalLight(0x22d3ee, 0.35)
  fill.position.set(14, 3, 9)
  scene.add(fill)

  // ---------- materials ----------
  const std = (c, m, r) => new MeshStandardMaterial({ color: c, metalness: m, roughness: r })
  const phys = (c, m, r, cc) => new MeshPhysicalMaterial({ color: c, metalness: m, roughness: r, clearcoat: cc, clearcoatRoughness: 0.2 })
  const glow = (c, i) => new MeshStandardMaterial({ color: 0x03070e, emissive: c, emissiveIntensity: i === undefined ? 1.6 : i, roughness: 0.5, metalness: 0 })
  const beamMat = (c) => new MeshBasicMaterial({ color: c, transparent: true, opacity: 0, blending: AdditiveBlending, depthWrite: false })
  const M = {
    frame: std(0x26354f, 0.85, 0.3),
    panel: std(0x0d1628, 0.55, 0.55),
    unit: std(0x15213a, 0.7, 0.38),
    face: std(0x1e2f4c, 0.8, 0.28),
    vent: std(0x050a14, 0.3, 0.85),
    metal: std(0xa4b6cf, 0.92, 0.24),
    shell: phys(0xd5dfec, 0, 0.3, 0.85),
    graphite: phys(0x1b2639, 0.45, 0.34, 0.6),
    rubber: std(0x090e18, 0, 0.9),
    plinth: std(0x0f192b, 0.75, 0.32),
    glass: new MeshPhysicalMaterial({ color: 0x9cc8ff, metalness: 0, roughness: 0.06, transparent: true, opacity: 0.16, depthWrite: false, side: DoubleSide, envMapIntensity: 1.3 }),
    cyan: glow(COL.cyan, 1.4),
    blue: glow(COL.blue, 1.5),
    green: glow(COL.green, 1.5),
    red: glow(COL.red, 1.7),
    amber: glow(COL.amber, 1.6),
    violet: glow(COL.violet, 1.4),
  }

  // ---------- geometry helpers ----------
  const box = (w, h, d) => new BoxGeometry(w, h, d)
  const cyl = (rt, rb, h, s) => new CylinderGeometry(rt, rb, h, seg(s || 24))
  const torus = (r, t, s) => new TorusGeometry(r, t, 8, seg(s || 48))
  const sphere = (r, s) => new SphereGeometry(r, seg(s || 20), seg(Math.round((s || 20) * 0.6)))
  const merge = (list) => mergeGeometries(list, false)
  const shadowy = (m) => {
    if (!light) { m.castShadow = true; m.receiveShadow = true }
    return m
  }
  const add = (geo, mat, parent, x, y, z) => {
    const m = new Mesh(geo, mat)
    m.position.set(x || 0, y || 0, z || 0)
    parent.add(m)
    return m
  }
  const solid = (geo, mat, parent, x, y, z) => shadowy(add(geo, mat, parent, x, y, z))
  const roundRect = (w, h, r) => {
    const s = new Shape()
    const x = -w / 2, y = -h / 2
    s.moveTo(x + r, y)
    s.lineTo(x + w - r, y)
    s.quadraticCurveTo(x + w, y, x + w, y + r)
    s.lineTo(x + w, y + h - r)
    s.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    s.lineTo(x + r, y + h)
    s.quadraticCurveTo(x, y + h, x, y + h - r)
    s.lineTo(x, y + r)
    s.quadraticCurveTo(x, y, x + r, y)
    return s
  }
  const slab = (w, h, d, r) => {
    const g = new ExtrudeGeometry(roundRect(w, h, r), { depth: d, bevelEnabled: true, bevelThickness: 0.012, bevelSize: 0.012, bevelSegments: 2, curveSegments: light ? 3 : 6 })
    g.translate(0, 0, -d / 2)
    return g
  }
  const anchors = {}
  const anchor = (name, parent, x, y, z) => {
    const o = new Object3D()
    o.position.set(x, y, z)
    parent.add(o)
    anchors[name] = o
    return o
  }
  const V = (x, y, z) => new Vector3(x, y, z)
  const curve = (pts) => new CatmullRomCurve3(pts.map((p) => V(p[0], p[1], p[2])), false, 'centripetal')

  // ---------- canvas textures (no text: readable text is always flat HTML) ----------
  function tex(w, h, draw) {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    const g = c.getContext('2d')
    draw(g, w, h)
    const t = new CanvasTexture(c)
    t.colorSpace = SRGBColorSpace
    textures.push(t)
    return t
  }
  const TW = light ? 192 : 320
  const TH = Math.round(TW * 0.62)
  function drawVideo(g, w, h) {
    const sky = g.createLinearGradient(0, 0, 0, h * 0.62)
    sky.addColorStop(0, '#0e2f57')
    sky.addColorStop(1, '#4f8fcf')
    g.fillStyle = sky
    g.fillRect(0, 0, w, h)
    g.fillStyle = '#1d3a52'
    g.beginPath()
    g.moveTo(0, h * 0.62)
    for (let i = 0; i <= 8; i++) g.lineTo((i / 8) * w, h * (0.5 + 0.08 * Math.sin(i * 1.7) + (i % 2) * 0.04))
    g.lineTo(w, h)
    g.lineTo(0, h)
    g.fill()
    const gr = g.createLinearGradient(0, h * 0.6, 0, h)
    gr.addColorStop(0, '#1f4a3a')
    gr.addColorStop(1, '#0c1f18')
    g.fillStyle = gr
    g.fillRect(0, h * 0.66, w, h * 0.34)
    g.strokeStyle = 'rgba(200,220,235,.55)'
    g.lineWidth = Math.max(1, w / 160)
    g.beginPath()
    g.moveTo(w * 0.36, h)
    g.lineTo(w * 0.52, h * 0.66)
    g.stroke()
    g.strokeStyle = 'rgba(34,211,238,.9)'
    g.lineWidth = Math.max(1, w / 220)
    const cx = w / 2, cy = h / 2, s = w * 0.05
    g.beginPath()
    g.moveTo(cx - s, cy); g.lineTo(cx - s * 0.35, cy); g.moveTo(cx + s * 0.35, cy); g.lineTo(cx + s, cy)
    g.moveTo(cx, cy - s); g.lineTo(cx, cy - s * 0.35); g.moveTo(cx, cy + s * 0.35); g.lineTo(cx, cy + s)
    const m = w * 0.06
    g.moveTo(m, m * 1.8); g.lineTo(m, m); g.lineTo(m * 1.8, m)
    g.moveTo(w - m, m * 1.8); g.lineTo(w - m, m); g.lineTo(w - m * 1.8, m)
    g.moveTo(m, h - m * 1.8); g.lineTo(m, h - m); g.lineTo(m * 1.8, h - m)
    g.moveTo(w - m, h - m * 1.8); g.lineTo(w - m, h - m); g.lineTo(w - m * 1.8, h - m)
    g.stroke()
  }
  function drawIdle(g, w, h) {
    g.fillStyle = '#071226'
    g.fillRect(0, 0, w, h)
    g.strokeStyle = 'rgba(59,130,246,.22)'
    g.lineWidth = 1
    for (let x = 0; x < w; x += w / 12) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke() }
    for (let y = 0; y < h; y += h / 7) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke() }
  }
  const T_ = {
    video: tex(TW, TH, drawVideo),
    idle: tex(TW, TH, drawIdle),
    waiting: tex(TW, TH, (g, w, h) => {
      drawIdle(g, w, h)
      g.strokeStyle = '#f59e0b'
      g.lineWidth = w / 40
      g.beginPath()
      g.arc(w / 2, h / 2, h * 0.22, -1.2, 3.6)
      g.stroke()
    }),
    error: tex(TW, TH, (g, w, h) => {
      g.fillStyle = '#1c0609'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#ef4444'
      g.lineWidth = w / 30
      g.beginPath()
      g.moveTo(w * 0.38, h * 0.28); g.lineTo(w * 0.62, h * 0.72); g.moveTo(w * 0.62, h * 0.28); g.lineTo(w * 0.38, h * 0.72)
      g.stroke()
      g.lineWidth = w / 80
      g.strokeRect(w * 0.03, h * 0.05, w * 0.94, h * 0.9)
    }),
    grid: tex(TW, TH, (g, w, h) => {
      g.fillStyle = '#0b1220'
      g.fillRect(0, 0, w, h)
      const cw = w / 4, ch = h / 3
      for (let i = 0; i < 12; i++) {
        const x = (i % 4) * cw, y = Math.floor(i / 4) * ch
        const gr = g.createLinearGradient(0, y, 0, y + ch)
        gr.addColorStop(0, '#24507e')
        gr.addColorStop(1, '#173826')
        g.fillStyle = gr
        g.fillRect(x + 3, y + 3, cw - 6, ch - 6)
      }
      g.strokeStyle = '#f59e0b'
      g.lineWidth = w / 70
      g.strokeRect(2, 2, w - 4, h - 4)
    }),
    admin: tex(TW, TH, (g, w, h) => {
      g.fillStyle = '#07101f'
      g.fillRect(0, 0, w, h)
      g.fillStyle = '#0f1d36'
      g.fillRect(0, 0, w * 0.2, h)
      g.fillStyle = '#3b82f6'
      for (let i = 0; i < 6; i++) g.fillRect(w * 0.03, h * (0.1 + i * 0.13), w * 0.13, h * 0.05)
      for (let r = 0; r < 5; r++) {
        g.fillStyle = r === 1 ? '#164e63' : '#0f1d36'
        g.fillRect(w * 0.25, h * (0.12 + r * 0.16), w * 0.7, h * 0.11)
        g.fillStyle = r === 1 ? '#22d3ee' : '#2b4a72'
        g.fillRect(w * 0.28, h * (0.155 + r * 0.16), w * (0.25 + 0.07 * (r % 3)), h * 0.04)
        g.fillStyle = r % 2 ? '#34d399' : '#3b82f6'
        g.fillRect(w * 0.86, h * (0.145 + r * 0.16), w * 0.06, h * 0.06)
      }
    }),
    locked: tex(TW, TH, (g, w, h) => {
      g.fillStyle = '#0a0f1c'
      g.fillRect(0, 0, w, h)
      g.strokeStyle = '#ef4444'
      g.lineWidth = w / 50
      g.beginPath()
      g.arc(w / 2, h * 0.42, h * 0.12, Math.PI, 0)
      g.stroke()
      g.fillStyle = '#ef4444'
      g.fillRect(w / 2 - h * 0.18, h * 0.42, h * 0.36, h * 0.26)
    }),
    rack: tex(TW, TH, (g, w, h) => {
      g.fillStyle = '#050b16'
      g.fillRect(0, 0, w, h)
      for (let r = 0; r < 6; r++) {
        g.fillStyle = '#10213b'
        g.fillRect(w * 0.06, h * (0.1 + r * 0.14), w * 0.88, h * 0.08)
        g.fillStyle = r % 3 ? '#3b82f6' : '#22d3ee'
        g.fillRect(w * 0.06, h * (0.1 + r * 0.14), w * (0.2 + 0.11 * ((r * 7) % 5)), h * 0.08)
      }
    }),
  }
  const screenMat = (t) => new MeshBasicMaterial({ map: t, toneMapped: false })

  // ---------- floor, grid, technical rings ----------
  const world = new Group()
  scene.add(world)
  const gridA = new GridHelper(70, 35, 0x1c3a66, 0x132743)
  gridA.material.transparent = true
  gridA.material.opacity = 0.6
  gridA.position.set(2, 0.002, 0)
  world.add(gridA)
  const gridB = new GridHelper(70, 140, 0x0e1d33, 0x0e1d33)
  gridB.material.transparent = true
  gridB.material.opacity = 0.35
  gridB.position.set(2, 0.001, 0)
  world.add(gridB)
  const glowTex = tex(256, 256, (g, w) => {
    const r = g.createRadialGradient(w / 2, w / 2, 4, w / 2, w / 2, w / 2)
    r.addColorStop(0, 'rgba(46,110,220,.38)')
    r.addColorStop(0.5, 'rgba(30,70,160,.12)')
    r.addColorStop(1, 'rgba(10,20,50,0)')
    g.fillStyle = r
    g.fillRect(0, 0, w, w)
  })
  const floorGlow = add(new PlaneGeometry(46, 30).rotateX(-Math.PI / 2), new MeshBasicMaterial({ map: glowTex, transparent: true, depthWrite: false, blending: AdditiveBlending }), world, 3, 0.003, 0)
  floorGlow.renderOrder = -1
  if (!light) {
    const sh = add(new PlaneGeometry(60, 40).rotateX(-Math.PI / 2), new ShadowMaterial({ opacity: 0.45 }), world, 2, 0.004, 0)
    sh.receiveShadow = true
  }
  const lineMat = (c, o) => new LineBasicMaterial({ color: c, transparent: true, opacity: o })
  function ringLine(r, n, ticks, mat) {
    const p = []
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU, b = ((i + 1) / n) * TAU
      p.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(b) * r, 0, Math.sin(b) * r)
    }
    for (let i = 0; i < ticks; i++) {
      const a = (i / ticks) * TAU, l = i % 6 === 0 ? 0.35 : 0.15
      p.push(Math.cos(a) * r, 0, Math.sin(a) * r, Math.cos(a) * (r + l), 0, Math.sin(a) * (r + l))
    }
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(p, 3))
    return new LineSegments(g, mat)
  }
  const rings = new Group()
  world.add(rings)
  const ringA = ringLine(2.35, 96, 72, lineMat(0x2f6fd8, 0.55))
  ringA.position.y = 0.01
  rings.add(ringA)
  const ringB = ringLine(15.5, 160, 120, lineMat(0x1d4b8f, 0.35))
  ringB.position.set(3, 0.01, 0)
  rings.add(ringB)

  // ---------- reusable parts ----------
  function plinth(parent, x, z, r, h) {
    const g = new Group()
    g.position.set(x, 0, z)
    parent.add(g)
    solid(cyl(r, r * 1.08, h, 36), M.plinth, g, 0, h / 2, 0)
    add(torus(r * 1.01, 0.012, 64).rotateX(Math.PI / 2), M.cyan, g, 0, h - 0.01, 0)
    add(cyl(r * 1.25, r * 1.3, 0.05, 36), M.panel, g, 0, 0.025, 0)
    g.userData.top = h
    return g
  }
  function makeKey(mat) {
    const g = new Group()
    add(torus(0.13, 0.04, 32), mat, g, -0.26, 0, 0)
    add(merge([box(0.42, 0.055, 0.05).translate(0.05, 0, 0), box(0.05, 0.12, 0.05).translate(0.18, -0.06, 0), box(0.05, 0.09, 0.05).translate(0.08, -0.045, 0)]), mat, g)
    return g
  }
  function makeLock(bodyMat, shackleMat) {
    const g = new Group()
    add(box(0.26, 0.2, 0.1), bodyMat, g, 0, 0, 0)
    add(new TorusGeometry(0.085, 0.022, 8, seg(24), Math.PI), shackleMat, g, 0, 0.1, 0)
    return g
  }
  function makeEnvelope() {
    const g = new Group()
    add(box(0.5, 0.32, 0.025), M.shell, g)
    const s = new Shape()
    s.moveTo(-0.25, 0.16); s.lineTo(0.25, 0.16); s.lineTo(0, -0.02); s.lineTo(-0.25, 0.16)
    add(new ShapeGeometry(s), M.cyan, g, 0, 0, 0.016)
    return g
  }
  function makeBeacon(mat) {
    const g = new Group()
    const core = add(new OctahedronGeometry(0.16, 0), mat, g, 0, 0.5, 0)
    add(torus(0.36, 0.014, 48).rotateX(Math.PI / 2), mat, g, 0, 0, 0)
    add(torus(0.22, 0.01, 40).rotateX(Math.PI / 2), mat, g, 0, 0.5, 0)
    g.userData.core = core
    g.scale.setScalar(0.001)
    return g
  }
  function makeHex(mat, r) {
    return new Mesh(new CylinderGeometry(r, r, r * 0.45, 6), mat)
  }

  // ---------- server rack ----------
  function makeRack(withScreen) {
    const g = new Group()
    const W = 1.5, H = 2.4, D = 1.15
    const frame = []
    for (const [x, z] of [[-W / 2, -D / 2], [W / 2, -D / 2], [-W / 2, D / 2], [W / 2, D / 2]]) frame.push(box(0.08, H, 0.08).translate(x, H / 2, z))
    frame.push(box(W + 0.04, 0.08, D + 0.04).translate(0, H - 0.04, 0), box(W + 0.12, 0.1, D + 0.12).translate(0, 0.05, 0))
    solid(merge(frame), M.frame, g)
    solid(merge([box(0.02, H - 0.2, D - 0.08).translate(-W / 2, H / 2, 0), box(0.02, H - 0.2, D - 0.08).translate(W / 2, H / 2, 0), box(W - 0.08, H - 0.2, 0.02).translate(0, H / 2, -D / 2)]), M.panel, g)
    const door = add(box(W - 0.06, H - 0.22, 0.012), M.glass, g, 0, H / 2, D / 2 + 0.035)
    door.renderOrder = 4
    const statusMat = glow(COL.cyan, 1.6)
    add(box(W * 0.7, 0.035, 0.02), statusMat, g, 0, H - 0.17, D / 2 + 0.05)
    const unitGeo = merge([box(1.3, 0.28, 0.98), box(0.03, 0.2, 0.04).translate(-0.6, 0, 0.52), box(0.03, 0.2, 0.04).translate(0.6, 0, 0.52)])
    const faceGeo = merge([box(1.32, 0.28, 0.02).translate(0, 0, 0.5)])
    const ventGeo = merge([0, 1, 2, 3].map((k) => box(0.035, 0.17, 0.01).translate(0.12 + k * 0.08, 0, 0.513)))
    const layers = []
    for (let i = 0; i < 5; i++) {
      const L = new Group()
      solid(unitGeo, M.unit, L)
      add(faceGeo, M.face, L)
      add(ventGeo, M.vent, L)
      const led = glow([COL.blue, COL.cyan, COL.sky, COL.cyan, COL.blue][i], 1.2)
      add(box(0.4, 0.032, 0.012), led, L, -0.36, 0.05, 0.515)
      L.position.set(0, 0.34 + i * 0.34, 0)
      L.userData.base = L.position.clone()
      g.add(L)
      layers.push({ g: L, led })
    }
    let screen = null
    if (withScreen) {
      screen = add(new PlaneGeometry(1.0, 0.36), screenMat(T_.rack), g, 0, 2.06, D / 2 + 0.045)
    }
    return { g, layers, statusMat, screen }
  }
  const rack = makeRack(true)
  world.add(rack.g)
  anchor('server', rack.g, 0, 2.7, 0)
  anchor('rackTop', rack.g, 0.55, 2.45, 0.5)
  anchor('rackSide', rack.g, -0.75, 1.2, 0.4)
  anchor('serverScreen', rack.g, 0.3, 2.06, 0.62)
  rack.layers.forEach((l, i) => anchor('L' + i, l.g, 0.66, 0.1, 0.5))
  anchor('slot', rack.layers[3].g, -0.2, 0.08, 0.52)
  // port panel on the viewer side
  const portPanel = new Group()
  portPanel.position.set(0.77, 1.0, 0.05)
  rack.g.add(portPanel)
  add(box(0.02, 0.46, 0.72), M.face, portPanel)
  const sockets = []
  for (let i = 0; i < 6; i++) {
    const y = 0.11 - Math.floor(i / 3) * 0.2, z = -0.2 + (i % 3) * 0.2
    add(box(0.025, 0.09, 0.11), M.vent, portPanel, 0.012, y, z)
    const m = glow(COL.green, 1.2)
    add(sphere(0.018, 10), m, portPanel, 0.03, y + 0.07, z)
    sockets.push(m)
  }
  anchor('portPanel', portPanel, 0.05, 0.25, 0.3)
  // OS chips (shown with the OS layer when the layers are apart)
  const osWin = new Group(), osLin = new Group()
  const winMat = glow(COL.sky, 1.0), linMat = glow(COL.cyan, 1.0)
  for (const [grp, x] of [[osWin, -1.05], [osLin, -1.62]]) {
    grp.position.set(x, 0.05, 0.3)
    grp.scale.setScalar(0.001)
    rack.layers[0].g.add(grp)
    add(slab(0.46, 0.46, 0.05, 0.06), M.graphite, grp)
  }
  for (let i = 0; i < 4; i++) add(box(0.15, 0.15, 0.02), winMat, osWin, (i % 2 ? 0.085 : -0.085), (i < 2 ? 0.085 : -0.085), 0.045)
  add(merge([box(0.16, 0.035, 0.02).rotateZ(-0.7).translate(-0.06, 0.05, 0), box(0.16, 0.035, 0.02).rotateZ(0.7).translate(-0.06, -0.05, 0), box(0.14, 0.035, 0.02).translate(0.08, -0.1, 0)]), linMat, osLin, 0, 0, 0.045)
  const osChipAnchor = anchor('osChip', rack.layers[0].g, -1.05, 0.32, 0.3)

  // trust boundary, scan ring, TLS key, egress lock
  const trustMat = new MeshPhysicalMaterial({ color: 0x7fb4ff, roughness: 0.1, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })
  const trust = add(new CylinderGeometry(2.05, 2.05, 3.1, seg(56), 1, true), trustMat, world, 0, 1.55, 0.1)
  trust.renderOrder = 5
  const trustRing = add(torus(2.05, 0.02, 96).rotateX(Math.PI / 2), beamMat(COL.amber), world, 0, 0.03, 0.1)
  anchor('trust', world, -1.45, 2.9, 1.45)
  const scanRing = add(torus(1.15, 0.018, 64).rotateX(Math.PI / 2), M.cyan, world, 0, 1.2, 0)
  scanRing.scale.setScalar(0.001)
  anchor('scan', world, -0.9, 2.3, 0.8)
  const tlsKey = makeKey(glow(COL.sky, 1.3))
  tlsKey.position.set(1.15, 2.75, 0.55)
  world.add(tlsKey)
  anchor('tlsKey', tlsKey, 0.1, 0.1, 0)
  const egressLock = makeLock(M.graphite, M.cyan)
  egressLock.position.set(1.25, 1.95, 0.5)
  world.add(egressLock)
  anchor('egressLock', egressLock, 0.1, 0.18, 0)

  // ---------- pilot zone: stylized quadcopter + remote ----------
  const drone = new Group()
  drone.position.set(-9.2, 3.4, 0.4)
  drone.rotation.y = 0.55
  world.add(drone)
  solid(sphere(1, 30).scale(0.62, 0.2, 0.4), M.shell, drone)
  solid(sphere(1, 24).scale(0.38, 0.12, 0.25), M.graphite, drone, -0.05, 0.1, 0)
  const motorPts = [[0.78, 0.6], [0.78, -0.6], [-0.78, 0.6], [-0.78, -0.6]]
  const armGeo = []
  for (const [x, z] of motorPts) {
    const len = Math.hypot(x, z)
    armGeo.push(box(len, 0.05, 0.075).rotateY(-Math.atan2(z, x)).translate(x / 2, 0.02, z / 2))
    armGeo.push(cyl(0.1, 0.1, 0.13, 20).translate(x, 0.06, z))
  }
  solid(merge(armGeo), M.graphite, drone)
  const props = []
  const bladeGeo = merge([box(0.66, 0.008, 0.06), box(0.66, 0.008, 0.06).rotateY(Math.PI / 2)])
  motorPts.forEach(([x, z], i) => {
    add(torus(0.1, 0.012, 24).rotateX(Math.PI / 2), M.cyan, drone, x, 0.12, z)
    const p = add(bladeGeo, M.metal, drone, x, 0.14, z)
    p.rotation.y = i
    props.push(p)
  })
  const gimbal = new Group()
  gimbal.position.set(0.42, -0.2, 0)
  drone.add(gimbal)
  solid(sphere(0.11, 18), M.graphite, gimbal)
  add(cyl(0.055, 0.055, 0.07, 16).rotateZ(Math.PI / 2), M.glass, gimbal, 0.1, 0, 0)
  add(torus(0.056, 0.01, 20).rotateY(Math.PI / 2), M.cyan, gimbal, 0.13, 0, 0)
  solid(merge([box(0.035, 0.3, 0.035).translate(0, -0.25, 0.24), box(0.035, 0.3, 0.035).translate(0, -0.25, -0.24), box(0.75, 0.03, 0.04).translate(0, -0.4, 0.24), box(0.75, 0.03, 0.04).translate(0, -0.4, -0.24)]), M.rubber, drone)
  const navG = glow(COL.green, 2), navR = glow(COL.red, 2)
  add(sphere(0.03, 8), navG, drone, 0.86, 0.05, 0.66)
  add(sphere(0.03, 8), navR, drone, 0.86, 0.05, -0.66)
  anchor('drone', drone, 0, 0.45, 0)

  const remoteP = plinth(world, -7.0, 2.2, 0.72, 0.72)
  const remote = new Group()
  remote.position.set(0, 0.8, 0)
  remote.rotation.set(-0.12, 0.42, 0)
  remoteP.add(remote)
  solid(slab(1.1, 0.48, 0.1, 0.16).rotateX(-Math.PI / 2), M.graphite, remote)
  solid(sphere(1, 18).scale(0.16, 0.08, 0.22), M.shell, remote, -0.5, -0.02, 0.05)
  solid(sphere(1, 18).scale(0.16, 0.08, 0.22), M.shell, remote, 0.5, -0.02, 0.05)
  for (const x of [-0.3, 0.3]) {
    add(cyl(0.018, 0.018, 0.08, 10), M.metal, remote, x, 0.09, 0.08)
    add(sphere(0.035, 12), M.rubber, remote, x, 0.14, 0.08)
  }
  const rScreen = new Group()
  rScreen.position.set(0, 0.22, -0.16)
  rScreen.rotation.x = -0.32
  remote.add(rScreen)
  solid(box(0.64, 0.38, 0.03), M.graphite, rScreen)
  const remoteScreen = add(new PlaneGeometry(0.58, 0.32), screenMat(T_.video), rScreen, 0, 0, 0.017)
  for (const s of [-1, 1]) {
    const a = add(box(0.05, 0.34, 0.018), M.shell, remote, s * 0.47, 0.2, -0.2)
    a.rotation.z = -s * 0.32
  }
  const remoteLed = glow(COL.green, 1.8)
  add(sphere(0.025, 10), remoteLed, remote, 0, 0.07, 0.2)
  anchor('remote', remote, 0, 0.62, 0)

  // ---------- admin desk ----------
  const desk = new Group()
  desk.position.set(4.6, 0, -4.8)
  desk.rotation.y = -0.45
  world.add(desk)
  solid(merge([box(2.0, 0.06, 0.9).translate(0, 0.75, 0), box(0.06, 0.72, 0.8).translate(-0.94, 0.36, 0), box(0.06, 0.72, 0.8).translate(0.94, 0.36, 0), box(1.9, 0.5, 0.03).translate(0, 0.5, -0.4)]), M.frame, desk)
  solid(merge([box(1.36, 0.82, 0.05).translate(0, 1.32, -0.22), box(0.08, 0.45, 0.06).translate(0, 0.98, -0.26), box(0.4, 0.03, 0.26).translate(0, 0.79, -0.24)]), M.graphite, desk)
  const adminScreen = add(new PlaneGeometry(1.26, 0.72), screenMat(T_.admin), desk, 0, 1.32, -0.193)
  solid(box(0.9, 0.03, 0.3), M.panel, desk, 0, 0.795, 0.17)
  const deskRingMat = beamMat(COL.cyan)
  add(torus(1.35, 0.02, 96).rotateX(Math.PI / 2), deskRingMat, desk, 0, 0.03, 0)
  const frameGlow = beamMat(COL.cyan)
  add(merge([box(1.44, 0.02, 0.02).translate(0, 1.74, -0.2), box(1.44, 0.02, 0.02).translate(0, 0.9, -0.2), box(0.02, 0.86, 0.02).translate(-0.71, 1.32, -0.2), box(0.02, 0.86, 0.02).translate(0.71, 1.32, -0.2)]), frameGlow, desk)
  const adminCode = new Group()
  adminCode.position.set(0, 1.9, -0.15)
  adminCode.scale.setScalar(0.001)
  desk.add(adminCode)
  for (let i = 0; i < 4; i++) add(box(0.12, 0.16, 0.03), M.cyan, adminCode, -0.24 + i * 0.16, 0, 0)
  anchor('admin', desk, -0.3, 2.0, 0)
  anchor('adminScreen', desk, 0.45, 1.5, -0.18)

  // ---------- viewers: laptop, phone, second browser ----------
  const lapP = plinth(world, 7.4, 1.5, 0.75, 0.74)
  const laptop = new Group()
  laptop.position.set(0, 0.76, 0)
  laptop.rotation.y = -0.5
  lapP.add(laptop)
  solid(slab(1.02, 0.7, 0.04, 0.05).rotateX(-Math.PI / 2), M.graphite, laptop, 0, 0.02, 0)
  add(box(0.86, 0.006, 0.34), M.panel, laptop, 0, 0.045, -0.04)
  const lid = new Group()
  lid.position.set(0, 0.04, -0.34)
  lid.rotation.x = -0.26
  laptop.add(lid)
  solid(slab(1.02, 0.68, 0.03, 0.05), M.graphite, lid, 0, 0.34, 0)
  const lapScreen = add(new PlaneGeometry(0.92, 0.58), screenMat(T_.idle), lid, 0, 0.35, 0.025)
  const lapCode = new Group()
  lapCode.position.set(0, 0.85, 0.05)
  lapCode.scale.setScalar(0.001)
  lid.add(lapCode)
  for (let i = 0; i < 4; i++) add(box(0.1, 0.13, 0.03), M.cyan, lapCode, -0.21 + i * 0.14, 0, 0)
  anchor('laptop', laptop, 0, 1.15, -0.2)
  anchor('laptopScreen', lid, 0.3, 0.5, 0.05)

  const phoneP = plinth(world, 9.1, 3.4, 0.5, 0.74)
  const phonePos = { a: V(9.1, 0, 3.4), b: V(16.2, 0, 3.1) }
  const phone = new Group()
  phone.position.set(0, 0.76, 0)
  phone.rotation.y = -0.7
  phoneP.add(phone)
  const phoneBody = new Group()
  phoneBody.position.set(0, 0.42, 0)
  phoneBody.rotation.x = -0.2
  phone.add(phoneBody)
  solid(slab(0.38, 0.76, 0.035, 0.06), M.graphite, phoneBody)
  const phoneScreen = add(new PlaneGeometry(0.33, 0.68), screenMat(T_.idle), phoneBody, 0, 0, 0.032)
  solid(box(0.3, 0.06, 0.2), M.frame, phone, 0, 0.03, 0.05)
  anchor('phone', phone, 0, 1.0, 0)

  const tabP = plinth(world, 5.4, 5.2, 0.62, 0.74)
  tabP.scale.setScalar(0.001)
  const tab = new Group()
  tab.position.set(0, 0.76, 0)
  tab.rotation.y = -0.35
  tabP.add(tab)
  const tabBody = new Group()
  tabBody.position.set(0, 0.36, 0)
  tabBody.rotation.x = -0.25
  tab.add(tabBody)
  solid(slab(0.84, 0.58, 0.035, 0.05), M.graphite, tabBody)
  add(new PlaneGeometry(0.76, 0.5), screenMat(T_.locked), tabBody, 0, 0, 0.032)
  solid(box(0.4, 0.06, 0.24), M.frame, tab, 0, 0.03, 0.06)
  anchor('tablet', tab, 0, 0.95, 0)

  // ---------- network: LAN zone, router + firewall, internet, domain ----------
  const lanMat = beamMat(COL.cyan)
  const lanFill = new MeshBasicMaterial({ color: COL.blue, transparent: true, opacity: 0, depthWrite: false, blending: AdditiveBlending })
  add(new RingGeometry(7.15, 7.24, seg(160)).rotateX(-Math.PI / 2), lanMat, world, 3.8, 0.02, 0.3)
  add(new CircleGeometry(7.15, seg(96)).rotateX(-Math.PI / 2), lanFill, world, 3.8, 0.015, 0.3)
  anchor('lanTag', world, -1.2, 0.2, 5.4)
  const routerP = plinth(world, 10.6, 0.6, 0.55, 0.74)
  routerP.scale.setScalar(0.001)
  solid(slab(0.9, 0.55, 0.16, 0.06).rotateX(-Math.PI / 2), M.graphite, routerP, 0, 0.84, 0)
  solid(merge([-0.3, 0, 0.3].map((x) => cyl(0.02, 0.025, 0.45, 10).translate(x, 1.12, -0.22))), M.graphite, routerP)
  for (let i = 0; i < 5; i++) add(box(0.05, 0.02, 0.01), M.green, routerP, -0.2 + i * 0.1, 0.86, 0.29)
  anchor('router', routerP, 0, 1.45, 0)
  const fw = new Group()
  fw.position.set(11.8, 0, 0.7)
  fw.scale.setScalar(0.001)
  world.add(fw)
  const fwPanel = add(box(0.05, 2.5, 4.6), M.glass, fw, 0, 1.25, 0)
  fwPanel.renderOrder = 5
  {
    const p = []
    for (let z = -2.3; z <= 2.31; z += 0.46) p.push(0, 0, z, 0, 2.5, z)
    for (let y = 0; y <= 2.51; y += 0.5) p.push(0, y, -2.3, 0, y, 2.3)
    const g = new BufferGeometry()
    g.setAttribute('position', new Float32BufferAttribute(p, 3))
    fw.add(new LineSegments(g, lineMat(0x3b82f6, 0.5)))
  }
  anchor('fw', fw, 0, 2.6, -1.6)
  const globe = new Group()
  globe.position.set(17.8, 3.6, -1.8)
  globe.scale.setScalar(0.001)
  world.add(globe)
  globe.add(new LineSegments(new EdgesGeometry(new IcosahedronGeometry(1.35, 1)), lineMat(0x22d3ee, 0.7)))
  add(sphere(1.25, 28), new MeshPhysicalMaterial({ color: 0x0b2a55, roughness: 0.3, transparent: true, opacity: 0.55, depthWrite: false }), globe)
  anchor('globe', globe, -0.6, 1.5, 0.4)
  const domain = new Group()
  domain.position.set(14.6, 2.7, 1.4)
  domain.rotation.y = -0.3
  domain.scale.setScalar(0.001)
  world.add(domain)
  solid(box(1.7, 0.44, 0.05), M.graphite, domain)
  domain.add(new LineSegments(new EdgesGeometry(box(1.74, 0.48, 0.07)), lineMat(0x22d3ee, 0.9)))
  add(box(0.2, 0.2, 0.02), M.cyan, domain, -0.6, 0, 0.04)
  anchor('domain', domain, 0, 0.3, 0)

  // ---------- paths: beams with packets ----------
  const PATH = {
    link: curve([[-8.75, 3.0, 0.65], [-8.0, 2.4, 1.4], [-7.05, 1.35, 2.05]]),
    ingest: curve([[-6.75, 1.2, 2.0], [-4.3, 2.35, 1.75], [-2.0, 2.05, 0.95], [-0.82, 1.45, 0.35]]),
    egressL: curve([[0.82, 1.45, 0.35], [3.0, 2.2, 1.05], [5.6, 1.95, 1.4], [7.1, 1.2, 1.45]]),
    egressP: curve([[0.82, 1.25, 0.5], [3.6, 1.85, 2.5], [7.0, 1.75, 3.3], [8.95, 1.2, 3.35]]),
    pageL: curve([[0.82, 1.75, 0.1], [3.2, 2.75, 0.55], [5.7, 2.4, 0.95], [7.15, 1.4, 1.3]]),
    admin: curve([[0.6, 1.9, -0.55], [2.4, 2.4, -2.6], [4.25, 1.55, -4.35]]),
    https: curve([[16.0, 1.25, 2.95], [13.2, 1.5, 1.6], [10.6, 1.2, 0.6], [5.5, 2.0, 0.15], [0.82, 1.65, 0.0]]),
    udp: curve([[16.0, 1.0, 3.2], [13.2, 1.1, 2.0], [10.6, 0.95, 0.95], [5.5, 1.45, 0.65], [0.82, 1.2, 0.3]]),
    turn: curve([[16.0, 1.35, 2.8], [12.5, 3.7, 1.4], [6.0, 3.9, 0.4], [0.4, 2.45, 0.1]]),
    dns: curve([[13.8, 2.6, 1.5], [12.2, 2.4, 1.0], [10.7, 1.5, 0.6]]),
    key: curve([[4.3, 1.55, -4.4], [1.0, 4.4, -2.2], [-4.0, 3.9, 0.4], [-6.75, 1.4, 2.0]]),
    req: curve([[7.0, 1.35, 1.4], [4.0, 2.25, 0.9], [0.85, 1.8, 0.25], [2.0, 2.5, -2.4], [4.3, 1.65, -4.3]]),
    tablet: curve([[5.3, 1.35, 5.0], [3.8, 2.1, 3.2], [2.25, 1.55, 1.2]]),
    bak: curve([[-0.6, 1.05, -0.62], [-2.0, 3.0, -3.4], [-4.0, 2.6, -6.2], [-4.45, 1.2, -6.95]]),
    planned: curve([[-6.6, 1.15, 2.45], [-5.1, 1.1, 4.25], [-1.5, 3.5, 3.5], [2.4, 3.7, 2.9], [6.95, 1.35, 1.7]]),
  }
  const _t = V(0, 0, 0), _p = V(0, 0, 0), _m = new Matrix4(), _q = new Quaternion(), _s = V(1, 1, 1), _up = V(0, 1, 0), _z = V(0, 0, 1)
  function makeBeam(c, color, radius, n, shell) {
    const geo = new TubeGeometry(c, seg(72), radius, 6, false)
    const mat = beamMat(color)
    const tube = add(geo, mat, world)
    tube.renderOrder = 6
    const total = geo.index.count
    const pm = glow(color, 1.8)
    const packets = new InstancedMesh(box(0.17, 0.1, 0.1), pm, n)
    packets.frustumCulled = false
    world.add(packets)
    let shells = null
    if (shell) {
      shells = new InstancedMesh(box(0.26, 0.18, 0.18), M.glass, n)
      shells.frustumCulled = false
      shells.renderOrder = 7
      world.add(shells)
    }
    const b = { c, tube, mat, pm, packets, shells, n, total, base: new Color(color) }
    b.update = (v, phase, reveal, dir, packetsOn) => {
      const on = v > 0.004
      tube.visible = on
      mat.opacity = 0.75 * v
      const r = reveal === undefined ? 1 : reveal
      geo.setDrawRange(0, Math.max(0, Math.floor((total * r) / 6) * 6))
      const show = on && packetsOn !== false
      packets.visible = show
      if (shells) shells.visible = show
      if (!show) return
      const sc = clamp01(v * 1.3)
      for (let j = 0; j < n; j++) {
        let u = (((j / n + phase) % 1) + 1) % 1
        if (dir < 0) u = 1 - u
        u *= r
        c.getPointAt(u, _p)
        c.getTangentAt(u, _t)
        _q.setFromUnitVectors(V(1, 0, 0), _t)
        const fade = Math.min(1, u * 8, (r - u) * 8)
        _s.setScalar(Math.max(0.0001, sc * fade))
        _m.compose(_p, _q, _s)
        packets.setMatrixAt(j, _m)
        if (shells) shells.setMatrixAt(j, _m)
      }
      packets.instanceMatrix.needsUpdate = true
      if (shells) shells.instanceMatrix.needsUpdate = true
    }
    b.color = (hex, k) => {
      mat.color.copy(b.base).lerp(_c.set(hex), k)
      pm.emissive.copy(b.base).lerp(_c.set(hex), k)
    }
    return b
  }
  const _c = new Color()
  function makeDashes(c, color, n, len) {
    const mat = glow(color, 1.5)
    const im = new InstancedMesh(cyl(0.022, 0.022, len, 8), mat, n)
    im.frustumCulled = false
    world.add(im)
    const d = { im, mat }
    d.update = (v, phase) => {
      im.visible = v > 0.004
      if (!im.visible) return
      for (let j = 0; j < n; j++) {
        const u = clamp01(((j + 0.5) / n + (phase || 0)) % 1)
        c.getPointAt(u, _p)
        c.getTangentAt(u, _t)
        _q.setFromUnitVectors(_up, _t)
        _s.setScalar(Math.max(0.0001, clamp01(v)))
        _m.compose(_p, _q, _s)
        im.setMatrixAt(j, _m)
      }
      im.instanceMatrix.needsUpdate = true
    }
    return d
  }
  const B = {
    ingest: makeBeam(PATH.ingest, COL.amber, 0.028, 6, false),
    egressL: makeBeam(PATH.egressL, COL.cyan, 0.03, 6, true),
    egressP: makeBeam(PATH.egressP, COL.sky, 0.026, 5, true),
    pageL: makeBeam(PATH.pageL, COL.blue, 0.024, 4, true),
    admin: makeBeam(PATH.admin, COL.sky, 0.022, 4, false),
    https: makeBeam(PATH.https, COL.blue, 0.03, 7, true),
    udp: makeBeam(PATH.udp, COL.cyan, 0.03, 7, true),
  }
  const D = {
    link: makeDashes(PATH.link, COL.cyan, 7, 0.16),
    turn: makeDashes(PATH.turn, COL.white, 26, 0.22),
    dns: makeDashes(PATH.dns, COL.cyan, 8, 0.14),
    key: makeDashes(PATH.key, COL.sky, 30, 0.14),
    planned: makeDashes(PATH.planned, COL.violet, 40, 0.2),
    bak: makeDashes(PATH.bak, COL.cyan, 18, 0.14),
  }
  const at = (c, u, dy, name) => {
    const o = new Object3D()
    c.getPointAt(u, o.position)
    o.position.y += dy || 0
    world.add(o)
    if (name) anchors[name] = o
    return o
  }
  at(PATH.ingest, 0.45, 0.12, 'ingestMid')
  at(PATH.egressL, 0.42, 0.12, 'egressMid')
  at(PATH.pageL, 0.55, 0.12, 'pageMid')
  at(PATH.https, 0.38, 0.14, 'httpsMid')
  at(PATH.udp, 0.62, -0.05, 'udpMid')
  at(PATH.turn, 0.45, 0.15, 'turnMid')
  at(PATH.planned, 0.5, 0.2, 'plannedMid')
  at(PATH.ingest, 0.3, 0.42, 'vpnTag')
  const vpnMat = new MeshPhysicalMaterial({ color: 0x34d399, roughness: 0.2, transparent: true, opacity: 0, depthWrite: false, side: DoubleSide })
  const vpn = add(new TubeGeometry(PATH.ingest, seg(64), 0.2, seg(16), false), vpnMat, world)
  vpn.renderOrder = 8

  // moving tokens: pult key, request envelope, blocked request, backup cartridge
  const keyObj = makeKey(glow(COL.cyan, 1.6))
  keyObj.scale.setScalar(0.001)
  world.add(keyObj)
  anchor('key', keyObj, 0, 0.2, 0)
  const reqObj = makeEnvelope()
  reqObj.scale.setScalar(0.001)
  world.add(reqObj)
  anchor('req', reqObj, 0, 0.25, 0)
  const tabReq = makeEnvelope()
  tabReq.scale.setScalar(0.001)
  world.add(tabReq)
  const bak = new Group()
  bak.scale.setScalar(0.001)
  world.add(bak)
  solid(slab(0.52, 0.34, 0.14, 0.05).rotateX(-Math.PI / 2), M.graphite, bak)
  add(box(0.4, 0.02, 0.01), M.cyan, bak, 0, 0.0, 0.18)
  const bakLock = makeLock(M.graphite, M.cyan)
  bakLock.scale.setScalar(0.7)
  bakLock.position.set(0, 0.2, 0)
  bak.add(bakLock)
  anchor('bak', bak, 0, 0.35, 0)

  // planned: ghost gateway
  const gateway = new Group()
  gateway.position.set(-5.1, 0, 4.25)
  gateway.scale.setScalar(0.001)
  world.add(gateway)
  gateway.add(new LineSegments(new EdgesGeometry(box(0.9, 0.6, 0.6)), lineMat(0xa78bfa, 0.9)).translateY(0.95))
  gateway.add(new LineSegments(new EdgesGeometry(new CylinderGeometry(0.5, 0.55, 0.62, 6)), lineMat(0xa78bfa, 0.5)).translateY(0.31))
  anchor('gateway', gateway, 0, 1.45, 0)

  // session badge, rights tiles, invitation (QR + envelope), shield, cut mark
  const session = makeHex(glow(COL.cyan, 1.4), 0.2)
  session.position.set(7.35, 2.35, 1.45)
  session.scale.setScalar(0.001)
  world.add(session)
  anchor('session', session, 0, 0.15, 0)
  const rights = new Group()
  rights.position.set(6.4, 2.3, 1.9)
  rights.rotation.y = -0.4
  rights.scale.setScalar(0.001)
  world.add(rights)
  const rightsMats = [glow(COL.green, 0.9), glow(COL.green, 0.9), glow(COL.red, 0.9)]
  for (let i = 0; i < 3; i++) {
    solid(slab(0.5, 0.34, 0.03, 0.04), i === 2 ? M.panel : M.graphite, rights, -0.62 + i * 0.62, 0, 0)
    add(new PlaneGeometry(0.42, 0.26), i === 2 ? screenMat(T_.locked) : screenMat(T_.video), rights, -0.62 + i * 0.62, 0, 0.03)
    add(box(0.5, 0.02, 0.02), rightsMats[i], rights, -0.62 + i * 0.62, -0.2, 0.02)
  }
  anchor('rightsOk', rights, -0.62, 0.25, 0)
  anchor('rightsNo', rights, 0.62, 0.25, 0)
  const qr = new Group()
  qr.position.set(8.55, 1.85, 2.45)
  qr.rotation.y = -0.55
  qr.scale.setScalar(0.001)
  world.add(qr)
  solid(slab(0.72, 0.72, 0.03, 0.04), M.shell, qr)
  {
    const N = 17, cell = 0.6 / N, list = []
    const finder = (i, j) => (i < 5 && j < 5) || (i < 5 && j > N - 6) || (i > N - 6 && j < 5)
    for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
      let on
      if (finder(i, j)) {
        const a = i < 5 ? i : i - (N - 5), b = j < 5 ? j : j - (N - 5)
        on = a === 0 || a === 4 || b === 0 || b === 4 || (a === 2 && b === 2)
      } else on = Math.sin(i * 12.9898 + j * 78.233) * 43758.5453 % 1 > 0.1
      if (on) list.push(box(cell * 0.92, cell * 0.92, 0.02).translate(-0.3 + (j + 0.5) * cell, 0.3 - (i + 0.5) * cell, 0.03))
    }
    add(merge(list), M.rubber, qr)
  }
  anchor('qr', qr, 0.15, 0.45, 0)
  const invite = makeEnvelope()
  invite.position.set(6.7, 2.05, 2.35)
  invite.rotation.y = -0.3
  invite.scale.setScalar(0.001)
  world.add(invite)
  anchor('envelope', invite, 0, 0.25, 0)
  const shieldMat = glow(COL.red, 1.4)
  const shield = new Mesh(new TorusGeometry(0.6, 0.035, 6, 6), shieldMat)
  shield.position.set(2.2, 1.55, 1.15)
  shield.rotation.y = 1.1
  shield.scale.setScalar(0.001)
  world.add(shield)
  const shieldFace = new Mesh(new CircleGeometry(0.58, 6), new MeshBasicMaterial({ color: COL.red, transparent: true, opacity: 0.12, side: DoubleSide, depthWrite: false, blending: AdditiveBlending }))
  shield.add(shieldFace)
  anchor('shield', shield, 0, 0.75, 0)
  const cutMark = new Group()
  PATH.egressL.getPointAt(0.47, cutMark.position)
  cutMark.scale.setScalar(0.001)
  world.add(cutMark)
  add(torus(0.22, 0.03, 32), M.red, cutMark).rotation.y = 1.2
  add(merge([box(0.36, 0.05, 0.05).rotateZ(0.785), box(0.36, 0.05, 0.05).rotateZ(-0.785)]), M.red, cutMark).rotation.y = 1.2
  anchor('cutMark', cutMark, 0, 0.35, 0)
  const rejects = []
  for (let i = 0; i < 3; i++) {
    const s = add(sphere(0.06, 10), M.red, world)
    s.visible = false
    rejects.push(s)
  }

  // content tiles and the collection frame
  const tiles = []
  const tilePos = {
    a: [V(1.55, 2.95, 2.25), V(3.4, 3.05, 1.55), V(1.85, 1.95, 2.65), V(3.75, 2.05, 2.35)],
    b: [V(2.62, 2.62, 1.6), V(3.62, 2.62, 1.6), V(2.62, 1.98, 1.6), V(3.62, 1.98, 1.6)],
  }
  const tileNames = ['tStream', 'tText', 'tImage', 'tVideo']
  for (let i = 0; i < 4; i++) {
    const t = new Group()
    t.scale.setScalar(0.001)
    world.add(t)
    solid(slab(0.86, 0.54, 0.035, 0.05), M.graphite, t)
    if (i === 0) {
      add(new PlaneGeometry(0.76, 0.44), screenMat(T_.video), t, 0, 0, 0.03)
      add(sphere(0.04, 10), M.red, t, 0.3, 0.17, 0.05)
    } else if (i === 1) {
      add(merge([0, 1, 2].map((k) => box(0.6 - k * 0.12, 0.05, 0.01).translate(-0.06 * k, 0.12 - k * 0.12, 0))), M.cyan, t, 0, 0, 0.03)
    } else if (i === 2) {
      const s = new Shape()
      s.moveTo(-0.34, -0.18); s.lineTo(-0.12, 0.1); s.lineTo(0.0, -0.02); s.lineTo(0.14, 0.14); s.lineTo(0.34, -0.18); s.lineTo(-0.34, -0.18)
      add(new ShapeGeometry(s), M.blue, t, 0, 0, 0.03)
      add(new CircleGeometry(0.06, 16), M.amber, t, -0.22, 0.15, 0.03)
    } else {
      const s = new Shape()
      s.moveTo(-0.08, -0.13); s.lineTo(0.14, 0); s.lineTo(-0.08, 0.13); s.lineTo(-0.08, -0.13)
      add(new ShapeGeometry(s), M.cyan, t, 0, 0, 0.03)
    }
    anchor(tileNames[i], t, 0.3, 0.32, 0)
    tiles.push(t)
  }
  const group = new Group()
  group.position.set(3.12, 2.3, 1.55)
  group.scale.setScalar(0.001)
  world.add(group)
  const groupGlass = add(box(2.25, 1.55, 0.36), M.glass, group)
  groupGlass.renderOrder = 6
  group.add(new LineSegments(new EdgesGeometry(box(2.27, 1.57, 0.38)), lineMat(0x22d3ee, 0.9)))
  anchor('group', group, -0.95, 0.9, 0)

  // backup target: a second (new) server
  const n2 = makeRack(false)
  n2.g.position.set(-4.6, 0, -7.6)
  n2.g.rotation.y = 0.3
  n2.g.scale.setScalar(0.001)
  world.add(n2.g)
  anchor('n2', n2.g, 0, 2.8, 0)

  // diagnostics beacons
  const beacon = {
    udp: makeBeacon(M.red),
    port: makeBeacon(M.red),
    cert: makeBeacon(M.amber),
    offline: makeBeacon(M.red),
    limit: makeBeacon(M.amber),
  }
  PATH.egressL.getPointAt(0.47, beacon.udp.position)
  beacon.udp.position.y -= 0.5
  anchors.videoCut = new Object3D()
  PATH.egressL.getPointAt(0.47, anchors.videoCut.position)
  anchors.videoCut.position.y += 0.2
  world.add(anchors.videoCut)
  beacon.port.position.set(1.55, 0.55, 0.05)
  PATH.pageL.getPointAt(0.82, beacon.cert.position)
  beacon.cert.position.y -= 0.45
  anchors.certMark = new Object3D()
  anchors.certMark.position.copy(beacon.cert.position)
  anchors.certMark.position.y += 0.75
  world.add(anchors.certMark)
  const certLock = makeLock(M.graphite, M.amber)
  PATH.pageL.getPointAt(0.82, certLock.position)
  certLock.scale.setScalar(0.001)
  world.add(certLock)
  beacon.offline.position.set(-6.0, 0.9, 2.6)
  beacon.limit.position.set(8.25, 1.5, 1.0)
  for (const k in beacon) world.add(beacon[k])

  // ---------- state sampling ----------
  const NS = STATES.length
  const C = new Float32Array(NS)
  const cam = new Float32Array(6)
  const ch = (name) => C[SI[name]]
  let lift = 0
  function sample(T) {
    const n = keys.length
    let a, b, f, between
    if (T <= keys[0].t) { a = b = keys[0]; f = 0 }
    else if (T >= keys[n - 1].t) { a = b = keys[n - 1]; f = 0 }
    else {
      let lo = 0, hi = n - 1
      while (hi - lo > 1) {
        const mid = (lo + hi) >> 1
        if (keys[mid].t <= T) lo = mid
        else hi = mid
      }
      a = keys[lo]; b = keys[hi]
      f = (T - a.t) / (b.t - a.t)
      between = lo % 2 === 1
      if (between) f = ease(f)
    }
    for (let i = 0; i < NS; i++) C[i] = a.v[i] + (b.v[i] - a.v[i]) * f
    for (let i = 0; i < 6; i++) cam[i] = a.cam[i] + (b.cam[i] - a.cam[i]) * f
    cam[4] += 0.07 * mix(a.drift, b.drift, f)
    lift = 0
    if (a.cam !== b.cam) {
      const d = Math.hypot(a.cam[0] - b.cam[0], a.cam[1] - b.cam[1], a.cam[2] - b.cam[2])
      lift = Math.sin(Math.PI * f) * Math.min(1, d / 10)
    }
  }

  // ---------- camera framing ----------
  let W = 1, H = 1
  const view = { x: 0, y: 0, fw: 1, fh: 1 }
  function resize(w, h, dpr, free) {
    W = w
    H = h
    renderer.setPixelRatio(dpr)
    renderer.setSize(w, h, false)
    camera.aspect = w / h
    setFree(free)
  }
  function setFree(free) {
    // shift the projection centre into the free area (outside the text panel)
    const w = W, h = H
    const cx = free.x + free.w / 2, cy = free.y + free.h / 2
    view.x = -(cx - w / 2)
    view.y = -(cy - h / 2)
    view.fw = free.w
    view.fh = free.h
    camera.setViewOffset(w, h, view.x, view.y, w, h)
    camera.updateProjectionMatrix()
  }
  const tg = V(0, 0, 0)
  function placeCamera() {
    const freeAspect = view.fw / Math.max(1, view.fh)
    // presets are framed for a wide free area; a tall phone screen crops the edges a little instead of shrinking everything
    const fit = Math.min(2.4, Math.max(1, (H / Math.max(1, view.fh)) * 0.9, 1.3 / freeAspect)) * (W < H ? 0.8 : 1)
    const dist = cam[3] * fit * (1 + 0.35 * lift)
    const el = cam[5] + 0.18 * lift
    const az = cam[4]
    tg.set(cam[0], cam[1], cam[2])
    camera.position.set(tg.x + Math.sin(az) * Math.cos(el) * dist, tg.y + Math.sin(el) * dist, tg.z + Math.cos(az) * Math.cos(el) * dist)
    camera.lookAt(tg)
  }

  // ---------- apply state ----------
  const setScale = (o, v) => o.scale.setScalar(Math.max(0.001, v))
  let os = 'windows'
  function update(T, amb, osPick) {
    sample(T)
    os = osPick
    const t = amb
    // pilot zone
    const flowOn = Math.max(ch('flow'), ch('live'), ch('ingest'))
    drone.position.y = 3.4 + 0.07 * Math.sin(t * 1.3)
    drone.rotation.z = 0.03 * Math.sin(t * 0.9)
    props.forEach((p, i) => { p.rotation.y = i + t * (14 + 10 * flowOn) })
    D.link.update(Math.max(ch('flow'), ch('live')), (t * 0.25) % 1)
    const offline = ch('dOffline')
    remoteLed.emissive.set(offline > 0.5 ? COL.red : flowOn > 0.5 ? COL.green : COL.sky)
    remoteScreen.material.map = offline > 0.5 ? T_.idle : T_.video

    // server rack
    const e = ease(clamp01(ch('explode')))
    rack.layers.forEach((l, i) => {
      const b = l.g.userData.base
      l.g.position.set(b.x, mix(b.y, 0.55 + i * 0.64, e), mix(b.z, 1.85, e))
      l.g.rotation.y = mix(0, -0.32, e)
      l.led.emissiveIntensity = 1.2 + (i === 3 ? 2.2 * ch('source') : 0)
    })
    const pick = ch('osPick')
    setScale(osWin, pick * (os === 'windows' ? 1.2 : 0.75))
    setScale(osLin, pick * (os === 'linux' ? 1.2 : 0.75))
    winMat.emissiveIntensity = os === 'windows' ? 2.2 : 0.05
    linMat.emissiveIntensity = os === 'linux' ? 2.2 : 0.05
    osChipAnchor.position.set(os === 'windows' ? -1.05 : -1.62, 0.32, 0.3)
    const verified = ch('verified'), dPort = ch('dPort')
    rack.statusMat.emissive.set(dPort > 0.5 ? COL.red : verified > 0.5 ? 0x334155 : ch('live') > 0.5 || ch('ok') > 0.5 ? COL.green : COL.cyan)
    rack.statusMat.emissiveIntensity = verified > 0.5 ? 0.4 : 1.6
    rack.screen.material.map = ch('clear') > 0.5 ? T_.video : T_.rack
    sockets.forEach((m, i) => m.emissive.set(i === 1 && dPort > 0.5 ? COL.red : COL.green))
    trustMat.opacity = 0.07 * ch('trust')
    trustRing.material.opacity = 0.8 * ch('trust')
    setScale(scanRing, ch('scan'))
    scanRing.position.y = 1.2 + 0.85 * Math.sin(t * 1.6)
    setScale(tlsKey, ch('tlsKey'))
    tlsKey.rotation.y = t * 0.8
    setScale(egressLock, ch('egressLock'))
    egressLock.rotation.y = 0.4 * Math.sin(t * 0.7)

    // beams
    const phase = t * 0.16 + T * 0.9
    const dim = 1 - 0.7 * ch('dim')
    B.ingest.update(Math.max(ch('ingest'), ch('flow'), 0.5 * offline) * dim, phase, offline > 0.5 ? 0.3 : 1, 1, offline < 0.5)
    B.ingest.color(COL.red, offline)
    vpnMat.opacity = 0.16 * ch('vpn')
    vpn.visible = ch('vpn') > 0.004
    const cut = ch('cut'), dUdp = ch('dUdp')
    B.egressL.update(Math.max(ch('egress'), ch('flow'), cut, dUdp) * dim, phase, 1 - 0.53 * Math.max(cut, dUdp), 1, Math.max(cut, dUdp) < 0.5)
    B.egressL.color(COL.red, Math.max(cut, dUdp))
    B.egressP.update(Math.max(ch('egress'), ch('flow')) * (1 - ch('phoneOut')) * dim, phase + 0.3, 1, 1)
    const login = ch('login')
    B.pageL.update(Math.max(login, dUdp, ch('dCert')), phase + 0.1, 1, login > 0.5 ? -1 : 1)
    B.admin.update(Math.max(ch('source'), ch('approve'), ch('revoke')), phase, 1, 1)
    B.admin.color(COL.red, ch('revoke'))
    B.https.update(ch('https') * ch('phoneOut'), phase, 1, -1)
    B.udp.update(ch('udp') * ch('phoneOut'), phase + 0.5, 1, 1)
    D.turn.update(ch('turn'), (t * 0.05) % 1)
    D.dns.update(ch('domain'), 0)
    D.key.update(ch('key') * 0.8, 0)
    D.planned.update(ch('planned'), 0)
    D.bak.update(Math.max(ch('bakMake'), ch('bakTravel')) * (1 - ch('verified')) * 0.8, (t * 0.04) % 1)

    // network
    const lan = ch('lan')
    lanMat.opacity = 0.9 * lan
    lanFill.opacity = 0.05 * lan
    setScale(routerP, ch('nat'))
    setScale(fw, ch('nat'))
    setScale(globe, ch('globe'))
    globe.rotation.y = t * 0.12
    setScale(domain, ch('domain'))
    const po = ease(clamp01(ch('phoneOut')))
    phoneP.position.lerpVectors(phonePos.a, phonePos.b, po)
    phoneScreen.material.map = Math.max(ch('egress'), ch('flow'), ch('udp')) > 0.5 ? T_.video : T_.idle

    // admin desk
    const revoke = ch('revoke'), approve = ch('approve')
    const ringC = revoke > 0.5 ? COL.red : approve > 0.5 ? COL.green : COL.cyan
    deskRingMat.color.set(ringC)
    deskRingMat.opacity = 0.9 * Math.max(revoke, approve, ch('source'), ch('code'))
    frameGlow.color.set(ringC)
    frameGlow.opacity = 0.9 * Math.max(revoke, approve, ch('code'))
    setScale(adminCode, ch('code'))
    setScale(lapCode, ch('code'))

    // viewer screen: one texture chosen by priority (discrete, so it is exact for a given T)
    const playing = Math.max(ch('egress'), ch('flow'), ch('live'))
    lapScreen.material.map = ch('dLimit') > 0.5 ? T_.grid : cut > 0.5 ? T_.error : ch('waiting') > 0.5 ? T_.waiting : playing > 0.5 && dUdp < 0.5 ? T_.video : T_.idle

    // tokens
    const kt = ease(clamp01(ch('keyTravel')))
    PATH.key.getPointAt(kt, keyObj.position)
    keyObj.rotation.set(0.3, t * 1.2, 0.2)
    setScale(keyObj, ch('key') * 1.4)
    const g1 = ch('guestTravel'), rq = ch('request')
    const rv = Math.max(g1, rq)
    PATH.req.getPointAt(ease(clamp01(rv)), reqObj.position)
    reqObj.rotation.y = 0.4 + t * 0.6
    setScale(reqObj, rv > 0.01 ? Math.min(1, rv * 5) : 0)
    const bt = ch('blockB')
    PATH.tablet.getPointAt(ease(clamp01(bt * 1.7)) * 0.97, tabReq.position)
    setScale(tabReq, bt > 0.01 ? Math.min(1, bt * 5) : 0)
    const bm = Math.max(ch('bakMake'), ch('bakTravel'))
    PATH.bak.getPointAt(ease(clamp01(ch('bakTravel'))), bak.position)
    bak.position.y += 0.15
    bak.rotation.y = t * 0.5
    setScale(bak, bm * (1 - verified))

    // session, approval, link, tablet
    setScale(session, ch('session'))
    session.rotation.y = t * 0.7
    session.position.y = 2.35 + 0.05 * Math.sin(t * 1.4)
    setScale(rights, ch('rights'))
    setScale(qr, ch('invite'))
    qr.position.y = 1.85 + 0.04 * Math.sin(t * 1.1)
    setScale(invite, ch('invite'))
    setScale(tabP, ch('browserB'))
    const rej = ch('reject')
    const sh = Math.max(rej, clamp01((bt - 0.45) * 6))
    setScale(shield, sh)
    shield.rotation.z = t * 0.4
    setScale(cutMark, cut)
    rejects.forEach((s, i) => {
      s.visible = rej > 0.05
      if (!s.visible) return
      const u = (t * 0.45 + i / 3) % 1
      const k = 1 - Math.abs(1 - 2 * u)
      PATH.egressL.getPointAt(mix(0.98, 0.3, k), s.position)
      s.scale.setScalar(rej)
    })

    // content
    const tl = ch('tiles'), gr = ease(clamp01(ch('group')))
    tiles.forEach((tile, i) => {
      tile.position.lerpVectors(tilePos.a[i], tilePos.b[i], gr)
      tile.rotation.set(0, mix(-0.4 + 0.25 * Math.sin(i * 2.1), 0, gr), mix(0.12 * Math.sin(i * 3.3), 0, gr))
      tile.position.y += (1 - gr) * 0.05 * Math.sin(t * 1.1 + i)
      setScale(tile, tl * mix(1, 0.92, gr))
    })
    setScale(group, ch('group'))

    // backup target
    const n2v = ch('n2')
    setScale(n2.g, n2v)
    n2.statusMat.emissive.set(verified > 0.5 ? COL.green : ch('standby') > 0.5 ? COL.amber : COL.cyan)
    n2.statusMat.emissiveIntensity = 1.6 + (ch('restore') > 0.5 && verified < 0.5 ? 0.8 * Math.sin(t * 4) : 0)
    n2.layers.forEach((l, i) => { l.led.emissiveIntensity = verified > 0.5 ? 1.4 : ch('restore') > 0.5 ? 0.8 + 0.6 * ((i + Math.floor(t * 3)) % 5 === 0 ? 1 : 0) : 0.15 })

    // planned (static, never animated as if it worked)
    setScale(gateway, ch('planned'))

    // diagnostics
    const beacons = [[beacon.udp, dUdp], [beacon.port, dPort], [beacon.cert, ch('dCert')], [beacon.offline, offline], [beacon.limit, ch('dLimit')]]
    for (const [b, v] of beacons) {
      setScale(b, v)
      b.userData.core.rotation.y = t * 1.5
      b.userData.core.position.y = 0.5 + 0.06 * Math.sin(t * 2.2)
    }
    setScale(certLock, ch('dCert'))
    certLock.rotation.y = t * 0.6

    rings.rotation.y = t * 0.01
    placeCamera()
  }

  // ---------- projection of label anchors ----------
  const _v = V(0, 0, 0)
  function project(name, out) {
    const o = anchors[name]
    if (!o) return false
    o.updateWorldMatrix(true, false)
    _v.setFromMatrixPosition(o.matrixWorld)
    const camSpace = _v.clone().applyMatrix4(camera.matrixWorldInverse)
    out.behind = camSpace.z > -camera.near
    _v.project(camera)
    out.x = ((_v.x + 1) / 2) * W
    out.y = ((1 - _v.y) / 2) * H
    // an anchor on an object that is scaled away is not shown
    let p = o, s = 1
    while (p && p !== scene) { s *= p.scale.x; p = p.parent }
    out.hidden = s < 0.2
    return true
  }

  function render() {
    renderer.render(scene, camera)
  }
  function setShadows(on) {
    renderer.shadowMap.enabled = on && !light
    scene.traverse((o) => { if (o.material) o.material.needsUpdate = true })
  }
  function dispose() {
    const mats = new Set(), geos = new Set()
    scene.traverse((o) => {
      if (o.geometry) geos.add(o.geometry)
      if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => mats.add(m))
    })
    geos.forEach((g) => g.dispose())
    mats.forEach((m) => m.dispose())
    textures.forEach((t) => t.dispose())
    envRT.dispose()
    pmrem.dispose()
    renderer.dispose()
    try { renderer.forceContextLoss() } catch (e) { /* already lost */ }
  }
  return { update, render, resize, setFree, project, dispose, setShadows, renderer, info: renderer.info }
}
