# Project Conventions

## Tracker

- Type: local
- Root: .scratch
- Labels: needs-triage, needs-info, ready-for-agent, ready-for-human, wontfix
- External PRs: off

Local tracker layout: one feature per directory under `.scratch/`, with a map
at `<feature>/spec.md` and tickets at `<feature>/issues/<NN>-<slug>.md`.

## Domain docs

- Layout: single-context
- Glossary: GLOSSARY.md
- Glossary map: none
- ADRs: docs/adr

## Wayfinding operations

- **Map**: `<feature>/spec.md` with front matter `labels: [wayfinder:map]`.
- **Ticket**: `<feature>/issues/<NN>-<slug>.md`. Child of the map by directory.
- **Front matter**: `id`, `title`, `labels` (exactly one `wayfinder:<type>`),
  `blocked_by` (list of ticket ids), `status` (`open` or `closed`), `assignee`.
- **Blocking**: local markdown has no native blocking, so edges live in
  `blocked_by`. A ticket is unblocked when every id it names is `closed`.
- **Frontier query**: tickets with `status: open`, every `blocked_by` id
  closed, and an empty `assignee`. Read the labels; the body never states the
  type.
- **Claiming**: set `assignee` before any work.
- **Resolution**: append `## Resolution` to the ticket, set `status: closed`,
  then append one line to the map's `## Decisions so far` that links the
  ticket by name.
- **Research assets**: `<feature>/research/<slug>.md`, linked from the ticket,
  never merged as product code.

## Notes

- Plain, direct language in tickets and docs.
- No accounts, no backend. The site is static and free to host.
- Every decision ticket names the answer, not just the trade-off.
