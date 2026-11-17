"""Static file server for the built dashboard (web/out) that tells browsers not to cache, so a rebuilt site and refreshed data always show up."""
import sys, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

class NoCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, max-age=0")
        super().end_headers()

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000; root = sys.argv[2] if len(sys.argv) > 2 else "out"
    ThreadingHTTPServer(("", port), functools.partial(NoCache, directory=root)).serve_forever()
