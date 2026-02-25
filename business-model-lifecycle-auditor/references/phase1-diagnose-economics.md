## PHASE 1: DIAGNOSE (Economics — Steps 3-6)

---

### Step 3: Unit Economics Deep Dive (Industry-Benchmarked)

**Core Calculations:**

```
ARPU:                            $___
- CAC:                           $___
- COGS:                          $___
  ├── Direct labor:              $___
  ├── Infrastructure/hosting:    $___
  ├── AI/LLM compute:           $___
  ├── Third-party services:      $___
  └── Other variable:            $___
= Gross Profit:                  $___
/ Your Hours:                    ___
= Effective Hourly Rate:         $___

Gross Margin %:  (Gross Profit / Revenue) × 100
CAC Payback:     CAC / (ARPU × Gross Margin %)
LTV:             ARPU / Monthly Churn Rate
LTV:CAC:         LTV / CAC
```

**⚠️ Pitfalls:** LTV from immature cohorts | Blending segments | Excluding founder time | LTV:CAC alone (easy to game)

#### Industry Benchmarks

*Sources: OpenView SaaS Benchmarks, Bessemer Cloud Index, First Round State of Startups, KeyBanc SaaS Survey. Directional guides. Last updated: 2025.*

#### SaaS

| Metric | Bad | Okay | Good | Great |
|--------|-----|------|------|-------|
| LTV:CAC | <2:1 | 2-3:1 | 3-5:1 | >5:1 |
| Gross Margin | <60% | 60-70% | 70-80% | >80% |
| Monthly Churn | >5% | 3-5% | 1-3% | <1% |
| Payback (PLG) | >12mo | 6-12mo | 3-6mo | <3mo |
| Payback (Sales-led) | >18mo | 12-18mo | 6-12mo | <6mo |
| NRR | <90% | 90-100% | 100-120% | >120% |
| Quick Ratio | <1 | 1-2 | 2-4 | >4 |
| Burn Multiple | >3x | 2-3x | 1-2x | <1x |
| Rule of 40 | <20 | 20-30 | 30-40 | >40 |
| Magic Number | <0.3 | 0.3-0.5 | 0.5-0.8 | >0.8 |

#### Usage-Based / API / AI Products

| Metric | Bad | Okay | Good | Great |
|--------|-----|------|------|-------|
| Contribution Margin/Unit | <20% | 20-40% | 40-60% | >60% |
| Gross Margin (incl. compute) | <40% | 40-55% | 55-70% | >70% |
| Dollar-Based Net Retention | <90% | 90-110% | 110-130% | >130% |
| Usage Growth (MoM/account) | <0% | 0-5% | 5-15% | >15% |

**AI/LLM Cost Guardrails:**
```
⚠️ Contribution margin < 30% per unit → unsustainable at scale
⚠️ LLM costs > 50% of revenue per unit → restructure
⚠️ Model costs drop 50%+/year → build price flexibility
```

**Usage-Based Pricing Guardrails:** Rate limits, spend caps, minimum commitments, commit tiers, credit expiry (12mo), overage pricing.

#### Agency / Service

| Metric | Bad | Okay | Good | Great |
|--------|-----|------|------|-------|
| Gross Margin | <30% | 30-50% | 50-65% | >65% |
| Effective Hourly | <$75 | $75-200 | $200-500 | >$500 |
| Client Retention (Annual) | <60% | 60-75% | 75-90% | >90% |
| Utilization Rate | <50% | 50-65% | 65-80% | >80% |

#### Info Products / Courses

| Metric | Bad | Okay | Good | Great |
|--------|-----|------|------|-------|
| LTV:CAC | <1:1 | 1-3:1 | 3-7:1 | >7:1 |
| Gross Margin | <60% | 60-75% | 75-85% | >85% |
| Completion Rate | <10% | 10-30% | 30-50% | >50% |
| Refund Rate | >15% | 10-15% | 5-10% | <5% |

#### E-commerce / DTC

