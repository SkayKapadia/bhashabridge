<!-- domains: ecommerce-retail -->
The cart abandonment rate jumped after the last release because the checkout page now asks users to create an account before paying. Many first-time buyers leave at that step.

Offer guest checkout and save the cart for later:

```ts
if (!session.user) {
  await saveCartForGuest(session.id, cart);
  return renderCheckout({ allowGuest: true });
}
```

Track the conversion rate for each checkout step in your analytics, so you can see exactly where users drop off.
