const { kv } = require('@vercel/kv');

const PHOTO_PREFIX = 'oong_board_photo:';
const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BASE64_LENGTH = 900000;

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const id = req.query && req.query.id;
    if (typeof id !== 'string' || !ID_PATTERN.test(id)) {
      res.status(400).end();
      return;
    }
    const record = await kv.get(PHOTO_PREFIX + id);
    if (!record || !record.b64) {
      res.status(404).end();
      return;
    }
    res.setHeader('Content-Type', record.mime);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.status(200).send(Buffer.from(record.b64, 'base64'));
    return;
  }

  if (req.method === 'POST') {
    const { id, mime, b64 } = req.body || {};
    if (typeof id !== 'string' || !ID_PATTERN.test(id) || !MIME_TYPES.includes(mime)) {
      res.status(400).json({ error: 'invalid photo' });
      return;
    }
    if (typeof b64 !== 'string' || b64.length === 0 || b64.length > MAX_BASE64_LENGTH) {
      res.status(413).json({ error: 'photo too large' });
      return;
    }
    await kv.set(PHOTO_PREFIX + id, { mime, b64 });
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
