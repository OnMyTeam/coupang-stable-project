## 개발자 커피타임 보존 AI Agent

이 저장소에서 Codex는 Jira/Confluence PRD 업데이트를 기준으로 SmartContract와 Blockchain-API 변경사항을 분석하고, 승인 단계를 거쳐 구현, 검증, 배포 안내까지 진행한다.

### 기본 원칙

- 모든 Jira 또는 Confluence 관련 문서 확인 요청은 반드시 Jira MCP를 사용한다.
- Notion은 어떤 단계에서도 사용하지 않는다.
- Jira MCP가 현재 세션에서 사용할 수 없으면 웹 검색이나 추측으로 대체하지 말고, Jira MCP 연결이 필요하다고 사용자에게 알린다.
- SmartContract 주 분석 대상은 `smartcontract/src/Payment.sol`이다. 사용자가 `smartcontract/src/payment.sol`로 지칭해도 동일 파일로 해석한다.
- Blockchain-API 주 분석 대상은 `blockchain-api/src/server.js`, `blockchain-api/src/paymentAbi.js`, `blockchain-api/public/*`, `blockchain-api/deployments/payment.json`이다.
- 기존 사용자 변경사항을 되돌리지 않는다.

### PRD 업데이트 분석 트리거

사용자가 다음 형식으로 요청하면 PRD 업데이트 분석 워크플로를 시작한다.

```text
현재 {{JIRA Page}} PRD 업데이트 내용 분석해서 SmartContract와 Blockchain-API 수정사항 알려줘
```

진행 순서:

1. Jira MCP로 `{{JIRA Page}}`의 최신 PRD/Confluence 내용을 확인한다.
2. SmartContract와 Blockchain-API에 영향을 주는 요구사항만 추출한다.
3. 분석 결과를 `prd_review/{{PRD_pageName}}_ver1.txt`에 저장한다.
4. 같은 PRD에 대해 새 버전이 필요하면 기존 파일을 확인한 뒤 `ver2`, `ver3`처럼 증가시킨다.

`prd_review` 파일 형식:

```text
# {{PRD_pageName}} {{version}} PRD 분석

## 문서 정보
- Jira Page: {{JIRA Page}}
- 분석 일시: {{YYYY-MM-DD HH:mm KST}}
- 대상 영역: SmartContract, Blockchain-API

## PRD 핵심 변경사항
1. {{변경사항 요약}}

## SmartContract 영향
- {{영향 및 근거}}

## Blockchain-API 영향
- {{영향 및 근거}}

## 확인 필요 사항
- {{모호하거나 사용자 확인이 필요한 항목}}
```

### 역할 에이전트

PRD 분석 파일이 만들어지면 다음 두 역할을 기준으로 변경 리스트를 작성한다.

- Contract_Agent: `.agents/Contract_Agent.md`
- Blockchain-API_Agent: `.agents/Blockchain-API_Agent.md`

두 역할의 분석 결과를 합쳐 `list/{{PRD_pageName}}_{{version}}.json`에 저장한다.

리스트 JSON 형식:

```json
{
  "prdPageName": "{{PRD_pageName}}",
  "version": "{{version}}",
  "sourceReview": "prd_review/{{PRD_pageName}}_{{version}}.txt",
  "items": [
    {
      "number": 1,
      "area": "SmartContract",
      "summary": "{{변경할 내용 요약}}",
      "before": "{{변경전 내용}}",
      "after": "{{변경후 내용}}",
      "status": "pending"
    }
  ]
}
```

### 승인 및 개발 진행

`list/{{PRD_pageName}}_{{version}}.json` 작성 후 번호 순서대로 하나씩 사용자 채팅과 Slack에 알린다.

- Slack 알림은 `#stable-project-codex` 채널로 전달한다.
- 채널 ID가 필요한 경우 `C0BG04CV3FD`를 사용한다.

알림 형식:

```text
{{번호}}. {{변경할 내용 요약}}
- 변경전: {{내용}}
- 변경후: {{내용}}

응답: 1:진행, 2:스킵, 3:코멘트
```

진행 규칙:

