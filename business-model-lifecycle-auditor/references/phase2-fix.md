## PHASE 2: FIX

---

### Step 12: Complexity Tax Assessment

*Skip if < 3 products/services.*

| Dimension | Count | Weight | Score |
|-----------|-------|--------|-------|
| Distinct offers | X | ×3 | X |
| Segments | X | ×2 | X |
| Delivery workflows | X | ×3 | X |
| Tools/platforms | X | ×1 | X |
| Integration points | X | ×2 | X |
| **Total** | | | **X** |

<15 🟢 Lean | 15-30 🟡 Moderate | 30-50 🔴 High | >50 🔴 Critical

**80/20:** Which 20% generates 80% profit? Kill the bottom 50%?

**Complexity Kill List:**

| Offer/Service | Revenue | Margin | Time Cost | Verdict |
|---------------|---------|--------|-----------|---------|
| [Offer 1] | $X | X% | X hrs/mo | KEEP / SIMPLIFY / KILL |
| [Offer 2] | $X | X% | X hrs/mo | KEEP / SIMPLIFY / KILL |
| [Offer 3] | $X | X% | X hrs/mo | KEEP / SIMPLIFY / KILL |

**Hormozi's Rule:** "If adding a product doesn't 2x the business, it'll probably 0.8x it."

---

### Step 13: Pricing Power + Architecture + Expansion Revenue

#### Part A: Pricing Power

