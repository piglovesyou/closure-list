
goog.provide('goog.ui.list.Model');



/**
 * @param {string} size .
 * @constructor
 */
goog.ui.list.Model = function(size) {
  this.id = 'list:' + goog.getUid(this);

  // We use FastDataNode so that a soy function
  // can accept the node as the same as an object.
  this.rootNode = new goog.ds.FastDataNode({
    total: -1,
    items: []
  }, this.id);

  goog.ds.DataManager.getInstance()
      .addDataSource(this.rootNode);

  // TODO: Be optional.
  this.xm = new goog.net.XhrManager();

};
goog.inherits(goog.ui.list.Model, goog.events.EventTarget);

/**
 * We should cache a page instance because we should cache height
 * of items in a page.
 * @param {number} offset .
 * @param {number} size .
 * @return {goog.result.SimpleResult} .
 */
goog.ui.list.Model.prototype.getResult = function(offset, size) {
  var collector = new goog.ui.list.Model.Collector(
        this, offset, size);
  return collector.getResult();
};

/**
 * @return {number} .
 */
goog.ui.list.Model.prototype.getTotal = function() {
  return this.rootNode.getChildNode('total').get();
};

/**
 * @return {Array.<goog.ds.FastDataNode>} .
 */
goog.ui.list.Model.prototype.getItemsNode = function() {
  return this.rootNode.getChildNode('items');
};

/**
 * @param {Array} newItems .
 * @param {number} from .
 * @return {Array.<Object>} Node set of array.
 */
goog.ui.list.Model.prototype.saveItems = function(newItems, from) {
  var itemsNode = this.getItemsNode();
  var i = 0;
  var items = [];
  // console.log('-----', from, from + newItems.length);
  goog.iter.forEach(goog.iter.range(from, from + newItems.length), function(n) {
    var name = 'item:' + n, newItem;
    var newItem = newItems[i++];
    itemsNode.setChildNode(name, newItem);
    items.push(itemsNode.getChildNode(name));
  });
  return items;
};

/**
 * @param {number} newTotal .
 * @return {Object} .
 */
goog.ui.list.Model.prototype.saveNewTotal = function(newTotal) {
  var node = this.rootNode.getChildNode('total');
  goog.asserts.assert(node);
  if (node.get() === newTotal) {
  } else {
    node.set(newTotal);
  }
  return node;
};







/**
 * @constructor
 * @param {goog.ui.list.Model} model .
 * @param {number} offset .
 * @param {number} size .
 */
goog.ui.list.Model.Collector = function(model, offset, size) {
  this.id = null; // Lazily initialized
  this.model = model;
  this.offset = offset;
  this.size = size;
};

/**
 * @return {string} .
 */
goog.ui.list.Model.Collector.prototype.getId = function() {
  return this.id || goog.getUid(this);
};

/**
 * @return {goog.result.SimpleResult} .
 */
goog.ui.list.Model.Collector.prototype.getResult = function() {
  var result = new goog.result.SimpleResult();
  var items = this.collectLocal_();
  if (items) {
    console.log('local');
    result.setValue(items);
  } else {
    console.log('remote');
    this.fetchRemote_(function(json) {
      this.model.saveNewTotal(json.total);
      result.setValue(this.model.saveItems(json.items, this.offset));
    }, this);
  }
  return result;
};

/**
 * @private
 * @return {Array.<Object>} .
 */
goog.ui.list.Model.Collector.prototype.collectLocal_ = function() {
  var items = [];
  if (goog.iter.every(
        goog.iter.range(this.offset, this.offset + this.size), function(i) {
    var itemNode = this.model.getItemsNode().getChildNode('item:' + i);
    if (itemNode) {
      items.push(itemNode);
      return true;
    }
    return false;
  }, this)) {
    return items;
  }
  return null;
};

/**
 * @private
 * @param {function(Object)} callback .
 * @param {Object=} opt_obj .
 */
goog.ui.list.Model.Collector.prototype.fetchRemote_ =
    function(callback, opt_obj) {
  var me = this;
  me.model.xm.send(
        this.getId(),
        this.createUrl_(),
        null, null, null, null, function(e) {
    var xhr = e.target,
        json = xhr.getResponseJson();
    callback.call(opt_obj, json);
  });
};

/**
 * @private
 * @return {string} .
 */
goog.ui.list.Model.Collector.prototype.createUrl_ = function() {
  goog.asserts.assertNumber(this.offset);
  goog.asserts.assertNumber(this.size);
  var url = new goog.Uri('/api');
  url.getQueryData().extend({
    offset: this.offset,
    size: this.size
  });
  return url.toString();
};
