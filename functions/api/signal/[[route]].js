// Cloudflare Pages Function: /api/signal/*
// Provides WebRTC signaling at the edge

const ROOMS = new Map();

export async function onRequest({ request }) {
  const url = new URL(request.url);
  const path = url.pathname;

  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json"
  };

  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Status check
  if (path === "/api/signal/status") {
    return new Response(JSON.stringify({ status: "ok", backend: "cloudflare-edge" }), { headers: corsHeaders });
  }

  // Poll
  if (path === "/api/signal/poll" && request.method === "GET") {
    const room = (url.searchParams.get("room") || "").toUpperCase();
    const role = (url.searchParams.get("role") || "").toLowerCase();

    if (ROOMS.has(room)) {
      const roomData = ROOMS.get(room);
      const key = role === "host" ? "host_msgs" : "guest_msgs";
      const msgs = [...roomData[key]];
      roomData[key] = [];
      return new Response(JSON.stringify({ status: "ok", messages: msgs }), { headers: corsHeaders });
    }
    return new Response(JSON.stringify({ status: "error", error: "ROOM_NOT_FOUND", messages: [] }), { headers: corsHeaders });
  }

  // POST endpoints
  if (request.method === "POST") {
    let body = {};
    try {
      body = await request.json();
    } catch (e) {}

    if (path === "/api/signal/create") {
      const room = (body.room || "").toUpperCase();
      ROOMS.set(room, {
        created: Date.now(),
        host_msgs: [],
        guest_msgs: []
      });
      return new Response(JSON.stringify({ status: "ok", room: room }), { headers: corsHeaders });
    }

    if (path === "/api/signal/join") {
      const room = (body.room || "").toUpperCase();
      if (ROOMS.has(room)) {
        ROOMS.get(room).host_msgs.push({ type: "GUEST_JOINED" });
        return new Response(JSON.stringify({ status: "ok", room: room }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ status: "error", error: "ROOM_NOT_FOUND" }), { headers: corsHeaders });
    }

    if (path === "/api/signal/send") {
      const room = (body.room || "").toUpperCase();
      const target = (body.target || "").toLowerCase();
      const msg = body.message;

      if (ROOMS.has(room)) {
        const key = target === "host" ? "host_msgs" : "guest_msgs";
        ROOMS.get(room)[key].push(msg);
        return new Response(JSON.stringify({ status: "ok" }), { headers: corsHeaders });
      }
      return new Response(JSON.stringify({ status: "error", error: "ROOM_NOT_FOUND" }), { headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: "Not Found" }), { status: 404, headers: corsHeaders });
}
