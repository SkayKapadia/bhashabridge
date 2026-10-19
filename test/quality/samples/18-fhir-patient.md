<!-- domains: healthcare -->
The FHIR server rejects your request with `400 Bad Request` because the `Patient` resource has a `birthDate` in the format `12/03/1990`. FHIR expects dates in ISO format.

Send the date as `YYYY-MM-DD`:

```json
{
  "resourceType": "Patient",
  "name": [{ "family": "Shah", "given": ["Asha"] }],
  "birthDate": "1990-03-12"
}
```

Before you store any patient data, make sure the EHR integration follows your hospital's rules for protected health information, and log access to each record.
