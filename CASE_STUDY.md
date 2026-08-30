# Inventory policy case notes

## Operating problem

The model covers 36 SKUs with different value and demand patterns. A single replenishment rule would under-protect some fast, valuable lines and hold too much stock in slower ones.

## Readout

Current inventory is **INR 2.80 million**. Nine SKUs enter the order queue, including six already below expected lead-time demand. The suggested orders total **11,277 units**. Another **INR 1.16 million** is flagged for an excess-stock review.

## Planner sequence

1. Check supplier availability and inbound stock for the six stockout-risk items.
2. Give AX items the tightest forecast and service review. Use exception reviews for AY, AZ and variable B items.
3. Review every excess flag against expiry, promotions, minimum order quantities, display stock and supplier reliability.

Python calculates the policy independently. Excel exposes the formulas and parameters. SQL turns the same rules into recurring order and excess-review queues.

## Before live use

The next version would use weekly demand, supplier lead-time history, shelf life, case packs, promotion calendars and service penalties. Z items may need an intermittent-demand method. The policy should be back-tested against fill rate and holding cost before rollout.
