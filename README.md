# FMCG inventory control tower

This project turns demand and stock data into two daily planner lists: what needs to be ordered now, and what excess stock needs review.

## The problem

The model covers 36 products with different sales value and demand stability. Using one stock rule for every product would create shortages in important lines and excess inventory in slower ones.

## What I built

- An Excel control tower with editable assumptions and visible formulas.
- ABC grouping based on annual consumption value.
- XYZ grouping based on how stable or unpredictable demand is.
- Safety stock, reorder point and recommended order calculations.
- A Python calculation that checks the workbook results independently.
- SQL queries that produce recurring order and excess-review queues.

![Inventory control tower](visuals/control-tower.png)

## Current output

- Inventory value: **INR 2.80 million**
- Products in the order queue: **9**
- Products already at stockout risk: **6**
- Recommended order quantity: **11,277 units**
- Inventory flagged for excess review: **INR 1.16 million**

The six stockout-risk products come first. The excess figure is a review list, not an automatic disposal decision. Promotions, expiry, inbound orders, supplier reliability and minimum order quantities still need to be checked.

## Project files

| File | What it contains |
|---|---|
| [Excel control tower](excel/fmcg-inventory-control-tower.xlsx) | Dashboard, inventory policy and editable calculations |
| [Case notes](CASE_STUDY.md) | The operating problem, current readout and planner sequence |
| [SQL queues](sql/inventory_decisions.sql) | Order and excess-review queries |
| [Python calculation](scripts/generate_and_analyze.py) | Data generation and an independent calculation of the policy |
| [Data dictionary](DATA_DICTIONARY.md) | Meaning and format of every field |

## Before using this with live inventory

I would add weekly demand, supplier lead-time history, shelf life, case-pack sizes, promotion calendars and service-level costs. The policy should then be tested against actual fill rate and holding cost.

The company, products and 24-month demand history were created for this project.

## Rebuild

```bash
python scripts/generate_and_analyze.py
node scripts/build_workbook.mjs
```

## Method references

- [Microsoft ABC analysis report](https://learn.microsoft.com/en-us/dynamics365/business-central/reports/report-723)
- [Safety-stock and ABC-XYZ comparison](https://www.mdpi.com/2079-8954/12/7/260)
- [Oracle reorder-point planning guide](https://docs.oracle.com/cd/B15436_02/current/acrobat/115invug.pdf)
