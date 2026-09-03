# Issue tracker: Linear

Issues and specs for this repo live in Linear, workspace **JS Workshop** (js-workshop),
team **Engineering** (`ENG`). Use the Linear MCP tools for all operations.

## Conventions

- Create an issue: `save_issue` with `team: "ENG"`, `title`, `description`.
- Read an issue: `get_issue` with the issue identifier (e.g. `ENG-12`).
- List issues: `list_issues` filtered by `team: "ENG"`, `state`/status, or `label`.
- Comment on an issue: `save_comment`.
- Apply / change labels: pass `labels` on `save_issue` (create via `create_issue_label` first if missing).
- Change status: `save_issue` with `status` set to one of this team's workflow states
  (`Backlog`, `Todo`, `In Progress`, `In Review`, `Done`, `Canceled`, `Duplicate`).
- Close: `save_issue` with `status: "Done"` or `"Canceled"`.

## When a skill says "publish to the issue tracker"

Create a Linear issue in team `ENG` via `save_issue`.

## When a skill says "fetch the relevant ticket"

`get_issue` with the Linear identifier.

## Pull requests as a triage surface

PRs as a request surface: no.
