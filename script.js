// LH행복마을작은도서관 자료검색 - script.js

// ✅ 여기 BOOKS만 엑셀 장서목록에 맞게 늘리면 됩니다.
const BOOKS = [
  { title: "아몬드", author: "손원평", publisher: "창비", callno: "813.7-손66ㅇ" },
  { title: "불편한 편의점", author: "김호연", publisher: "나무옆의자", callno: "813.7-김95ㅂ" },
  { title: "사피엔스", author: "유발 하라리", publisher: "김영사", callno: "909-하292ㅅ" }
];

// DOM
const $target = document.getElementById("target");
const $q = document.getElementById("q");
const $btn = document.getElementById("searchBtn");
const $tbody = document.getElementById("tbody");
const $hint = document.getElementById("hint");

// 유틸: 띄어쓰기 무시 + 소문자
function normalize(text) {
  return (text ?? "")
    .toString()
    .trim()
    .replace(/\s+/g, "")
    .toLowerCase();
}

// 유틸: XSS 방지용(표시용)
function escapeHtml(str) {
  return (str ?? "").toString().replace(/[&<>"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  }[m]));
}

function renderInitial() {
  $hint.textContent = "검색 결과: 0권 · 도서명, 저자, 출판사로 검색할 수 있습니다.";
  $tbody.innerHTML = `
    <tr>
      <td class="empty" colspan="4">
        도서명 또는 저자를 입력한 후 [검색] 버튼을 눌러주세요.
      </td>
    </tr>
  `;
}

function renderEmptyResult() {
  $tbody.innerHTML = `
    <tr>
      <td class="empty" colspan="4">
        해당 도서가 없습니다. 다른 검색어로 다시 시도해 주세요.
      </td>
    </tr>
  `;
}

function renderRows(rows) {
  $tbody.innerHTML = rows.map(b => `
    <tr>
      <td>${escapeHtml(b.title)}</td>
      <td>${escapeHtml(b.author)}</td>
      <td>${escapeHtml(b.publisher)}</td>
      <td>${escapeHtml(b.callno)}</td>
    </tr>
  `).join("");
}

function doSearch() {
  const qRaw = $q.value.trim();
  const nq = normalize(qRaw);

  if (!nq) {
    renderInitial();
    return;
  }

  const target = $target.value;

  const results = BOOKS.filter(b => {
    const fields = {
      title: normalize(b.title),
      author: normalize(b.author),
      publisher: normalize(b.publisher),
      callno: normalize(b.callno),
    };

    if (target === "all") {
      return Object.values(fields).some(v => v.includes(nq));
    }
    return (fields[target] || "").includes(nq);
  });

  $hint.textContent = `검색 결과: ${results.length}권`;

  if (results.length === 0) {
    renderEmptyResult();
    return;
  }

  renderRows(results);
}

// 이벤트
$btn.addEventListener("click", doSearch);
$q.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doSearch();
});

// 첫 화면
renderInitial();
