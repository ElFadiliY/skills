## Worked Examples

### Final Output Template

```markdown
# Business Model Audit: [Business Name]
**Date:** [Date] | **Audit #:** [Number] | **Model Type:** [From Step 2]

## Executive Summary
- **Composite Scale Score:** X/10 [🔴/🟡/🟢]
- **Quadrant:** [Freelancer/Operator/Stuck Scaler/Owner]
- **#1 Constraint:** [From Step 15]
- **Value-Market Fit:** X/10
- **Moat Strength:** X/18
- **Top Risk:** [From Step 11]

## Sub-Scores Dashboard
[15-component table]

## Key Findings
#### Phase 0: Design — Canvas, fit score, model classification
#### Phase 1: Diagnose — Economics, retention, channels, concentration, time, stress, leverage, moat, team, risks
#### Phase 2: Fix — Complexity, pricing, expansion, discounts, THE constraint, emotional barrier
#### Phase 3: Test — Experiment plan, scenarios, comparable evolution

## Action Plan
🔴 Critical (This Week) → 🟡 Important (30 Days) → 🟢 Monitor (90 Days)

## Next Re-Audit
Date: [cadence] | Focus: [metrics] | Success: [criteria]
```

---

### Worked Example: CloudDash (Fictional SaaS)

**Context:** Solo founder, B2B SaaS dashboard tool for marketing teams, 18 months old, $8k MRR, 45 customers, $180/mo ARPU, PLG.

#### Quick Audit

> Q1: Revenue per customer? → "$180/mo"
> Q2: Hours per customer? → "About 2 hours — mostly support and onboarding"
> Q3: Active customers? → "45"

| Metric | Value | Verdict |
|--------|-------|---------|
| Effective Hourly Rate | $180 / 2hrs = $90/hr | 🟡 (SaaS threshold: $100-300) |
| Monthly Time Load | 2hrs × 45 = 90 hrs | 🟡 |
| Revenue Per Hour | $8,000 / 90 = $89/hr | 🟡 |
| Time Ceiling | 160 / 2 = 80 max | 🟡 Nearly there |

**Quick Verdict:** Mixed — approaching time ceiling. Recommended full audit.

#### Phase 0: Design (abbreviated — existing business)

**Lean Canvas snapshot** (not built from scratch since business exists):

| Block | CloudDash |
|-------|-----------|
| Problem | Marketing teams can't see cross-platform ROI in real time |
| Segments | B2B marketing teams, 5-50 person companies |
| UVP | "See all your marketing ROI in one dashboard, in real time" |
| Solution | Auto-connect data sources, real-time dashboard, weekly email digest |
| Channels | Content/SEO (blog), Product Hunt, word of mouth |
| Revenue | $180/mo flat subscription |
| Costs | Hosting $400/mo, API fees $200/mo, founder time |
| Key Metrics | MRR, churn, activation rate |
| Unfair Advantage | None yet (⚠️) |

#### Phase 1: Diagnose

**Step 1 — Fit: 7/10.** Customers rely on it for weekly reporting.

| Job / Pain / Gain | Solution | Fit | Gap |
|-------------------|----------|-----|-----|
| See ROI across channels | Dashboard | 4/5 | Missing TikTok, LinkedIn Ads |
| Stop manual spreadsheet work | Auto-connect | 5/5 | — |
| Justify budget to leadership | Weekly digest email | 3/5 | No exportable reports |
| Compare performance over time | Historical view | 2/5 | Only 30-day history |

**Step 3 — Economics:**

| Metric | Value | vs. SaaS Benchmark | Status |
|--------|-------|--------------------|--------|
| ARPU | $180/mo | — | — |
| CAC (direct spend) | $50 | $500 content hosting / ~10 new customers | — |
| CAC (fully loaded) | $200 | Including $1,500 imputed founder marketing time (15 hrs × $100/hr) | — |
| COGS | $13/customer (hosting + API) | — | — |
| Gross Margin | 93% | >80% = Great | 🟢 |
| CAC Payback (fully loaded) | 1.2 months | PLG <3mo = Great | 🟢 |
| LTV (at 4% churn) | $4,500 | — | — |
| LTV:CAC (fully loaded) | 22.5:1 | >5:1 = Great | 🟢 |

