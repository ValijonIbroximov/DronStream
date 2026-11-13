// Shared vocabulary of the 3D guide: camera presets, state channels and label anchors.
// guide/build.mjs imports this file to validate guide/src/scenes.json; scene3d.js uses it at runtime.
// Plain data only (no imports), so Node can load it without three.js or a DOM.

// Camera presets: [targetX, targetY, targetZ, distance, azimuth, elevation] (radians; azimuth 0 = looking from +Z).
// World layout: pilot zone at -X, server at the origin, admin desk at -Z/+X, viewers at +X, internet beyond +X.
export const CAMS = {
  overview: [1.4, 1.2, 0.4, 32, 0.32, 0.42],
  flow: [1.0, 1.5, 0.8, 29, 0.22, 0.3],
  sec_ingest: [-4.4, 1.9, 1.0, 17, -0.1, 0.25],
  sec_server: [0, 1.5, 0.3, 10.5, 0.42, 0.2],
  sec_egress: [4.6, 1.4, 1.5, 17, 0.2, 0.28],
  sec_plan: [0.2, 1.6, 2.0, 25, 0.04, 0.4],
  inst_rack: [0, 1.25, 0, 7.6, 0.55, 0.17],
  inst_layers: [0.2, 2.0, 1.2, 10, 0.62, 0.12],
  inst_os: [-0.4, 1.5, 1.6, 9.5, -0.12, 0.2],
  net_lan: [3.8, 0.3, 0.3, 25, 0.0, 0.82],
  net_nat: [13.5, 1.5, 0.6, 15, 0.5, 0.3],
  net_https: [9.2, 1.4, 1.0, 29, 0.12, 0.38],
  net_udp: [9.2, 1.4, 1.0, 29, -0.1, 0.34],
  net_dns: [14.2, 2.2, 0.4, 13, 0.25, 0.2],
  pult_create: [2.4, 1.3, -2.6, 13, 0.72, 0.3],
  pult_key: [-1.2, 2.0, -1.0, 21, 0.18, 0.46],
  pult_check: [-3.4, 1.7, 0.8, 15, -0.2, 0.25],
  pult_live: [-0.6, 1.8, 0.8, 28, -0.04, 0.3],
  acc_login: [3.8, 1.4, 0.8, 15, 0.3, 0.28],
  acc_approve: [4.0, 1.3, -1.4, 18, 0.45, 0.42],
  acc_session: [7.4, 1.3, 1.6, 7.6, 0.38, 0.22],
  acc_rights: [6.6, 1.8, 1.4, 9.5, 0.1, 0.24],
  link_invite: [7.6, 1.5, 2.0, 8.5, 0.15, 0.2],
  link_request: [4.0, 1.3, -1.2, 19, 0.4, 0.45],
  link_approve: [5.4, 1.2, -1.2, 18, 0.25, 0.55],
  link_copy: [4.6, 1.3, 2.6, 15, 0.05, 0.42],
  content_types: [2.7, 2.4, 1.6, 8.6, 0.28, 0.12],
  content_group: [3.4, 2.1, 1.5, 9.6, -0.18, 0.18],
  rev_play: [4.2, 1.4, 0.8, 16, 0.25, 0.28],
  rev_admin: [4.2, 1.4, -1.6, 17, 0.5, 0.4],
  rev_cut: [4.2, 1.3, 0.8, 15, 0.1, 0.26],
  rev_reject: [3.8, 1.4, 0.9, 13, -0.1, 0.22],
  bak_file: [-0.8, 1.3, -1.6, 10, 0.2, 0.3],
  bak_new: [-2.4, 1.4, -3.8, 17, 0.9, 0.33],
  bak_verify: [-2.4, 1.4, -3.8, 17, 0.7, 0.33],
  diag_udp: [3.9, 1.4, 0.9, 13, 0.3, 0.3],
  diag_port: [1.1, 1.1, 0.1, 6.5, 1.0, 0.2],
  diag_cert: [5.8, 1.5, 1.1, 8, 0.25, 0.22],
  diag_offline: [-6.8, 2.0, 1.6, 10, -0.2, 0.24],
  diag_limit: [7.4, 1.15, 1.5, 5.5, -0.4, 0.16],
  final: [2.2, 1.2, 0.4, 34, 0.3, 0.46],
  final_go: [1.6, 1.3, 0.6, 31, 0.18, 0.36],
}

// State channels (0..1). A beat lists the channels that are on; "name~" ramps 0 -> 1 across the beat.
export const STATES = [
  'flow', 'ingest', 'vpn', 'trust', 'clear', 'tlsKey', 'egress', 'egressLock', 'planned', 'dim',
  'explode', 'osPick', 'lan', 'nat', 'globe', 'phoneOut', 'https', 'udp', 'turn', 'domain',
  'source', 'key', 'keyTravel', 'scan', 'live', 'login', 'guestTravel', 'approve', 'session', 'rights',
  'invite', 'request', 'waiting', 'code', 'browserB', 'blockB', 'tiles', 'group', 'revoke', 'cut',
  'reject', 'bakMake', 'bakTravel', 'n2', 'restore', 'standby', 'verified', 'dUdp', 'dPort', 'dCert',
  'dOffline', 'dLimit', 'checks', 'ok',
]

// Points that HTML callouts can be attached to.
export const ANCHORS = [
  'drone', 'remote', 'server', 'rackTop', 'rackSide', 'serverScreen', 'portPanel', 'admin', 'adminScreen', 'laptop',
  'laptopScreen', 'phone', 'tablet', 'ingestMid', 'egressMid', 'vpnTag', 'trust', 'tlsKey', 'egressLock', 'gateway',
  'plannedMid', 'L0', 'L1', 'L2', 'L3', 'L4', 'osChip', 'lanTag', 'router', 'fw', 'globe', 'httpsMid', 'udpMid',
  'turnMid', 'domain', 'slot', 'key', 'scan', 'req', 'session', 'rightsOk', 'rightsNo', 'qr', 'envelope', 'shield',
  'tStream', 'tText', 'tImage', 'tVideo', 'group', 'cutMark', 'bak', 'n2', 'certMark', 'pageMid', 'videoCut',
]
