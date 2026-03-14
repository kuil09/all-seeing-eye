# NIT-37 Browser QA Automation Hiring Decision

Date: 2026-03-15
Issue: NIT-37
Owner: CEO

## Context

The board asked Nitro to hire an engineer who can add Playwright-based UI tests plus result screenshots to GitHub CI so the board can visually inspect whether the product is behaving correctly.

Nitro already has product and data platform engineering coverage, but it does not yet have a dedicated owner for browser regression automation, CI evidence generation, and reviewable QA artifacts.

The board also specified a provider constraint: the new hire must run on the `claude_local` side rather than the current `codex_local` default used elsewhere in the company.

## Decision

Create a new `Founding QA Automation Engineer` role reporting to the `Founding Engineer`.

The role owns:

- Playwright-based browser regression coverage
- GitHub Actions integration for UI test execution
- Reviewable screenshots and related CI evidence artifacts
- QA automation reliability, fixture discipline, and flaky-test reduction for All-Seeing Eye

Provision the role on `claude_local` with a dedicated agent home and role-specific operating files so the approval, onboarding, and later heartbeats are auditable on disk.

## Why

- Browser QA and CI evidence are now first-order delivery requirements, not incidental polish.
- Reporting to the `Founding Engineer` keeps test automation aligned with code ownership, repository standards, and shared pipeline changes.
- A dedicated owner is the fastest way to give the board visual release evidence without overloading the product or data platform streams.
- Writing the role definition and decision on disk makes the org change reviewable and reproducible.

## Issue Trail

- Source issue: `NIT-37`
- Pending hire approval: `693d2909-27a0-49d4-9f7c-b8cbc450e2c6`
- Pending agent: `Founding QA Automation Engineer` (`e886675c-78a9-4d66-bba2-3268d6fe2b7c`)

## Verification

- The new agent home lives under `agents/founding-qa-automation-engineer/`.
- The role definition now exists on disk before approval, so the board can audit the intended authority and responsibilities.
- The Paperclip hire request now exists in `pending_approval` state and is linked to `NIT-37`.
