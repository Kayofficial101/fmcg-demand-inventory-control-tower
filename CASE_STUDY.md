# Case study: one policy should not manage every SKU

## The operating problem

The synthetic distributor carries 36 FMCG SKUs across beverages, snacks, personal care and home care. Demand ranges from stable high-value lines to volatile long-tail products. A single safety-stock rule either under-protects important items or ties up cash in slower stock.

## What the model found

- Current inventory value: **INR 2.80 million**
- SKUs requiring an order: **9**
- SKUs already below expected lead-time demand: **6**
- Recommended order quantity across the queue: **11,277 units**
- Potential working-capital review: **INR 1.16 million**

These are outputs from the fixed synthetic dataset, not a promise that the full value can be released. Excess stock may be needed for promotions, minimum order quantities, supplier disruption or shelf availability.

## My recommendation

### 1. Protect service before releasing cash

The six stockout-risk SKUs should be checked first. The operating conversation is supplier availability, current inbound orders and the next demand window. A working-capital programme that ignores these items can create the wrong behaviour.

### 2. Use the ABC-XYZ cell to set review cadence

- **AX:** tight forecast review, high service factor, frequent replenishment.
- **AY/AZ:** high-value items with more uncertainty, so planner judgement matters.
- **BX/BY:** standard policy with exception review.
- **C cells:** lighter-touch management unless a commercial or service constraint overrides value.

### 3. Treat potential release as a queue

The model flags current stock above safety stock plus one EOQ cycle. A planner should then check expiry, promotion, minimum order quantity, display stock and supplier reliability. Only the remainder is a credible release.

## Why I used two methods

Python creates and independently analyzes the fixed dataset. Excel recalculates the policy using visible formulas and editable parameters. SQL shows how the same logic can become a recurring reorder and review queue in a warehouse. The three paths make the decisions easier to inspect.

## Limits before production use

- Use daily or weekly demand when lead times are short.
- Add lead-time variability when supplier delivery is unstable.
- Use intermittent-demand methods for Z items where the normal approximation is weak.
- Add shelf life, promotions, MOQ, case packs and service penalties.
- Back-test the policy against actual fill rate and holding cost before rollout.
