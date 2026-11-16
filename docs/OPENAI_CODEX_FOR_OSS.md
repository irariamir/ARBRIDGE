# Codex for Open Source: ARBRIDGE application notes

**Checked:** 16 November 2026. This is an internal, factual application-preparation note—not an OpenAI endorsement, an application, or a claim that ARBRIDGE qualifies. The repository owner must verify all personal and maintainer statements before submitting.

## What OpenAI's official program says

OpenAI's [Codex for Open Source program](https://developers.openai.com/community/codex-for-oss) says selected maintainers may receive six months of ChatGPT Pro with Codex, conditional Codex Security access, and/or API credits for eligible open-source maintainer workflows. It invites core maintainers and operators of widely used public projects to apply; projects that do not neatly fit but play an important ecosystem role may still apply and explain why. Applications are reviewed on a rolling basis. **Applying does not guarantee selection or any benefit.**

The [official application form](https://openai.com/form/codex-for-oss/) asks for a GitHub profile and public repository, the applicant's role, why the repository qualifies (up to 500 characters), interest in Codex Security and/or API credits, an OpenAI Organization ID, how API credits would be used (up to 500 characters), and any additional context (up to 500 characters). The form says selected maintainers receive the six-month Pro benefit; other benefits are conditional or discretionary.

The [program terms](https://developers.openai.com/codex/codex-for-oss-terms) say OpenAI may consider repository usage, ecosystem importance, active maintenance, role/permissions, and program capacity; may verify repository control; and selects applicants at its discretion. Do not send confidential material. Benefits are personal and non-transferable. Review the current official form and terms at submission time because the program may change.

## Verified ARBRIDGE facts at the check date

- Public repository: <https://github.com/irariamir/ARBRIDGE>.
- GitHub reports **0 stars** and an empty repository description as of 16 November 2026.
- The default branch is `main`; its visible starting commit is `3b7fe28` (`Initial commit`). The current development branch has an open PR, and the current prototype changes are not yet merged to `main`.
- There is no published GitHub Release and no verified public usage, downloads, adoption, or production deployment to cite.
- The current repository contains a working prototype for Chrome-to-Telegram public-link capture, SSRF-aware URL downloading, two-step pairing, and manually reviewed sample subscriptions. Pairings, sessions, receipts, subscriptions, and jobs are in memory and reset on API restart. Live Chrome and Telegram end-to-end tests have not been completed.
- Current code checks/builds are not evidence of community adoption. Do not convert local tests, prototype features, planned work, or this application itself into claims of usage or ecosystem importance.

These facts make the project eligible to **ask for consideration**, not to claim that it is a widely used or critical project. Its current adoption evidence is weak. OpenAI explicitly invites explanations from relevant projects that do not neatly fit its criteria, but acceptance remains entirely OpenAI's decision.

## Suggested GitHub repository description

> Open-source Chrome-to-Telegram capture prototype for public documents, with SSRF-aware downloading and manually reviewed subscriptions.

This is concise, describes only prototype capabilities, and does not imply a hosted service or endorsement. The GitHub description was not changed: the previous metadata edit was rejected with HTTP 403. Do not claim it has been published unless GitHub shows the new description.

## Draft application text

The form requires personal details and an OpenAI Organization ID. Obtain those directly from the applicant's own accounts; do not put them in this repository or share them in chat. Select **Primary maintainer** or **Core maintainer** only if that accurately describes the applicant's real role and repository permissions. The wording below is under the form's 500-character limit, but the applicant must confirm that every first-person statement is true.

### “Why does this repository qualify?” (draft, 456 characters)

> ARBRIDGE is a public, MIT-licensed prototype connecting Chrome to Telegram for server-side capture of public document links. I maintain the repository and am building security-conscious URL fetching, account pairing, receipt review, and delivery workflows. The project is early: it has 0 GitHub stars, no published release, and no verified usage metrics. I’m applying based on its potential utility and ongoing maintainer work, not claiming broad adoption.

**Before using:** If the applicant is not the person who maintains the repository, replace “I maintain” with the accurate relationship. Add measurable, independently verifiable usage or ecosystem context only if it exists. Do not omit the candid status simply to make the application sound stronger.

### “How will you use API credits for your project?” (draft, 347 characters)

> If awarded, I would use credits only for authorized ARBRIDGE maintenance workflows: test and code-review automation on this repository, security triage of code I maintain, and release documentation or CI improvements. I would keep a maintainer review before merging generated changes and would not scan third-party repositories without permission.

This is a proposed use, not a statement that these automated workflows are already deployed. Only submit it if the applicant genuinely intends to implement and use them.

### “Anything else we should know?” (draft, 335 characters)

> ARBRIDGE is a small, early-stage open-source prototype, not a deployed service. Its account, subscription, receipt, and job state is currently volatile, and live browser/Telegram flows have not been verified. I welcome consideration under the program’s invitation to explain relevant projects that do not neatly fit its usual criteria.

## Practical next steps (no guarantees)

1. The repository owner should review the official form and terms and apply personally if they choose; no application has been submitted from this repository.
2. Confirm the applicant's GitHub profile is public, repository ownership/maintainer role is accurate, and the ChatGPT account and OpenAI Organization ID are theirs.
3. Publish maintainable code and documentation through the normal review process, merge only tested changes, and document actual usage/feedback when available. Do not manufacture stars, downloads, testimonials, adoption, issues, or releases.
4. Add a real test bot/Chrome run with clean credentials and consent before describing live integrations as verified. Never use a token previously exposed in chat; revoke it and replace it securely.
5. If OpenAI selects the maintainer, follow the redemption instructions and verify account eligibility. Do not promise or assume that a current/recent subscriber can redeem the promotional benefit; resolve any such restriction with OpenAI.

## Sources

- [OpenAI: Codex for Open Source program overview](https://developers.openai.com/community/codex-for-oss)
- [OpenAI: application form](https://openai.com/form/codex-for-oss/)
- [OpenAI: Codex for Open Source program terms](https://developers.openai.com/codex/codex-for-oss-terms)
- [ARBRIDGE repository](https://github.com/irariamir/ARBRIDGE)