| Metric | Bad | Okay | Good | Great |
|--------|-----|------|------|-------|
| LTV:CAC | <1:1 | 1-2:1 | 2-4:1 | >4:1 |
| Gross Margin | <20% | 20-35% | 35-50% | >50% |
| Repeat Purchase | <15% | 15-30% | 30-50% | >50% |

#### Marketplace

| Metric | Bad | Okay | Good | Great |
|--------|-----|------|------|-------|
| Take Rate | <5% | 5-10% | 10-20% | >20% |
| Gross Margin | <40% | 40-60% | 60-75% | >75% |
| Supply Retention | <50% | 50-70% | 70-85% | >85% |
| Demand Retention | <30% | 30-50% | 50-70% | >70% |
| Liquidity (match rate) | <30% | 30-50% | 50-70% | >70% |

**Marketplace-Specific Deep Dive** *(only when Step 2 = Marketplace):*

| Dimension | Question | Risk |
|-----------|----------|------|
| Liquidity | What % of listings get fulfilled? | Low = both sides churn |
| Chicken-and-egg | Which side first? | Wrong sequence = no marketplace |
| Disintermediation | Can they bypass you after connecting? | High = take rate pressure |
| Supply/Demand balance | Which side constrained? | Imbalance = poor experience |
| Multi-homing | Do users use competitors simultaneously? | High = low switching costs |

**E-commerce/DTC-Specific Deep Dive** *(only when Step 2 = E-commerce):*

| Dimension | Question | Risk |
|-----------|----------|------|
| **Inventory** | Holding inventory or drop-shipping? | Holding = cash tied up + dead stock risk |
| **Fulfillment** | Self-fulfill or 3PL? Cost per order? | Fulfillment cost can eat margin at scale |
| **Return rate** | What % of orders returned? Cost per return? | High returns (>15%) destroy unit economics |
| **AOV** | Average order value? Trending up or down? | Low AOV + high CAC = unprofitable |
| **Repeat purchase** | What % buy again? Time between purchases? | <20% repeat = you're constantly buying new customers |
| **Seasonality** | Revenue swing between peak and trough? | >3x swing = cash flow crisis risk |
| **Supply chain** | Single supplier? Lead time? | Single source = fragility |

E-commerce Unit Economics — calculate per-order:
```
Revenue per order:             $___
- COGS (product cost):         $___
- Shipping / fulfillment:      $___
- Returns & refunds (% × AOV): $___
- Payment processing (~3%):    $___
= Contribution per order:      $___
× Orders per customer (LTV):   ___
= Lifetime contribution:       $___
- CAC:                         $___
= Customer profit:             $___
```

⚠️ E-commerce trap: Positive gross margin but negative after shipping + returns + CAC. Always calculate fully-loaded unit economics.

⚠️ Always compare against correct industry AND sales motion.

---

### Step 4: Churn & Retention Economics

*Skip if < 6 months of customers.*

> **6 Questions:**
> 1. What % leave each month?
> 2. Average customer lifespan?
> 3. Expansion revenue?
> 4. Main churn reason?
> 5. Different segments with different retention?
> 6. What does onboarding look like?

**LTV Calculation Engine:**
```
Simple:        LTV = ARPU × Average Lifespan
Churn-Based:   LTV = ARPU / Monthly Churn Rate
With Expansion: LTV = ARPU / (Churn - Expansion Rate)
  ⚠️ Only valid if churn > expansion. If NRR > 100%, cap LTV at 36-60 months.
Per-Segment:   LTV_total = Σ (LTV_segment × % of customers)
  ⚠️ Always calculate per segment. Blended averages hide dying segments.
```

**Retention Health Dashboard:**

| Metric | Value | Status |
|--------|-------|--------|
| Monthly Churn Rate (logo) | X% | [vs benchmark] |
| Monthly Revenue Churn | X% | [vs benchmark] |
| Average Customer Lifespan | X months | |
| Simple LTV | $X | |
| LTV:CAC Ratio | X:1 | [vs benchmark] |
| Net Revenue Retention (NRR) | X% | [vs benchmark] |
| Gross Revenue Retention (GRR) | X% | 🔴 <80% / 🟡 80-90% / 🟢 >90% |
| Revenue from Existing vs New | X% / X% | 🔴 if new > 60% |
| Quick Ratio | X | 🔴 <1 / 🟡 1-2 / 🟢 2-4 |

