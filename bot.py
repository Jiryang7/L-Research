"""
bot.py  —  텔레그램 봇 메인
실행: python bot.py

입력 형식 (텔레그램 메시지):
이름: 홍길동
나이: 35
성별: 여
직업: 코치
MBTI: INFJ
상황: 번아웃 이후 방향성을 잃은 상태
APTI 주성향: 1번
날개: 9w
서브: 5번
점수A: 29
점수B: 20
점수C: 23
점수D: 34
점수E: 33
점수F: 15
점수G: 31
점수H: 36
점수I: 41
"""

import os
import re
import json
import subprocess
import tempfile
import logging
from datetime import datetime
from pathlib import Path

from telegram import Update
from telegram.ext import (
    Application, MessageHandler, CommandHandler,
    ContextTypes, filters
)

from analyze import analyze

# ─── 설정 ────────────────────────────────────────────────────
TELEGRAM_TOKEN = os.environ.get("TELEGRAM_TOKEN", "")
PPT_SCRIPT     = Path(__file__).parent / "generate_ppt.js"

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger(__name__)

# ─── 입력 파싱 ───────────────────────────────────────────────
def parse_input(text: str) -> dict | None:
    """텔레그램 메시지를 key:value 딕셔너리로 파싱"""
    field_map = {
        "이름":           "name",
        "나이":           "age",
        "성별":           "gender",
        "직업":           "job",
        "mbti":           "mbti",
        "MBTI":           "mbti",
        "상황":           "situation",
        "apti 주성향":    "main",
        "APTI 주성향":    "main",
        "날개":           "wing",
        "서브":           "sub",
        **{f"점수{c}": f"score_{c}" for c in "ABCDEFGHI"},
        **{f"점수{c.lower()}": f"score_{c}" for c in "ABCDEFGHI"},
    }
    result = {}
    for line in text.strip().splitlines():
        if ":" not in line:
            continue
        key, _, val = line.partition(":")
        key = key.strip()
        val = val.strip()
        mapped = field_map.get(key) or field_map.get(key.upper()) or field_map.get(key.lower())
        if mapped:
            result[mapped] = val

    # 필수 필드 확인
    required = {"name", "age", "gender", "job", "main"}
    if not required.issubset(result.keys()):
        return None

    # 점수 딕셔너리 조립
    result["scores"] = {
        c: int(result.pop(f"score_{c}", 0) or 0)
        for c in "ABCDEFGHI"
    }

    # 날짜
    result["date"] = datetime.now().strftime("%b %d, %Y").upper()

    return result


# ─── PPT 생성 ────────────────────────────────────────────────
def build_ppt(meta: dict, analysis_result: dict) -> str:
    """JSON → Node.js generate_ppt.js → .pptx 경로 반환"""
    tmpdir = tempfile.mkdtemp()
    data_path = os.path.join(tmpdir, "data.json")
    ppt_path  = os.path.join(tmpdir, "result.pptx")

    with open(data_path, "w", encoding="utf-8") as f:
        json.dump({"meta": meta, "analysis": analysis_result}, f, ensure_ascii=False, indent=2)

    result = subprocess.run(
        ["node", str(PPT_SCRIPT), "--input", data_path, "--output", ppt_path],
        capture_output=True, text=True, timeout=60
    )

    if result.returncode != 0 or not os.path.exists(ppt_path):
        raise RuntimeError(f"PPT 생성 실패:\n{result.stderr}")

    return ppt_path


# ─── 핸들러 ──────────────────────────────────────────────────
async def start(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    msg = (
        "👋 안녕하세요! 심리 분석 봇입니다.\n\n"
        "아래 양식으로 정보를 보내주세요:\n\n"
        "```\n"
        "이름: 홍길동\n"
        "나이: 35\n"
        "성별: 여\n"
        "직업: 코치\n"
        "MBTI: INFJ\n"
        "상황: 번아웃 이후 방향을 잃은 상태\n"
        "APTI\n"
"1번: 41\n"
"2번: 20\n"
"3번: 23\n"
"4번: 34\n"
"5번: 33\n"
"6번: 15\n"
"7번: 31\n"
"8번: 36\n"
"9번: 29\n"
    )
    await update.message.reply_text(msg, parse_mode="Markdown")


async def handle_message(update: Update, ctx: ContextTypes.DEFAULT_TYPE):
    text = update.message.text or ""

    # 파싱
    meta = parse_input(text)
    if not meta:
        await update.message.reply_text(
            "⚠️ 입력 형식을 확인해주세요.\n/start 명령으로 양식을 확인하세요."
        )
        return

    progress = await update.message.reply_text("🔄 분석 중입니다... (15~30초 소요)")

    try:
        # Claude API 분석
        log.info(f"분석 시작: {meta['name']}")
        result = analyze(meta)

        # PPT 생성
        log.info("PPT 생성 중...")
        ppt_path = build_ppt(meta, result)

        # 파일 전송
        filename = f"분석지_{meta['name']}_{datetime.now().strftime('%Y%m%d')}.pptx"
        with open(ppt_path, "rb") as f:
            await update.message.reply_document(
                document=f,
                filename=filename,
                caption=f"✅ {meta['name']}님 분석 완료!"
            )
        log.info(f"전송 완료: {filename}")

    except Exception as e:
        log.error(f"오류 발생: {e}", exc_info=True)
        await update.message.reply_text(f"❌ 오류가 발생했습니다:\n{str(e)[:200]}")
    finally:
        try:
            await progress.delete()
        except Exception:
            pass


# ─── 실행 ────────────────────────────────────────────────────
def main():
    if not TELEGRAM_TOKEN:
        raise ValueError("TELEGRAM_TOKEN 환경변수를 설정하세요")

    app = Application.builder().token(TELEGRAM_TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))

    log.info("봇 시작됨")
    app.run_polling(allowed_updates=Update.ALL_TYPES)


if __name__ == "__main__":
    main()