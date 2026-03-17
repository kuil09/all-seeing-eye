# all-seeing-eye

[English](README.md) | [한국어](README.ko.md) | [日本語](README.ja.md) | [中文](README.zh-CN.md)

엄선된 RSS 항목을 출처, 신뢰도, 리뷰 이력이 포함된 검토 가능한 이벤트로 전환하는 로컬 퍼스트 1차 슬라이스 분석 워크플로 저장소입니다.

## 범위

현재 저장소의 고정 범위는 다음과 같습니다.

`curated RSS -> local synthesis -> SQLite -> read API -> timeline-first review console`

이번 슬라이스의 범위 밖:

- 직접적인 SNS 수집
- 지도 중심 워크플로
- 멀티테넌트 인증 또는 배포 표면
- 호스팅된 LLM 의존성

## 현재 구현된 내용

- 큐레이션된 fixture 데이터를 SQLite로 시드하는 경로
- 명시적 allowlist를 사용하는 실시간 curated RSS polling
- 피드별 성공/실패 문맥이 남는 ingest run 이력 저장
- 이벤트, claim, entity, relationship, provenance, confidence를 위한 결정적 로컬 synthesis
- 타임라인, 이벤트 상세, 리뷰 액션을 제공하는 로컬 read API
- 큐 필터, 검색, 드래프트, 저장된 뷰, handoff 링크, 최근 리뷰 복구, 키보드 단축키를 갖춘 analyst review console
- fixture 기반과 SQLite 기반의 smoke validation 경로

## 저장소 구조

```text
apps/review-console/        Analyst review application
contracts/                  Canonical JSON schemas and example payloads
docs/architecture/          Architecture package for the first slice
docs/contracts/             Contract change-control notes
docs/operations/            Runbooks, observability notes, validation bundle
fixtures/                   Shared fixture dataset and allowlist example
packages/contracts/         Contract helper tests and package surface
schemas/                    SQLite schema baseline
services/pipeline/          Ingest, poll, synthesize, and persist flow
services/read-api/          Local read-only API
scripts/                    Local validation and dev entrypoints
```

## 빠른 시작

데모 데이터베이스를 시드합니다.

```bash
node services/pipeline/cli.mjs seed-demo
```

현재 데이터베이스 상태를 점검합니다.

```bash
node services/pipeline/cli.mjs stats
node services/pipeline/cli.mjs ingest-runs
```

Read API를 실행합니다.

```bash
./scripts/serve_read_api.sh
```

Analyst review console을 실행합니다.

```bash
npm run review-console:dev
```

열어볼 경로:

- `http://127.0.0.1:4310/api/timeline`
- `http://127.0.0.1:4173/apps/review-console/`

fixture 모드 대신 SQLite 기반 데이터로 console과 API를 연결하려면:

```bash
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

## 검증

저장소 smoke check:

```bash
./scripts/validate_sql.sh
./scripts/validate_json.sh
./scripts/smoke_pipeline.sh
./scripts/smoke_read_api.sh
./scripts/smoke_review_console.sh
./scripts/smoke_review_console_sqlite.sh
```

집중 실행용 npm 진입점:

```bash
npm run pipeline:smoke
npm run publication:check
npm run read-api:smoke
npm run review-console:smoke
npm run review-console:smoke:sqlite
```

## 실시간 Curated RSS 경로

승인된 allowlist를 polling하고 ingest 이력을 저장합니다.

```bash
node services/pipeline/cli.mjs poll-curated \
  --allowlist ./path/to/approved-curated-feed-allowlist.json
```

저장소에는 형상 예제가 포함되어 있습니다.

- `fixtures/curated-feed-allowlist.example.json`

체크포인트나 handoff 전에 참고할 운영 문서:

- `docs/operations/curated-rss-runbook.md`
- `docs/operations/pipeline-observability.md`

## 핵심 문서

- `docs/architecture/first-slice-architecture.md`
- `services/pipeline/README.md`
- `services/read-api/README.md`
- `apps/review-console/README.md`
- `docs/operations/review-console-validation-bundle.md`
- `notes/2026-03-17-nit-105-mainline-publication-path-recovery.md`

## 현재 한계

- 실시간 curated polling은 현재 각 fetched item마다 결정적 이벤트 후보 1개와 event-fact claim 1개를 생성합니다
- 실시간 피드에서는 아직 더 풍부한 multi-entity 또는 relationship 추출을 하지 않습니다
- review console의 saved view, draft, recent activity는 브라우저 로컬 상태에 남습니다
- 이 슬라이스는 호스팅 운영보다 로컬 재현성에 최적화되어 있습니다
