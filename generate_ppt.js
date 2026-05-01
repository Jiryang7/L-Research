/**
 * generate_ppt.js  —  심리 분석지 PPT 생성기
 * 실행: node generate_ppt.js --input data.json --output result.pptx
 *
 * npm install pptxgenjs
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const path = require("path");

// ─── CLI 인수 파싱 ───────────────────────────────────────────
const args = process.argv.slice(2);
let inputFile = "", outputFile = "output.pptx";
for (let i = 0; i < args.length; i++) {
  if (args[i] === "--input")  inputFile  = args[i + 1];
  if (args[i] === "--output") outputFile = args[i + 1];
}
if (!inputFile) { console.error("--input 파일 경로가 필요합니다"); process.exit(1); }

const payload = JSON.parse(fs.readFileSync(inputFile, "utf8"));
const { meta, analysis } = payload;

// ─── 폰트 ────────────────────────────────────────────────────
// Pretendard가 PPT 뷰어에 설치되어 있어야 정상 렌더링됩니다.
// 다운로드: https://cactus.tistory.com/306  또는  npm i pretendard
const FONT = "Pretendard";

// ─── 색상 팔레트 ─────────────────────────────────────────────
const C = {
  navyDark:  "0D2347",   // 헤더 배경
  navyMid:   "1A3A6B",   // 인포바 배경
  navyLight: "1E4D8C",   // 강조용
  white:     "FFFFFF",
  offWhite:  "F8F9FA",
  tableHdr:  "E8ECF0",
  tableRow1: "FFFFFF",
  tableRow2: "F4F6F8",
  border:    "C8D0DA",
  textMain:  "1A1A2E",
  textMuted: "5A6478",
  accent:    "2563EB",
  strengthBg:"EEF4FF",
  weaknessBg:"FFF1F1",
  improveBg: "FFFBEB",
  suggestBg: "F0FDF4",
  strengthTx:"1E40AF",
  weaknessTx:"991B1B",
  improveTx: "92400E",
  suggestTx: "166534",
};

// ─── 레이아웃 상수 (인치, Portrait A4-like) ───────────────────
const W = 7.5;   // 슬라이드 너비
const H = 10.5;  // 슬라이드 높이

// ─── 헬퍼 함수 ───────────────────────────────────────────────
function hdr(slide, title) {
  // 메인 헤더 배경
  slide.addShape("rect", { x: 0, y: 0, w: W, h: 0.75, fill: { color: C.navyDark } });
  slide.addText(title, {
    x: 0, y: 0, w: W, h: 0.75,
    fontSize: 18, fontFace: FONT, bold: true,
    color: C.white, align: "center", valign: "middle", margin: 0
  });

  // 인포 바
  slide.addShape("rect", { x: 0, y: 0.75, w: W, h: 0.45, fill: { color: C.navyMid } });
  const info = `NAME | ${meta.name}      GENDER | ${meta.gender}      AGE | ${meta.age}      DATE | ${meta.date}`;
  slide.addText(info, {
    x: 0.2, y: 0.75, w: W - 0.4, h: 0.45,
    fontSize: 9, fontFace: FONT, bold: true,
    color: C.white, align: "left", valign: "middle", margin: 0,
    charSpacing: 0.5
  });
}

function sectionLabel(slide, text, x, y) {
  slide.addText(text, {
    x, y, w: 3.6, h: 0.28,
    fontSize: 9, fontFace: FONT, bold: true,
    color: C.navyDark, align: "left", valign: "middle", margin: 0
  });
}

// ─── 슬라이드 1: 내담자용 ─────────────────────────────────────
function buildSlide1(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  // 헤더
  hdr(s, "Personality Type Analysis Results");

  const TOP = 1.28;

  // ── 좌측: ANALYSIS RESULTS ──────────────────────────────────
  sectionLabel(s, "ANALYSIS RESULTS", 0.15, TOP);

  // 레이더 차트 (APTI 점수)
  const scores = meta.scores || {};
  const labels = ["1번","2번","3번","4번","5번","6번","7번","8번","9번"];
  const scoreKeys = [1,2,3,4,5,6,7,8,9];
  const values = scoreKeys.map(k => scores[k] || 0);

  if (values.some(v => v > 0)) {
    s.addChart(pres.charts.RADAR, [{
      name: "TYPE",
      labels: labels,
      values: values
    }], {
      x: 0.1, y: TOP + 0.3, w: 2.3, h: 2.1,
      radarStyle: "standard",
      lineSize: 1.5,
      chartColors: [C.accent],
      catAxisLabelColor: C.textMuted,
      catAxisLabelFontSize: 8,
      showLegend: true,
      legendPos: "t",
      legendFontSize: 7,
      chartArea: { fill: { color: C.white } },
      plotArea: { fill: { color: C.white } }
    });
  }

  // 점수 테이블 (우측)
  const scoreRows = [
    [{ text: "유형", options: { bold: true, fill: { color: C.tableHdr }, color: C.textMain } },
     { text: "점수", options: { bold: true, fill: { color: C.tableHdr }, color: C.textMain } }],
    ...scoreKeys.map((k, i) => [
      { text: `${k}번`, options: { bold: true, fill: { color: i % 2 === 0 ? C.tableRow1 : C.tableRow2 }, color: C.textMain } },
      { text: String(values[i] || "-"), options: { fill: { color: i % 2 === 0 ? C.tableRow1 : C.tableRow2 } } }
    ])
  ];
  s.addTable(scoreRows, {
    x: 2.5, y: TOP + 0.3, w: 1.4, h: 2.1,
    fontSize: 8, fontFace: FONT,
    align: "center", valign: "middle",
    border: { pt: 0.5, color: C.border },
    colW: [0.6, 0.8]
  });

  // ── 우측: SELF CHECK QUESTIONNAIRE ──────────────────────────
  sectionLabel(s, "SELF CHECK QUESTIONNAIRE", 4.05, TOP);

  const checks = analysis.self_check || [];
  const checkItems = checks.map((q, i) => ({
    text: q,
    options: { bullet: true, breakLine: i < checks.length - 1, fontSize: 9, paraSpaceAfter: 8 }
  }));
  s.addText(checkItems, {
    x: 3.95, y: TOP + 0.3, w: 3.35, h: 2.1,
    fontFace: FONT, fontSize: 9,
    color: C.textMain, valign: "top",
    wrap: true, margin: [4, 4, 4, 4]
  });

  // ── 구분선 ──────────────────────────────────────────────────
  s.addShape("line", { x: 0.15, y: TOP + 2.5, w: W - 0.3, h: 0, line: { color: C.border, width: 0.5 } });

  // ── PERSONALITY TABLE ────────────────────────────────────────
  const PT_Y = TOP + 2.62;
  const rowLabels = ["핵심 특성", "행동/사고 패턴", "대인관계/감정", "도전/보완점"];
  const keyMap    = ["핵심특성",  "행동사고패턴",    "대인관계감정",  "도전보완점"];
  const mainLabel = `MAIN (${meta.main_type || "?"}번)`;
  const wingLabel = `WING (${meta.wing_type || "?"}번)`;
  const subLabel  = `SUB  (${meta.sub_type  || "?"}번)`;

  const tableData = [
    [
      { text: "PERSONALITY", options: { bold: true, fill: { color: C.navyDark }, color: C.white, fontSize: 9 } },
      { text: mainLabel,     options: { bold: true, fill: { color: C.navyDark }, color: C.white, fontSize: 9 } },
      { text: wingLabel,     options: { bold: true, fill: { color: C.navyDark }, color: C.white, fontSize: 9 } },
      { text: subLabel,      options: { bold: true, fill: { color: C.navyDark }, color: C.white, fontSize: 9 } }
    ],
    ...rowLabels.map((label, i) => {
      const key = keyMap[i];
      const row = analysis.apti_table?.[key] || {};
      const bg = i % 2 === 0 ? C.tableRow1 : C.tableRow2;
      return [
        { text: label,        options: { bold: true, fill: { color: C.tableHdr }, color: C.textMain, fontSize: 8 } },
        { text: row.main || "", options: { fill: { color: bg }, fontSize: 8, color: C.textMain } },
        { text: row.wing || "", options: { fill: { color: bg }, fontSize: 8, color: C.textMain } },
        { text: row.sub  || "", options: { fill: { color: bg }, fontSize: 8, color: C.textMain } }
      ];
    })
  ];

  s.addTable(tableData, {
    x: 0.15, y: PT_Y, w: W - 0.3, h: 2.05,
    fontSize: 8, fontFace: FONT,
    align: "left", valign: "middle",
    border: { pt: 0.5, color: C.border },
    colW: [1.2, 1.85, 1.85, 1.85],
    autoPage: false
  });

  // ── OVERALL ANALYSIS ────────────────────────────────────────
  const OA_Y = PT_Y + 2.15;

  s.addText("OVERALL ANALYSIS", {
    x: 0.15, y: OA_Y, w: W - 0.3, h: 0.28,
    fontSize: 10, fontFace: FONT, bold: true,
    color: C.navyDark, align: "left", valign: "middle", margin: 0
  });

  // 요약 문장 (굵게, 중앙)
  s.addText(analysis.overall_summary || "", {
    x: 0.15, y: OA_Y + 0.3, w: W - 0.3, h: 0.6,
    fontSize: 10, fontFace: FONT, bold: true,
    color: C.navyDark, align: "center", valign: "middle",
    wrap: true, margin: [0, 8, 0, 8]
  });

  // 4 컬럼 카드 (STRENGTH / WEAKNESS / IMPROVEMENT / SUGGESTIONS)
  const CARD_Y = OA_Y + 1.0;
  const cardW = (W - 0.3) / 2 - 0.1;

  function addCard(slide, x, y, title, items, bg, titleColor) {
    slide.addShape("rect", { x, y, w: cardW, h: 1.55, fill: { color: bg }, line: { color: C.border, width: 0.5 } });
    slide.addText(title, {
      x: x + 0.06, y: y + 0.04, w: cardW - 0.12, h: 0.22,
      fontSize: 8, fontFace: FONT, bold: true,
      color: titleColor, align: "left", valign: "middle", margin: 0
    });
    const bullets = (items || []).map((t, i) => ({
      text: t, options: { bullet: true, breakLine: i < items.length - 1, fontSize: 8, paraSpaceAfter: 3 }
    }));
    slide.addText(bullets, {
      x: x + 0.06, y: y + 0.28, w: cardW - 0.12, h: 1.22,
      fontFace: FONT, fontSize: 8, color: C.textMain,
      valign: "top", wrap: true, margin: 0
    });
  }

  addCard(s, 0.15,             CARD_Y, "STRENGTH(긍정요인)",           analysis.strength,    C.strengthBg, C.strengthTx);
  addCard(s, 0.15 + cardW + 0.2, CARD_Y, "WEAKNESS(위험요인)",          analysis.weakness,    C.weaknessBg, C.weaknessTx);
  addCard(s, 0.15,             CARD_Y + 1.65, "AREA FOR IMPROVEMENT(보완점)", analysis.improvement, C.improveBg,  C.improveTx);
  addCard(s, 0.15 + cardW + 0.2, CARD_Y + 1.65, "SUGGESTIONS(제안)",     analysis.suggestions, C.suggestBg,  C.suggestTx);
}

// ─── 슬라이드 2: 상담사용 ─────────────────────────────────────
function buildSlide2(pres) {
  const s = pres.addSlide();
  s.background = { color: C.white };

  // 헤더
  hdr(s, "Personality Type Analysis Results (상담사용)");

  const TOP = 1.28;

  // ── 상담 대화 시나리오 ──────────────────────────────────────
  s.addText("상담 대화 시나리오", {
    x: 0.15, y: TOP, w: 4, h: 0.3,
    fontSize: 11, fontFace: FONT, bold: true,
    color: C.navyDark, align: "left", valign: "middle", margin: 0
  });

  const scenarios = analysis.scenarios || [];
  const scenarioRows = [
    [
      { text: "목적", options: { bold: true, fill: { color: C.navyDark }, color: C.white, fontSize: 9, align: "center" } },
      { text: "예시 질문", options: { bold: true, fill: { color: C.navyDark }, color: C.white, fontSize: 9, align: "center" } }
    ],
    ...scenarios.map((sc, i) => {
      const bg = i % 2 === 0 ? C.tableRow1 : C.tableRow2;
      return [
        { text: sc.purpose || "", options: { bold: true, fill: { color: C.tableHdr }, fontSize: 9, color: C.textMain, align: "center" } },
        { text: `"${sc.q1}"\n"${sc.q2}"`, options: { fill: { color: bg }, fontSize: 9, color: C.textMain, align: "left" } }
      ];
    })
  ];

  s.addTable(scenarioRows, {
    x: 0.15, y: TOP + 0.35, w: W - 0.3, h: 2.5,
    fontSize: 9, fontFace: FONT,
    align: "left", valign: "middle",
    border: { pt: 0.5, color: C.border },
    colW: [1.6, 5.5],
    autoPage: false
  });

  // ── 라포 형성용 심층 코멘트/질문 ────────────────────────────
  const RAPPORT_Y = TOP + 3.0;

  s.addText("상담사 라포 형성용 심층 코멘트/질문", {
    x: 0.15, y: RAPPORT_Y, w: 6, h: 0.3,
    fontSize: 11, fontFace: FONT, bold: true,
    color: C.navyDark, align: "left", valign: "middle", margin: 0
  });

  const comments = analysis.rapport_comments || [];
  comments.forEach((comment, i) => {
    const cy = RAPPORT_Y + 0.45 + i * 0.85;
    s.addShape("rect", { x: 0.15, y: cy, w: W - 0.3, h: 0.72, fill: { color: C.offWhite }, line: { color: C.border, width: 0.5 } });
    s.addShape("rect", { x: 0.15, y: cy, w: 0.06, h: 0.72, fill: { color: C.accent } });
    s.addText(`"${comment}"`, {
      x: 0.3, y: cy, w: W - 0.45, h: 0.72,
      fontSize: 10, fontFace: FONT, italic: true,
      color: C.textMain, valign: "middle", wrap: true,
      margin: [0, 8, 0, 4]
    });
  });
}

// ─── 메인 실행 ────────────────────────────────────────────────
const pres = new pptxgen();
pres.defineLayout({ name: "PORTRAIT_A4", width: W, height: H });
pres.layout = "PORTRAIT_A4";
pres.author  = "Psy Coach Bot";
pres.title   = "Personality Type Analysis Results";

buildSlide1(pres);
buildSlide2(pres);

pres.writeFile({ fileName: outputFile })
  .then(() => {
    console.log("OK:" + path.resolve(outputFile));
  })
  .catch(err => {
    console.error("ERROR:" + err.message);
    process.exit(1);
  });
