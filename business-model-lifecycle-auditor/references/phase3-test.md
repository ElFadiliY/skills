## PHASE 3: TEST & EVOLVE

---

### Step 16: Experiment Design

*Skip if no changes recommended.*

#### Choosing the Right Experiment Method

| Your Situation | Method | Why |
|---------------|--------|-----|
| PLG, 500+ users, testing conversion | **A/B test** | Statistical power, fast signal |
| 50-200 customers, testing pricing | **New customers only** | Don't disrupt existing; compare cohorts |
| <50 customers, testing anything | **Before/after** | Can't split; compare same base over time |
| Changing pricing for all | **Grandfather + new** | Protect existing, test on new |
| Testing a new channel or feature | **Holdout cohort** | Reserve 10-20% as control |
| Enterprise, long sales cycle | **Sequential testing** | Too few deals for split; run periods |

**⚠️ Small-Sample Reality Check:** Most early-stage businesses CANNOT do statistically valid A/B tests. With 45 customers, you need massive effect sizes (>30% difference) to detect anything. For small bases: use before/after comparisons, qualitative signals (are customers complaining? expanding?), and directional indicators rather than statistical significance.

#### Sample Size Guidance

```
Minimum detectable effect → required sample per variant:
  30% lift → ~50 per variant
  20% lift → ~100 per variant
  10% lift → ~400 per variant
  5% lift → ~1,600 per variant

If you don't have the sample: use before/after, qualitative signals, or run longer.
```

#### Experiment Design Template

```
EXPERIMENT: [Name]
HYPOTHESIS: If we [change], then [metric] will [improve by X%] because [reason].
PRIMARY METRIC: [The one number that decides GO/NO-GO]
GUARDRAIL METRICS: [Metrics that must NOT get worse — e.g., churn, NPS, support tickets]
METHOD: [From table above]
DURATION: [Min observation window — see lag windows below]
SAMPLE: [Who, how many]
SUCCESS CRITERIA: GO if primary ≥ +X% AND guardrails hold
FAILURE CRITERIA: NO-GO if primary flat or negative OR guardrail breach
AMBIGUOUS: ITERATE if mixed signals after [duration]
```

#### Lag Windows — How Long to Wait

| What You're Measuring | Lag | Minimum Wait |
|----------------------|-----|-------------|
| Conversion rate, sign-up | Short | 1-2 weeks |
| Activation, onboarding completion | Short-Medium | 2-4 weeks |
| Upgrade / expansion | Medium | 4-8 weeks |
| Churn impact | Long | 8-16 weeks (need full billing cycle) |
| NRR / LTV impact | Very Long | 3-6 months |

⚠️ Never declare success on short-lag alone. Min observation windows: PLG 8wk, Sales-led 12wk, Enterprise 6mo.

#### Experiment Results Template

```
RESULT: [GO / NO-GO / ITERATE]
PRIMARY METRIC: [Before] → [After] = [Δ%]
GUARDRAILS: [All held / Breach in X]
CONFIDENCE: [High — clear signal / Medium — directional / Low — noisy]
DECISION: [Roll out to all / Kill it / Modify and re-test]
LEARNINGS: [What did we learn regardless of outcome?]
NEXT: [What experiment follows?]
```

---

### Step 17: Scenario Modeling

*Skip if pre-revenue.*

#### Scenario Definition

| Variable | Worst (Conservative) | Base (Current Trend) | Best (Optimistic) | Basis |
|----------|---------------------|---------------------|-------------------|-------|
| New customers/mo | X | X | X | [Why this range] |
| Monthly churn | X% | X% | X% | [Historical / benchmark] |
| ARPU | $X | $X | $X | [Pricing change Y/N] |
| NRR | X% | X% | X% | [Expansion mechanics] |
| CAC | $X | $X | $X | [Channel mix shift] |
| Gross Margin | X% | X% | X% | [Cost structure change] |

**How to set ranges:**
- **Worst case:** Assume your weakest month repeats. Key channel dies. Biggest customer leaves. No pricing change.
- **Base case:** Current trend continues. No major changes. Constraint partially addressed.
- **Best case:** Constraint fully broken. Pricing change succeeds. Best month becomes average.

#### 12-Month Revenue Projection

```
For each scenario, calculate:

M0 Customers: [current]
M(n) Customers = M(n-1) × (1 - churn) + new customers
M(n) Revenue = M(n) Customers × ARPU × NRR adjustment

Fill in:
| Month | Worst Customers | Worst MRR | Base Customers | Base MRR | Best Customers | Best MRR |
|-------|----------------|-----------|----------------|----------|----------------|----------|
| M0    | X              | $X        | X              | $X       | X              | $X       |
| M3    | X              | $X        | X              | $X       | X              | $X       |
| M6    | X              | $X        | X              | $X       | X              | $X       |
| M12   | X              | $X        | X              | $X       | X              | $X       |
```

#### Sensitivity Analysis — What Moves the Needle Most?

