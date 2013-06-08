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
goog.provide('goog.ui.List.Model');




goog.scope(function() {

// for devel
var dm = goog.ds.DataManager.getInstance();



/**
 * @constructor
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List = function(model, perPage, itemHeight, opt_itemType, opt_itemRenderer, opt_domHelper) {
  goog.base(this, opt_domHelper);

  this.model = model;
  this.perPage = perPage;
  this.itemHeight = goog.isNumber(itemHeight) ? itemHeight : 49;

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
  this.clearContent();
};


goog.ui.List.prototype.clearContent = function() {
  var dh = this.getDomHelper();
  dh.removeChildren(this.getContentElement());
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
  var delay = new goog.async.Delay(function() {
    this.fillViewport();
  }, 200, this);
  eh.listen(this.getElement(), 'scroll', function(e) {
    delay.start();
  });
  this.fillViewport();
};


goog.ui.List.prototype.fillViewport = function() {
  var range = this.calcPageRange();

  var result = this.model.getResult(range.start * this.perPage,
      range.end * this.perPage);
  result.wait(goog.bind(function(result) {

    goog.iter.forEach(goog.iter.range(range.start, range.end), function(n) {
      if (this.pages[n]) return;
      this.pages[n] = new goog.ui.List.Page(this, result.getValue());
    }, this);

    // Remove extra pages.
    goog.array.removeIf(this.pages, function(page, i) {
      if (i < range.start || range.end <= i) {
        page.dispose();
        return true;
      }
      return false;
    });

    this.adjustContentPadding(range);

  }, this));
};

goog.ui.List.prototype.calcPageRange = function() {
  var el = this.getElement(),
      scrollTop = el.scrollTop,
      viewportHeight = el.offsetHeight,
      pageHeight = this.itemHeight * this.model.perPage,
      upperPageIndex = Math.floor(scrollTop / pageHeight),
      lowerPageIndex = Math.floor((scrollTop + viewportHeight) / pageHeight);
  return new goog.math.Range(upperPageIndex, lowerPageIndex + 1);
};

goog.ui.List.prototype.adjustContentPadding = function(range) {
  var el = this.getContentElement(),
      total = this.model.getTotal();

  var top = range.start * this.perPage;
  var bottom = total - range.end * this.perPage;
  goog.style.setStyle(el, {
    paddingTop: top * this.itemHeight + 'px',
    paddingBottom: bottom * this.itemHeight + 'px'
  });
};

/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};







/**
 * @constructor
 * @extends {goog.Disposable}
 */
goog.ui.List.Page = function(list, records, opt_prepend) {
  goog.base(this);
  this.list = list;
  this.items = [];
  goog.array.forEach(records, function(node, i) {
    var item = new list.ItemType(node);
    // TODO: prepare this
    if (opt_prepend) {
      list.addChildAt(item, i, true);
    } else {
      list.addChild(item, true);
    }
    this.items.push(item);
  }, this);
};
goog.inherits(goog.ui.List.Page, goog.Disposable);

/** @inheritDoc */
goog.ui.List.Page.prototype.disposeInternal = function() {
  goog.array.forEach(this.items, function(item) {
    // TODO: Unrendered correctly?
    this.list.removeChild(item, true);
    item.dispose();
  }, this);
  this.items = null;

  goog.base(this, 'disposeInternal');
};








/**
 * @constructor
 * @param {FastDataNode} node .
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List.Item = function(node, opt_domHelper) {
  goog.base(this, opt_domHelper);
  this.node = node;
};
goog.inherits(goog.ui.List.Item, goog.ui.Component);


/** @inheritDoc */
goog.ui.List.Item.prototype.createDom = function() {
  var dh = this.getDomHelper();
  // TODO: use renderer
  var el = dh.createDom('div', 'my-list-item',
      this.createContent());
  this.setElementInternal(el);
};


/**
 * @return {Node} .
 */
goog.ui.List.Item.prototype.createContent = function() {
  var dh = this.getDomHelper();
  var fragment = dh.getDocument().createDocumentFragment();
  dh.append(fragment,
      dh.createDom('div', null, this.node.id),
      dh.createDom('div', null, this.node.title));
  return fragment;
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
  console.log(ds);
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

  // We use FastDataNode so that a soy function
  // can accept the node as the same as an object.
  this.rootNode = new goog.ds.FastDataNode({
    total: -1,
    items: []
  }, this.id);

  dm.addDataSource(this.rootNode);

  // TODO: Be optional.
  this.xm = new goog.net.XhrManager();

  this.perPage = 10;

  // For devel.
  // var me = this;
  // var r = me.get(2);
  // r.wait(function(r) {
  //   console.log(r.getValue());
  // });
  // setTimeout(function() {
  //   var r2 = me.get(2);
  //   r2.wait(function(r) {
  //     console.log(r2.getValue());
  //   });
  // }, 2000);
};
goog.inherits(goog.ui.List.Model, goog.events.EventTarget);

/**
 * We should cache a page instance because we should cache height
 * of items in a page.
 * @param {number} offset .
 * @param {number} size .
 * @return {goog.result.SimpleResult} .
 */
goog.ui.List.Model.prototype.getResult = function(offset, size) {
  var collector = new goog.ui.List.Model.Collector(
        this, offset, size);
  return collector.getResult();
};

goog.ui.List.Model.prototype.getTotal = function() {
  return this.rootNode.getChildNode('total').get();
};

goog.ui.List.Model.prototype.getItemsNode = function() {
  return this.rootNode.getChildNode('items');
};

/**
 * @param {Array} newItems .
 * @param {number} from .
 * @return {Array.<Object>} Node set of array.
 */
goog.ui.List.Model.prototype.saveItems = function(newItems, from) {
  var itemsNode = this.getItemsNode();
  var i = 0;
  var items = [];
  goog.iter.forEach(goog.iter.range(from, from + this.perPage), function(n) {
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
goog.ui.List.Model.Collector = function(model, offset, size) {
  this.id = null; // Lazily initialized
  this.model = model;
  this.offset = offset;
  this.size = size;
};

/**
 * @return {string} .
 */
goog.ui.List.Model.Collector.prototype.getId = function() {
  return this.id || goog.getUid(this);
};

/**
 * @return {goog.result.SimpleResult} .
 */
goog.ui.List.Model.Collector.prototype.getResult = function() {
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
goog.ui.List.Model.Collector.prototype.collectLocal_ = function() {
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
goog.ui.List.Model.Collector.prototype.fetchRemote_ = function(callback, opt_obj) {
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
goog.ui.List.Model.Collector.prototype.createUrl_ = function() {
  goog.asserts.assertNumber(this.offset);
  goog.asserts.assertNumber(this.size);
  var url = new goog.Uri('/api');
  url.getQueryData().extend({
    offset: this.offset,
    size: this.size
  });
  return url.toString();
};


}); // goog.scope
