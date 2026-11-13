// Package turnsrv runs an optional built-in TURN relay (pion/turn) with
// time-limited HMAC credentials ("TURN REST API" scheme). The relay only
// forwards to this server's own addresses, so it cannot be abused as an open
// relay to third parties.
package turnsrv

import (
	"fmt"
	"log/slog"
	"net"

	"github.com/pion/turn/v5"
)

type Config struct {
	Listen   string
	PublicIP string
	Realm    string
	Secret   string
	MinPort  int
	MaxPort  int
}

type Server struct{ s *turn.Server }

func localIPs(public string) map[string]bool {
	ok := map[string]bool{}
	if public != "" {
		ok[public] = true
	}
	addrs, _ := net.InterfaceAddrs()
	for _, a := range addrs {
		if n, isNet := a.(*net.IPNet); isNet {
			ok[n.IP.String()] = true
		}
	}
	return ok
}

func Start(c Config, log *slog.Logger) (*Server, error) {
	ip := net.ParseIP(c.PublicIP)
	if ip == nil {
		return nil, fmt.Errorf("turn.public_ip must be set to the address browsers use to reach this server")
	}
	udp, err := net.ListenPacket("udp4", c.Listen)
	if err != nil {
		return nil, err
	}
	tcp, err := net.Listen("tcp4", c.Listen)
	if err != nil {
		udp.Close()
		return nil, err
	}
	allowed := localIPs(c.PublicIP)
	perm := func(_ net.Addr, peer net.IP) bool { return allowed[peer.String()] }
	gen := func() turn.RelayAddressGenerator {
		return &turn.RelayAddressGeneratorPortRange{RelayAddress: ip, Address: "0.0.0.0", MinPort: uint16(c.MinPort), MaxPort: uint16(c.MaxPort)}
	}
	s, err := turn.NewServer(turn.ServerConfig{
		Realm:             c.Realm,
		AuthHandler:       turn.LongTermTURNRESTAuthHandler(c.Secret, nil),
		PacketConnConfigs: []turn.PacketConnConfig{{PacketConn: udp, RelayAddressGenerator: gen(), PermissionHandler: perm}},
		ListenerConfigs:   []turn.ListenerConfig{{Listener: tcp, RelayAddressGenerator: gen(), PermissionHandler: perm}},
	})
	if err != nil {
		udp.Close()
		tcp.Close()
		return nil, err
	}
	log.Info("built-in TURN started", "listen", c.Listen, "public_ip", c.PublicIP, "relay_ports", fmt.Sprintf("%d-%d", c.MinPort, c.MaxPort))
	return &Server{s: s}, nil
}

func (s *Server) Close() error { return s.s.Close() }
