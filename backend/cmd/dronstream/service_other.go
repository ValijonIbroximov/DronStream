//go:build !windows

package main

func isService() bool             { return false }
func runService(root string) error { return nil }
