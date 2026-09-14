const DEFAULT_NAMES = ["ปาม", "เบียร์", "โซเฟีย", "เค", "พอช", "เอย", "น้ำ", "เปตอง", "แพรว"];

// รูปแบบจากตารางต้นฉบับ: จันทร์–ศุกร์ (true = เข้าออฟฟิศ)
const PATTERNS = [
  [1, 1, 1, 0, 0],
  [1, 1, 1, 0, 0],
  [1, 1, 1, 0, 0],
  [0, 1, 1, 1, 0],
  [0, 0, 1, 1, 1],
  [0, 0, 1, 1, 1],
  [1, 1, 0, 0, 1],
  [1, 0, 0, 1, 1],
  [1, 0, 0, 1, 1],
];

const COLORS = ["#18a99b", "#356bd7", "#51a552", "#acc83e", "#d5a51f", "#ef7a45", "#ef5b4f", "#e25c91", "#8650bd"];
const STORAGE_KEY = "office-shuffle-v2";
const state = loadState();

const drawDate = document.querySelector("#drawDate");
const rosterBody = document.querySelector("#rosterBody");
const periodText = document.querySelector("#periodText");
const dialog = document.querySelector("#nameDialog");
const nameInputs = document.querySelector("#nameInputs");
const toast = document.querySelector("#toast");

function localISO(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.names?.length === 9 && saved?.order?.length === 9) return saved;
  } catch (_) { /* เริ่มด้วยค่าเริ่มต้นเมื่อข้อมูลเก่าเสีย */ }
  return { names: [...DEFAULT_NAMES], order: [...DEFAULT_NAMES], drawDate: localISO() };
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function parseLocalDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function nextMonday(date) {
  const day = date.getDay();
  return addDays(date, day === 0 ? 1 : 8 - day);
}

function formatShort(date) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "short" }).format(date).replace(".", "");
}