**Cohort Retention Curve:**

| Month | Cohort 1 | Cohort 2 | Cohort 3 | Average |
|-------|----------|----------|----------|---------|
| M0 | 100% | 100% | 100% | 100% |
| M1 | X% | X% | X% | X% |
| M3 | X% | X% | X% | X% |
| M6 | X% | X% | X% | X% |
| M12 | X% | X% | X% | X% |

**Churn Diagnosis:**

| Pattern | Meaning | Fix |
|---------|---------|-----|
| High early (M1-M3) | Onboarding failure | Fix onboarding, align marketing with delivery |
| Steady bleed | Value not growing | Engagement loops, expand value |
| Cliff drop (specific month) | Contract cycle ending | Renewal incentives, lock value before cliff |
| Seasonal | Business-cycle dependent | Adjust billing/offerings for seasonality |
| Involuntary (payments) | Payment infrastructure | Retry logic, dunning, card updater |
| Downgrade (revenue, not logo) | Shrinking usage | Expansion triggers, investigate value delivery |

**Leaky Bucket Ratio:** New Revenue / Churned Revenue — >3:1 growing | 2-3:1 churn is a drag | 1-2:1 treading water | <1:1 shrinking

---

### Step 5: Customer Acquisition Channel Economics

*Skip if single channel, pre-scale.*

> **5 Questions:**
> 1. Spend per channel monthly?
> 2. Customers from each channel?
> 3. Which channel has best LTV (not just lowest CAC)?
> 4. Top channel disappears — what happens?
> 5. Any channels approaching their ceiling?

**Channel-Level Economics:**

| Channel | Spend | Customers | CAC | LTV | LTV:CAC | % of Acq |
|---------|-------|-----------|-----|-----|---------|----------|
| [Channel 1] | $X | X | $X | $X | X:1 | X% |
| [Channel 2] | $X | X | $X | $X | X:1 | X% |
| **Blended** | **$X** | **X** | **$X** | **$X** | **X:1** | **100%** |

**Channel Concentration Risk:**

| Top Channel % | Risk |
|---------------|------|
| >70% | 🔴 CRITICAL — one algorithm change = zero growth |
| 50-70% | 🔴 HIGH |
| 30-50% | 🟡 MODERATE |
| <30% | 🟢 HEALTHY |

**Channel Scalability:**

| Channel | Ceiling | CAC at Scale | Verdict |
|---------|---------|-------------|---------|
| Organic/SEO | High, slow | Decreases (compounds) | INVEST long-term |
| Paid Social | Medium | Increases (fatigue) | OPTIMIZE, diminishing returns |
| Content Marketing | High | Decreases | INVEST, compounds |
| Outbound Sales | Low-medium | Increases (need reps) | SYSTEMATIZE |
| Referrals | High if product great | Decreases | NURTURE |

**⚠️ CAC Trap:** Blended CAC hides channel problems. $200 blended = $50 organic + $500 paid. Scaling paid spikes blended CAC.

---

### Step 6: Revenue Concentration Risk

*Skip if 100+ diverse customers, no single customer > 5%.*

| Top Customer % | Risk |
|----------------|------|
| >40% | 🔴 CRITICAL — you have a client, not a business |
| 25-40% | 🔴 HIGH |
| 15-25% | 🟡 MODERATE |
| 5-15% | 🟢 LOW |
| <5% | 🟢 MINIMAL |

**HHI:** Sum of (customer % of revenue)² — <1,500 healthy, >2,500 dangerous.

**Revenue Source Diversification:**

| Dimension | Current State | Risk |
|-----------|---------------|------|
| Customer concentration | Top 3 = X% | [🔴/🟡/🟢] |
| Channel concentration | Top channel = X% (see Step 5) | [🔴/🟡/🟢] |
| Product concentration | Top product = X% | [🔴/🟡/🟢] |
| Geographic concentration | Top region = X% | [🔴/🟡/🟢] |

---
