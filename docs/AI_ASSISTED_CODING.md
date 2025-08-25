## AI-assisted coding workflow

This document transcribes and adapts the short workflow posted in the attachment (original: "How we vibe code at a FAANG"). It's intended as a concise, practical process for using AI tools to accelerate feature delivery while keeping engineering discipline and quality gates intact.

Summary
- AI is used as a force multiplier — not a replacement for engineering process. Follow standard design, review, and testing steps, and treat AI-produced output like any other contributor: review carefully, test, and iterate.

Proposed steps
1. Start with a technical design document
   - Write a small proposal or design doc that describes the feature, architecture, integrations, and acceptance criteria.
   - This is where the majority of the system-level thinking happens.

2. Design review before development
   - Share the design doc with senior engineers for feedback and sign-off.
   - Use this as a gate to catch major flaws early.

3. Tests (and/or TDD) first
   - Write automated tests or at least test plans before generating implementation with AI.
   - If using Test Driven Development, author the tests first then ask the AI to implement code that satisfies the tests.

4. Backlog and sprint planning
   - Break the feature into discrete tasks that individual devs or teams own.
   - Prioritize and plan work like any other sprint item.

5. Software development (use AI to implement)
   - Use AI agents to scaffold, generate, or refactor code for small chunks at a time.
   - Always run the tests you wrote and validate behavior locally.

6. Code submission and review
   - Keep the existing code review process. AI changes must pass the same review gates.
   - Consider a two-stage approval (peer review + senior approval) for high-risk changes.

7. Test in staging and deploy
   - Run full integration and staging tests. If staging is good, promote to production.

Outcomes reported in the original note
- The author reported roughly a ~30% end-to-end speedup from proposal to production when following this workflow.

Practical notes & guardrails
- Treat AI like a junior pair programmer: expect hallucinations and verify all outputs.
- Keep design docs and tests authoritative sources of truth.
- Restrict AI-generated code to small, reviewed PRs — avoid large, unchecked monolithic dumps.
- Update tests and CI to catch regressions introduced by auto-generated code.

TL;DR
- Always start with a solid design doc and tests. Use AI for fast iteration on small chunks. Keep code review and staging gating unchanged.

Suggested checklist for adoptation in this repo
- [ ] Create a short design doc for the feature being built (link to RFC or issue)
- [ ] Write acceptance tests / unit tests first
- [ ] Use AI to implement a focused change that satisfies the tests
- [ ] Open a small PR and run CI / linters
- [ ] Get peer review + final approval before merging
- [ ] Smoke test in staging, then promote

References
- Source: adapted from an internal-style post (titled: "How we vibe code at a FAANG").
