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
  const cleaned = text.replace(/^\uFEFF/, "").replace(/\r/g, "");
  const lines = cleaned.split("\n").filter(l => l.trim() !== "");
  if (lines.length < 2) return [];

  const headerLine = lines[0];

  // ✅ 구분자 자동 감지: 탭(\t) > 세미콜론(;) > 콤마(,)
  const delimiter =
    headerLine.includes("\t") ? "\t" :
    (headerLine.includes(";") && !headerLine.includes(",")) ? ";" :
    ",";

  const splitLine = (line) => {
    if (delimiter === ",") return splitCSVLine(line); // 기존 따옴표 대응 함수 사용
    // 탭/세미콜론은 일반 split로 충분한 경우가 대부분(엑셀 내보내기)
    return line.split(delimiter).map(v =>
      v.trim().replace(/^"|"$/g, "").replace(/""/g, '"')
    );
  };

  const headers = splitLine(headerLine).map(h => h.trim());

  const pickIndex = (candidates) => {
    for (const name of candidates) {
      const i = headers.findIndex(h =>
        h.replace(/\s+/g, "") === name.replace(/\s+/g, "")
      );
      if (i >= 0) return i;
    }
    return -1;
  };

  const idx = {
    title: pickIndex(["도서명", "서명", "제목", "도서제목", "도서 제목"]),
    author: pickIndex(["저자", "지은이", "저자명"]),
    publisher: pickIndex(["출판사", "발행처"]),
    pubyear: pickIndex(["출판년도", "발행년도", "출판연도", "발행연도"]),
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

