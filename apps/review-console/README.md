# review console bootstrap

Recommended first routes:

- `/timeline`
- `/events/:eventId`

The local read API is now available for the first analyst loop, with fixture mode kept as a
fallback for UX and contract checks.

## Local run

From the repository root:

```bash
npm run review-console:dev
```

Then open `http://127.0.0.1:4173/apps/review-console/`.

To make the same-origin `/api/*` routes read seeded SQLite data instead of
fixtures, start the console with:

```bash
READ_API_DB_PATH=data/all-seeing-eye.sqlite npm run review-console:dev
```

Smoke test the integrated route surface:

```bash
npm run review-console:smoke
npm run review-console:smoke:sqlite
```

The current `verified-local` validation bundle lives in
`../../docs/operations/review-console-validation-bundle.md`. Use that artifact
when you need the latest reproducible command set, the active workspace caveats,
or the current replacement trail from cancelled issues `NIT-14`, `NIT-71`, and
`NIT-77` to `NIT-100`, `NIT-101`, and `NIT-85`. The bundle also keeps the
historical `NIT-75` promoted baseline at
`/Users/gun9/Developer/nitro/ceo/all-seeing-eye.promote-0316` (`42ff50a`)
explicit without treating the cancelled checkpoint gates as active owners.

API-mode review actions persist to `data/review-actions.json` by default. To keep
that local overlay somewhere else during fixture-backed testing, set:

```bash
REVIEW_ACTIONS_FILE=/tmp/review-actions.json npm run review-console:dev
```

When `READ_API_DB_PATH` is set, API-mode review actions are stored in the
SQLite `review_actions` table instead of the overlay file.

`edit` and `reject` actions require analyst notes. `approve` can still be
recorded without notes for quick triage.

## Current behavior

