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
goog.require('goog.async.Delay');
goog.require('goog.ds.DataManager');
goog.require('goog.ds.FastDataNode');
goog.require('goog.ds.JsDataSource');
goog.require('goog.iter');
goog.require('goog.math.Range');
goog.require('goog.net.XhrManager');
goog.require('goog.ui.Component');
goog.require('goog.ui.list.Model');




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
  this.itemRenderer = opt_itemRenderer ||
      goog.ui.List.Item.Renderer.getInstance();

  var dh = this.getDomHelper();
};
goog.inherits(goog.ui.List, goog.ui.Component);


/**
 * @type {number}
 */
goog.ui.List.prototype.heightCache = -1;


/***/
goog.ui.List.prototype.updateHeightCache = function() {
  this.heightCache = goog.style.getContentBoxSize(this.getElement()).height;
};


/** @inheritDoc */
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


/***/
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


goog.ui.List.prototype.lastPageRange_;

goog.ui.List.prototype.fillViewport = function() {
  var dh = this.getDomHelper();
  var range = this.calcPageRangeToCreate();

  // var result = this.model.getResult(range.start * this.perPage,
  //     range.end * this.perPage);
  
  goog.iter.forEach(goog.iter.range(range.start, range.end), function(pageIndex) {
    if (this.pages[pageIndex]) return;
    var p = new goog.ui.List.Page(this, pageIndex);
    this.pages[pageIndex] = p;
    p.request(function(pageFragment) {
      var contentEl = this.getContentElement();
      if (this.pages[pageIndex + 1]) {
        dh.prepend(contentEl, pageFragment);
      } else {
        dh.append(contentEl, pageFragment);
      }

      this.adjustContentPadding(range);
    }, this)
  }, this);

  // Remove extra pages.
  goog.array.removeIf(this.pages, function(page, i) {
    if (i < range.start || range.end <= i) {
      page.dispose();
      return true;
    }
    return false;
  });
};

goog.ui.List.getRangeDiff_ = function(range, factor) {
  goog.iter.forEach
}

goog.ui.List.prototype.calcPageRangeToCreate = function() {
  var el = this.getElement(),
      scrollTop = el.scrollTop,
      viewportHeight = el.offsetHeight,
      pageHeight = this.itemHeight * this.model.perPage,
      currUpperPageIndex = this.getUpperPageIndex(),
      currLowerPageIndex = this.getLowerPageIndex(),
      upperPageIndex = Math.max(currUpperPageIndex, Math.floor(scrollTop / pageHeight)),
      lowerPageIndex = currLowerPageIndex >= 0 ? Math.floor((scrollTop + viewportHeight) / pageHeight) : 0;
  console.log(currUpperPageIndex, upperPageIndex);
  console.log(upperPageIndex, lowerPageIndex + 1);
  return new goog.math.Range(upperPageIndex, lowerPageIndex + 1);
};

/**
 * @return {number} .
 */
goog.ui.List.prototype.getUpperPageIndex = function() {
  return goog.array.findIndex(this.pages, function(page) {
    return !!page;
  });
};

/**
 * @return {number} .
 */
goog.ui.List.prototype.getLowerPageIndex = function() {
  return goog.array.findIndexRight(this.pages, function(page) {
    return !!page;
  });
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
goog.ui.List.Page = function(list, index, opt_prepend) {
  goog.base(this);
  this.list = list;
  this.index = index;
  this.itemsRef = [];
};
goog.inherits(goog.ui.List.Page, goog.Disposable);


goog.ui.List.Page.prototype.request = function(callback, opt_obj) {
  var me = this,
      index = me.index,
      list = me.list,
      dh = list.getDomHelper(),
      ItemType = list.ItemType,
      perPage = list.perPage,
      result = list.model.getResult(index * perPage, perPage);

  result.wait(function(result) {
    var records = result.getValue(),
        itemsRef = me.itemsRef,
        fragment = dh.getDocument().createDocumentFragment();

    goog.array.forEach(records, function(node, i) {
      var item = new ItemType(node);
      itemsRef.push(item);
      item.createDom();
      dh.append(fragment, item.getElement());
    });

    callback.call(opt_obj, fragment);
  });

};

goog.ui.List.Page.prototype.enterItems = function() {
  goog.array.forEach(this.itemsRef, function(item) {
    item.enterDocument();
  });
};

/** @inheritDoc */
goog.ui.List.Page.prototype.disposeInternal = function() {
  goog.array.forEach(this.itemsRef, function(item) {
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

