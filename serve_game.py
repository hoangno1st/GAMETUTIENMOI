from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import os
import webbrowser
import time


PORT = 8000
ROOT = Path(__file__).resolve().parent


class NoCacheHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        if "If-Modified-Since" in self.headers:
            del self.headers["If-Modified-Since"]
        if "If-None-Match" in self.headers:
            del self.headers["If-None-Match"]
        return super().send_head()

    def end_headers(self):
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()


if __name__ == "__main__":
    os.chdir(ROOT)
    try:
        server = ThreadingHTTPServer(("127.0.0.1", PORT), NoCacheHandler)
    except OSError:
        print("Port 8000 is still used by an old game server.")
        print("Close the old server window, then run start-game.cmd again.")
        input("Press Enter to close...")
        raise SystemExit(1)
    print(f"Game server: http://127.0.0.1:{PORT}")
    print("Keep this window open while playing. Press Ctrl+C to stop.")
    webbrowser.open(f"http://localhost:{PORT}/?reload={int(time.time())}", new=2)
    server.serve_forever()
