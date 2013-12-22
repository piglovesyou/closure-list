
goog.provide('example');

goog.require('goog.ui.List');
goog.require('goog.ui.list.Data');

/**
 * @param {Element} listEl to decorate.
 * @param {Element} totalEl to decorate.
 */
goog.ui.list.example = function(listEl, totalEl) {
  
  // Create data object.
  var data = new goog.ui.list.Data('/api', 30);

  // Initialize list by using the data.
  var list = new goog.ui.List(data);

  // Decorate an existing element.
  list.decorate(listEl);

  // Display 
  goog.events.listen(data,
      goog.ui.list.Data.EventType.UPDATE_TOTAL, function(e) {
    totalEl.innerHTML = 'total: ' + e.target.getTotal();
  });
};
goog.exportSymbol('example', goog.ui.list.example);