- 각 번호는 `1`, `2`, `3` 중 하나의 응답을 받은 뒤에만 다음 번호로 넘어간다.
- 사용자 채팅 응답과 Slack thread 응답은 동일한 승인 입력으로 처리한다.
- Slack MCP가 사용 가능하면 승인 알림을 보낸 뒤 해당 thread의 최신 사용자 응답을 확인한다.
- Slack에서 `1`, `2`, `3` 또는 `1:진행`, `2:스킵`, `3:코멘트` 형식의 응답이 오면 채팅 응답을 받은 것과 동일하게 계속 진행한다.
- Slack과 채팅 양쪽에 응답이 모두 있는 경우 먼저 확인한 유효 응답을 기준으로 처리하고, 이후 충돌 응답이 보이면 사용자에게 확인한다.
- `1:진행`이면 해당 변경사항을 구현한다.
- `2:스킵`이면 구현하지 않고 리스트 상태를 `skipped`로 기록한다.
- `3:코멘트`이면 코멘트 내용을 반영해 해당 항목을 재분석하거나 수정한 뒤 개발한다.
- Slack MCP가 사용할 수 없으면 사용자에게 Slack 연결이 필요하다고 알리고 채팅 승인 흐름은 계속 진행한다.

### SmartContract와 HTML 자동 동기화

- SmartContract에 외부에서 호출 가능한 `public` 또는 `external` 함수가 추가, 변경, 삭제되면 Blockchain-API 연동 영향으로 간주한다.
- 함수 ABI, 이벤트, 에러, 배포 주소가 바뀌면 `blockchain-api/deployments/payment.json`, `blockchain-api/src/paymentAbi.js`, `blockchain-api/src/server.js` 반영 여부를 확인한다.
- 새로 추가된 컨트랙트 호출 함수가 사용자가 직접 실행할 수 있는 기능이면 `blockchain-api/public/index.html`에 해당 입력 폼 또는 버튼을 자동으로 추가한다.
- HTML을 수정할 때 필요한 경우 `blockchain-api/public/app.js`와 `blockchain-api/public/styles.css`도 함께 수정해 실제 호출 흐름이 동작하게 한다.
- 이 HTML/API 동기화는 별도 승인 항목이 없어도 해당 SmartContract 변경의 필수 후속 작업으로 처리한다. 단, 기능 범위가 PRD를 넘어서는 새 정책 판단이 필요하면 사용자에게 확인한다.
- 프론트엔드에 노출하는 호출명, 입력값, 출력값은 컨트랙트 ABI와 JSON-RPC 메서드명에 맞춘다.

### 구현 및 검증

- SmartContract 변경 후에는 가능한 범위에서 `smartcontract` 테스트를 실행한다.
- Blockchain-API 변경 후에는 가능한 범위에서 API 또는 프론트엔드 동작을 확인한다.
- ABI, 배포 주소, 컨트랙트 이벤트/함수 시그니처가 바뀌면 SmartContract와 Blockchain-API 양쪽 반영 여부를 확인한다.
- 보안 관련 변경은 권한, 재진입, 입력 검증, 이벤트 로그, 상태 변경 순서를 검토한다.

### 최종 리포트

승인된 모든 항목 개발이 완료되면 최종 리포트를 작성하고 Slack에 알린다.

최종 리포트 형식:

```text
# {{PRD_pageName}} {{version}} 최종 리포트

## 완료 항목
- {{번호}}. {{요약}}

## 스킵 항목
- {{번호}}. {{요약 및 사유}}

## 테스트/검증
- {{실행한 명령 및 결과}}

## 보안성 검토
- {{검토 결과}}

응답: 1:확인, 2:코멘트
```

최종 리포트 응답 규칙:

- `1:확인`이면 최종 보안성 검토를 한 번 더 수행하고 완료 처리한다.
- `2:코멘트`이면 코멘트에 해당하는 리스트 항목을 다시 수정한다.
- 최종 리포트의 `1`, `2` 응답도 사용자 채팅과 Slack thread 양쪽에서 받을 수 있다.

### 배포 명령

리스트 전체 개수와 `확인` 처리된 개수가 일치하면 `smartcontract` 폴더에서 다음 명령을 실행한다.

```powershell
node scripts/deploy-payment.mjs
```

명령 완료 후 사용자 채팅과 Slack에 GitHub Push 여부를 묻는다.

```text
배포 명령이 완료되었습니다. GitHub에 Push할까요?
응답: 1:진행, 2:스킵
```

- `1:진행`이면 변경사항 확인 후 커밋/푸시 절차를 진행한다.
- `2:스킵`이면 푸시하지 않고 현재 상태를 보고한다.
- 배포와 Push 확인 응답도 사용자 채팅과 Slack thread 양쪽에서 받을 수 있다.

### 필수 작업

1. Jira 관련 요청은 Jira MCP를 활용한다.
