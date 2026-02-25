## PHASE 1: DIAGNOSE (Operations — Steps 7-11)

### Step 7: Time Dependency Analysis

*Skip if 10+ team, founder not in delivery.*

> **5 Questions:**
> 1. If you took a month off, what would happen to revenue?
> 2. What % of delivery requires YOUR specific involvement?
> 3. What tasks ONLY you can do?
> 4. What tasks could be delegated?
> 5. What tasks could be eliminated?

**Time Dependency Score:**

| Scenario | Score | Meaning |
|----------|-------|---------|
| Business stops if you stop | 1/10 | Totally dependent |
| Revenue drops 50%+ | 3/10 | Highly dependent |
| Revenue drops 20-50% | 5/10 | Moderately dependent |
| Revenue drops <20% | 7/10 | Low dependency |
| Revenue unaffected | 9/10 | Time independent |
| Revenue grows without you | 10/10 | True leverage |

**"Would I Hire Me?" Test:**

> If this business had to pay me a market salary for the work I do, would the economics still work?
> Revenue - Your Market Salary - All Other Costs = ?
> If < 20% margin → model is too dependent on your free/cheap labor.

**Founder Replacement Test:** Could someone else run this at 80% effectiveness for 6 months? If yes → you have a business. If no → you have a job you created.

---

### Step 8: The 10x Stress Test + Cost Curve Analysis

*Never skip.*

> 1. What breaks first at 10x?
> 2. What would you need?
> 3. Margins at 10x?
> 4. Customer experience at 10x?
> 5. Actual capacity limit now?

**Cost Curve Analysis — classify each cost:**

| Cost Item | Type | Current | At 2x | At 10x | Threshold |
|-----------|------|---------|--------|--------|-----------|
| Your time | Step-function | $X | $X | Can't | Breaks at X customers |
| Hosting | Fixed until threshold | $X | $X | $X | Upgrade at X |
| Support staff | Step-function | $X | +1 hire | +4 hires | 1 per X customers |
| LLM/compute | Pure variable | $X | 2× | 10× | Margin watch |
| Marketing | Variable w/ diminishing returns | $X | 1.5× | 5× | CAC increases |

**Cost Types:**
* **Fixed:** Doesn't change with customer count (up to threshold)
* **Variable:** Scales linearly (or worse) per customer
* **Step-function:** Flat, then jumps (e.g., hire every 50 customers)
* **Diminishing returns:** Increases faster than value generated

**Margin Projection:**

| Scale | Revenue | Variable | Step | Fixed | Margin |
|-------|---------|----------|------|-------|--------|
| Current | $X | $X | $X | $X | X% |
| 2x | $X | $X | $X | $X | X% |
| 5x | $X | $X | $X | $X | X% |
| 10x | $X | $X | $X | $X | X% |

**Stress Point Mapping:**

| Scale | What Breaks | Why | Fix Required | Cost |
|-------|-------------|-----|--------------|------|
| 2x | [First break] | [Cause] | [Solution] | $X / X hrs |
| 5x | [Second break] | [Cause] | [Solution] | $X / X hrs |
| 10x | [Third break] | [Cause] | [Solution] | $X / X hrs |
| 100x | [Ultimate break] | [Cause] | [Solution] | $X / X hrs |

---

### Step 9: Leverage & Moat Audit

*Never skip.*

#### Leverage Assessment

**Five Types of Leverage:**

| Type | Description | Example | Scale Factor |
|------|-------------|---------|--------------|
| **Labor** | Other people's time | Employees, contractors | Linear |
| **Capital** | Other people's money | Investment, debt | Variable |
| **Code** | Software/automation | SaaS, tools, AI | Infinite |
| **Media** | Content/audience | YouTube, podcasts, SEO | Infinite |
| **Network** | Users create value for users | Marketplaces, communities | Exponential |

**Score:** 0 = Freelancer | 1 = Some | 2-3 = Real | 4-5 = Highly leveraged

**Composite Conversion:** Leverage Score for composite = (Raw Score / 5) × 10. E.g., 3/5 = 6.0/10.

**Network Effects** *(if applicable):*

| Dimension | Question | Score (1-5) |
|-----------|----------|-------------|
| Strength | Does each new user measurably improve experience? | |
| Critical mass | Has growth become self-reinforcing? | |
| Defensibility | Could competitor replicate the network? How long? | |
| Multi-homing cost | How painful to use a competitor simultaneously? | |

#### Competitive Moat & Defensibility

> 1. Well-funded competitor copies you tomorrow — what stops switching?
> 2. What gets STRONGER as you grow (not just bigger)?
> 3. What can't be easily bought, copied, or replicated?
> 4. How long for a new entrant to reach your position?