- Timeline-first analyst queue
- The queue now defaults to a pending-first sort and can switch to newest, oldest, lowest-confidence, or most-sources ordering without leaving the current queue context
- Filter summary shows how many events remain in view and exposes one-click reset paths when search or review filters narrow the queue too far
- Filter summary now also surfaces one-click status and confidence lanes with queue counts, so analysts can jump across likely triage slices without opening each dropdown first
- Filter controls now include review-history state so previously reviewed or untouched events can be isolated without relying on status alone
- Filter summary now also surfaces one-click analyst attention lanes for saved local drafts, pending revisits, reviewed-before items, and pending confidence slices, so unfinished notes and follow-up buckets can be reopened without restacking filters
- Shareable view now exposes a one-click copyable URL for the current queue slice and selected event, while warning when saved-draft filtering depends on browser-local state
- Shareable view now also offers a portable-link copy path that strips saved-draft filtering so async handoff does not depend on browser-local state, only surfaces portability warning copy when saved-draft, demo-mode, or other browser-local caveats actually matter, combines those warnings when multiple caveats stack, and keeps the live helper copy aligned with the `Copy start link` and next-pending actions instead of generic reviewer wording
- Shareable view now also breaks handoff scope into URL-carried state, saved-draft dependencies, and browser-local-only state such as unsaved draft-note text or active saved-view labels
- Shareable view now also copies a paste-ready handoff note that bundles the current link, a portable link when needed, the included versus local-only scope cues, and the selected local draft snapshot when one exists
- Shareable view now also surfaces a reviewer snapshot plus recent persisted review context for the selected event, trims redundant `pending review` status, drops empty `No prior review` copy, hides generic review-history counts when the latest review is already spelled out below, and keeps reviewed-status chips behind confidence and provenance cues so the snapshot stays scan-friendly
- Shareable view now also surfaces confidence drivers with claim-signal counts and rationale preview in the handoff card and copied note, so async reviewers can judge why the event is high or low confidence before opening detail
- Shareable view now also surfaces supporting source proof snapshots in the handoff card and copied note, prioritizing the source that matches the active provenance search focus and collapsing overflow into a short summary cue so async reviewers get concrete evidence without a dense handoff block
- Shareable view now also carries the selected event's active search-match rationale plus current queue position and next-pending context into the handoff card and copied note, exposes a direct `Copy next pending link` action when the current selection is context only, automatically switches that direct copy to a portable next-pending URL when saved-draft filtering would otherwise make the handoff browser-local, includes a direct next-pending link in copied notes when another actionable item is waiting, and copied links now restore the focused detail section when one is active, so async reviewers can reopen the exact matched subsection instead of rescanning detail
- Shareable view now keeps the recommended reopen path only when it clarifies a queue-only or multi-step replay, while live cards and copied notes drop the extra `Recommended path` line once action-first reopen links already make the single-step or next-pending flow obvious
- Shareable view now folds the long-form handoff evidence into an expandable preview inside the card while keeping the copied note fully detailed, mirrors the copied note's reviewer-context order, and includes the selected local draft snapshot when one exists, so the control panel stays scannable during live triage without dropping async reviewer context
- Shareable view live cards no longer repeat `Included in handoff note only` scope chips for reviewer context and evidence, because the expandable preview already names that extra detail while the copied note keeps the full handoff sections
- Shareable view card controls now use reviewer-centered wording such as `Copy start link`, `Copy start link without saved drafts`, `Copy review note`, and dynamic preview labels plus counts like `Show reviewer context` / `4 context items · 2 evidence items` when only part of the handoff detail matters, so the live handoff surface speaks in terms of the next review action instead of implementation jargon
- Copy review note now emits action-first markdown sections with `Start here` and `Continue with next pending` reopen labels instead of current/portable-view jargon, calls out the portable fallback link in success feedback when one is included, trims repeated queue/view phrasing in the queue snapshot and recommended-path copy, keeps reviewer context focused on triage cues, moves raw supporting source proof into an evidence appendix, and avoids repeating reviewer-context/evidence section labels again inside `Handoff scope` so pasted async handoffs stay scannable even when proof-rich detail is preserved
- Analysts can save recurring search, filter, sort, and source combinations as local saved views and reapply or delete them without rebuilding the queue state manually, while the panel helper and empty state now name the queue slice those views restore directly and cross-source saved views call out the required dataset switch before they are applied
- Review-note drafts stay attached to each event in local browser storage while analysts move around the queue or refresh the page, and timeline cards show when a local draft note is waiting
- Review forms now expose one-click quick note starters for confidence rationale, source posture, prior review notes, and edit/reject note skeletons so required analyst notes start from grounded evidence instead of a blank field
- Keyboard shortcuts now keep the detail workflow moving without leaving the keyboard: `/` focuses search, `J`/`K` move across visible rows, `N` jumps to the next pending item, and `A`/`E`/`X` trigger review actions when analysts are not typing in inputs
- Recent activity keeps the last local review decisions visible in the controls panel, previews the actual draft outcome that reopening will produce, promotes the actual reopen outcome into a compact action chip, names reviewed-item reopen paths directly instead of falling back to a generic `Reopen for context` label, foregrounds required source switches and saved queue-slice restores in that chip before the reopen copy, uses chips for reopen queue position, marks a fully matched active card as `Already open in saved queue slice` instead of showing another reopen-style label, keeps the helper line focused on the saved search/filter/sort lens instead of repeating source-switch copy the action chip already names, drops queue-position copy when the saved source no longer matches the current dataset, makes the panel helper and empty state call out the review-safe search/filter/sort/source reopen path directly, calls out any review-only filters that were intentionally omitted so the reviewed event stays visible when reopened, collapses the remaining helper copy down to the next pending headline only when the card is now context only, and only promises note restoration when no newer local draft already exists, so auto-advance does not misstate what reopening will put back into the editor
- Success flash notes now use action labels that match the actual reopen outcome, name reviewed-item recovery directly in the button copy, foreground saved queue-slice restores after the analyst changes search/filter/sort state, show the saved queue lens plus reopened queue-position chips that button will restore, keep non-default queue sort visible even when the rest of that lens is condensed, avoid repeating source-switch wording when the action chip already covers it, and preview the actual note outcome that reopen will produce, so analysts can immediately verify or revise the last decision without losing the next-pending queue handoff
- Timeline cards surface key participant roles before detail is opened, while avoiding duplicate location labels
- Timeline cards surface source posture and timing windows before detail is opened
- Timeline cards surface confidence drivers with claim-polarity chips and a short rationale preview before detail is opened
- When search is active, timeline cards now explain why they matched by surfacing the first matching event, claim, participant, source, or review-history fields directly on the card
- Selected events now surface a Search focus card that jumps directly to the matched overview, claims, entities, relationships, provenance, or review-history section in detail, with previous/next match cycling available through buttons or `[` and `]`
- When URL state is stale or missing, the detail view re-centers on the first pending event instead of an already-reviewed row
- Detail view surfaces queue context so analysts can see visible position plus remaining pending work under the current filters
- Detail view includes previous/next visible controls plus a next-pending jump that now names the target headline when one exists, so analysts can keep moving inside the filtered queue without returning to the left rail
- Search matches timeline copy plus claim text, entity names and roles, source titles and feed keys, and recorded analyst notes
- Event detail with confidence rationale, claims, entities, relationships, and source provenance
- Supporting source cards show event-relative publish timing for faster provenance inspection
- Timeline cards surface the latest review-history summary so analysts can triage prior edits without opening detail first
- API and SQLite-backed timeline responses keep tag chips derived from feed categories and event types so tag filtering remains usable outside fixture mode
- Relationship cards resolve canonical entity names and event roles instead of raw ids
- Same-origin review actions persisted through the active local read-api backend
- Recording an action on a `pending_review` event automatically advances the console to the next pending queue item when one exists
- Fixture-mode review actions kept browser-local as a fallback
- Edit and reject actions require analyst notes before the console records them
- Draft notes remain local to the browser until the corresponding review action is recorded
- Saved views remain local to the browser and capture search, review-status, review-history, confidence, tag, saved-draft filters, source mode, and queue sort
- Recent activity remains local to the browser and captures the last reviewed event, the latest analyst note, and the review-safe reopen filters plus queue sort needed to inspect it again quickly, while the live card resolves the current reopen queue position from that saved view state and names any review-only filters it had to drop
- URL-synced selected event, active Search focus section, filters, source mode, and demo mode for reproducible refreshes
- Filter controls plus explicit empty and error demo states
- Default to local read API mode, with contract fixtures available as a fallback