⚠️ LTV:CAC looks exceptionally strong because CAC is low (PLG + organic). The real constraint isn't economics — it's the founder time buried in the $200 fully-loaded CAC. Step 7 will expose this.

**Step 4 — Retention:**

| Metric | Value | Status |
|--------|-------|--------|
| Monthly logo churn | 4% | 🟡 (SaaS Good = 1-3%) |
| Revenue churn | 4% (flat pricing, no expansion) | 🟡 |
| NRR | 96% | 🟡 (<100% = shrinking without new customers) |
| GRR | 96% | 🟢 (>90%) |

Cohort analysis:

| Month | Jan '24 | Apr '24 | Jul '24 | Avg |
|-------|---------|---------|---------|-----|
| M0 | 100% | 100% | 100% | 100% |
| M1 | 82% | 78% | 85% | 82% |
| M3 | 70% | 68% | 74% | 71% |
| M6 | 62% | 60% | — | 61% |

⚠️ **18% M1 churn is the red flag.** Nearly 1 in 5 customers leave in the first month. Classic onboarding failure.

**Step 5 — Channels:**

| Channel | Direct Spend | Founder Time | Customers | Direct CAC | Fully Loaded CAC | % of Acq |
|---------|-------------|-------------|-----------|-----------|-----------------|----------|
| Content/SEO | $500/mo | 15 hrs ($1,500) | ~6/mo | $83 | $333 | 60% |
| Product Hunt | $0 | 3 hrs ($300) | ~3/mo (declining) | $0 | $100 | 30% |
| Referrals | $0 | 0 hrs | ~1/mo | $0 | $0 | 10% |
| **Blended** | **$500** | **18 hrs ($1,800)** | **~10/mo** | **$50** | **$200** | **100%** |

⚠️ Direct CAC ($50) looks amazing. Fully loaded ($200) reveals the hidden cost is founder time, not dollars. This is why Step 3 uses fully-loaded CAC.

Channel risk: Product Hunt is a one-time spike, now declining 20%/mo. Content/SEO is compounding. Low concentration risk today but growth depends on scaling content.

**Step 7 — Time: 3/10 🔴.** Founder does support (40 hrs), dev (30 hrs), content (15 hrs), admin (5 hrs) = 90 hrs/mo. Revenue drops 60%+ without founder.

**"Would I Hire Me?" test:** Market salary for this work: ~$12k/mo. Revenue $8k/mo. 🔴 Economics don't work with a paid replacement.

**Step 9 — Moat: 6/18 🟡**

| Moat Type | Score | Reasoning |
|-----------|-------|-----------|
| Network Effects | 0/3 | No multi-user features |
| Switching Costs | 2/3 | Data connections painful to redo |
| Data Advantage | 1/3 | Accumulating data but not using it for product improvement yet |
| Brand | 1/2 | Some recognition in niche |
| Scale Economies | 1/2 | Marginal cost near zero |
| Regulatory | 0/2 | None |
| Unique Expertise | 1/2 | Founder knows marketing analytics |
| Counter-positioning | 0/1 | Incumbents could add this |
| **Total** | **6/18** | Composite: (6/18) × 10 = **3.3/10** |

**Step 11 — Riskiest Assumptions:**

```
🔴 RISK #1: "Founder can keep doing support + dev + marketing"
   If wrong: Growth caps at 80 customers, founder burns out
   Test: Hire part-time support for 30 days, measure quality
   
🔴 RISK #2: "Content/SEO will keep scaling"
   If wrong: Growth stalls when Product Hunt dries up
   Test: Track organic growth rate MoM for next 90 days

🟡 RISK #3: "Current pricing ($180/mo) captures enough value"
   If wrong: Leaving 30-50% revenue on table
   Test: Van Westendorp with 15 customers (2 weeks)
```