| If This Changes... | By This Much... | Revenue Impact (12mo) | Confidence |
|--------------------|-----------------|-----------------------|-----------|
| Churn drops 1% | 4% → 3% | +$X | [H/M/L] |
| ARPU increases 20% | $X → $X | +$X | [H/M/L] |
| New customers +50% | X → X/mo | +$X | [H/M/L] |
| NRR hits 110% | 95% → 110% | +$X | [H/M/L] |
| CAC drops 30% | $X → $X | +$X (efficiency) | [H/M/L] |

**The highest-impact, highest-confidence lever is your priority.** This should align with the constraint identified in Step 15. If it doesn't, revisit.

---

### Step 18: Composite Score, Quadrant, and Action Plan

#### Composite Scale Score

**Scoring Rubrics — How to Score Each Component /10:**

| Component | 1-2 🔴 | 3-4 🔴 | 5-6 🟡 | 7-8 🟢 | 9-10 🟢 |
|-----------|--------|--------|--------|--------|---------|
| **Value-Market Fit** | No fit, no PMF signals | Weak fit, alternatives easy | Nice-to-have, some retention | Strong fit, would miss it | Market pull, evangelists |
| **Unit Economics** | LTV:CAC <1:1, negative margin | LTV:CAC 1-2:1, margin <40% | LTV:CAC 2-3:1, margin 40-60% | LTV:CAC 3-5:1, margin 60-80% | LTV:CAC >5:1, margin >80% |
| **Retention** | >10% monthly churn | 5-10% monthly churn | 3-5% monthly, NRR <95% | 1-3% monthly, NRR 95-110% | <1% monthly, NRR >110% |
| **Time Independence** | Stops without you (Step 7: 1-2) | Drops 50%+ (Step 7: 3-4) | Drops 20-50% (Step 7: 5-6) | Drops <20% (Step 7: 7-8) | Grows without you (Step 7: 9-10) |
| **Moat** | Raw 0-3/18 | Raw 4-6/18 | Raw 7-9/18 | Raw 10-13/18 | Raw 14-18/18 |
| **Leverage** | 0/5 types | 1/5 types | 2/5 types | 3/5 types | 4-5/5 types |
| **Pricing Power** | Commodity, can't raise (Step 13A: 1-2) | Raise 5% with churn (3-4) | Raise 10-20% ok (5-6) | Raise 20-30% ok (7-8) | 2x+ possible (9-10) |
| **Channel Health** | Single channel >80%, CAC rising | 1-2 channels, >70% concentrated | 2-3 channels, 50-70% top | 3+ channels, <50% top, stable CAC | 4+ channels, <30% top, CAC declining |
| **Concentration Safety** | Top customer >40% | Top customer 25-40% | Top customer 15-25% or top 3 >50% | Top customer 5-15%, multi-dimension ok | Top customer <5%, diversified across all dimensions |
| **Pricing Architecture** | No structure, ad-hoc | Single price, no tiers | Basic tiers, weak value metric | Clear tiers, good value metric, upgrade path | Optimized tiers, expansion built-in, tested WTP |
| **Assumptions Tested** | 0 of top 5 tested | 1 of top 5 tested | 2-3 tested, critical gaps remain | 4 tested, minor gaps | All critical assumptions validated |
| **Team Capability** | Critical gaps, no plan | Gaps in 2+ key activities | Gaps in 1 key activity, plan exists | Minor gaps, team covers all key activities | Strong across all activities, redundancy built |
| **Discount Discipline** | No policy, ad-hoc, >30% common | Some limits, inconsistent | Written policy, mostly followed | Clear guardrails, enforced, impact tracked | Rarely discount, value-based, renewal structured |
| **Experiment Readiness** | Never tested anything | Tested once, no framework | Has a plan, hasn't executed | Running experiments, tracking results | Systematic experimentation culture, decision rules |
| **Complexity Control** | >50 complexity score, no focus | 30-50, spreading thin | 15-30, some bloat | <15, focused | Ruthlessly focused, 80/20 enforced, kill list active |

```
Scale Score = (Value-Market Fit × 0.12) + (Unit Economics × 0.12) + 
              (Retention × 0.10) + (Time Independence × 0.10) + 
              (Moat × 0.08) + (Leverage × 0.07) + (Pricing Power × 0.07) +
              (Channel Health × 0.06) + (Concentration Safety × 0.05) + 
              (Pricing Architecture × 0.05) + (Assumptions Tested × 0.05) +
              (Team Capability × 0.04) + (Discount Discipline × 0.03) + 
              (Experiment Readiness × 0.03) + (Complexity Control × 0.03)
```

