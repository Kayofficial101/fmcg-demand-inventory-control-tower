# FMCG inventory control tower

An editable 36-SKU model for two daily questions: what needs to be ordered, and which excess-stock flags deserve a planner's review?

> Data note: the company, products and 24-month demand history are generated for this project.

![Inventory control tower](visuals/control-tower.png)

## Current readout

- Inventory value: **INR 2.80 million**
- Order queue: **9 SKUs**
- Stockout risk: **6 SKUs**
- Recommended order quantity: **11,277 units**
- Potential excess-stock review: **INR 1.16 million**

The six stockout-risk items come first. The excess figure is a review queue; expiry, promotions, supplier reliability and minimum order quantities still need to be checked.

## Workbook logic

ABC ranks annual consumption value. XYZ groups demand by coefficient of variation. The workbook then calculates safety stock, reorder point, EOQ, order quantity and potential excess using visible formulas and editable parameters.

## Files

- [Excel control tower](excel/fmcg-inventory-control-tower.xlsx)
- [Case notes](CASE_STUDY.md)
- [SQL queues](sql/inventory_decisions.sql)
- [Data dictionary](DATA_DICTIONARY.md)
- [Python calculation](scripts/generate_and_analyze.py)

## Rebuild

```bash
python scripts/generate_and_analyze.py
node scripts/build_workbook.mjs
```

## Method references

- Microsoft ABC analysis report: https://learn.microsoft.com/en-us/dynamics365/business-central/reports/report-723
- Safety-stock and ABC-XYZ comparison: https://www.mdpi.com/2079-8954/12/7/260
- Oracle reorder-point planning guide: https://docs.oracle.com/cd/B15436_02/current/acrobat/115invug.pdf
