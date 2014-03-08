
goog.provide('example');

goog.require('goog.ui.List');
goog.require('goog.ui.list.Data');

/**
 * @param {Element} listEl to decorate.
 */
goog.ui.list.example = function(listEl) {

  // Create data object.
  var data = new goog.ui.list.Data('/api');

  // Initialize list and set data.
  var list = new goog.ui.List(renderer);
  list.setData(data);

  // Decorate an existing element.
  list.decorate(listEl);
};

function renderer(data) {
  return 'id: ' + data['id'] + '  title: ' + data['title'];
}

goog.exportSymbol('example', goog.ui.list.example);

