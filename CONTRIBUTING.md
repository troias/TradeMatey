# Contributing: AI-assisted workflow (short)

This project adopts an AI-assisted, tests-first development workflow. Follow these steps for new features or non-trivial changes.

1) Create a design doc / RFC
- Use `/.github/ISSUE_TEMPLATE/design-doc.md` or `docs/RFC_TEMPLATE.md` to write a short proposal.
- Get at least one senior engineer to review major designs.

2) Tests first
- Write unit/integration tests that express the acceptance criteria before implementing the change.

3) Implement in small chunks
- Use AI tools to scaffold or implement small, focused changes. Treat AI output the same as any contributor: review carefully.
- Keep PRs small and focused so reviewers can validate modifications easily.

4) Code review & approvals
- Use the PR template. Ensure tests pass locally and on CI.
- For high-risk or cross-system changes, get a second (senior) approval.

5) Staging & rollout
- Deploy to staging, run smoke tests and monitoring checks, then promote to production.

Notes and guardrails
- AI can speed up implementation but may hallucinate or miss non-functional requirements. Always review, test, and limit scope per PR.
- Prefer incremental changes over large auto-generated refactors.

If you'd like, I can also:
- Create a sample design doc from a feature you pick.
- Create a small branch+PR that follows this process as an example.
