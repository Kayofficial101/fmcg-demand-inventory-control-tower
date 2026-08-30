-- The tables assumed here match data/sku_master.csv and data/monthly_demand.csv.
-- Syntax is PostgreSQL-compatible.

CREATE OR REPLACE VIEW inventory_policy AS
WITH recent_demand AS (
    SELECT
        sku_id,
        SUM(demand_units) AS annual_demand_units,
        AVG(demand_units::numeric) AS avg_monthly_demand,
        STDDEV_SAMP(demand_units::numeric) AS std_monthly_demand
    FROM monthly_demand
    WHERE month >= (SELECT MAX(month) - INTERVAL '11 months' FROM monthly_demand)
    GROUP BY sku_id
),
base AS (
    SELECT
        m.*,
        d.annual_demand_units,
        d.avg_monthly_demand,
        d.std_monthly_demand,
        d.annual_demand_units * m.unit_cost_inr AS annual_consumption_value_inr
    FROM sku_master m
    JOIN recent_demand d USING (sku_id)
),
value_curve AS (
    SELECT
        *,
        annual_consumption_value_inr / SUM(annual_consumption_value_inr) OVER () AS value_share,
        SUM(annual_consumption_value_inr) OVER (
            ORDER BY annual_consumption_value_inr DESC
            ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
        ) / SUM(annual_consumption_value_inr) OVER () AS cumulative_value_share
    FROM base
),
segmented AS (
    SELECT
        *,
        CASE
            WHEN cumulative_value_share <= 0.80 THEN 'A'
            WHEN cumulative_value_share <= 0.95 THEN 'B'
            ELSE 'C'
        END AS abc_class,
        CASE
            WHEN std_monthly_demand / NULLIF(avg_monthly_demand, 0) <= 0.50 THEN 'X'
            WHEN std_monthly_demand / NULLIF(avg_monthly_demand, 0) <= 1.00 THEN 'Y'
            ELSE 'Z'
        END AS xyz_class
    FROM value_curve
),
policy AS (
    SELECT
        *,
        CASE abc_class WHEN 'A' THEN 2.05 WHEN 'B' THEN 1.65 ELSE 1.28 END AS service_factor
    FROM segmented
),
calculated AS (
    SELECT
        *,
        CEIL(service_factor * std_monthly_demand * SQRT(lead_time_days / 30.0)) AS safety_stock_units,
        CEIL(avg_monthly_demand * (lead_time_days / 30.0)
            + service_factor * std_monthly_demand * SQRT(lead_time_days / 30.0)) AS reorder_point_units,
        CEIL(SQRT((2 * annual_demand_units * order_cost_inr)
            / (unit_cost_inr * holding_rate))) AS eoq_units
    FROM policy
)
SELECT * FROM calculated;


-- Replenishment queue.
SELECT
    sku_id,
    product_name,
    category,
    abc_class || xyz_class AS policy_cell,
    current_stock_units,
    on_order_units,
    reorder_point_units,
    eoq_units,
    CASE
        WHEN current_stock_units + on_order_units <= reorder_point_units
        THEN GREATEST(0, CEIL(reorder_point_units + eoq_units - current_stock_units - on_order_units))
        ELSE 0
    END AS recommended_order_units
FROM inventory_policy
ORDER BY recommended_order_units DESC, annual_consumption_value_inr DESC;


-- Working-capital review queue. Excess is a review signal, not an automatic disposal order.
SELECT
    sku_id,
    product_name,
    category,
    GREATEST(0, FLOOR(current_stock_units - safety_stock_units - eoq_units)) AS excess_units,
    GREATEST(0, FLOOR(current_stock_units - safety_stock_units - eoq_units)) * unit_cost_inr AS potential_release_inr
FROM inventory_policy
WHERE current_stock_units > safety_stock_units + eoq_units
ORDER BY potential_release_inr DESC;
