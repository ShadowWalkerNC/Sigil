# UPA Escalation Checklist

Use **Light Mode** by default. Escalate to Full UPA when any high-risk condition is true.

---

## Light Mode Preflight

- [ ] What is the goal in one sentence?
- [ ] Is the scope small and well understood?
- [ ] Is the change reversible?
- [ ] Are there any obvious security, privacy, or auth impacts?
- [ ] Are there any data model or migration impacts?
- [ ] Are there any accessibility or compliance impacts?
- [ ] Are there multiple stakeholders or teams affected?
- [ ] Is there any serious uncertainty about the right approach?

---

## Escalate to Full UPA if any answer is yes

- [ ] Security, privacy, secrets, auth, or access control are involved.
- [ ] Database schema, migrations, or data integrity are involved.
- [ ] The change affects production deployment or rollback.
- [ ] The task is hard to reverse.
- [ ] Accessibility or compliance may be impacted.
- [ ] Multiple teams, stakeholders, or systems are affected.
- [ ] The requirements are unclear or disputed.
- [ ] The change introduces a third-party integration or external dependency.
- [ ] The risk of failure is material to users or business operations.

---

## Full UPA Requirements

- [ ] Define the real problem before proposing a solution.
- [ ] State assumptions and unknowns explicitly.
- [ ] Compare conservative, balanced, and aggressive options.
- [ ] Document risks, mitigations, and rollback plan.
- [ ] Review security, UX, accessibility, and operations.
- [ ] Add tests and verification steps.
- [ ] Update docs and runbooks if behavior changes.

---

## Decision Log

| Field | Value |
|---|---|
| **Date** | |
| **Task** | |
| **Mode used** | Light / Full UPA |
| **Escalation trigger(s)** | |
| **Decision** | |
| **Follow-up** | |

---

*Copy this file for each significant task. Fill in the Decision Log before closing the work.*
