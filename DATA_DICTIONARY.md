# Data dictionary

## `data/sku_master.csv`

| Field | Meaning |
|---|---|
| `sku_id` | Synthetic SKU identifier |
| `product_name` | Invented FMCG product description |
| `category` | Beverages, Snacks, Personal Care or Home Care |
| `unit_cost_inr` | Synthetic unit acquisition cost |
| `unit_price_inr` | Synthetic selling price |
| `lead_time_days` | Assumed replenishment lead time |
| `order_cost_inr` | Assumed fixed cost per replenishment order |
| `holding_rate` | Annual carrying-cost percentage |
| `current_stock_units` | Synthetic on-hand stock at the snapshot date |
| `on_order_units` | Synthetic confirmed inbound quantity |

## `data/monthly_demand.csv`

| Field | Meaning |
|---|---|
| `month` | First day of the demand month |
| `sku_id` | Joins to the SKU master |
| `demand_units` | Synthetic requested units before stock constraints |

## Important derived fields

| Field | Definition |
|---|---|
| Annual consumption value | Recent 12-month demand multiplied by unit cost |
| Coefficient of variation | Monthly demand standard deviation divided by monthly mean |
| Safety stock | Service factor multiplied by monthly demand deviation and the square root of lead time in months |
| Reorder point | Expected lead-time demand plus safety stock |
| EOQ | Square root of two times annual demand times order cost divided by annual per-unit holding cost |
| Inventory position | On-hand plus on-order units |
| Potential release | Units above safety stock plus one EOQ cycle, multiplied by unit cost |
