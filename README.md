## goog.ui.List

Lighter List UI for Pc and Mobile.

### Demo

\# Preparing in progress.

### Fast because:

- It renders only DOMs to display.
- It fetches only data to display from a server.
- It uses a browser native scroller (overflow:auto).
- It caches data in goog.ds.DataNode which another compnent can refers to.

### Usage

```javascript
var data = new goog.ui.list.Data(
    '/api', // Url to request a remote JSON to
    30);    // Item count per page in a JSON

// Decorate example
var list = new goog.ui.List(data);
list.decorate(listElem1);

// Render example
var list2 = new goog.ui.List(data);
list2.render();
```
### License

\# Preparing in progress.