> "I don't know my NPS." → **Handled as assumption:** Estimated NPS 30-40 based on 7/10 fit score and 96% GRR. Flagged as untested. Added to risk register.

#### Phase 2: Fix

**Step 15 — THE Constraint: Founder Time**

Second-worst: Moat (3.3/10). But time is THE constraint because it physically prevents growth — even if moat were perfect, you can't serve more than 80 customers.

**15.2 EXPLOIT:** Batch all support into 2 fixed windows/day (save 8 hrs/mo). Create FAQ from top 20 tickets. Set up auto-reply for common questions. Zero cost.

**15.3 SUBORDINATE:**
```
STOP: Product Hunt marketing (diminishing returns, save 4 hrs/mo)
REDUCE: New feature dev (ship 1 thing/mo not 3)
CONTINUE: Content/SEO (compounding channel), support (but systematized)
```

**15.4 ELEVATE:** Hire part-time support ($2k/mo). Frees 30+ hrs. Enables 45 → 80 customers = +$6.3k MRR.

**15.5 REPEAT:** Next constraint after support hire = onboarding (M1 churn 18%). Then moat (3.3/10).

**Emotional Barrier:** "Nobody can do support as well as me."
**Reframe:** "80% support by someone else lets you build features that grow revenue. Your $90/hr time on support = $2k hire doing the same work."

#### Phase 3: Test

**Experiment:** Hire part-time support, measure for 30 days.
```
HYPOTHESIS: If we hire support, founder time drops 40+ hrs AND support quality stays >4/5.
PRIMARY: Founder hours freed
GUARDRAILS: Support satisfaction >4/5, churn doesn't spike
METHOD: Before/after (too few customers to split)
DURATION: 30 days
GO if: 30+ hrs freed AND satisfaction holds
```

#### Action Plan

🔴 **This week:** Hire part-time support ($2k/mo). Create FAQ. Batch support windows.

🟡 **30 days:** Fix M1 onboarding. Self-serve flow + activation email sequence. Target: M1 churn 18% → 10%.

🟡 **30 days:** Run Van Westendorp on 15 customers. Design tier with expansion revenue. Target: NRR 96% → 105%.

🟢 **90 days:** Build team collaboration features (switching cost ↑ + seat expansion = moat + expansion revenue).

#### Composite: 5.6/10 🟡 NEEDS WORK

| Component | Score | Weight | Weighted | How Scored |
|-----------|-------|--------|----------|-----------|
| Value-Market Fit | 7/10 | 12% | 0.84 | Step 1: strong fit, would miss it |
| Unit Economics | 8/10 | 12% | 0.96 | LTV:CAC 22.5:1 (fully loaded), margin 93% |
| Retention | 5/10 | 10% | 0.50 | 4% churn (🟡), NRR 96% (🟡) |
| Time Independence | 3/10 | 10% | 0.30 | Revenue drops 60%+ without founder |
| Moat | 3.3/10 | 8% | 0.26 | 6/18 raw, converted |
| Leverage | 4/10 | 7% | 0.28 | 2/5 types (Code ✅, Media ✅) |
| Pricing Power | 6/10 | 7% | 0.42 | Can likely raise 10-20% |
| Channel Health | 7/10 | 6% | 0.42 | Content strong, PH dying but not critical |
| Concentration | 9/10 | 5% | 0.45 | Top customer 8%, well diversified |
| Pricing Architecture | 3/10 | 5% | 0.15 | Single flat tier, no expansion, no WTP research |
| Assumptions Tested | 4/10 | 5% | 0.20 | 1 of 3 critical tested |
| Team Capability | 5/10 | 4% | 0.20 | Solo but capable; single-point-of-failure risk |
| Discount Discipline | 8/10 | 3% | 0.24 | No discounting (by default — PLG) |
| Experiment Readiness | 4/10 | 3% | 0.12 | No history but founder is data-literate |
| Complexity Control | 9/10 | 3% | 0.27 | Single product, focused |
| **Total** | | **100%** | **5.61** | |

