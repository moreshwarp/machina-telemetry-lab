"""
Machina Telemetry Lab - High-Performance Web Server
Zero external dependencies. Runs on pure Python 3 standard library.
Serves real-time telemetry APIs and responsive laboratory web interface.
"""

import argparse
import http.server
import json
import os
import socket
import socketserver
import sys
import threading
import time
import webbrowser

# Add backend directory to module path
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_DIR = os.path.dirname(CURRENT_DIR)
FRONTEND_DIR = os.path.join(PROJECT_DIR, "frontend")
ARTICLES_DIR = os.path.join(PROJECT_DIR, "articles")

sys.path.insert(0, CURRENT_DIR)
from collector import SystemTelemetryCollector
from theory import RESEARCHER_THEORY

collector = SystemTelemetryCollector()

def get_articles_data():
    """Reads all markdown articles and returns structured JSON."""
    articles = []
    if os.path.exists(ARTICLES_DIR):
        for fname in sorted(os.listdir(ARTICLES_DIR)):
            if fname.endswith(".md"):
                fpath = os.path.join(ARTICLES_DIR, fname)
                with open(fpath, "r", encoding="utf-8") as f:
                    content = f.read()
                # Parse title from first line
                first_line = content.split("\n")[0].replace("#", "").strip()
                articles.append({
                    "id": fname.replace(".md", ""),
                    "filename": fname,
                    "title": first_line,
                    "content": content
                })
    return articles

class TelemetryRequestHandler(http.server.SimpleHTTPRequestHandler):
    """Handles REST API queries and serves frontend laboratory assets."""

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def do_GET(self):
        # Strip query parameters if present
        clean_path = self.path.split("?")[0]

        if clean_path == "/api/specs":
            self._send_json(collector.get_static_specs())
        elif clean_path == "/api/telemetry":
            self._send_json(collector.get_full_telemetry())
        elif clean_path == "/api/theory":
            self._send_json(RESEARCHER_THEORY)
        elif clean_path == "/api/articles":
            self._send_json(get_articles_data())
        elif clean_path == "/api/snapshot":
            snapshot = {
                "experiment": "Machina System Telemetry Lab",
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime()),
                "collector_version": "1.0-researcher",
                "telemetry": collector.get_full_telemetry(),
                "theory": RESEARCHER_THEORY
            }
            self._send_json(snapshot)
        elif clean_path == "/" or clean_path == "":
            self.path = "/index.html"
            super().do_GET()
        else:
            # Fall back to serving static frontend files
            super().do_GET()

    def _send_json(self, data, status_code=200):
        body = json.dumps(data, indent=2).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, format, *args):
        # Keep server log clean; suppress noisy 200 OK polling logs
        if "GET /api/telemetry" in format % args:
            return
        super().log_message(format, *args)


def find_available_port(start_port=8080, max_attempts=50):
    """Finds an unused TCP port to ensure guaranteed binding."""
    for port in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind(("127.0.0.1", port))
                return port
            except OSError:
                continue
    return start_port


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


def start_server(port=8080, open_browser=True):
    port = find_available_port(port)
    server_address = ("127.0.0.1", port)
    httpd = ReusableTCPServer(server_address, TelemetryRequestHandler)
    url = f"http://localhost:{port}"

    print("=" * 65)
    print("🔬  MACHINA TELEMETRY LAB - RESEARCH MONITOR")
    print("=" * 65)
    print(f"🚀  Web Dashboard Live:  \033[1;32m{url}\033[0m")
    print(f"📡  REST API Endpoint:    \033[1;34m{url}/api/telemetry\033[0m")
    print(f"🧠  Theoretical Library:  \033[1;35m{url}/api/theory\033[0m")
    print(f"📂  Serving Frontend:     {FRONTEND_DIR}")
    print("=" * 65)
    print("💡  Press [Ctrl + C] anytime to stop the server safely.")
    print("=" * 65)

    if open_browser:
        def _open():
            time.sleep(0.5)
            try:
                webbrowser.open(url)
            except Exception:
                pass
        threading.Thread(target=_open, daemon=True).start()

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑  Server stopped gracefully. Goodbye! 🤖✨")
        httpd.server_close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Machina Telemetry Lab Server")
    parser.add_argument("--port", type=int, default=8080, help="Port to listen on")
    parser.add_argument("--no-browser", action="store_true", help="Do not auto-open browser")
    args = parser.parse_args()

    start_server(port=args.port, open_browser=not args.no_browser)
