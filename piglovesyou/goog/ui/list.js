/**
 * @license
 * Copyright (c) 2012 Soichi Takamura (http://stakam.net/).
 *
 * Dual licensed under the MIT and GPL licenses:
 *   http://www.opensource.org/licenses/mit-license.php
 *   http://www.gnu.org/licenses/gpl.html
 */

goog.provide('goog.ui.List');
goog.provide('goog.ui.List.Item');
goog.provide('goog.ui.List.Item.Renderer');

goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.ds.DataManager');
goog.require('goog.ds.FastDataNode');
goog.require('goog.ds.JsDataSource');
goog.require('goog.iter');
goog.require('goog.net.XhrManager');
goog.require('goog.ui.Component');




goog.scope(function() {

// for devel
var dm = goog.ds.DataManager.getInstance();



/**
 * @constructor
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List = function(model, aproxItemHeight, opt_itemType, opt_itemRenderer, opt_domHelper) {
  goog.base(this, opt_domHelper);

  this.model = model;
  this.aproxItemHeight = aproxItemHeight;

  this.pages = [];

  this.ItemType = opt_itemType || goog.ui.List.Item;
  this.itemRenderer = opt_itemRenderer || goog.ui.List.Item.Renderer.getInstance();

  var dh = this.getDomHelper();
};
goog.inherits(goog.ui.List, goog.ui.Component);


goog.ui.List.prototype.heightCache = -1;


goog.ui.List.prototype.updateHeightCache = function() {
  this.heightCache = goog.style.getContentBoxSize(this.getElement()).height;
};


goog.ui.List.prototype.getContentElement = function() {
  return this.contentElement;
};


/** @inheritDoc */
goog.ui.List.prototype.createDom = function() {
  var dh = this.getDomHelper();
  this.setElementInternal(dh.createDom('div', 'my-list',
      this.contentElement = dh.createDom('div', 'my-list-inner')));
};


/** @inheritDoc */
goog.ui.List.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);
};


/** @inheritDoc */
goog.ui.List.prototype.canDecorate = function(element) {
  if (element) {
    var dh = this.getDomHelper();
    var inner = dh.getElementByClass('my-list-inner', element);
    if (inner) {
      this.contentElement = inner;
      return true;
    }
  }
  return false;
};


/** @inheritDoc */
goog.ui.List.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  this.updateHeightCache();
  var eh = this.getHandler();
  // eh.listen(this.model,
  //     goog.ui.List.Model.EventType.RECORDS_READY, this.handleRecordsReady);
};


goog.ui.List.prototype.fillViewport = function() {

};


goog.ui.List.prototype.handleRecordsReady = function(e) {
  this.renderItems(e.offset, e.size, e.item);
};


goog.ui.List.prototype.renderItems = function(offset, size, itemNodes) {

};


/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};










/**
 * @constructor
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List.Item = function(opt_domHelper) {
  goog.base(this, opt_domHelper);
};
goog.inherits(goog.ui.List.Item, goog.ui.Component);


/** @inheritDoc */
goog.ui.List.Item.prototype.createDom = function() {
  goog.base(this, 'createDom');
};


/** @inheritDoc */
goog.ui.List.Item.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);
};


/** @inheritDoc */
goog.ui.List.Item.prototype.canDecorate = function(element) {
  if (element) {
    return true;
  }
  return false;
};


/** @inheritDoc */
goog.ui.List.Item.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
};


/** @inheritDoc */
goog.ui.List.Item.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};



/**
 * @constructor
 */
goog.ui.List.Item.Renderer = function() {
};
goog.addSingletonGetter(goog.ui.List.Item.Renderer);

goog.ui.List.Item.Renderer.prototype.createDom = function(component) {
  var dh = component.getDomHelper();
  return dh.createDom('div', 'my-list-item');
};

goog.ui.List.Item.Renderer.prototype.createContent = function(component, parentNode, ds) {
  var dh = component.getDomHelper();
  dh.append(parentNode,
      dh.createDom('div', 'yeah', 'ohh'),
      dh.createDom('div', 'yeah', 'ohh'));
  return parentNode;
};






/**
 * @constructor
 */
goog.ui.List.Model = function(size) {
  this.id = 'list:' + goog.getUid(this);

  this.rootNode = new goog.ds.FastDataNode({
    total: -1,
    items: []
  }, this.id);

  this.pages = [];

  dm.addDataSource(this.rootNode);

  this.xm = new goog.net.XhrManager();

  this.perPage = 10;

  var me = this;
  var r = me.get(2);
  r.wait(function(r) {
    console.log(r.getValue());
  });
  setTimeout(function() {
    var r2 = me.get(2);
    r2.wait(function(r) {
      console.log(r2.getValue());
    });
  }, 2000);
};
goog.inherits(goog.ui.List.Model, goog.events.EventTarget);

/**
 * @param {number} pageIndex .
 * @return {goog.result.SimpleResult} .
 */
goog.ui.List.Model.prototype.get = function(pageIndex) {
  var page = this.pages[pageIndex];
  if (!page) {
    page = new goog.ui.List.Model.Page(
        this, this.perPage * pageIndex, this.perPage);
  }
  return page.getResult();
};

/**
 * @param {Array} newItems .
 * @param {number} from .
 * @return {Array.<Object>} Node set of array.
 */
goog.ui.List.Model.prototype.saveItems = function(newItems, from) {
  var itemsNode = this.rootNode.getChildNode('items');
  var i = 0;
  var items = [];
  goog.iter.forEach(goog.iter.range(from, from + this.perPage), function(n) {
    var name = 'item:' + n, newItem
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
goog.ui.List.Model.prototype.saveNewTotal = function(newTotal) {
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
 */
goog.ui.List.Model.Page = function(model, offset, size) {
  this.id = null; // Lazily initialized
  this.model = model;
  this.offset = offset;
  this.size = size;
};

/**
 * @return {string} .
 */
goog.ui.List.Model.Page.prototype.getId = function() {
  return this.id || goog.getUid(this);
};

/**
 * @return {goog.result.SimpleResult} .
 */
goog.ui.List.Model.Page.prototype.getResult = function() {
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
goog.ui.List.Model.Page.prototype.collectLocal_ = function() {
  var items = [];
  if (goog.iter.every(goog.iter.range(this.offset, this.offset + this.size), function(i) {
    var itemNode = this.model.rootNode.getChildNode('items').getChildNode('item:' + i);
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
goog.ui.List.Model.Page.prototype.fetchRemote_ = function(callback, opt_obj) {
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
 */
goog.ui.List.Model.Page.prototype.createUrl_ = function() {
  var url = new goog.Uri('/api');
  url.getQueryData().extend({
    offset: this.offset,
    size: this.size
  });
  return url.toString();
};




// /**
//  * I want just .root_ !
//  *
//  * @param {goog.ds.DataNode} parent .
//  * @param {string} dataName .
//  * @param {goog.ds.DataNode=} opt_parentDataNode .
//  * @constructor
//  * @extends {goog.ds.JsPropertyDataSource}
//  */
// goog.ui.List.Model.ItemNode = function(parent, dataName, opt_parentDataNode) {
//   goog.base(this, parent, dataName, opt_parentDataNode);
// };
// goog.inherits(goog.ui.List.Model.ItemNode, goog.ds.JsPropertyDataSource);
//
// /**
//  * @return {Object}
//  */
// goog.ui.List.Model.ItemNode.provide.get = function() {
//   return root_;
// };







}); // goog.scope
