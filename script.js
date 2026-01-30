// script.js (books.csv 한글 컬럼명: 도서명/저자/출판사/청구기호/등록번호)

let BOOKS = []; // CSV에서 로드됨

const $target = document.getElementById("target");
const $q = document.getElementById("q");
const $btn = document.getElementById("searchBtn");
const $tbody = document.getElementById("tbody");
const $hint = document.getElementById("hint");

function normalize(text) {
  return (text ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, "") // 띄어쓰기 무시
    .toLowerCase();
}

function escapeHtml(str) {
  return (str ?? "").toString().replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function renderMessage(msg) {
  $tbody.innerHTML = `<tr><td class="empty" colspan="4">${escapeHtml(msg)}</td></tr>`;
}

function renderRows(rows) {
  $tbody.innerHTML = rows.map(b => `
    <tr>
      <td>${escapeHtml(b.title || "")}</td>
      <td>${escapeHtml(b.author || "")}</td>
      <td>${escapeHtml(b.publisher || "")}</td>
      <td>${escapeHtml(b.callno || "")}</td>
    </tr>
  `).join("");
}

// CSV 한 줄 파싱(따옴표 포함 대응)
function splitCSVLine(line) {
  const out = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    const next = line[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"'; // "" -> "
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur.trim());
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseCSV(text) {
  // BOM 제거 + \r 제거
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = cleaned.split("\n").filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const headers = splitCSVLine(lines[0]).map(h => h.trim());

  // ✅ 한글 헤더 위치 찾기
  const idx = {
    title: headers.indexOf("도서명"),
    author: headers.indexOf("저자"),
    publisher: headers.indexOf("출판사"),
    callno: headers.indexOf("청구기호"),
    regno: headers.indexOf("등록번호"),
  };

  // 필수 컬럼 검사
  if (idx.title === -1) throw new Error("CSV 첫 줄(헤더)에 '도서명' 컬럼이 없습니다.");
  if (idx.author === -1) throw new Error("CSV 첫 줄(헤더)에 '저자' 컬럼이 없습니다.");
  if (idx.publisher === -1) throw new Error("CSV 첫 줄(헤더)에 '출판사' 컬럼이 없습니다.");
  if (idx.callno === -1) throw new Error("CSV 첫 줄(헤더)에 '청구기호' 컬럼이 없습니다.");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitCSVLine(lines[i]);

    rows.push({
      title: cols[idx.title] ?? "",
      author: cols[idx.author] ?? "",
      publisher: cols[idx.publisher] ?? "",
      callno: cols[idx.callno] ?? "",
      regno: idx.regno >= 0 ? (cols[idx.regno] ?? "") : "",
    });
  }
  return rows;
}

async function loadBooks() {
  try {
    $hint.textContent = "장서 데이터를 불러오는 중입니다...";
    renderMessage("장서 데이터를 불러오는 중입니다...");

    const res = await fetch("./books.csv", { cache: "no-store" });
    if (!res.ok) throw new Error(`books.csv를 불러오지 못했습니다. (HTTP ${res.status})`);

    const text = await res.text();
    BOOKS = parseCSV(text);

    $hint.textContent = `준비 완료: ${BOOKS.length}권 · 도서명/저자/출판사/청구기호로 검색할 수 있습니다.`;
    renderMessage("도서명 또는 저자를 입력한 후 [검색] 버튼을 눌러주세요.");
  } catch (err) {
    console.error(err);
    $hint.textContent = "오류: 장서 데이터를 불러오지 못했습니다.";
    renderMessage(`오류: ${err.message}`);
  }
}

function doSearch() {
  const qRaw = $q.value.trim();
  const nq = normalize(qRaw);

  if (!nq) {
    $hint.textContent = "검색 결과: 0권 · 검색어를 입력해 주세요.";
    renderMessage("도서명 또는 저자를 입력한 후 [검색] 버튼을 눌러주세요.");
    return;
  }

  const target = $target.value;

  const results = BOOKS.filter(b => {
    // 화면 드롭다운 값(title/author/publisher/callno/all)과 매핑
    const fields = {
      title: normalize(b.title),
      author: normalize(b.author),
      publisher: normalize(b.publisher),
      callno: normalize(b.callno),
      regno: normalize(b.regno),
    };

    if (target === "all") {
      // 통합검색에 등록번호까지 포함
      return Object.values(fields).some(v => v.includes(nq));
    }
    return (fields[target] || "").includes(nq);
  });

  $hint.textContent = `검색 결과: ${results.length}권`;

  if (results.length === 0) {
    renderMessage("해당 도서가 없습니다. 다른 검색어로 다시 시도해 주세요.");
    return;
  }

  renderRows(results);
}

// 이벤트
$btn.addEventListener("click", doSearch);
$q.addEventListener("keydown", (e) => { if (e.key === "Enter") doSearch(); });

// 시작: CSV 로드
loadBooks();
