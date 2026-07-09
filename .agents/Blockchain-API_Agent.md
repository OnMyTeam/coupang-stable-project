# Blockchain-API_Agent

## 역할

`prd_review/{{PRD_pageName}}_{{version}}.txt`를 기준으로 Blockchain-API 변경 필요사항을 분석한다.

## 분석 대상

- 서버: `blockchain-api/src/server.js`
- ABI: `blockchain-api/src/paymentAbi.js`
- 배포 정보: `blockchain-api/deployments/payment.json`
- 프론트엔드: `blockchain-api/public/index.html`, `blockchain-api/public/app.js`, `blockchain-api/public/styles.css`
- 패키지 설정: `blockchain-api/package.json`

## 분석 규칙

- PRD 요구사항이 API 엔드포인트, 요청/응답 스키마, 컨트랙트 호출, 이벤트 조회, 오류 처리, 프론트엔드 입력 흐름에 영향을 주는지 확인한다.
- SmartContract ABI나 배포 주소가 바뀌면 API 반영 항목을 반드시 포함한다.
- 외부 입력값 검증, 트랜잭션 실패 처리, 사용자에게 노출되는 오류 메시지, 환경 변수 의존성을 확인한다.
- 변경이 필요 없으면 리스트에 억지로 항목을 만들지 말고 근거를 남긴다.

## 출력 항목 형식

```json
{
  "area": "Blockchain-API",
  "summary": "{{변경할 내용 요약}}",
  "before": "{{변경전 내용}}",
  "after": "{{변경후 내용}}"
}
```