| Component | Source | Weight | Score |
|-----------|--------|--------|-------|
| Value-Market Fit | Step 1 | 12% | X/10 |
| Unit Economics | Step 3 | 12% | X/10 |
| Retention | Step 4 | 10% | X/10 |
| Time Independence | Step 7 | 10% | X/10 |
| Moat & Defensibility | Step 9 | 8% | X/10 |
| Leverage | Step 9 | 7% | X/10 |
| Pricing Power | Step 13A | 7% | X/10 |
| Channel Health | Step 5 | 6% | X/10 |
| Concentration Safety | Step 6 | 5% | X/10 |
| Pricing Architecture | Step 13B | 5% | X/10 |
| Assumptions Tested | Step 11 | 5% | X/10 |
| Team Capability | Step 10 | 4% | X/10 |
| Discount Discipline | Step 14 | 3% | X/10 |
| Experiment Readiness | Step 16 | 3% | X/10 |
| Complexity Control | Step 12 | 3% | X/10 |
| **Composite** | | **100%** | **X/10** |

8-10 🟢 Excellent | 6-8 🟢 Good | 4-6 🟡 Needs Work | 2-4 🔴 Poor | 0-2 🔴 Broken

> **⚠️ Calibration note:** These bands are directional, not deterministic. A 6/10 in a market with strong tailwinds may outperform an 8/10 in a declining market. The composite is most valuable for tracking YOUR progress over time (re-audit delta) and for identifying which components drag you down — not for comparing across different businesses.

> **Weight customization:** Weights reflect framework design judgment across typical businesses. If your context differs — e.g., moat matters disproportionately in winner-take-all markets, or time independence is irrelevant for a lifestyle business — adjust weights accordingly. The component scores matter more than the composite.

#### Business Model Quadrant

```
                    HIGH Time Independence (7-10)
                          │
      ┌───────────────────┼───────────────────┐
      │     OPERATOR      │      OWNER        │
      │  "Runs without    │  "Grows without   │
      │   me daily"       │   me entirely"    │
LOW   │───────────────────┼───────────────────│ HIGH
Leverage                  │                     Leverage
(0-1)                     │                     (3-5)
      │    FREELANCER     │   STUCK SCALER    │
      │  "I AM the        │  "Built leverage  │
      │   business"       │   but bottleneck" │
      └───────────────────┼───────────────────┘
                    LOW Time Independence (1-3)
```

#### Decision Tree

```
Score < 2: Value-Market Fit? NO → Phase 0 | YES → Fix pricing (Step 13)
Score 2-4: Assumptions tested? NO → Test first | YES → Fix #1 constraint
Score 4-6: Fix constraint (complexity/pricing/channel/moat/leverage)
Score 6-8: Optimize (leverage, architecture, expansion, moat)
Score 8+: Model evolution → consider next stage below
```

**Model Evolution Paths** (for Score 8+ or when current model ceiling is reached):

| From | To | Trigger |
|------|----|---------|
| Service → Productized Service | Fixed-scope packages | Time dependency >5, demand proven |
| Productized → SaaS | Software replaces manual delivery | Delivery cost is constraint |
| 1:1 → 1:Many | Groups, courses, templates | Time is constraint, content is leverage |
| One-Time → Recurring | Subscriptions, retainers | Retention >70%, expansion possible |
| Usage-Based → Predictable | Commit tiers, credits, hybrid | Revenue volatility is constraint |

#### Prioritized Action Plan

```
🔴 CRITICAL (This Week):
1. [Action] — Impact: $X — Cost: $X/Xhrs
   Emotional barrier: [name it] — Reframe: [provide it]

🟡 IMPORTANT (30 Days):
2. [Action] — Impact: $X — Experiment: [plan from Step 16]
3. [Action]

🟢 MONITOR (90 Days):
4. [Action] — Scenario dependency: [trigger]
```

---

### Step 19: Re-Audit & Progress Tracking

| Metric | Previous | Current | Δ | Trend |
|--------|----------|---------|---|-------|
| **Composite** | **X/10** | **X/10** | **±X** | **↑/↓/→** |
| Value-Market Fit | X/10 | X/10 | | |
| Unit Economics | X/10 | X/10 | | |
| Retention | X/10 | X/10 | | |
| Time Independence | X/10 | X/10 | | |
| Moat | X/18 (X/10) | X/18 (X/10) | | |
| Leverage | X/5 (X/10) | X/5 (X/10) | | |
| Pricing Power | X/10 | X/10 | | |
| Channel Health | X/10 | X/10 | | |
| Concentration | X/10 | X/10 | | |
| Pricing Architecture | X/10 | X/10 | | |
| Assumptions Tested | X/10 | X/10 | | |
| Team Capability | X/10 | X/10 | | |
| Discount Discipline | X/10 | X/10 | | |
| Experiment Readiness | X/10 | X/10 | | |
| Complexity Control | X/10 | X/10 | | |

**Progress Assessment:**

```
Previous #1 Constraint: [What it was]
Fixed? [Yes/No/Partially]
New #1 constraint: [What emerged]

Experiment results since last audit:
- [Experiment 1]: [Result] → [GO/NO-GO/ITERATE]

Assumptions validated since last audit:
- [Assumption 1]: [Confirmed/Invalidated/Inconclusive]

Net progress: [Significant / Moderate / Minimal / Regressed]
```

**Cadence:** Pre-PMF monthly | <$10k MRR 6wk | $10-100k quarterly | $100k+ bi-annually

---

