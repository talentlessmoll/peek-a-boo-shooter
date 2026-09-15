// Cloudflare Pages Function: POST /api/players/score (Runs 100% in Cloudflare V8 Edge, 0 Python)
export async function onRequestPost({ request, env }) {
  try {
    const body = await request.json();
    const playerId = body.playerId || crypto.randomUUID();
    const playerName = body.name || "Player";
    const delta = parseInt(body.delta || 0, 10);

    if (env && env.LEADERBOARD_KV) {
      let leaderboard = [];
      try {
        leaderboard = (await env.LEADERBOARD_KV.get("leaderboard", { type: "json" })) || [];
      } catch (e) {
        leaderboard = [];
      }

      let found = false;
      for (const entry of leaderboard) {
        if (entry.id === playerId || entry.name === playerName) {
          entry.score = (entry.score || 0) + delta;
          entry.name = playerName;
          entry.updatedAt = new Date().toISOString();
          found = true;
          break;
        }
      }

      if (!found) {
        leaderboard.push({
          id: playerId,
          name: playerName,
          score: delta,
          updatedAt: new Date().toISOString()
        });
      }

      leaderboard.sort((a, b) => (b.score || 0) - (a.score || 0));
      await env.LEADERBOARD_KV.put("leaderboard", JSON.stringify(leaderboard));
    }

    return new Response(JSON.stringify({ status: "ok", jazzuoStatus: "ok" }), {
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
}
