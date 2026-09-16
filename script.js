const COVER_PASSWORD = "12150209"; // 표지 열 때 쓰는 비밀번호
const ADMIN_PASSWORD = "260118"; // 관리자 인증할 때 쓸 비밀번호
let isAdmin = false;

// 💡 일기 데이터 (서버 API 연동, 로딩 전까지 쓰이는 기본값). 날짜당 글 1개: { content, isSecret }
let diaryData = {
  "2026-09-09": {
    isSecret: false,
    content: "오늘드디어 나만의 비밀 일기장 웹사이트를 만들었다!\n비밀번호를 입력해야만 들어올 수 있어서 너무 뿌듯하다. 📝"
  }
};

let trashData = [];

let currentDate = new Date(2026, 8, 1);
let selectedDateKey = "";

// 과거 형식(날짜당 여러 글 배열)으로 저장된 데이터를 날짜당 글 1개 형식으로 변환
function migrateDiaryData(rawDiaryData) {
  const migrated = {};
  for (const dateKey in rawDiaryData) {
    const value = rawDiaryData[dateKey];
    if (Array.isArray(value)) {
      if (value.length === 0) continue;
      migrated[dateKey] = {
        content: value.map((entry) => entry.content).join("\n\n---\n\n"),
        isSecret: value.some((entry) => entry.isSecret)
      };
    } else {
      migrated[dateKey] = value;
    }
  }
  return migrated;
}

function migrateTrashData(rawTrashData) {
  return (rawTrashData || []).map((item) => ({
    originalDate: item.originalDate,
    content: item.content,
    isSecret: !!item.isSecret
  }));
}

async function loadDataFromServer() {
  try {
    const response = await fetch("/api/diary");
    const state = await response.json();
    diaryData = migrateDiaryData(state.diaryData || {});
    trashData = migrateTrashData(state.trashData || []);
  } catch (e) {
    console.error("일기 데이터를 불러오지 못했습니다.", e);
    alert("⚠️ 서버에서 일기를 불러오지 못했습니다. 인터넷 연결을 확인해주세요.");
  }
}

async function saveDataToStorage() {
  try {
    await fetch("/api/diary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diaryData, trashData })
    });
  } catch (e) {
    console.error("일기 데이터를 저장하지 못했습니다.", e);
    alert("⚠️ 서버 저장에 실패했습니다. 인터넷 연결을 확인해주세요.");
  }
}

