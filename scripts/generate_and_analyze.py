from __future__ import annotations

import csv
import json
import math
import random
from collections import defaultdict
from datetime import date
from pathlib import Path
from statistics import mean, stdev


ROOT = Path(__file__).resolve().parents[1]
RNG = random.Random(108)
START_YEAR = 2024
START_MONTH = 1


PRODUCTS = {
    "Beverages": [
        "Spark Cola 250 ml", "Lime Soda 300 ml", "Mango Drink 200 ml",
        "Energy Drink 250 ml", "Bottled Water 1 L", "Iced Tea Lemon 300 ml",
        "Orange Drink 200 ml", "Coconut Water 200 ml", "Soda Water 750 ml",
    ],
    "Snacks": [
        "Classic Salted Chips 52 g", "Masala Chips 52 g", "Roasted Peanuts 100 g",
        "Cheese Puffs 45 g", "Oat Cookies 120 g", "Chilli Corn Snacks 60 g",
        "Salted Crackers 100 g", "Trail Mix 80 g", "Chocolate Wafer 40 g",
    ],
    "Personal Care": [
        "Daily Shampoo 180 ml", "Herbal Shampoo 180 ml", "Bath Soap 100 g",
        "Face Wash 100 ml", "Body Lotion 200 ml", "Toothpaste 150 g",
        "Deodorant 150 ml", "Hand Wash 250 ml", "Hair Oil 200 ml",
    ],
    "Home Care": [
        "Laundry Powder 1 kg", "Dishwash Bar 200 g", "Floor Cleaner 1 L",
        "Toilet Cleaner 500 ml", "Fabric Conditioner 500 ml", "Surface Spray 500 ml",
        "Garbage Bags 30 pack", "Air Freshener 250 ml", "Kitchen Towels 2 roll",
    ],
}


def month_sequence(count: int) -> list[str]:
    values = []
    year, month = START_YEAR, START_MONTH
    for _ in range(count):
        values.append(date(year, month, 1).isoformat())
        month += 1
        if month == 13:
            month = 1
            year += 1
    return values


def build_data() -> tuple[list[dict[str, object]], list[dict[str, object]]]:
    months = month_sequence(24)
    master: list[dict[str, object]] = []
    demand_rows: list[dict[str, object]] = []
    sku_number = 1
    for category_index, (category, names) in enumerate(PRODUCTS.items()):
        for local_index, name in enumerate(names):
            sku = f"SKU-{sku_number:03d}"
            value_band = 9 - local_index
            base = 80 + (value_band ** 1.7) * 45 + category_index * 20
            pattern = "X" if local_index < 4 else "Y" if local_index < 7 else "Z"
            unit_cost = round(18 + category_index * 12 + local_index * 4.5 + RNG.uniform(-2, 2), 2)
            unit_price = round(unit_cost * RNG.uniform(1.32, 1.65), 2)
            lead_time = [5, 7, 10, 14, 18, 21][(local_index + category_index) % 6]
            order_cost = [650, 800, 950, 1100][category_index]
            history: list[int] = []
            for month_index, month in enumerate(months):
                calendar_month = int(month[5:7])
                seasonal = 1.0
                if category == "Beverages" and calendar_month in {4, 5, 6}:
                    seasonal = 1.28
                elif category == "Snacks" and calendar_month in {10, 11}:
                    seasonal = 1.18
                elif category == "Home Care" and calendar_month in {7, 8}:
                    seasonal = 1.12
                volatility = {"X": 0.08, "Y": 0.28, "Z": 0.62}[pattern]
                shock = 1.0
                if pattern == "Z":
                    shock = RNG.choice([0.25, 0.55, 0.9, 1.2, 2.0])
                demand = max(8, round(base * seasonal * shock * (1 + RNG.gauss(0, volatility))))
                history.append(demand)
                demand_rows.append({"month": month, "sku_id": sku, "demand_units": demand})
            recent_avg = mean(history[-12:])
            lead_demand = recent_avg * lead_time / 30
            stock_bucket = (sku_number * 3 + local_index) % 6
            if stock_bucket == 0:
                current_stock = max(0, round(lead_demand * 0.40))
            elif stock_bucket == 1:
                current_stock = max(0, round(lead_demand + recent_avg * 0.30))
            else:
                cycle_factor = {2: 0.8, 3: 1.5, 4: 2.8, 5: 4.2}[stock_bucket]
                current_stock = max(0, round(lead_demand + recent_avg * cycle_factor))
            on_order = round(recent_avg * 0.8) if sku_number % 7 == 0 else 0
            master.append({
                "sku_id": sku,
                "product_name": name,
                "category": category,
                "unit_cost_inr": unit_cost,
                "unit_price_inr": unit_price,
                "lead_time_days": lead_time,
                "order_cost_inr": order_cost,
                "holding_rate": 0.24,
                "current_stock_units": current_stock,
                "on_order_units": on_order,
            })
            sku_number += 1
    return master, demand_rows


