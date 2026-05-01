"""
analyze.py  —  Gemini API 심리 분석 모듈
"""
import google.generativeai as genai
import json
import re
import os

genai.configure(api_key=os.environ.get("GOOGLE_API_KEY", ""))

SYSTEM_PROMPT = """당신은 MBTI, APTI(주성향+날개+서브), 직업, 고민/관심사를 기반으로
내담자의 심리 성향을 심층 분석하는 전문 심리 코치입니다.

반드시 순수한 JSON만 반환하세요. 마크다운 코드블록(```json)이나 설명 텍스트를 절대 포함하지 마세요.
모든 텍스트 값은 간결하고 실용적으로 작성하세요 (불릿 형태, 핵심 위주).
"""

def build_analysis_prompt(data: dict) -> str:
    return f"""
다음 내담자 정보를 분석하여 JSON 형식으로만 응답하세요.

# 내담자 정보
- 이름: {data.get('name', 'OOO')}
- 나이: {data.get('age', '')}세
- 성별: {data.get('gender', '')}
- 직업: {data.get('job', '')}
- MBTI: {data.get('mbti', '')}
- 현재 상황: {data.get('situation', '')}
- APTI 주성향: {data.get('main', '')}
- 날개성향: {data.get('wing', '')}
- 서브성향: {data.get('sub', '')}

# 분석 지침
## APTI 성향 분석
- 주성향/날개성향/서브성향 각각에 대해 핵심 특성, 행동/사고 패턴, 대인관계/감정, 도전/보완점을 분석
- 에니어그램 이론 기반으로 각 성향의 고유한 특징과 상호작용 패턴을 반영
- 내담자가 자기 이해에 도움이 되도록 구체적이고 실용적으로 작성

## 자가체크 질문
- 분석 내용을 기반으로 내담자가 부담 없이 확인할 수 있는 가벼운 질문 3개
- "예/아니오"로 대답할 수 있는 형태

## 종합 분석
- 긍정요인: 강점 및 자원 2-3개 (불릿, 30자 이내)
- 위험요인: 주의가 필요한 패턴 2-3개 (불릿, 30자 이내)
- 보완사항: 개선이 필요한 영역 2-3개 (불릿, 30자 이내)
- 제안: 실질적 행동 제안 2-3개 (불릿, 30자 이내)

## 종합 결론
- 2-3문장으로 성향의 흐름과 성장 방향 요약
- 멘탈 트레이닝/실습 적용의 필요성을 자연스럽게 포함

## 상담 대화 시나리오
- 3개 시나리오 (목적 한 줄 + 예시 질문 2개)
- 내담자가 압박 느끼지 않도록 열린 질문 형태

## 라포 형성용 코멘트
- 4개의 심층 코멘트/질문 (상담사가 사용할 수 있는 공감형 문장)

# 응답 JSON 구조 (이 형식 그대로 반환)
{{
  "apti_table": {{
    "핵심특성": {{
      "main": "주성향 핵심 특성 (40자 이내)",
      "wing": "날개성향 핵심 특성 (40자 이내)",
      "sub": "서브성향 핵심 특성 (40자 이내)"
    }},
    "행동사고패턴": {{
      "main": "주성향 행동패턴 (40자 이내)",
      "wing": "날개 행동패턴 (40자 이내)",
      "sub": "서브 행동패턴 (40자 이내)"
    }},
    "대인관계감정": {{
      "main": "주성향 대인/감정 (40자 이내)",
      "wing": "날개 대인/감정 (40자 이내)",
      "sub": "서브 대인/감정 (40자 이내)"
    }},
    "도전보완점": {{
      "main": "주성향 도전/보완 (40자 이내)",
      "wing": "날개 도전/보완 (40자 이내)",
      "sub": "서브 도전/보완 (40자 이내)"
    }}
  }},
  "self_check": [
    "자가체크 질문 1",
    "자가체크 질문 2",
    "자가체크 질문 3"
  ],
  "overall_summary": "주성향+날개+서브를 통합한 핵심 요약 (2줄, 굵게 표시될 메인 카피)",
  "strength": ["긍정요인1", "긍정요인2", "긍정요인3"],
  "weakness": ["위험요인1", "위험요인2", "위험요인3"],
  "improvement": ["보완사항1", "보완사항2", "보완사항3"],
  "suggestions": ["제안1", "제안2", "제안3"],
  "conclusion": "종합 결론 2-3문장",
  "scenarios": [
    {{
      "purpose": "시나리오1 목적 (한 줄)",
      "q1": "예시 질문 1",
      "q2": "예시 질문 2"
    }},
    {{
      "purpose": "시나리오2 목적 (한 줄)",
      "q1": "예시 질문 1",
      "q2": "예시 질문 2"
    }},
    {{
      "purpose": "시나리오3 목적 (한 줄)",
      "q1": "예시 질문 1",
      "q2": "예시 질문 2"
    }}
  ],
  "rapport_comments": [
    "라포 코멘트/질문 1",
    "라포 코멘트/질문 2",
    "라포 코멘트/질문 3",
    "라포 코멘트/질문 4"
  ]
}}
"""

_model = genai.GenerativeModel(
    model_name="gemini-2.0-flash",
    system_instruction=SYSTEM_PROMPT
)

def analyze(data: dict) -> dict:
    """Gemini API 호출 후 JSON 파싱하여 반환"""
    response = _model.generate_content(build_analysis_prompt(data))
    raw = response.text.strip()
    raw = re.sub(r'^```(?:json)?\s*', '', raw)
    raw = re.sub(r'\s*```$', '', raw)
    return json.loads(raw)