**Composite: 5.6/10 🟡 NEEDS WORK** (rounded from 5.61)

*Biggest drags: Time Independence (3/10, weight 10%) and Moat (3.3/10, weight 8%). Biggest strengths: Unit Economics (8/10), Concentration (9/10), Complexity Control (9/10).*

**Quadrant: STUCK SCALER** — has Code + Media leverage but founder is bottleneck.

**Re-audit:** 6 weeks. Success criteria: time dependency → 5+, M1 churn → <12%, support hire producing at 4+/5 satisfaction. Target composite: 6.5+.

---

### Worked Example: BrightCopy (Fictional Agency)

**Context:** 2-person content agency, 14 clients, $4,200/mo avg retainer, $58.8k MRR, founder + 1 writer.

#### Quick Audit

| Metric | Value | Verdict |
|--------|-------|---------|
| Effective Hourly Rate | $4,200 / 25hrs = $168/hr | 🟡 (Agency: $75-200 = Okay) |
| Monthly Time Load | 25hrs × 14 = 350 hrs (2 people) | 🔴 175 hrs/person |
| Time Ceiling | 160 / 25 = 6.4 clients per person | 🔴 At 14 clients, already over capacity |

#### Key Findings (Quick → Constraint)

- **Fit: 8/10 🟢.** Clients renew, refer others, expand scope.
- **Economics:** Margin 55% after writer costs 🟡. LTV:CAC 12:1 🟢 (all referral/inbound, near-zero CAC).
- **Retention:** 92% annual 🟢. But 3 clients = 45% of revenue 🔴 CONCENTRATION.
- **Time: 2/10 🔴.** Founder writes 40% of content, manages all clients, does all sales.
- **Moat: 4/18 🔴.** Client relationships only. Any senior writer could compete.
- **Leverage: 1/5.** Labor only.

#### THE Constraint: Founder Time (again — but different fix than SaaS)

**Why it's different from CloudDash:** For SaaS, the fix was hiring support to unlock more customers. For an agency, more customers without more leverage just means more hiring → margin compression. The real fix is **model evolution**, not just delegation.

**15.2 EXPLOIT:** Raise prices 20% on next 3 renewals (pricing power 7/10 — clients value the work). Systematize briefs into templates. Stop doing first drafts — review only.

**15.3 SUBORDINATE:** STOP taking <$3,500/mo clients. REDUCE founder writing to 0%. CONTINUE relationship management (that's the moat).

**15.4 ELEVATE:** Two paths:
| Path | Investment | Outcome |
|------|-----------|---------|
| A: Scale agency | Hire writer #2 + PM ($8k/mo) | 14 → 22 clients, margin drops to 45% |
| B: Productize | Build content playbook + templates ($0, 40hrs) | Fixed-scope packages, writer independence, margin holds |

**Emotional Barrier:** "Clients pay for MY writing, not 'the agency's.'"
**Reframe:** "3 of 14 clients specifically need you. The other 11 need the system you built. Productize the system."

**Action Plan:**
🔴 **This week:** Raise prices 20% on next 2 renewals. Template the 5 most common content briefs.
🟡 **30 days:** Move founder to review-only. Hire writer #2 or begin productized service design.
🟢 **90 days:** Reduce concentration — no client >20% of revenue.

**Composite: 4.9/10 🟡** — Biggest drags: Time (2/10), Moat (2.2/10), Leverage (2/10). Biggest strengths: Fit (8/10), Retention (8/10), Economics (7/10).

**Quadrant: FREELANCER** moving toward OPERATOR if productization succeeds.

---

