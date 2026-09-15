// Cloudflare Pages Function: GET /api/leaderboard (Runs 100% in Cloudflare V8 Edge, 0 Python)
export async function onRequestGet({ env }) {
  if (env && env.LEADERBOARD_KV) {
    try {
      const data = await env.LEADERBOARD_KV.get("leaderboard", { type: "json" });
      if (data) {
        return new Response(JSON.stringify(data), {
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      }
    } catch (e) {}
  }

  // Default seeded scores
  const defaultScores = [
    { id: "1", name: "daddy", score: 4110, updatedAt: new Date().toISOString() },
    { id: "2", name: "drunken_TROOPer_CZ", score: 3290, updatedAt: new Date().toISOString() },
    { id: "3", name: "Noli", score: 3090, updatedAt: new Date().toISOString() },
    { id: "4", name: "DarvX92", score: 1410, updatedAt: new Date().toISOString() },
    { id: "5", name: "Kadin", score: 1090, updatedAt: new Date().toISOString() },
    { id: "6", name: "mut", score: 1000, updatedAt: new Date().toISOString() }
  ];

  return new Response(JSON.stringify(defaultScores), {
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*"
    }
  });
}
