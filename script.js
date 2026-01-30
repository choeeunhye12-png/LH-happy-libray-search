// script.js (books.csv 한글 컬럼명: 도서명/저자/출판사/출판년도/청구기호/등록번호)

let BOOKS = []; // CSV에서 로드됨

const $target = document.getElementById("target");
const $q = document.getElementById("q");
const $btn = document.getElementById("searchBtn");
const $tbody = document.getElementById("tbody");
const $hint = document.getElementById("hint");

// 띄어쓰기 무시 + 소문자
function normalize(text) {
  return (text ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

// XSS 방지(표시용)
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

// 콤마 CSV용(따옴표 포함) 파서
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

// ✅ 탭/세미콜론/콤마 자동 인식 + 한글 헤더 자동 매핑
function parseCSV(text) {
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = cleaned.split("\n").filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const headerLine = lines[0];

  // 구분자 자동 감지: 탭 > 세미콜론 > 콤마
  const delimiter =
    headerLine.includes("\t") ? "\t" :
    (headerLine.includes(";") && !headerLine.includes(",")) ? ";" :
    ",";

  const splitLine = (line) => {
    if (delimiter === ",") return splitCSVLine(line);
    return line.split(delimiter).map(v =>
      v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
    );
  };

  const headers = splitLine(headerLine).map(h => h.trim());
  const normHeader = (h) => h.replace(/\s+/g, "");

  const pickIndex = (candidates) => {
    for (const name of candidates) {
      const i = headers.findIndex(h => normHeader(h) === normHeader(name));
      if (i >= 0) return i;
    }
    return -1;
  };

  const idx = {
    title: pickIndex(["도서명", "서명", "제목", "도서제목", "도서 제목"]),
    author: pickIndex(["저자", "지은이", "저자명"]),
    publisher: pickIndex(["출판사", "발행처"]),
    pubyear: pickIndex(["출판년도", "출판연도", "발행년도", "발행연도"]),
    callno: pickIndex(["청구기호", "청구번호", "청구 번호"]),
    regno: pickIndex(["등록번호", "등록 번호"])
  };

  if (idx.title === -1) throw new Error("CSV 첫 줄(헤더)에 '도서명/서명/제목' 컬럼이 없습니다.");
  if (idx.author === -1) throw new Error("CSV 첫 줄(헤더)에 '저자' 컬럼이 없습니다.");
  if (idx.publisher === -1) throw new Error("CSV 첫 줄(헤더)에 '출판사' 컬럼이 없습니다.");
  if (idx.callno === -1) throw new Error("CSV 첫 줄(헤더)에 '청구기호' 컬럼이 없습니다.");

  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = splitLine(lines[i]);
    rows.push({
      title: cols[idx.title] ?? "",
      author: cols[idx.author] ?? "",
      publisher: cols[idx.publisher] ?? "",
      callno: cols[idx.callno] ?? "",
      regno: idx.regno >= 0 ? (cols[idx.regno] ?? "") : "",
      pubyear: idx.pubyear >= 0 ? (cols[idx.pubyear] ?? "") : ""
    });
  }
  return rows;
}

// ✅ CSV 로드 (여기가 핵심!)
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
    const fields = {
      title: normalize(b.title),
      author: normalize(b.author),
      publisher: normalize(b.publisher),
      callno: normalize(b.callno),
      regno: normalize(b.regno),
      pubyear: normalize(b.pubyear),
    };

    if (target === "all") {
      // 통합검색: 등록번호/출판년도도 포함
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
