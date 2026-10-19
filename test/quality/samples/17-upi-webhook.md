<!-- domains: finance-banking -->
Your system marks some UPI payments as paid twice because the payment gateway can send the same webhook more than once. Gateways retry when your server is slow to answer, so every webhook handler must be idempotent.

Store the payment id and ignore repeats:

```ts
app.post("/webhooks/payment", async (req, res) => {
  const { paymentId, status } = req.body;
  const isNew = await db.payments.insertIfAbsent(paymentId, status);
  if (isNew && status === "captured") {
    await markOrderPaid(paymentId);
  }
  res.sendStatus(200);
});
```

Also verify the webhook signature before trusting the body, and run a daily reconciliation against the settlement report so the ledger always matches the bank.
