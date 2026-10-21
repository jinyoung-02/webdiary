// ==========================================
// 💌 팬보드 (스푼 글 모음 · 사진)
// script.js 다음에 로드되며 isAdmin, switchTab, showToast를 공유한다
// ==========================================
const BOARD_TAGS = [
  { key: "spoon", label: "스푼 글" },
  { key: "photo", label: "사진" },
  { key: "etc", label: "기타" }
];
const MAX_BOARD_PHOTOS = 6;

let boardPosts = [];
let boardLoaded = false;
let boardFilterTag = "all";
let boardSelectedId = null;
let boardDraft = null;

function boardTagLabel(key) {
  const tag = BOARD_TAGS.find((t) => t.key === key);
  return tag ? tag.label : "기타";
}

function randomId(prefix) {
  const rand = (window.crypto && crypto.randomUUID)
    ? crypto.randomUUID().replace(/-/g, "").slice(0, 16)
    : Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
  return prefix + rand;
}

function formatBoardDate(dateKey) {
  const [y, m, d] = dateKey.split("-").map(Number);
  return `${y}.${m}.${d}`;
}

function localDateKey(dateObj = new Date()) {
  const y = dateObj.getFullYear();
  const m = String(dateObj.getMonth() + 1).padStart(2, "0");
  const d = String(dateObj.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

async function openBoard() {
  switchTab("board");
  renderBoard();
  if (!boardLoaded) await loadBoard();
}

async function loadBoard() {
  const list = document.getElementById("boardList");
  list.innerHTML = '<div class="board-empty">불러오는 중…</div>';
  try {
    const response = await fetch("/api/board");
    const data = await response.json();
    boardPosts = Array.isArray(data.posts) ? data.posts : [];
    boardLoaded = true;
  } catch (e) {
    console.error("팬보드를 불러오지 못했습니다.", e);
    list.innerHTML = '<div class="board-empty">불러오지 못했어요. 잠시 후 다시 시도해주세요.</div>';
    return;
  }
  renderBoard();
}

function renderBoard() {
  const filter = document.getElementById("boardFilter");
  filter.innerHTML = "";
  [{ key: "all", label: "전체" }, ...BOARD_TAGS].forEach((tag) => {
    const chip = document.createElement("button");
    chip.className = "board-chip" + (boardFilterTag === tag.key ? " active" : "");
    chip.textContent = tag.label;
    chip.onclick = () => {
      boardFilterTag = tag.key;
      renderBoard();
    };
    filter.appendChild(chip);
  });

  const list = document.getElementById("boardList");
  if (!boardLoaded) return;
  list.innerHTML = "";

  const posts = boardPosts
    .filter((p) => boardFilterTag === "all" || p.tag === boardFilterTag)
    .sort((a, b) => (b.date + String(b.createdAt || 0)).localeCompare(a.date + String(a.createdAt || 0)));

  if (posts.length === 0) {
    list.innerHTML = '<div class="board-empty">아직 올라온 글이 없어요.<br>＋ 버튼으로 첫 글을 남겨보세요.</div>';
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("div");
    card.className = "board-card";
    card.onclick = () => openBoardView(post.id);

    const meta = document.createElement("div");
    meta.className = "board-card-meta";
    const dateSpan = document.createElement("span");
    dateSpan.textContent = formatBoardDate(post.date);
    const tagSpan = document.createElement("span");
    tagSpan.className = "board-tag";
    tagSpan.textContent = boardTagLabel(post.tag);
    meta.appendChild(dateSpan);
    meta.appendChild(tagSpan);
    card.appendChild(meta);

    if (post.title) {
      const title = document.createElement("div");
      title.className = "board-card-title";
      title.textContent = post.title;
      card.appendChild(title);
    }
    if (post.content) {
      const preview = document.createElement("div");
      preview.className = "board-card-preview";
      preview.textContent = post.content;
      card.appendChild(preview);
    }
    if (post.photos && post.photos.length > 0) {
      const thumbs = document.createElement("div");
      thumbs.className = "board-thumbs";
      post.photos.slice(0, 3).forEach((pid) => {
        const img = document.createElement("img");
        img.className = "board-thumb";
        img.loading = "lazy";
        img.alt = "";
        img.src = `/api/photo?id=${pid}`;
        thumbs.appendChild(img);
      });
      if (post.photos.length > 3) {
        const more = document.createElement("div");
        more.className = "board-thumb-more";
        more.textContent = `+${post.photos.length - 3}`;
        thumbs.appendChild(more);
      }
      card.appendChild(thumbs);
    }
    list.appendChild(card);
  });
}

// ----- 글 보기 -----
function openBoardView(postId) {
  const post = boardPosts.find((p) => p.id === postId);
  if (!post) return;
  boardSelectedId = postId;

  document.getElementById("boardViewDate").textContent = formatBoardDate(post.date);
  document.getElementById("boardViewTag").textContent = boardTagLabel(post.tag);

  const title = document.getElementById("boardViewTitle");
  title.textContent = post.title || "";
  title.style.display = post.title ? "block" : "none";

  document.getElementById("boardViewText").textContent = post.content || "";

  const grid = document.getElementById("boardViewPhotos");
  grid.innerHTML = "";
  (post.photos || []).forEach((pid) => {
    const img = document.createElement("img");
    img.alt = "";
    img.loading = "lazy";
    img.src = `/api/photo?id=${pid}`;
    img.onclick = () => openLightbox(img.src);
    grid.appendChild(img);
  });

  document.getElementById("boardEditBtn").style.display = isAdmin ? "inline-block" : "none";
  document.getElementById("boardDeleteBtn").style.display = isAdmin ? "inline-block" : "none";
  document.getElementById("boardViewOverlay").style.display = "flex";
}

function closeBoardView() {
  document.getElementById("boardViewOverlay").style.display = "none";
}

function openLightbox(src) {
  document.getElementById("photoLightboxImg").src = src;
  document.getElementById("photoLightbox").style.display = "flex";
}

function closeLightbox() {
  document.getElementById("photoLightbox").style.display = "none";
}

async function deleteCurrentBoardPost() {
  if (!confirm("이 글을 삭제할까요? 사진도 함께 지워지고 되돌릴 수 없어요.")) return;
  try {
    const response = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ op: "delete", id: boardSelectedId })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "delete failed");
    boardPosts = data.posts;
    closeBoardView();
    renderBoard();
    showToast("삭제했어요");
  } catch (e) {
    console.error(e);
    alert("⚠️ 삭제에 실패했어요. 잠시 후 다시 시도해주세요.");
  }
}

