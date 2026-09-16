#!/usr/bin/env python3
import http.server
import socketserver
import json
import os
import sys
import uuid
import time
import urllib.parse
from datetime import datetime

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
LEADERBOARD_FILE = os.path.join(BASE_DIR, "leaderboard.json")

# In-memory WebRTC signaling rooms:
# room_code -> { "created": timestamp, "host_msgs": [], "guest_msgs": [] }
ROOMS = {}

def clean_old_rooms():
    now = time.time()
    for code in list(ROOMS.keys()):
        if now - ROOMS[code].get("created", 0) > 3600:
            ROOMS.pop(code, None)

class CustomHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=BASE_DIR, **kwargs)

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(200)
        self.end_headers()

    def do_GET(self):
        parsed_path = self.path.split("?")[0]

        # Leaderboard endpoint
        if parsed_path == "/api/leaderboard":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            if os.path.exists(LEADERBOARD_FILE):
                with open(LEADERBOARD_FILE, "rb") as f:
                    self.wfile.write(f.read())
            else:
                self.wfile.write(b"[]")
            return

        # Signaling backend health check
        if parsed_path == "/api/signal/status":
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            self.wfile.write(b'{"status":"ok","backend":"native"}')
            return

        # Signaling poll endpoint (long-polling / retrieval)
        if parsed_path == "/api/signal/poll":
            query = self.path.split("?")[1] if "?" in self.path else ""
            params = dict(urllib.parse.parse_qsl(query))
            room = params.get("room", "").upper()
            role = params.get("role", "").lower()

            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.end_headers()

            if room in ROOMS:
                key = "host_msgs" if role == "host" else "guest_msgs"
                msgs = list(ROOMS[room].get(key, []))
                ROOMS[room][key] = []
                self.wfile.write(json.dumps({"status": "ok", "messages": msgs}).encode("utf-8"))
            else:
                self.wfile.write(b'{"status":"error","error":"ROOM_NOT_FOUND","messages":[]}')
            return

        # Fallback to SPA index.html for unknown HTML paths
        if not os.path.exists(os.path.join(BASE_DIR, parsed_path.lstrip("/"))) and not parsed_path.startswith("/assets"):
            self.path = "/index.html"

        return super().do_GET()

    def do_POST(self):
        parsed_path = self.path.split("?")[0]

        # WebRTC Signal: Host creates a room
        if parsed_path == "/api/signal/create":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                room = data.get("room", "").upper()
                clean_old_rooms()
                ROOMS[room] = {
                    "created": time.time(),
                    "host_msgs": [],
                    "guest_msgs": []
                }
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "room": room}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # WebRTC Signal: Guest joins a room
        if parsed_path == "/api/signal/join":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                room = data.get("room", "").upper()
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()

                if room in ROOMS:
                    ROOMS[room]["host_msgs"].append({"type": "GUEST_JOINED"})
                    self.wfile.write(json.dumps({"status": "ok", "room": room}).encode("utf-8"))
                else:
                    self.wfile.write(json.dumps({"status": "error", "error": "ROOM_NOT_FOUND"}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # WebRTC Signal: Send message (Offer / Answer / Candidate)
        if parsed_path == "/api/signal/send":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                room = data.get("room", "").upper()
                target = data.get("target", "").lower()
                msg = data.get("message")

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()

                if room in ROOMS:
                    key = "host_msgs" if target == "host" else "guest_msgs"
                    ROOMS[room][key].append(msg)
                    self.wfile.write(b'{"status":"ok"}')
                else:
                    self.wfile.write(b'{"status":"error","error":"ROOM_NOT_FOUND"}')
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        # Player score update
        if parsed_path == "/api/players/score":
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length)
            try:
                data = json.loads(body.decode("utf-8")) if body else {}
                player_id = data.get("playerId") or str(uuid.uuid4())
                player_name = data.get("name") or "Player"
                delta = int(data.get("delta", 0))

                leaderboard = []
                if os.path.exists(LEADERBOARD_FILE):
                    try:
                        with open(LEADERBOARD_FILE, "r", encoding="utf-8") as f:
                            leaderboard = json.load(f)
                    except Exception:
                        leaderboard = []

                # Find existing entry or add new
                found = False
                for entry in leaderboard:
                    if entry.get("id") == player_id or entry.get("name") == player_name:
                        entry["score"] = entry.get("score", 0) + delta
                        entry["name"] = player_name
                        entry["updatedAt"] = datetime.utcnow().isoformat() + "Z"
                        found = True
                        break

                if not found:
                    leaderboard.append({
                        "id": player_id,
                        "name": player_name,
                        "score": delta,
                        "updatedAt": datetime.utcnow().isoformat() + "Z"
                    })

                # Sort by score descending
                leaderboard.sort(key=lambda x: x.get("score", 0), reverse=True)

                with open(LEADERBOARD_FILE, "w", encoding="utf-8") as f:
                    json.dump(leaderboard, f, indent=2)

                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"status": "ok", "jazzuoStatus": "ok"}).encode("utf-8"))
            except Exception as e:
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": str(e)}).encode("utf-8"))
            return

        return super().do_GET()

if __name__ == "__main__":
    with socketserver.TCPServer(("", PORT), CustomHandler) as httpd:
        print(f"=================================================")
        print(f" Peek-a-Boo Shooter Clone Server")
        print(f" Local URL:    http://localhost:{PORT}")
        print(f" Document Root: {BASE_DIR}")
        print(f" WebRTC Signal: Active at /api/signal/*")
        print(f"=================================================")
        try:
            httpd.serve_forever()
        except KeyboardInterrupt:
            print("\nServer stopped.")
