#!/usr/bin/env python3
"""Packet-capture check (CI, Linux loopback): is the video visible on the wire?

Usage: python3 tests/ci/pcap-check.py <capture.pcap>

The capture is taken while the integration tests run (real MediaMTX, WebRTC viewers,
FFmpeg RTMP publishers). Two kinds of traffic are examined:

  * WebRTC media (UDP 18189): must be SRTP. The demo stream's H.264 SPS bytes and the
    x264 SEI text are present in every clear-text keyframe; they must NOT appear.
  * Plain RTMP ingest (TCP 11935): expected to be READABLE. The check reports whether the
    stream path and the publish key appear in clear text - this documents the known risk of
    plain RTMP (it is why secure mode refuses it on public interfaces).

This is supporting evidence only, never the sole proof of security: it shows encryption is
present on one path, not that keys are handled correctly.
Standard library only.
"""
import struct
import sys

SPS = bytes.fromhex("6742c01fda0280bfe5c044")  # demo_a.h264 SPS NAL (header + start)
X264 = b"x264 - core"


def packets(path):
    with open(path, "rb") as f:
        data = f.read()
    magic = data[:4]
    if magic in (b"\xd4\xc3\xb2\xa1", b"\x4d\x3c\xb2\xa1"):
        e = "<"
    elif magic in (b"\xa1\xb2\xc3\xd4", b"\xa1\xb2\x3c\x4d"):
        e = ">"
    else:
        raise SystemExit("not a pcap file (pcapng is not supported; use tcpdump -w)")
    linktype = struct.unpack(e + "I", data[20:24])[0]
    off = 24
    while off + 16 <= len(data):
        incl = struct.unpack(e + "I", data[off + 8:off + 12])[0]
        frame = data[off + 16:off + 16 + incl]
        off += 16 + incl
        if linktype == 1:  # Ethernet (Linux loopback)
            if len(frame) < 14 or frame[12:14] != b"\x08\x00":
                continue
            ip = frame[14:]
        elif linktype == 113:  # Linux cooked v1
            if frame[14:16] != b"\x08\x00":
                continue
            ip = frame[16:]
        elif linktype in (0, 108):  # BSD loopback
            ip = frame[4:]
        else:
            continue
        if len(ip) < 20 or ip[0] >> 4 != 4:
            continue
        ihl = (ip[0] & 15) * 4
        proto = ip[9]
        seg = ip[ihl:]
        if proto == 17 and len(seg) >= 8:
            sport, dport = struct.unpack(">HH", seg[:4])
            yield "udp", sport, dport, seg[8:]
        elif proto == 6 and len(seg) >= 20:
            sport, dport = struct.unpack(">HH", seg[:4])
            doff = (seg[12] >> 4) * 4
            yield "tcp", sport, dport, seg[doff:]


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    udp_n = rtp_n = udp_leak = 0
    rtmp = bytearray()
    for proto, sp, dp, payload in packets(sys.argv[1]):
        if proto == "udp" and 18189 in (sp, dp):
            udp_n += 1
            if len(payload) >= 12 and payload[0] >> 6 == 2:  # RTP/RTCP version 2 (SRTP keeps the header clear)
                rtp_n += 1
            if SPS in payload or X264 in payload:
                udp_leak += 1
        elif proto == "tcp" and 11935 in (sp, dp):
            rtmp += payload
    rtmp_clear = b"publish" in rtmp and b"live/" in rtmp
    rtmp_key = b"key=" in rtmp
    print(f"WebRTC UDP packets: {udp_n} (RTP/SRTP-shaped: {rtp_n}); packets with clear H.264 SPS/x264 SEI: {udp_leak}")
    print(f"Plain RTMP bytes captured: {len(rtmp)}; publish command readable: {rtmp_clear}; key readable: {rtmp_key}")
    ok = True
    if udp_n < 200:
        print("::error title=pcap::too few WebRTC packets captured - the check did not observe media")
        ok = False
    if udp_leak:
        print(f"::error title=pcap::{udp_leak} WebRTC packets contain clear H.264 data")
        ok = False
    print(f"::notice title=pcap (WebRTC)::{udp_n} UDP paket ushlandi, ochiq H.264 belgisi: {udp_leak}")
    print(f"::notice title=pcap (oddiy RTMP)::publish buyrug'i ochiq: {rtmp_clear}, kalit ochiq: {rtmp_key} (kutilgan xavf: oddiy RTMP shifrlanmaydi)")
    sys.exit(0 if ok else 1)


if __name__ == "__main__":
    main()