function editCurrentBoardPost() {
  const post = boardPosts.find((p) => p.id === boardSelectedId);
  if (!post) return;
  closeBoardView();
  openBoardWrite(post);
}

// ----- 글쓰기 / 수정 -----
function renderBoardTagPicker() {
  const picker = document.getElementById("boardTagPicker");
  picker.innerHTML = "";
  BOARD_TAGS.forEach((tag) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "board-chip" + (boardDraft.tag === tag.key ? " active" : "");
    chip.textContent = tag.label;
    chip.onclick = () => {
      boardDraft.tag = tag.key;
      renderBoardTagPicker();
    };
    picker.appendChild(chip);
  });
}

function renderBoardPhotoPreview() {
  const preview = document.getElementById("boardPhotoPreview");
  preview.innerHTML = "";
  boardDraft.photos.forEach((photo, idx) => {
    const item = document.createElement("div");
    item.className = "board-photo-item";
    const img = document.createElement("img");
    img.alt = "";
    img.src = photo.b64 ? `data:${photo.mime};base64,${photo.b64}` : `/api/photo?id=${photo.id}`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "board-photo-remove";
    remove.textContent = "×";
    remove.onclick = () => {
      boardDraft.photos.splice(idx, 1);
      renderBoardPhotoPreview();
    };
    item.appendChild(img);
    item.appendChild(remove);
    preview.appendChild(item);
  });
  document.getElementById("boardPhotoCount").textContent = `${boardDraft.photos.length}/${MAX_BOARD_PHOTOS}`;
}

