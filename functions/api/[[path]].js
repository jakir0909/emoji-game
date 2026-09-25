export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);
  const path = url.pathname.replace('/api/', '');
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json; charset=utf-8'
  };

  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

  try {
    if (path === 'save-score' && request.method === 'POST') {
      const body = await request.json();
      const { uid, name, emoji, picture, score, correct, total } = body;
      if (!uid || typeof score !== 'number' || score < 0 || score > 100000) {
        return json({ error: 'invalid' }, 400, cors);
      }
      const safeName = String(name || 'à¦–à§‡à¦²à§‹à¦¯à¦¼à¦¾à¦¡à¦¼').slice(0, 20);
      const safeEmoji = String(emoji || 'ðŸ˜Ž').slice(0, 8);
      const safePic = picture ? String(picture).slice(0, 500) : null;
      const now = Date.now();
      const day = new Date().toISOString().slice(0, 10);

      await env.DB.prepare(
        `INSERT INTO scores (uid, name, emoji, picture, score, correct, total, day, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(uid, safeName, safeEmoji, safePic, Math.floor(score), correct | 0, total | 0, day, now).run();

      return json({ success: true }, 200, cors);
    }

    if (path === 'leaderboard' && request.method === 'GET') {
      const tab = url.searchParams.get('tab') || 'all';
      const now = Date.now();
      let where = '';
      if (tab === 'today') {
        const day = new Date().toISOString().slice(0, 10);
        where = `WHERE day = '${day}'`;
      } else if (tab === 'week') {
        const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
        where = `WHERE created_at >= ${weekAgo}`;
      }
      const q = `SELECT uid, name, emoji, picture, MAX(score) as score
                 FROM scores ${where}
                 GROUP BY uid ORDER BY score DESC LIMIT 20`;
      const { results } = await env.DB.prepare(q).all();
      return json({ scores: results || [] }, 200, cors);
    }

    return json({ error: 'not found' }, 404, cors);
  } catch (err) {
    return json({ error: 'server', message: String(err) }, 500, cors);
  }
}

function json(obj, status = 200, headers = {}) {
  return new Response(JSON.stringify(obj), { status, headers });
}