def classify(master: list[dict[str, object]], demand_rows: list[dict[str, object]]) -> list[dict[str, object]]:
    history: dict[str, list[int]] = defaultdict(list)
    for row in demand_rows:
        history[str(row["sku_id"])].append(int(row["demand_units"]))
    working = []
    for row in master:
        recent = history[str(row["sku_id"])][-12:]
        annual_demand = sum(recent)
        avg = mean(recent)
        sigma = stdev(recent)
        cv = sigma / avg if avg else 0
        annual_value = annual_demand * float(row["unit_cost_inr"])
        working.append({**row, "annual_demand_units": annual_demand, "avg_monthly_demand": avg, "std_monthly_demand": sigma, "coefficient_of_variation": cv, "annual_consumption_value_inr": annual_value})
    working.sort(key=lambda row: float(row["annual_consumption_value_inr"]), reverse=True)
    total_value = sum(float(row["annual_consumption_value_inr"]) for row in working)
    cumulative = 0.0
    for row in working:
        share = float(row["annual_consumption_value_inr"]) / total_value
        cumulative += share
        abc = "A" if cumulative <= 0.80 else "B" if cumulative <= 0.95 else "C"
        cv = float(row["coefficient_of_variation"])
        xyz = "X" if cv <= 0.50 else "Y" if cv <= 1.00 else "Z"
        z = {"A": 2.05, "B": 1.65, "C": 1.28}[abc]
        lead_fraction = float(row["lead_time_days"]) / 30
        safety_stock = math.ceil(z * float(row["std_monthly_demand"]) * math.sqrt(lead_fraction))
        reorder_point = math.ceil(float(row["avg_monthly_demand"]) * lead_fraction + safety_stock)
        holding_cost = float(row["unit_cost_inr"]) * float(row["holding_rate"])
        eoq = math.ceil(math.sqrt((2 * float(row["annual_demand_units"]) * float(row["order_cost_inr"])) / holding_cost))
        inventory_position = int(row["current_stock_units"]) + int(row["on_order_units"])
        recommended_order = max(0, math.ceil(reorder_point + eoq - inventory_position)) if inventory_position <= reorder_point else 0
        lead_time_demand = float(row["avg_monthly_demand"]) * lead_fraction
        if int(row["current_stock_units"]) < lead_time_demand:
            risk = "Stockout risk"
        elif inventory_position <= reorder_point:
            risk = "Reorder now"
        elif inventory_position <= reorder_point * 1.25:
            risk = "Monitor"
        else:
            risk = "Healthy"
        excess_units = max(0, math.floor(int(row["current_stock_units"]) - (safety_stock + eoq)))
        row.update({
            "value_share": share,
            "cumulative_value_share": cumulative,
            "abc_class": abc,
            "xyz_class": xyz,
            "service_factor": z,
            "safety_stock_units": safety_stock,
            "reorder_point_units": reorder_point,
            "eoq_units": eoq,
            "inventory_position_units": inventory_position,
            "recommended_order_units": recommended_order,
            "risk_status": risk,
            "excess_units": excess_units,
            "potential_release_inr": round(excess_units * float(row["unit_cost_inr"]), 2),
        })
    return working


def write_csv(path: Path, rows: list[dict[str, object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0].keys()))
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    master, demand = build_data()
    policy = classify(master, demand)
    order = {str(row["sku_id"]): index for index, row in enumerate(policy)}
    master.sort(key=lambda row: order[str(row["sku_id"])])
    write_csv(ROOT / "data" / "sku_master.csv", master)
    write_csv(ROOT / "data" / "monthly_demand.csv", demand)
    write_csv(ROOT / "outputs" / "sku_policy_snapshot.csv", policy)
    summary = {
        "sku_count": len(policy),
        "months": 24,
        "inventory_value_inr": round(sum(int(row["current_stock_units"]) * float(row["unit_cost_inr"]) for row in policy), 2),
        "reorder_now_count": sum(row["risk_status"] in {"Stockout risk", "Reorder now"} for row in policy),
        "stockout_risk_count": sum(row["risk_status"] == "Stockout risk" for row in policy),
        "recommended_order_units": sum(int(row["recommended_order_units"]) for row in policy),
        "potential_release_inr": round(sum(float(row["potential_release_inr"]) for row in policy), 2),
        "abc_counts": {label: sum(row["abc_class"] == label for row in policy) for label in "ABC"},
        "xyz_counts": {label: sum(row["xyz_class"] == label for row in policy) for label in "XYZ"},
    }
    (ROOT / "outputs" / "summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