> **6 Questions:**
> 1. When did you last raise prices?
> 2. What happened? (Or why haven't you?)
> 3. If you raised prices 20% tomorrow, what % of customers leave?
> 4. Do customers compare you to alternatives on price?
> 5. What would customers say is worth paying MORE for?
> 6. Do you compete on price or value?

**Pricing Power Score:**

| Scenario | Score | Meaning |
|----------|-------|---------|
| Can't raise without losing most customers | 1/10 | Commodity |
| Can raise 5-10% with some churn | 3/10 | Low power |
| Can raise 10-20% with minimal churn | 5/10 | Moderate |
| Can raise 20-30% with negligible churn | 7/10 | Strong |
| Customers would pay 2x+ if asked | 9/10 | Exceptional |
| Customers ASK to pay more (enterprise tier) | 10/10 | Monopoly-like |

**Price Sensitivity Matrix:**

```
                    HIGH perceived value
                          │
         PREMIUM          │        MONOPOLY
     (Can charge more,    │    (Can charge much more,
      some will leave)    │     few will leave)
                          │
LOW switching ───────────┼──────────── HIGH switching
cost                      │              cost
                          │
         COMMODITY        │       LOCKED-IN
     (Can't raise,        │    (Can raise, but
      leave easily)       │     customers resent it)
                          │
                    LOW perceived value
```

**20% Price Test (Thought Experiment):**

```
Current Revenue: $___/month
If you raised prices 20%:
  New price: $___
  Estimated customer loss: ___%
  New customer count: ___
  New revenue: $___/month
  Revenue change: +/-$___

If revenue INCREASES with fewer customers:
  → You were underpriced. Raise prices.
  → Bonus: fewer customers = less delivery cost = higher margins
```

#### Part B: Pricing Architecture

**Competitive Pricing Landscape** (required before setting prices):

| Competitor | Target Segment | Price | Value Metric | Key Differentiator |
|-----------|---------------|-------|-------------|-------------------|
| [Comp 1] | [Who] | $X/mo | [What] | [Why they win] |
| [Comp 2] | [Who] | $X/mo | [What] | [Why they win] |
| [Comp 3] | [Who] | $X/mo | [What] | [Why they win] |
| **You** | [Who] | $X/mo | [What] | [Why you win] |

**Positioning Decision:** Price ABOVE competitors (premium, need clear differentiation) | AT competitors (feature parity) | BELOW (penetration, need cost advantage) | ORTHOGONAL (different value metric entirely)

⚠️ You cannot assess pricing power without knowing the competitive landscape. If the user doesn't know competitor pricing, flag as a critical blind spot.

**Value Metric Selection:**

| Type | Best For | Risk |
|------|----------|------|
| Per seat | Team tools | Low users subsidize heavy |
| Per usage | Dev/AI tools | Unpredictable revenue |
| Per outcome | Consulting, lead gen | Hard to measure |
| Flat rate | Content, communities | No expansion |
| Per transaction | Payments, marketplaces | Volume dependency |
| Tiered hybrid | Most SaaS at scale | Complexity |

**Good Value Metric:** Aligns with value delivered + cost incurred, easy to understand, grows naturally, hard to game.

**WTP Research — Van Westendorp Price Sensitivity Meter:**

Ask 15-30 customers (or prospects) these 4 questions about your product:

> 1. At what price would this be **so cheap** you'd question its quality? (Too Cheap)
> 2. At what price is this a **bargain** — a great deal? (Cheap/Good Value)
> 3. At what price does this start to feel **expensive** but you'd still consider it? (Expensive/High)
> 4. At what price is this **too expensive** — you'd never buy it? (Too Expensive)

**How to interpret:** Plot cumulative distributions of all 4 answers.
- **Optimal Price Point (OPP):** Where "Too Cheap" and "Too Expensive" cross. Maximum purchase probability.
- **Indifference Price Point (IDP):** Where "Cheap" and "Expensive" cross. Equal number feel it's cheap vs. expensive.
- **Acceptable Price Range:** Between the "Too Cheap"/"Expensive" crossing and the "Cheap"/"Too Expensive" crossing.

**Quick heuristic with small samples:** Take the median of Q2 (Bargain) and Q3 (Expensive). The midpoint is a reasonable starting price. The Q3 median is your stretch price to test.

**When NOT to use:** New categories where customers can't anchor, outcome-based pricing where value varies wildly, enterprise where each deal is custom.

**Tier Design:**

| Element | Starter | Growth | Pro | Enterprise |
|---------|---------|--------|-----|------------|
| Target | [Who] | [Who] | [Who] | [Who] |
| Limit | [X] | [X] | [X] | Custom |
| Price | $X/mo | $X/mo | $X/mo | Custom |
| Upgrade trigger | [What] | [What] | [What] | — |
| Margin target | Break-even | >60% | >70% | >75% |

#### Part C: Expansion Revenue Design

> 1. Do customers naturally use more over time?
> 2. Clear upsell path to higher tiers?
> 3. Cross-sell opportunities?
> 4. Seat-based expansion as teams grow?

**Expansion Mechanics by Model:**

| Model | Primary Lever | How |
|-------|--------------|-----|
| SaaS (seat) | More team members | Price per seat, team features at thresholds |
| SaaS (usage) | More volume | Tiered usage, overage, commit tiers |
| Info Products | More courses/content | Subscription upgrade, bundles, certifications |
| Agency/Service | Larger scope | QBRs, proactive upsell at milestones |
| Marketplace | Higher GMV/user | Premium placement, value-add services |
| E-commerce | Higher AOV | Bundles, subscriptions, loyalty, cross-sell |

**NRR Targets:** SMB SaaS 100-110% | Mid-market 110-120% | Enterprise 120-130% | Usage-based 110-130%

**Expansion Triggers:**
```
Outreach when: hit X% of tier limit → upsell
               add X team members → seat expansion
               same tier for X months → review call
               NPS > X → ask for referral + expansion
               hit [success milestone] → "next level" offer
```

---

### Step 14: Discount & Renewal Policy

*Skip if no discounting/renewals.*

**Guardrails:**

| Rule | Guideline | Reasoning |
|------|-----------|-----------|
| **Max discount** | 20% (annual) / 10% (monthly) | Protects margin floor |
| **Approval** | Only [role] above X% | Prevents ad-hoc |
| **Annual prepay** | 15-20% vs. monthly | Justified by cash flow + churn reduction |
| **No discount default** | Exceptions, not standard | Train customers to expect full price |
| **Sunset clause** | Expires after X renewals | Prevents permanent erosion |

**Discount Impact Calculator:**

```
Required volume increase to maintain same profit after discount:
= Discount % / (Margin % - Discount %)

Example: 60% margin, 20% discount
= 20% / (60% - 20%) = 50% more customers needed

⚠️ A 20% discount at 60% margin means you need 50% MORE customers
   to make the same profit. Is that realistic?
```

**Renewal & Expansion Policy:**

| Element | Policy |
|---------|--------|
| **Renewal default** | Auto-renew with 60-day notice |
| **Price increase** | Up to X% annually with 90-day notice |
| **Grandfathering** | Grandfather for X renewals, then migrate |
| **Expansion triggers** | Proactive outreach at X% utilization |
| **Contraction handling** | Allow downgrade with minimum commitment |
| **Win-back** | X% discount for returning within 90 days |
| **Multi-year** | Additional X% for 2-3 year commitment |

---

### Step 15: Constraint Theory Loop (Goldratt)

*Never skip. Synthesis of Phase 2.*

#### 15.1: IDENTIFY — single biggest constraint

| Candidate | Evidence | Impact |
|-----------|----------|--------|
| Value-Market Fit | Step 1: X/10 | Foundation |
| Unit Economics | Step 3: LTV:CAC X:1 | Unsustainable |
| Churn | Step 4: X%/mo | $X/mo lost |
| Channel | Step 5: X% one source | Growth fragile |
| Concentration | Step 6: top X% | Revenue risk |
| Time | Step 7: X/10 | Ceiling |
| Moat | Step 9: X/18 | Competitor risk |
| Pricing | Step 13: X/10 | Revenue left |

**THE constraint is:** ___

#### 15.2: EXPLOIT — max output from current constraint without spending money

> What can you do THIS WEEK with zero investment to get more from the constraint?

| Constraint Type | Exploit Examples |
|----------------|-----------------|
| **Time** | Batch similar tasks, eliminate meetings, template repetitive work, set office hours |
| **Pricing** | Raise prices for new customers only (zero cost), remove lowest tier |
| **Churn** | Email at-risk customers today, fix the #1 reported bug, add onboarding email sequence |
| **Channel** | Double down on best channel, pause worst, repurpose existing content |
| **Moat** | Start collecting data you're not collecting, enable integrations, build community |
| **Fit** | Talk to 5 best customers this week — why do they stay? |

#### 15.3: SUBORDINATE — what do you stop doing to focus on the constraint?

> Everything not directly addressing the constraint is deprioritized. Be specific.

```
STOP: [List 2-3 activities to stop or pause]
REDUCE: [List 2-3 activities to do less of]
CONTINUE: [Only activities that directly address the constraint]
```

⚠️ This is the hardest step emotionally. Founders resist stopping things. Use the Psychological Barriers table below.

#### 15.4: ELEVATE — what investment breaks the constraint permanently?

> If exploiting isn't enough, what investment (money, time, hiring, technology) removes the constraint?

| Investment | Cost | Timeline | Expected Impact |
|-----------|------|----------|-----------------|
| [Option 1] | $X / X hrs | X weeks | [Metric change] |
| [Option 2] | $X / X hrs | X weeks | [Metric change] |

**Decision criteria:** Pick the option with the best (Impact / Cost × Time) ratio. Don't over-invest — once this constraint breaks, a NEW constraint emerges.

#### 15.5: REPEAT — what's the next constraint after this one is fixed?

> If we successfully break the current constraint, what becomes the NEW bottleneck?

```
Current constraint: [X]
If fixed, next constraint is likely: [Y]
Evidence: [From Steps 3-11, which was the SECOND worst score?]
```

⚠️ Never try to fix two constraints at once. Fix one, re-audit, find the next.

**🧠 Psychological Barriers:**

| Fix Required | Emotional Barrier | Reframe |
|-------------|-------------------|---------|
| Raise prices | "They'll hate me" | "Customers who leave over 20% weren't ideal" |
| Kill a product | "But I built it" | "Every hour on bottom 50% steals from top 20%" |
| Delegate | "Nobody does it as well" | "80% by someone else > 100% by you at burnout" |
| Drop a big client | "They're 40% of revenue" | "They own you. Diversify or accept risk." |
| Kill a channel | "It used to work" | "Past performance ≠ future. Reallocate to what works." |
| Change model | "We've always done this" | "The model got you here. It won't get you there." |
| Invest in slow (content/brand) | "Need results NOW" | "Fast channels have ceilings. Slow channels compound." |
| Admit weak PMF | "People say they like it" | "'Like' ≠ 'pay for.' Sean Ellis test doesn't lie." |

---

