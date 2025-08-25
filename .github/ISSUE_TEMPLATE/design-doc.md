---
name: Design doc / RFC
about: Use this template to propose features or architecture changes. Start here before implementation.
labels: rfc, design
---

<!-- Short title -->
# Title: [Short, descriptive]

## Summary
- One-paragraph summary of the feature or change.

## Goals
- What success looks like (1-3 bullet points).

## Non-goals
- What this does NOT aim to solve.

## Background / Motivation
- Why are we doing this? Link any relevant issues or discussions.

## Architecture / Design
- High-level components, data flow, integrations.
- API shapes, DB changes, queueing, permissions.

## Acceptance criteria & tests
- List concrete acceptance tests and which automated tests will cover them.

## Rollout & monitoring
- How to deploy, metrics to watch, rollback plan.

## Security & privacy considerations
- Any data handling, PII, or security checks needed.

## Migration / backward compatibility
- DB migrations, compatibility notes, versioning.

## Alternatives considered
- Short list of alternatives and why they were rejected.

## Approvals
- Owner: @
- Reviewers: @

<!-- After filling this out: create a small PR that links this issue and includes tests-first changes -->
