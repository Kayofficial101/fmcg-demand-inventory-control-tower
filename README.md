# FMCG inventory control tower

This project turns demand and stock data into two practical lists: what needs to be ordered now and what excess stock needs review.

## What I was trying to solve

The 36 products in the model have different sales value and demand stability. One stock rule for all of them would create shortages in important products and too much stock in slower ones.

## What I built

1. Grouped products by annual consumption value using ABC analysis.
2. Grouped demand as stable, variable or unpredictable using XYZ analysis.
3. Calculated safety stock, reorder points and suggested order quantities.
4. Built an Excel control tower for the planner.
5. Used Python to check the workbook and SQL to create recurring work queues.

![Inventory control tower](visuals/control-tower.png)

## Current output

- Inventory value: **₹2.80 million**
- Products in the order queue: **9**
- Products already at stockout risk: **6**
- Suggested order quantity: **11,277 units**
- Inventory flagged for excess review: **₹1.16 million**

The stockout-risk products come first. Excess stock is a review queue, not an automatic disposal decision.

## Tools used

Excel, Python, SQL, ABC-XYZ analysis, safety stock and reorder-point calculations.

## Main files

- [Excel control tower](excel/fmcg-inventory-control-tower.xlsx): editable dashboard and calculations
- [Case study](CASE_STUDY.md): problem, result and planner sequence
- [SQL queues](sql/inventory_decisions.sql): order and excess-review lists
- [Python model](scripts/generate_and_analyze.py): data build and independent check
- [Data dictionary](DATA_DICTIONARY.md): meaning of every field

The company, products and demand history were created for this project. A live version would also need supplier reliability, shelf life, pack sizes, promotions and actual service-level costs.

Run `python scripts/generate_and_analyze.py` and `node scripts/build_workbook.mjs` to rebuild it.
