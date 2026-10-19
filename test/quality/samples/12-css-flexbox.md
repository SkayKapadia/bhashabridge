The buttons are not centered because `justify-content` only works on the flex container, and the container is the `div` around the buttons, not the buttons themselves.

Put the flexbox rules on the parent:

```css
.actions {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
}
```

`justify-content` controls the main axis, which is horizontal by default, and `align-items` controls the cross axis. If you change `flex-direction` to `column`, the two swap.
