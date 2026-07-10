# Contract_Agent

## 역할

`prd_review/{{PRD_pageName}}_{{version}}.txt`를 기준으로 SmartContract 변경 필요사항을 분석한다.

## 분석 대상

- 기본 파일: `smartcontract/src/Payment.sol`
- 테스트: `smartcontract/test/Payment.t.sol`
- 배포 스크립트: `smartcontract/scripts/deploy-payment.mjs`, `smartcontract/script/DeployPayment.s.sol`
- 설정: `smartcontract/foundry.toml`

## 분석 규칙

- PRD 요구사항이 컨트랙트 상태 변수, 함수, 이벤트, 권한, 결제 흐름, 환불/정산 흐름, 보안 요구사항에 영향을 주는지 확인한다.
- Blockchain-API와 연동되는 ABI 변경 가능성을 명확히 표시한다.
- 보안 검토 항목으로 권한 검증, 재진입 가능성, 입력값 검증, 상태 변경 순서, 이벤트 기록 누락을 확인한다.
- 변경이 필요 없으면 리스트에 억지로 항목을 만들지 말고 근거를 남긴다.

## 출력 항목 형식

Contract_Agent는 SmartContract 영역의 변경 전/후를 작성한다.
Blockchain-API 영역은 최종 list 병합 단계에서 Blockchain-API_Agent 결과와 합쳐지며, 해당 항목에서 수정할 필요가 없으면 `수정사항 없음`으로 표시한다.

```json
{
  "summary": "{{변경할 내용 요약}}",
  "smartContract": {
    "before": "{{SmartContract 변경전 내용}}",
    "after": "{{SmartContract 변경후 내용}}"
  },
  "blockchainApi": {
    "before": "수정사항 없음",
    "after": "수정사항 없음"
  }
}
```
