const { kv } = require('@vercel/kv');

const STATE_KEY = 'oong_diary_state';

const DEFAULT_STATE = {
  diaryData: {
    '2026-09-09': {
      isSecret: false,
      content: '오늘드디어 나만의 비밀 일기장 웹사이트를 만들었다!\n비밀번호를 입력해야만 들어올 수 있어서 너무 뿌듯하다. 📝'
    }
  },
  trashData: []
};

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const state = await kv.get(STATE_KEY);
    res.status(200).json(state || DEFAULT_STATE);
    return;
  }

  if (req.method === 'POST') {
    const { diaryData, trashData } = req.body || {};
    if (!diaryData || !trashData) {
      res.status(400).json({ error: 'diaryData and trashData are required' });
      return;
    }
    await kv.set(STATE_KEY, { diaryData, trashData });
    res.status(200).json({ ok: true });
    return;
  }

  res.status(405).json({ error: 'Method not allowed' });
};