function formatLong(date) {
  return new Intl.DateTimeFormat("th-TH", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function updateDates() {
  const start = nextMonday(parseLocalDate(drawDate.value));
  const end = addDays(start, 13);
  periodText.textContent = `${formatLong(start)} — ${formatLong(end)}`;
  document.querySelectorAll("[data-day]").forEach((el, index) => {
    el.textContent = `${formatShort(addDays(start, index))}\n${formatShort(addDays(start, index + 7))}`;
  });
}

function renderRoster(animate = false) {
  rosterBody.innerHTML = "";
  state.order.forEach((name, index) => {
    const row = document.createElement("tr");
    row.style.setProperty("--row-color", COLORS[index]);
    row.style.setProperty("--i", index);
    if (animate) row.classList.add("shuffle-in");
    row.innerHTML = `
      <td class="person-cell"><span class="person-index">${String(index + 1).padStart(2, "0")}</span><span>${escapeHTML(name)}</span><span class="drag-handle" role="button" tabindex="0" aria-label="ลากเพื่อสลับตำแหน่ง ${escapeHTML(name)}" title="ลากเพื่อสลับตำแหน่ง">⠿</span></td>
      ${PATTERNS[index].map(active => `<td class="shift-cell ${active ? "active" : ""}"><span class="sr-only">${active ? "เข้าออฟฟิศ" : ""}</span></td>`).join("")}
    `;
    rosterBody.appendChild(row);
  });
  bindDragHandles();
}

function bindDragHandles() {
  rosterBody.querySelectorAll(".drag-handle").forEach((handle, index) => {
    handle.addEventListener("pointerdown", event => startNameDrag(event, index));
  });
}

function startNameDrag(event, sourceIndex) {
  if (event.button !== undefined && event.button !== 0) return;
  const handle = event.currentTarget;
  const sourceRow = handle.closest("tr");
  let targetIndex = sourceIndex;
  let dragging = false;
  const origin = { x: event.clientX, y: event.clientY };
  handle.setPointerCapture(event.pointerId);

  const clearTarget = () => rosterBody.querySelector(".drag-target")?.classList.remove("drag-target");

  const move = moveEvent => {
    const distance = Math.hypot(moveEvent.clientX - origin.x, moveEvent.clientY - origin.y);
    if (!dragging && distance < 6) return;
    dragging = true;
    sourceRow.classList.add("drag-source");
    clearTarget();
    const row = document.elementFromPoint(moveEvent.clientX, moveEvent.clientY)?.closest("#rosterBody tr");
    if (!row || row === sourceRow) {
      targetIndex = sourceIndex;
      return;
    }
    targetIndex = [...rosterBody.children].indexOf(row);
    row.classList.add("drag-target");
  };

  const finish = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", finish);
    handle.removeEventListener("pointercancel", cancel);
    sourceRow.classList.remove("drag-source");
    clearTarget();
    if (!dragging || targetIndex === sourceIndex || targetIndex < 0) return;
    [state.order[sourceIndex], state.order[targetIndex]] = [state.order[targetIndex], state.order[sourceIndex]];
    saveState();
    renderRoster(true);
    showToast("สลับตำแหน่งและบันทึกแล้ว");
  };

  const cancel = () => {
    handle.removeEventListener("pointermove", move);
    handle.removeEventListener("pointerup", finish);
    handle.removeEventListener("pointercancel", cancel);
    sourceRow.classList.remove("drag-source");
    clearTarget();
  };

  handle.addEventListener("pointermove", move);
  handle.addEventListener("pointerup", finish);
  handle.addEventListener("pointercancel", cancel);
}

function escapeHTML(value) {
  const div = document.createElement("div");
  div.textContent = value;
  return div.innerHTML;
}

function secureShuffle(items) {
  const result = [...items];
  const random = new Uint32Array(result.length);
  crypto.getRandomValues(random);
  for (let i = result.length - 1; i > 0; i--) {
    const j = random[i] % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function shuffle() {
  let next;
  do { next = secureShuffle(state.names); }
  while (next.every((name, index) => name === state.order[index]));
  state.order = next;
  state.drawDate = drawDate.value;
  saveState();
  renderRoster(true);
  showToast("สุ่มและบันทึกตารางใหม่แล้ว");
}

function buildNameInputs() {
  nameInputs.innerHTML = state.names.map((name, index) => `
    <label class="name-field">
      <span>คนที่ ${index + 1}</span>
      <input value="${escapeHTML(name)}" maxlength="30" required autocomplete="off">
    </label>
  `).join("");
}

function saveNames() {
  const names = [...nameInputs.querySelectorAll("input")].map(input => input.value.trim());
  if (names.some(name => !name)) return false;
  if (new Set(names).size !== names.length) {
    showToast("รายชื่อต้องไม่ซ้ำกัน");
    return false;
  }
  state.names = names;
  state.order = [...names];
  saveState();
  renderRoster(true);
  showToast("บันทึกรายชื่อแล้ว");
  return true;
}

async function copySchedule() {
  const start = nextMonday(parseLocalDate(drawDate.value));
  const weekdays = ["จ.", "อ.", "พ.", "พฤ.", "ศ."];
  const lines = [`ตารางเข้าออฟฟิศ ${formatLong(start)} — ${formatLong(addDays(start, 13))}`, ""];
  state.order.forEach((name, index) => {
    const days = PATTERNS[index].map((active, day) => active ? weekdays[day] : null).filter(Boolean).join(" ");
    lines.push(`${name}: ${days}`);
  });
  try {
    await navigator.clipboard.writeText(lines.join("\n"));
    showToast("คัดลอกตารางแล้ว");
  } catch (_) {
    showToast("เบราว์เซอร์ไม่อนุญาตให้คัดลอก");
  }
}

let toastTimer;
function showToast(message) {
  toast.textContent = message;
  toast.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("show"), 2200);
}

drawDate.value = state.drawDate || localISO();
updateDates();
renderRoster();

drawDate.addEventListener("change", () => {
  state.drawDate = drawDate.value;
  saveState();
  updateDates();
});
document.querySelector("#shuffleButton").addEventListener("click", shuffle);
document.querySelector("#copyButton").addEventListener("click", copySchedule);
document.querySelector("#editButton").addEventListener("click", () => {
  buildNameInputs();
  dialog.showModal();
});
document.querySelector("#nameForm").addEventListener("submit", event => {
  if (event.submitter?.value === "save" && !saveNames()) event.preventDefault();
});