function openBoardWrite(post = null) {
  boardDraft = post
    ? {
        id: post.id,
        createdAt: post.createdAt,
        date: post.date,
        tag: post.tag,
        photos: (post.photos || []).map((pid) => ({ id: pid }))
      }
    : { id: randomId("b"), createdAt: Date.now(), date: localDateKey(), tag: "spoon", photos: [] };

  document.getElementById("boardWriteTitle").textContent = post ? "팬보드 글 수정" : "팬보드 글쓰기";
  document.getElementById("boardInputDate").value = boardDraft.date;
  document.getElementById("boardInputTitle").value = post ? post.title || "" : "";
  document.getElementById("boardInputContent").value = post ? post.content || "" : "";
  document.getElementById("boardSaveBtn").disabled = false;
  document.getElementById("boardSaveBtn").textContent = "저장하기";

  renderBoardTagPicker();
  renderBoardPhotoPreview();
  document.getElementById("boardWriteOverlay").style.display = "flex";
}

function closeBoardWrite() {
  document.getElementById("boardWriteOverlay").style.display = "none";
  boardDraft = null;
}

// 업로드 전에 긴 변을 줄이고 JPEG로 압축 (서버 저장 용량과 전송 시간을 줄이기 위함)
function compressImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      let maxDim = 1280;
      let quality = 0.82;
      let b64 = "";

      for (let attempt = 0; attempt < 6; attempt++) {
        const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        b64 = canvas.toDataURL("image/jpeg", quality).split(",")[1];
        if (b64.length <= 650000) break;
        quality = Math.max(0.5, quality - 0.1);
        maxDim = Math.round(maxDim * 0.85);
      }
      resolve({ id: randomId("p"), mime: "image/jpeg", b64 });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

async function onBoardPhotosPicked(event) {
  const files = Array.from(event.target.files || []);
  event.target.value = "";
  if (!boardDraft) return;

  const room = MAX_BOARD_PHOTOS - boardDraft.photos.length;
  if (files.length > room) {
    alert(`사진은 한 글에 최대 ${MAX_BOARD_PHOTOS}장까지 올릴 수 있어요.`);
  }

  for (const file of files.slice(0, Math.max(0, room))) {
    try {
      boardDraft.photos.push(await compressImage(file));
    } catch (e) {
      console.error(e);
      alert("사진을 불러오지 못했어요. 다른 사진으로 시도해주세요.");
    }
  }
  renderBoardPhotoPreview();
}

async function saveBoardPost() {
  if (!boardDraft) return;

  const date = document.getElementById("boardInputDate").value;
  const title = document.getElementById("boardInputTitle").value.trim();
  const content = document.getElementById("boardInputContent").value.trim();

  if (!date) {
    alert("날짜를 선택해 주세요.");
    return;
  }
  if (!title && !content && boardDraft.photos.length === 0) {
    alert("내용이나 사진 중 하나는 있어야 해요.");
    return;
  }

  const saveBtn = document.getElementById("boardSaveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "저장 중…";

  try {
    const newPhotos = boardDraft.photos.filter((p) => p.b64);
    for (const photo of newPhotos) {
      const response = await fetch("/api/photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: photo.id, mime: photo.mime, b64: photo.b64 })
      });
      if (!response.ok) throw new Error("photo upload failed");
    }

    const response = await fetch("/api/board", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        op: "upsert",
        post: {
          id: boardDraft.id,
          createdAt: boardDraft.createdAt,
          date,
          tag: boardDraft.tag,
          title,
          content,
          photos: boardDraft.photos.map((p) => p.id)
        }
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "save failed");

    boardPosts = data.posts;
    boardLoaded = true;
    closeBoardWrite();
    renderBoard();
    showToast("저장했어요");
  } catch (e) {
    console.error(e);
    alert("⚠️ 저장에 실패했어요. 잠시 후 다시 시도해주세요.");
    saveBtn.disabled = false;
    saveBtn.textContent = "저장하기";
  }
}