**Moat Scoring:**

| Moat Type | Test | Max |
|-----------|------|-----|
| Network Effects | Product worse with half the users? | /3 |
| Switching Costs | Lose data/integrations/workflows? | /3 |
| Data Advantage | Product improves with more usage? | /3 |
| Brand / Trust | Pay more for your brand? | /2 |
| Scale Economies | Margins better at 10x? | /2 |
| Regulatory | Permissions needed to enter? | /2 |
| Unique Expertise | Replaceable by smart team in 12 months? | /2 |
| Counter-positioning | Copying you hurts incumbents? | /1 |
| **Total** | | **/18** |

**Interpretation:** 0-4 🔴 No moat | 5-8 🟡 Weak | 9-12 🟢 Moderate | 13-18 🟢 Strong

**Composite Conversion:** Moat Score for composite = (Raw Score / 18) × 10. E.g., 9/18 = 5.0/10.

⚠️ Moat < 5 = critical risk. Business works today but highly vulnerable.

---

### Step 10: Team & Execution Capability Check

*Skip if solo founder (time dependency in Step 7 covers this). For teams of 2+.*

> **5 Questions:**
> 1. For each key activity (from BMC), who does it?
> 2. If any one person left tomorrow, which activities stop?
> 3. What key capabilities are missing entirely?
> 4. What's being outsourced that should be in-house (or vice versa)?
> 5. Where is the team stretched thinnest?

| Key Activity Required | Who Does It | Capability | Gap? | Fix | Single-Point-of-Failure? |
|----------------------|-------------|-----------|------|-----|--------------------------|
| [From BMC] | [Name/role] | Strong/Adequate/Weak | Y/N | Hire/Train/Partner/Outsource | Y/N |
| [Activity 2] | | | | | |
| [Activity 3] | | | | | |

**Single-Point-of-Failure Analysis** (critical for teams <10):

> For each key activity, ask: "If this person is unavailable for 30 days, does this activity stop entirely?"
> If YES → that's a single-point-of-failure (SPOF), equivalent to revenue concentration risk but for execution.

| SPOF Risk Level | Situation | Action |
|----------------|-----------|--------|
| 🔴 CRITICAL | 2+ key activities have SPOF | Cross-train or hire immediately |
| 🟡 MODERATE | 1 key activity has SPOF | Document processes, begin cross-training |
| 🟢 LOW | No SPOFs, all key activities have backup | Monitor as team changes |

**🔴 Red Flags:**
* Model requires enterprise sales → team has only done PLG
* Model requires complex engineering → outsourcing core tech
* Model requires regulatory expertise → nobody has it
* Founder doing 3+ critical activities with no backup
* Key hire planned but unfunded — check if unit economics support the hire at current scale

---

### Step 11: Riskiest Assumptions Audit

*Never skip. Synthesis of Phase 1.*

| Source | Assumption | Tested? | Confidence | Impact |
|--------|-----------|---------|------------|--------|
| Step 1 (Fit) | Customers have [problem] | Y/N | H/M/L | Fatal/Major/Minor |
| Step 3 (Economics) | CAC stays below $X | Y/N | H/M/L | |
| Step 3 (Economics) | Margin holds at X% at scale | Y/N | H/M/L | |
| Step 4 (Retention) | Customers stay X months | Y/N | H/M/L | |
| Step 5 (Channels) | [Channel] keeps performing | Y/N | H/M/L | |
| Step 9 (Moat) | Competitors won't enter for X months | Y/N | H/M/L | |
| Step 10 (Team) | Team can execute [activity] | Y/N | H/M/L | |
| Regulatory | No regulatory changes affect model | Y/N | H/M/L | |

**Regulatory Risk Flag:**

> Operates in regulated space? (Fintech, healthtech, edtech, AI/data, food, insurance, legal)
> If YES: Compliance costs in COGS? Could regulations change model? Licensing needed? Data privacy (GDPR/HIPAA)?

**Top 3 Riskiest Assumptions** — rank by (Impact × Inverse Confidence × Untested):

```
🔴 RISK #1: [Assumption]
   If wrong: [consequence] | Test: [cheapest method] | Timeline: [when]

🔴 RISK #2: [Assumption]
   If wrong: [consequence] | Test: [method]

🟡 RISK #3: [Assumption]
   If wrong: [consequence] | Test: [method]
```

**Validation Methods:** Customer interviews (low/$, 1-2wk) | Landing page (low/$, 1-2wk) | Pre-sales/LOIs (low/$, 2-4wk) | A/B test (med/$, 2-8wk) | Pilot (med/$, 4-12wk)

---

