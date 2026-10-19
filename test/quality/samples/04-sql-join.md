Your query returns duplicate orders because the `JOIN` with `order_items` creates one row for every item in an order. An order with three items appears three times.

If you only need one row per order with its total, group the rows:

```sql
SELECT o.id, o.created_at, SUM(i.price * i.quantity) AS total
FROM orders o
JOIN order_items i ON i.order_id = o.id
GROUP BY o.id, o.created_at;
```

Make sure there is an index on `order_items.order_id`, otherwise the database has to scan the whole table for each order. You can check this with `EXPLAIN`.
