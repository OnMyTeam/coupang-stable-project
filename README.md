## 개발자 커피타임 보존 AI Agent

### JIRA 페이지 정보
쿠팡 스테이블 코인 PRD문서

### 진행방향
1. jira confluence 기획문서가 업데이트 되면 CODEX 채팅창 입력
- 입력내용: "현재 프로젝트 PRD 업데이트 내용 분석해서 추가 및 수정사항 알려줘"
- 분석한 내용을 특정 양식으로 '{{PRD_pageName}}_ver1.txt'로 저장

2. Contract_Agent, Blockchain-API_Agent 2개 생성
- Contract_Agent는 스마트 컨트랙트 코드 분석 후 추가 및 수정사항 리포트 작성
- Blockchain-API_Agent Blockchain-API 코두 분석 후 추가 및 수정사항 리포트작성
- 서로 공유 함으로써 최종 추가 및 수정사항 리스트업
- 리스트는 특정 양식(고민중) 있음

3. 각 리스트 별로 순회하여 Slack에 알림
- 1:진행, 2:스킵, 3:코멘트
- 3 코멘트 내용에 따라 개발 진행

4. 모두 개발이 완료되면 최종 리포트 작성해서 다시 Slack으로 알림
- 1:확인, 2:코멘트
- 1 확인이 되면 최종 보안성 검토 후 완료
- 2 코멘트 내용에 따라 특정 리스트 다시 수정

## 후속 작업
1. 컨트랙트를 배포하면 paymentAbi.js에 ABI정보를 업데이트 한다.

## 주의사항
1. Jira Wiki 탐색시 "jira" MCP를 사용한다.