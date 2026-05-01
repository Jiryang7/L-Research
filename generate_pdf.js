/**
 * generate_pdf.js  —  HTML → PDF 변환기 (puppeteer)
 * 실행: node generate_pdf.js --input data.json --output result.pdf
 */
const puppeteer = require("puppeteer-core");
const fs = require("fs");
const path = require("path");

const args = process.argv.slice(2);
let inputFile = "", outputFile = "output.pdf";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--input")  inputFile  = args[i + 1];
  if (args[i] === "--output") outputFile = args[i + 1];
}
if (!inputFile) { console.error("--input required"); process.exit(1); }

const { meta, analysis } = JSON.parse(fs.readFileSync(inputFile, "utf8"));

function radarSVG(scores) {
  const letters = "ABCDEFGHI".split("");
  const vals = letters.map(k => Number(scores[k]) || 0);
  const maxVal = Math.max(...vals, 1);
  const cx = 140, cy = 140, r = 110, n = 9;

  const pt = (i, scale) => {
    const a = -Math.PI / 2 + 2 * Math.PI * i / n;
    return [cx + r * scale * Math.cos(a), cy + r * scale * Math.sin(a)];
  };
  const polyPts = (scale) =>
    Array.from({ length: n }, (_, i) => pt(i, scale).join(",")).join(" ");

  const grids = [0.25, 0.5, 0.75, 1.0].map(lv =>
    `<polygon points="${polyPts(lv)}"
      fill="${lv < 1 ? "rgba(200,208,218,0.12)" : "none"}"
      stroke="#C8D0DA" stroke-width="${lv === 1 ? 1.2 : 0.6}"/>`
  ).join("");

  const axes = Array.from({ length: n }, (_, i) => {
    const [x, y] = pt(i, 1);
    return `<line x1="${cx}" y1="${cy}" x2="${x}" y2="${y}" stroke="#C8D0DA" stroke-width="0.6"/>`;
  }).join("");

  const dataPts = vals
    .map((v, i) => pt(i, Math.min(v / maxVal, 1)).join(","))
    .join(" ");

  const dots = vals.map((v, i) => {
    const [x, y] = pt(i, Math.min(v / maxVal, 1));
    return `<circle cx="${x}" cy="${y}" r="4" fill="#2563EB"/>`;
  }).join("");

  const labels = ["1번","2번","3번","4번","5번","6번","7번","8번","9번"];
  const lblEls = labels.map((lbl, i) => {
    const [x, y] = pt(i, 1.18);
    return `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="middle"
      font-size="11" fill="#5A6478" font-family="sans-serif">${lbl}</text>`;
  }).join("");

  return `<svg width="280" height="280" xmlns="http://www.w3.org/2000/svg">
    ${grids}${axes}
    <polygon points="${dataPts}"
      fill="rgba(37,99,235,0.18)" stroke="#2563EB" stroke-width="2.5" stroke-linejoin="round"/>
    ${dots}${lblEls}
  </svg>`;
}

