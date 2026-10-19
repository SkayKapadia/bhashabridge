The `NullPointerException` happens at line 42 because `customer.getAddress()` returns null for customers who have not saved an address yet. Calling `getCity()` on null throws the exception.

Use `Optional` to make the missing value explicit:

```java
String city = Optional.ofNullable(customer.getAddress())
        .map(Address::getCity)
        .orElse("Unknown");
```

It is also worth adding a unit test with a customer that has no address, so this case is covered in the future.
