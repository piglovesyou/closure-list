## goog.ui.List

Faster List UI for PC and Mobile.

### Demo

1. Clone this project and change directory into it.
1. ```node server.js``` to start a demo server.
1. Access ```localhost:1337``` in your browser.

### Fast because:

- It renders only DOMs to display.
- It fetches only data to display from a server.
- It uses a browser native scroller (overflow:auto).
- It caches data in goog.ds.DataNode which another compnent can refer to.

### Usage

```javascript

// A row renderer. It gets item data from JSON and has to return (html) string.
function renderer(data) {
  return 'id: ' + data['id'] + '  title: ' + data['title'];
}

var data = new goog.ui.list.Data('/api' // Url to request a remote JSON to
                                 50);   // Optional: Total count of all items. You can lazily pass it.

// Decorating example
var list = new goog.ui.List(data,     // Set data object a list refers to
                            renderer, // Set row renderer, or you can pass a subclass of goog.ui.List.Item.
                            5);       // Optional: Item count per a request. Default is 25.
list.decorate(listElem1);

// Rendering example
var list2 = new goog.ui.List(data);
list2.render();
```

### Test

Open ```piglovesyou/goog/ui/list/list_test.html``` in a browser.

### License

\# Preparing in progress.