// ==========================================
// 🎯 기념일 자동 계산 로직
// ==========================================
function getAnniversaries(year, month, date) {
  const anniversaries = [];
  const targetDate = new Date(year, month - 1, date);
  const targetTime = targetDate.getTime();

  // 1. 매년 반복 생일
  if (month === 12 && date === 15) anniversaries.push("🎂 휴");

  // 2. 휴 첫 방송일 (2025년 6월 21일 기준)
  const broadcastStart = new Date(2025, 5, 21);
  const diffBroadcastDays = Math.floor((targetTime - broadcastStart.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  if (diffBroadcastDays > 0) {
    if (diffBroadcastDays % 100 === 0) anniversaries.push(`📻 방송 ${diffBroadcastDays}일`);
    if (month === 6 && date === 21 && year > 2025) anniversaries.push(`📻방송 ${year - 2025}주년`);
  }

  return anniversaries;
}

// ==========================================
// 🔒 화면 제어 및 관리자 인증
// ==========================================
async function openDiary() {
  const inputPassword = prompt("🧸👻생일");
  if (inputPassword === COVER_PASSWORD) {
    alert("Hi, my Luv🧸♥️");
    document.getElementById("lockScreen").style.display = "none";
    document.getElementById("diaryMainContent").style.display = "block";
    await loadDataFromServer();
    updateAdminUI();
  } else if (inputPassword !== null) {
    alert("Think again.");
  }
}

function closeDiary() {
  isAdmin = false;
  updateAdminUI();
  document.getElementById("lockScreen").style.display = "block";
  document.getElementById("diaryMainContent").style.display = "none";
}

function toggleAdminLogin() {
  if (isAdmin) {
    isAdmin = false;
    alert("관리자 권한을 해제했습니다.");
    updateAdminUI();
  } else {
    const password = prompt("비밀번호를 입력하세요:");
    if (password === ADMIN_PASSWORD) {
      isAdmin = true;
      alert("👻");
      updateAdminUI();
    } else if (password !== null) {
      alert("접근 불가");
    }
  }
}

function updateAdminUI() {
  const actionButtons = document.getElementById("actionButtons");
  const secretListBtn = document.getElementById("secretListBtn");
  const trashListBtn = document.getElementById("trashListBtn");

  if (isAdmin) {
    actionButtons.style.display = "flex";
    secretListBtn.style.display = "flex";
    trashListBtn.style.display = "flex";
  } else {
    actionButtons.style.display = "none";
    secretListBtn.style.display = "none";
    trashListBtn.style.display = "none";
    switchTab('calendar');
  }
  renderCalendar();
  renderAdminSection();
}

function openNewEntryFromView() {
  const dateKey = selectedDateKey;
  const hasEntry = !!diaryData[dateKey];
  closeViewModal();
  openWriteModal(dateKey, hasEntry);
}

// 🐻 곰 그림을 길게 누르면(0.6초) 관리자 인증/해제가 트리거되는 숨겨진 진입점
function setupAdminHotspot() {
  const hotspot = document.getElementById("adminHotspot");
  if (!hotspot) return;

  let pressTimer = null;

  const startPress = () => {
    pressTimer = setTimeout(() => {
      pressTimer = null;
      toggleAdminLogin();
    }, 600);
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      pressTimer = null;
    }
  };

  hotspot.addEventListener("mousedown", startPress);
  hotspot.addEventListener("touchstart", startPress, { passive: true });
  ["mouseup", "mouseleave", "touchend", "touchcancel"].forEach((evt) =>
    hotspot.addEventListener(evt, cancelPress)
  );
}

setupAdminHotspot();

function switchTab(tabName) {
  const calendarSection = document.getElementById("calendarSection");
  const secretSection = document.getElementById("secretSection");
  const trashSection = document.getElementById("trashSection");

  calendarSection.style.display = tabName === 'calendar' ? "block" : "none";
  secretSection.style.display = tabName === 'secret' ? "block" : "none";
  trashSection.style.display = tabName === 'trash' ? "block" : "none";

  if (tabName !== 'calendar') {
    renderAdminSection();
  }
}

// ==========================================
// 📅 달력 그리기
// ==========================================
function renderCalendar() {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  // 1. 💡 년/월 드롭다운 옵션 및 현재 값 갱신 (추가됨!)
  updateSelectOptions(year, month);

  // 🖼️ 2. 월별 속지 배경 동적 변경
  const diaryMain = document.getElementById("diaryMainContent");
  if (diaryMain) {
    diaryMain.style.backgroundImage = `url('bg_${month + 1}.png')`;
  }

  const calendarDates = document.getElementById("calendarDates");
  calendarDates.innerHTML = "";

  const firstDay = new Date(year, month, 1).getDay();
  const lastDate = new Date(year, month + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    const emptyCell = document.createElement("div");
    emptyCell.className = "date-cell empty";
    calendarDates.appendChild(emptyCell);
  }

  for (let date = 1; date <= lastDate; date++) {
    const cell = document.createElement("div");
    cell.className = "date-cell";

    const formattedMonth = String(month + 1).padStart(2, '0');
    const formattedDate = String(date).padStart(2, '0');
    const dateKey = `${year}-${formattedMonth}-${formattedDate}`;

    let innerHTML = `<div class="date-num">${date}</div>`;

    const anniList = getAnniversaries(year, month + 1, date);
    const entry = diaryData[dateKey];

    if (entry || anniList.length > 0) {
      innerHTML += `<div class="badge-container">`;

      anniList.forEach(anni => {
        innerHTML += `<div class="entry-badge" style="background-color: #fff2cc; color: #8c6239; font-weight: bold;">${anni}</div>`;
      });

      if (entry) {
        if (entry.isSecret) {
          innerHTML += `<div class="entry-badge secret">🔒 비밀글</div>`;
        } else {
          innerHTML += `<div class="entry-badge paw">🐾</div>`;
        }
      }

      innerHTML += `</div>`;
    }

    cell.innerHTML = innerHTML;
    cell.onclick = () => openViewModal(dateKey);
    calendarDates.appendChild(cell);
  }
}

function changeMonth(delta) {
  currentDate.setMonth(currentDate.getMonth() + delta);
  renderCalendar();
}

// 📅 년/월 직접 선택 이동 함수
// 1. 년도(2020~2030) 및 월(1~12월) 드롭다운 옵션 생성 & 갱신
function updateSelectOptions(currentYear, currentMonth) {
  const selectYear = document.getElementById("selectYear");
  const selectMonth = document.getElementById("selectMonth");

  if (!selectYear || !selectMonth) return;

  // 년도 옵션 (2020년 ~ 2030년)
  selectYear.innerHTML = "";
  for (let y = 2020; y <= 2030; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = `${y}년`;
    if (y === currentYear) opt.selected = true;
    selectYear.appendChild(opt);
  }

  // 월 옵션 (1월 ~ 12월)
  selectMonth.innerHTML = "";
  for (let m = 0; m < 12; m++) {
    const opt = document.createElement("option");
    opt.value = m;
    opt.textContent = `${m + 1}월`;
    if (m === currentMonth) opt.selected = true;
    selectMonth.appendChild(opt);
  }
}

// 2. 드롭다운에서 선택을 변경했을 때 실행되는 함수
function onSelectYearMonthChange() {
  const selectedY = parseInt(document.getElementById("selectYear").value, 10);
  const selectedM = parseInt(document.getElementById("selectMonth").value, 10);

  currentDate.setFullYear(selectedY, selectedM, 1);
  renderCalendar();
}

// ==========================================
// 📖 일기 및 일정 상세보기 모달
// ==========================================
function openViewModal(dateKey) {
  selectedDateKey = dateKey;

  const year = parseInt(dateKey.split('-')[0]);
  const month = parseInt(dateKey.split('-')[1]);
  const day = parseInt(dateKey.split('-')[2]);

  const anniList = getAnniversaries(year, month, day);
  const entry = diaryData[dateKey];

  // 1. 일기도 없고 기념일도 없으면 바로 일기 작성창으로
  if (!entry && anniList.length === 0) {
    openWriteModal(dateKey);
    return;
  }

  document.getElementById("viewModalDate").innerText = `${year}년 ${month}월 ${day}일`;
  document.getElementById("viewWriteBtn").style.display = entry ? "none" : "flex";

  const modalInfo = document.getElementById("modalInfo");
  modalInfo.innerHTML = "";

  // 2. 기념일 박스 표시
  if (anniList.length > 0) {
    const anniBox = document.createElement("div");
    anniBox.style.cssText = "background-color: #fff8e7; border: 1px dashed #e5c158; padding: 8px 12px; border-radius: 8px; margin-bottom: 12px; font-size: 1.1rem; color: #8c6239; font-weight: bold;";
    anniBox.innerHTML = `🎉 Today: ${anniList.join(' / ')}`;
    modalInfo.appendChild(anniBox);
  }

  const deleteBtn = document.getElementById("deleteBtn");

  if (entry) {
    deleteBtn.style.display = isAdmin ? "inline-block" : "none";

    if (entry.isSecret && !isAdmin) {
      document.getElementById("viewModalText").innerText = "🔒 이 글은 비밀글입니다.";
    } else {
      document.getElementById("viewModalText").innerText = entry.content;
    }
  } else {
    // 3. 일기는 없고 기념일만 있는 경우
    document.getElementById("viewModalText").innerText = "이 날에 등록된 일기가 아직 없습니다.";
    deleteBtn.style.display = "none";
  }

  document.getElementById("viewModalOverlay").style.display = "flex";
}

function closeViewModal() {
  document.getElementById("viewModalOverlay").style.display = "none";
}

function openWriteModal(targetDateKey = "", isEdit = false) {
  const titleElement = document.getElementById("writeModalTitle");
  const dateInput = document.getElementById("inputDate");

  if (isEdit && diaryData[targetDateKey]) {
    const entry = diaryData[targetDateKey];
    titleElement.innerText = "일기 수정하기";
    dateInput.value = targetDateKey;
    dateInput.disabled = true;
    document.getElementById("inputContent").value = entry.content;
  } else {
    titleElement.innerText = "새 일기 작성하기";
    dateInput.disabled = false;
    dateInput.value = targetDateKey || new Date().toISOString().substring(0, 10);
    document.getElementById("inputContent").value = "";
  }

  document.getElementById("writeModalOverlay").style.display = "flex";
}

function closeWriteModal() {
  document.getElementById("writeModalOverlay").style.display = "none";
  document.getElementById("inputContent").value = "";
  document.getElementById("inputDate").disabled = false;
}

function deleteCurrentDiary() {
  if (confirm("이 일기를 삭제하시겠습니까? (삭제된 일기는 휴지통으로 이동합니다.)")) {
    const deletedEntry = diaryData[selectedDateKey];
    trashData.push({
      originalDate: selectedDateKey,
      content: deletedEntry.content,
      isSecret: deletedEntry.isSecret
    });
    delete diaryData[selectedDateKey];

    saveDataToStorage();
    alert("🗑️ 일기가 휴지통으로 이동했습니다.");
    closeViewModal();
    renderCalendar();
  }
}

function saveDiary() {
  const date = document.getElementById("inputDate").value;
  const content = document.getElementById("inputContent").value;

  if (!date || !content.trim()) {
    alert("날짜와 내용을 모두 입력해 주세요!");
    return;
  }

  const isEditMode = document.getElementById("inputDate").disabled;
  const existingIsSecret = diaryData[date] ? diaryData[date].isSecret : false;

  if (!isEditMode && diaryData[date]) {
    if (!confirm("이미 작성된 일기가 있습니다. 내용을 덮어씌울까요?")) {
      return;
    }
  }

  diaryData[date] = { content, isSecret: existingIsSecret };

  saveDataToStorage();
  alert("🎉 일기가 잘 저장되었습니다!");
  closeWriteModal();
  renderCalendar();
}

// 관리자: 공개/비밀 전환
function toggleSecretStatus(dateKey) {
  const entry = diaryData[dateKey];
  if (!entry) return;
  entry.isSecret = !entry.isSecret;
  saveDataToStorage();
  renderAdminSection();
  renderCalendar();
}

function renderAdminSection() {
  const secretList = document.getElementById("secretList");
  const trashList = document.getElementById("trashList");

  secretList.innerHTML = "";
  const dateKeys = Object.keys(diaryData).sort();

  if (dateKeys.length === 0) {
    secretList.innerHTML = "<p style='color:#888;'>작성된 일기가 없습니다.</p>";
  } else {
    dateKeys.forEach((dateKey) => {
      const item = diaryData[dateKey];
      const card = document.createElement("div");
      card.className = "admin-card";
      const statusBadge = item.isSecret
        ? `<span class="status-badge secret">🔒 비밀</span>`
        : `<span class="status-badge public">🌐 공개</span>`;
      const toggleLabel = item.isSecret ? "🌐 공개로 전환" : "🔒 비밀로 전환";
      card.innerHTML = `
        <div class="admin-card-info">
          <strong>[${dateKey}]</strong> ${statusBadge}
          <br><small style="color:#666;">${item.content.substring(0, 20)}...</small>
        </div>
        <button class="btn-toggle-secret" onclick="toggleSecretStatus('${dateKey}')">${toggleLabel}</button>
      `;
      secretList.appendChild(card);
    });
  }

  trashList.innerHTML = "";
  if (trashData.length === 0) {
    trashList.innerHTML = "<p style='color:#888;'>휴지통이 비어있습니다.</p>";
  } else {
    trashData.forEach((item, idx) => {
      const card = document.createElement("div");
      card.className = "admin-card";
      card.innerHTML = `
        <div class="admin-card-info">
          <strong>[${item.originalDate}]</strong> 삭제된 일기
        </div>
        <div>
          <button class="btn-restore" onclick="restoreDiary(${idx})">🔄 복구</button>
          <button class="btn-delete" onclick="permanentDelete(${idx})">❌ 영구삭제</button>
        </div>
      `;
      trashList.appendChild(card);
    });
  }
}

function restoreDiary(trashIndex) {
  const restoredItem = trashData.splice(trashIndex, 1)[0];
  const dateKey = restoredItem.originalDate;

  diaryData[dateKey] = { content: restoredItem.content, isSecret: restoredItem.isSecret };

  saveDataToStorage();
  alert("🔄 일기가 복구되었습니다!");
  renderAdminSection();
  renderCalendar();
}

function permanentDelete(trashIndex) {
  if (confirm("정말로 완전히 지우시겠습니까? 복구할 수 없습니다.")) {
    trashData.splice(trashIndex, 1);
    saveDataToStorage();
    alert("❌ 영구 삭제되었습니다.");
    renderAdminSection();
  }
}
