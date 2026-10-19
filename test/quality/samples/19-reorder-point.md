<!-- domains: supply-chain-logistics -->
The stock alert fires too late because the reorder point only uses average daily sales and ignores the lead time from the supplier. By the time the purchase order arrives, the shelf is already empty.

Calculate the reorder point from demand during the lead time plus safety stock:

```python
def reorder_point(daily_demand: float, lead_time_days: int, safety_stock: int) -> int:
    return round(daily_demand * lead_time_days + safety_stock)
```

Review the safety stock every month, because demand forecasting for seasonal products changes quickly.
