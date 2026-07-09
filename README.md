## 개발자 커피타임 보존 AI Agent

### 문서확인
문서는 Jira페이지에 있는 내용을 확인하며 Jira MCP를 활용한다.
SmartContract는 'smartcontract/src/payment.sol' 위치한다.

### jira confluence 기획문서가 업데이트 되면 CODEX 채팅창 입력
- 입력내용: "현재 {{JRIA Page}} PRD 업데이트 내용 분석해서 SmartContract와 Blockchain-API 수정사항 알려줘"
- 분석한 내용을 특정 양식으로 로컬 환경의 prd_review/'{{PRD_pageName}}_ver1.txt'로 저장

### Contract_Agent, Blockchain-API_Agent 2개 생성
- prd_review/{{PRD_pageName}}_{{version}}.txt 내용을 기준으로 SmartContract와 Blockchain-API를 분석하여 수정할 리스트를 작성한다.
- 리스트는 list/{{PRD_pageName}}_{{version}}.json
- 리스트 양식
    {{번호}}: {{변경할 내용 요약}}
    - 변경전: {{내용}}
    - 변경후: {{내용}}

### 작성한 list/{{PRD_pageName}}_{{version}}.json 번호 순서대로 내용을 채팅과 Slack에 알림
- 1:진행, 2:스킵, 3:코멘트
- 3 코멘트 내용에 따라 개발 진행
- 1,2,3에 대한 응답이 있어야 그 다음 번호를 채팅과 Slack에 알람 가능

### 모두 개발이 완료되면 최종 리포트 작성해서 다시 Slack으로 알림
- 1:확인, 2:코멘트
- 1 확인이 되면 최종 보안성 검토 후 완료
- 2 코멘트 내용에 따라 특정 리스트 다시 수정

### 리스트 개수와 '확인' 개수가 일치하면 smartcontract폴더 위치에서 'node scripts/deploy-payment.mjs' 명령어 실행

### 명령어 완료되면 Github에 Push할건지 채팅과 슬랙 알림
- 1: 진행, 2:스킵

## 필수작업
1. Jira관련 요청은 Jira MCP를 활용한다.
2. Notion 사용 금지