The regular expression matches too much because `.*` is greedy: it takes as many characters as possible, so `<b>one</b> and <b>two</b>` becomes a single match.

Make the quantifier lazy by adding a question mark:

```js
const bold = text.match(/<b>(.*?)<\/b>/g);
```

For real HTML, a regex is fragile. Use the browser's `DOMParser` or a library such as `cheerio`, which understands nested tags and attributes.
