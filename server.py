#!/usr/bin/env python3
"""Static server for the film with caching disabled.

Run:  python3 server.py [port]
The no-store headers mean every reload picks up file changes — the plain
`python3 -m http.server` lets browsers serve stale modules (macOS mtime
granularity makes Last-Modified revalidation unreliable for quick edits).
"""
import http.server
import socketserver
import sys

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8123


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def log_message(self, fmt, *args):
        sys.stderr.write(f"[odyssey] {fmt % args}\n")


with socketserver.TCPServer(("", PORT), NoCacheHandler) as httpd:
    print(f"serving odyssey on http://localhost:{PORT} (no cache)")
    httpd.serve_forever()
