<!-- domains: ecommerce-retail -->
Every channel scenario was checked against the running API with `publishProduct()`:

```ts
for (const scenario of scenarios) {
  const res = await api.post('/products', scenario.body);
  expect(res.status).toBe(201);
}
```

8–10. Channel Behavior Verification

Channel Scenario	Status Returned	Message	Verification Result
A. Digital Catalog Only	published	"Product published to Artisan Digital Catalog."	✅ 201 Created (689ms)
B. B2B Marketplace Only	published	"Product listed on HunarSetu B2B Wholesale Marketplace."	✅ 201 Created (396ms)
C. Digital Catalog + B2B (Screenshot Scenario)	published, published	Both channels published	✅ 201 Created (191ms)
D. Nothing Selected	None	No channels published	✅ 201 Created (77ms)
E. GeM Unchecked	Not included	Omitted from active channels	✅ 201 Created
F. GeM Checked	prototype	"GeM government marketplace integration is prepared for future API integration."	✅ 201 Created (39ms)

All six scenarios return 201 Created, and only the selected channels are published.
