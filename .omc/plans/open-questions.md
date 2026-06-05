# Open Questions

Tracking unresolved decisions and clarifications across all plans.

## newton-raphson-refactor - 2026-06-04

- [ ] Capture features (GIF/video) — are they actively used? — If not, defer or drop, reducing Phase 5 scope by ~600 lines.
- [ ] Share-link inventory — can the team supply 5–10 real bookmarked share-links to seed legacy-compat fixtures? — Without them we fall back to synthesized URLs, which is weaker evidence of backward compatibility.
- [ ] TypeScript scope — adopt for new modules from Phase 2, or defer to a Phase 7? — Plan currently defers to keep Phase 2 risk minimal; revisit after parity is locked.
- [ ] i18n — fold into Phase 5 (controls extraction) or treat as a separate follow-up? — Plan currently treats as follow-up because string separation is itself a Phase 5 deliverable.
- [ ] Performance budget — is +/-10% solver wall-time the right CI gate, or stricter? — Affects pass/fail on the perf benchmark added in Phase 2.
- [ ] Cutover trigger — what concrete signal (calendar week, feature-flag exposure %, zero critical bugs for N days) flips users from `iframe` to `inline` mode? — Plan currently defaults to a one-week soak; product needs to confirm.
