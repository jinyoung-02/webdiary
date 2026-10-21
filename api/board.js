const { kv } = require('@vercel/kv');

const POSTS_KEY = 'oong_board_posts';
const PHOTO_PREFIX = 'oong_board_photo:';
const ID_PATTERN = /^[A-Za-z0-9_-]{6,64}$/;
const TAGS = ['spoon', 'photo', 'etc'];
const MAX_PHOTOS = 8;

function cleanPost(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const { id, date, tag, title, content, photos, createdAt } = raw;
  if (typeof id !== 'string' || !ID_PATTERN.test(id)) return null;
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const photoIds = Array.isArray(photos) ? photos : [];
  if (photoIds.length > MAX_PHOTOS || !photoIds.every((p) => typeof p === 'string' && ID_PATTERN.test(p))) return null;

  return {
    id,
    date,
    tag: TAGS.includes(tag) ? tag : 'etc',
    title: typeof title === 'string' ? title.slice(0, 80) : '',
    content: typeof content === 'string' ? content.slice(0, 20000) : '',
    photos: photoIds,
    createdAt: typeof createdAt === 'number' ? createdAt : Date.now()
  };
}

async function deletePhotos(ids) {
  await Promise.all(ids.map((id) => kv.del(PHOTO_PREFIX + id)));
}

module.exports = async (req, res) => {
  const posts = (await kv.get(POSTS_KEY)) || [];

  if (req.method === 'GET') {
    res.status(200).json({ posts });
    return;
  }

  if (req.method === 'POST') {
    const { op, post, id } = req.body || {};

    if (op === 'upsert') {
      const cleaned = cleanPost(post);
      if (!cleaned) {
        res.status(400).json({ error: 'invalid post' });
        return;
      }
      const idx = posts.findIndex((p) => p.id === cleaned.id);
      if (idx === -1) {
        posts.unshift(cleaned);
      } else {
        const removed = posts[idx].photos.filter((pid) => !cleaned.photos.includes(pid));
        cleaned.createdAt = posts[idx].createdAt;
        posts[idx] = cleaned;
        await deletePhotos(removed);
      }
      await kv.set(POSTS_KEY, posts);
      res.status(200).json({ ok: true, posts });
      return;
    }

    if (op === 'delete') {
      const target = posts.find((p) => p.id === id);
      if (!target) {
        res.status(404).json({ error: 'not found' });
        return;
      }
      const rest = posts.filter((p) => p.id !== id);
      await deletePhotos(target.photos);
      await kv.set(POSTS_KEY, rest);
      res.status(200).json({ ok: true, posts: rest });
      return;
    }

    res.status(400).json({ error: 'unknown op' });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