function buildHTML() {
  const scores  = meta.scores || {};
  const mainNum = (meta.main || "").replace("번", "");
  const wingNum = (meta.wing || "").replace("w", "");
  const subNum  = (meta.sub  || "").replace("번", "");

  const letters   = "ABCDEFGHI".split("");
  const scoreVals = letters.map(k => Number(scores[k]) || 0);

  const rowLabels = ["핵심 특성", "행동/사고 패턴", "대인관계/감정", "도전/보완점"];
  const keyMap    = ["핵심특성",  "행동사고패턴",    "대인관계감정",  "도전보완점"];

  const infoBar = `NAME | ${meta.name}&nbsp;&nbsp;&nbsp;&nbsp;GENDER | ${meta.gender}&nbsp;&nbsp;&nbsp;&nbsp;AGE | ${meta.age}&nbsp;&nbsp;&nbsp;&nbsp;DATE | ${meta.date}`;

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Noto Sans CJK KR', 'Noto Sans KR', 'NanumGothic', sans-serif; color: #1A1A2E; }

.page { width: 210mm; min-height: 297mm; page-break-after: always; overflow: hidden; }

.hdr { background: #0D2347; color: #fff; text-align: center; font-size: 18pt; font-weight: bold; padding: 14px 0; letter-spacing: 0.3px; }
.infobar { background: #1A3A6B; color: #fff; font-size: 9.5pt; font-weight: bold; letter-spacing: 0.6px; padding: 8px 22px; }

.body { padding: 14px 22px 12px; }

/* ── Top Section ── */
.top-row { display: flex; gap: 0; margin-bottom: 14px; }
.left-col { flex: 0 0 auto; }
.sec-lbl { font-size: 11.5pt; font-weight: bold; color: #0D2347; margin-bottom: 8px; }
.chart-score { display: flex; gap: 10px; align-items: flex-start; }
.score-tbl { border-collapse: collapse; font-size: 10pt; }
.score-tbl th { background: #E8ECF0; border: 1px solid #C8D0DA; padding: 4px 12px; font-weight: bold; text-align: center; }
.score-tbl td { border: 1px solid #C8D0DA; padding: 4px 12px; text-align: center; }
.score-tbl tr:nth-child(even) td { background: #F4F6F8; }

.right-col { flex: 1; padding-left: 22px; border-left: 2px solid #E8ECF0; margin-left: 12px; }
.self-list { padding-left: 18px; }
.self-list li { font-size: 11pt; margin-bottom: 12px; line-height: 1.55; }

/* ── Personality Table ── */
.pers-tbl { width: 100%; border-collapse: collapse; margin-bottom: 13px; }
.pers-tbl th { background: #0D2347; color: #fff; padding: 8px 12px; font-size: 10.5pt; text-align: center; border: 1px solid #0D2347; }
.pers-tbl td { border: 1px solid #C8D0DA; padding: 8px 10px; font-size: 10pt; line-height: 1.5; vertical-align: middle; }
.pers-tbl td.row-lbl { background: #E8ECF0; font-weight: bold; text-align: center; width: 14%; }
.pers-tbl tr:nth-child(odd) td:not(.row-lbl) { background: #fff; }
.pers-tbl tr:nth-child(even) td:not(.row-lbl) { background: #F4F6F8; }

/* ── Overall Analysis ── */
.overall-title { font-size: 12.5pt; font-weight: bold; color: #0D2347; margin-bottom: 7px; }
.overall-summary {
  font-size: 12pt; font-weight: bold; color: #0D2347;
  text-align: center; line-height: 1.6; margin-bottom: 13px;
  padding: 10px 16px; background: #EEF4FF; border-radius: 5px;
  border-left: 4px solid #2563EB;
}
.cards { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; }
.card { border-radius: 5px; padding: 11px 13px; border: 1px solid #C8D0DA; }
.card-ttl { font-size: 10.5pt; font-weight: bold; margin-bottom: 7px; }
.card ul { padding-left: 16px; }
.card li { font-size: 10pt; margin-bottom: 4px; line-height: 1.45; }
.s  { background: #EEF4FF; } .s  .card-ttl { color: #1E40AF; }
.w  { background: #FFF1F1; } .w  .card-ttl { color: #991B1B; }
.im { background: #FFFBEB; } .im .card-ttl { color: #92400E; }
.su { background: #F0FDF4; } .su .card-ttl { color: #166534; }

/* ── Page 2 ── */
.sc-tbl { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
.sc-tbl th { background: #0D2347; color: #fff; padding: 10px 16px; font-size: 11pt; }
.sc-tbl td { border: 1px solid #C8D0DA; padding: 11px 16px; font-size: 11pt; line-height: 1.65; vertical-align: middle; }
.sc-tbl td.purpose { background: #E8ECF0; font-weight: bold; text-align: center; width: 22%; }
.sc-tbl tr:nth-child(even) td:not(.purpose) { background: #F4F6F8; }

.rapport { display: flex; margin-bottom: 14px; border: 1px solid #C8D0DA; border-radius: 5px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.rapport-bar { width: 7px; background: #2563EB; flex-shrink: 0; }
.rapport-txt { padding: 15px 20px; font-size: 12pt; font-style: italic; line-height: 1.65; background: #F8F9FA; }

@media print { .page { page-break-after: always; } }
</style>
</head>
<body>

<!-- PAGE 1 -->
<div class="page">
  <div class="hdr">Personality Type Analysis Results</div>
  <div class="infobar">${infoBar}</div>
  <div class="body">

    <div class="top-row">
      <div class="left-col">
        <div class="sec-lbl">ANALYSIS RESULTS</div>
        <div class="chart-score">
          ${radarSVG(scores)}
          <table class="score-tbl">
            <tr><th>유형</th><th>점수</th></tr>
            ${scoreVals.map((v,i) => `<tr><td><b>${i+1}번</b></td><td>${v}</td></tr>`).join("")}
          </table>
        </div>
      </div>
      <div class="right-col">
        <div class="sec-lbl">SELF CHECK QUESTIONNAIRE</div>
        <ul class="self-list">
          ${(analysis.self_check||[]).map(q=>`<li>${q}</li>`).join("")}
        </ul>
      </div>
    </div>

    <table class="pers-tbl">
      <tr>
        <th>PERSONALITY</th>
        <th>MAIN (${mainNum}번)</th>
        <th>WING (${wingNum}번)</th>
        <th>SUB (${subNum}번)</th>
      </tr>
      ${rowLabels.map((lbl,i) => {
        const row = (analysis.apti_table||{})[keyMap[i]] || {};
        return `<tr>
          <td class="row-lbl">${lbl}</td>
          <td>${row.main||""}</td>
          <td>${row.wing||""}</td>
          <td>${row.sub||""}</td>
        </tr>`;
      }).join("")}
    </table>

    <div class="overall-title">OVERALL ANALYSIS</div>
    <div class="overall-summary">${analysis.overall_summary||""}</div>

    <div class="cards">
      <div class="card s">
        <div class="card-ttl">STRENGTH (긍정요인)</div>
        <ul>${(analysis.strength||[]).map(t=>`<li>${t}</li>`).join("")}</ul>
      </div>
      <div class="card w">
        <div class="card-ttl">WEAKNESS (위험요인)</div>
        <ul>${(analysis.weakness||[]).map(t=>`<li>${t}</li>`).join("")}</ul>
      </div>
      <div class="card im">
        <div class="card-ttl">AREA FOR IMPROVEMENT (보완점)</div>
        <ul>${(analysis.improvement||[]).map(t=>`<li>${t}</li>`).join("")}</ul>
      </div>
      <div class="card su">
        <div class="card-ttl">SUGGESTIONS (제안)</div>
        <ul>${(analysis.suggestions||[]).map(t=>`<li>${t}</li>`).join("")}</ul>
      </div>
    </div>

  </div>
</div>

<!-- PAGE 2 -->
<div class="page">
  <div class="hdr">Personality Type Analysis Results (상담사용)</div>
  <div class="infobar">${infoBar}</div>
  <div class="body">

    <div class="sec-lbl" style="margin-bottom:12px;">상담 대화 시나리오</div>
    <table class="sc-tbl">
      <tr><th>목적</th><th>예시 질문</th></tr>
      ${(analysis.scenarios||[]).map(sc=>`
        <tr>
          <td class="purpose">${sc.purpose||""}</td>
          <td>"${sc.q1||""}"<br/><br/>"${sc.q2||""}"</td>
        </tr>
      `).join("")}
    </table>

    <div class="sec-lbl" style="margin-bottom:14px;">상담사 라포 형성용 심층 코멘트/질문</div>
    ${(analysis.rapport_comments||[]).map(c=>`
      <div class="rapport">
        <div class="rapport-bar"></div>
        <div class="rapport-txt">"${c}"</div>
      </div>
    `).join("")}

  </div>
</div>

</body>
</html>`;
}

async function main() {
  const execPath = process.env.PUPPETEER_EXECUTABLE_PATH || "/usr/bin/chromium";
  const browser = await puppeteer.launch({
    executablePath: execPath,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"]
  });
  const page = await browser.newPage();
  await page.setContent(buildHTML(), { waitUntil: "domcontentloaded" });
  await page.pdf({
    path: outputFile,
    format: "A4",
    printBackground: true,
    margin: { top: "0", right: "0", bottom: "0", left: "0" }
  });
  await browser.close();
  console.log("OK:" + path.resolve(outputFile));
}

main().catch(err => {
  console.error("ERROR:" + err.message);
  process.exit(1);
});
