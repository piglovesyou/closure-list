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

goog.require('goog.Uri');
goog.require('goog.array');
goog.require('goog.async.Delay');
goog.require('goog.ds.DataManager');
goog.require('goog.ds.FastDataNode');
goog.require('goog.ds.JsDataSource');
goog.require('goog.math.Range');
goog.require('goog.net.XhrManager');
goog.require('goog.ui.Component');
goog.require('goog.ui.list.Data');






/**
 * @constructor
 * @param {Function|function(new:goog.ui.List.Item,
 *         number, number, Function=, goog.dom.DomHelper=)} rowRenderer
 *    You can pass two types of params:
 *      - If it's function, used as a renderer which called in
 *        "renderContent" and takes 1 item argument from json.
 *      - If it's an instance of goog.ui.List.Item, we always generate a row
 *        by it. The class has to implement its own "renderContent" method.
 * @param {number=} opt_rowCountPerPage Used as a request param.
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List = function(rowRenderer, opt_rowCountPerPage, opt_domHelper) {
  goog.base(this, opt_domHelper);

  this.rowHeight = 60;

  /**
   * @type {number}
   */
  this.rowCountPerPage = goog.isNumber(opt_rowCountPerPage) ?
      opt_rowCountPerPage : 25;

  /**
   * @private
   * @type {function(new:goog.ui.List.Item,
   *        number, number, Function=, goog.dom.DomHelper=)}
   */
  this.rowClassRef_;

  /**
   * @private
   * @type {Function}
   */
  this.rowRenderer_;

  if (rowRenderer.prototype instanceof goog.ui.List.Item) {
    this.rowClassRef_ = /**@type {function(new:goog.ui.List.Item,
        number, number, Function=, goog.dom.DomHelper=)}*/(rowRenderer);
    this.rowRenderer_ = goog.isFunction;
  } else if (goog.isFunction(rowRenderer)) {
    this.rowClassRef_ = /**@type {function(new:goog.ui.List.Item,
        number, number, Function=, goog.dom.DomHelper=)}*/(goog.ui.List.Item);
    this.rowRenderer_ = rowRenderer;
  } else {
    goog.asserts.fail('You need pass renderer or render class');
  }
};
goog.inherits(goog.ui.List, goog.ui.Component);
goog.exportSymbol('goog.ui.List', goog.ui.List);


/**
 * @enum {string}
 */
goog.ui.list.EventType = {
  CLICKROW: 'clickrow'
};


/** @type {string} */
goog.ui.list.RowNodeNamePrefix = goog.ui.list.Data.RowNodeNamePrefix;


/**
 * @param {goog.ui.list.Data} data .
 */
goog.ui.List.prototype.setData = function(data) {

  /**
   * @type {goog.ui.list.Data} .
   */
  this.data_ = data;
  this.updateParamsInternal();
};


/**
 * @return {goog.ui.list.Data} data .
 */
goog.ui.List.prototype.getData = function() {
  return this.data_;
};


/** @inheritDoc */
goog.ui.List.prototype.getContentElement = function() {
  return this.contentEl;
};


/***/
goog.ui.List.prototype.updateParamsInternal = function() {
  this.lastPageIndex =
      Math.ceil(this.data_.getTotal() / this.rowCountPerPage) - 1;
  this.pageHeight = this.rowHeight * this.rowCountPerPage;

  // Cache for a speed.
  this.lastPageRows = this.data_.getTotal() % this.rowCountPerPage;
  if (this.lastPageRows == 0) this.lastPageRows = this.rowCountPerPage;

  this.lastRange = new goog.math.Range(-1, -1);
};


/** @inheritDoc */
goog.ui.List.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);

  this.elementHeight = goog.style.getContentBoxSize(element).height;
  this.contentEl = this.getElementByClass('goog-list-container');
};


/** @inheritDoc */
goog.ui.List.prototype.createDom = function() {
  var dh = this.getDomHelper();
  var element = dh.createDom('div', 'goog-list',
    this.contentEl = dh.createDom('div', 'goog-list-container'));
  this.setElementInternal(element);
  this.elementHeight = goog.style.getContentBoxSize(element).height;
};


/** @inheritDoc */
goog.ui.List.prototype.canDecorate = function(element) {
  if (element &&
      goog.dom.classes.has(element, 'goog-list') &&
      goog.dom.getElementByClass('goog-list-container', element)) {
    return true;
  }
  return false;
};


/***/
goog.ui.List.prototype.updateVirualSizing = function() {
  this.contentEl.style.paddingTop =
      this.lastRange.start * this.pageHeight + 'px';
  this.contentEl.style.paddingBottom = this.rowHeight * this.data_.getTotal() -
      this.lastRange.start * this.pageHeight - this.getChildCount() * this.rowHeight + 'px';
};


/** @inheritDoc */
goog.ui.List.prototype.enterDocument = function() {
  goog.asserts.assert(this.data_,
      'You should set data before "enterDocument".');
  goog.base(this, 'enterDocument');
  var eh = this.getHandler();
  var element = this.getElement();

  eh.listen(element, goog.events.EventType.SCROLL, this.redraw)
    .listen(this.data_,
        goog.ui.list.Data.EventType.UPDATE_TOTAL, this.handleTotalUpdate_)
    .listen(this.getContentElement(),
        goog.events.EventType.CLICK, this.handleClick);

  this.redraw();
};


/**
 * @param {goog.events.Event} e .
 */
goog.ui.List.prototype.handleClick = function(e) {
  var row = this.findRowFromEventTarget(/**@type{Element}*/(e.target));
  if (row) {
    row.dispatchEvent(new goog.ui.List.ClickRowEvent(
        this.data_.getRowByIndex(row.getIndex()), row));
  }
};


/**
 * @param {Element} et .
 * @return {?goog.ui.List.Item} .
 */
goog.ui.List.prototype.findRowFromEventTarget = function(et) {
  // TODO: Can be faster to seek row from a visible content.
  var found;
  goog.array.findIndex(this.getChildIds(), function(id, i) {
    var child = this.getChild(id);
    if (goog.dom.contains(child.getElement(), et)) {
      found = /**@type{goog.ui.List.Item}*/(child);
      return true;
    }
    return false;
  }, this);
  return found;
};


/**
 * @private
 * @param {goog.events.Event} e .
 */
goog.ui.List.prototype.handleTotalUpdate_ = function(e) {
  this.updateParamsInternal();
  this.updateVirualSizing();
};


/**
 * Here is the most of the logic in goog.ui.List.
 * A kind of large method but it would be hard to devide.
 */
goog.ui.List.prototype.redraw = function() {
  var dh = this.getDomHelper();
  var element = this.getElement();
  var content = this.contentEl;

  var top = element.scrollTop;
  var paddingTopPage = Math.floor(top / this.pageHeight);

  var boxMiddle = top + this.elementHeight / 2;
  var pageMiddle = paddingTopPage * this.pageHeight + this.pageHeight / 2;
  var boxPosLessThanPagePos = boxMiddle < pageMiddle;

  var isEdge = paddingTopPage == 0 && boxPosLessThanPagePos ||
               paddingTopPage == this.lastPageIndex && !boxPosLessThanPagePos;

  var range;
  if (isEdge) {
    range = new goog.math.Range(paddingTopPage, paddingTopPage);
  } else {
    var page1index = !boxPosLessThanPagePos ?
      paddingTopPage : paddingTopPage - 1;
    range = new goog.math.Range(page1index, page1index + 1);
  }

  if (goog.math.Range.equals(range, this.lastRange)) {
    return;
  }

  var lastRange = this.lastRange.start < 0 ? null : this.lastRange;
  this.lastRange = range;

  // We want to create only necessary rows, so if there is a row
  // that will be needed in this time as well, we keep it.
  if (!lastRange || !goog.math.Range.hasIntersection(range, lastRange)) {
    this.removeChildren(true);
  } else {
    var c, i = 0;
    while (c = this.getChildAt(i)) {
      if (goog.math.Range.containsPoint(range,
          Math.floor(c.getIndex() / this.rowCountPerPage))) {
        i++;
      } else {
        this.removeChild(c, true);
      }
    }
  }

  // Create rows of a page.
  // If we already have rows of a page, skip.
  var fragment = dh.getDocument().createDocumentFragment();
  for (var i = range.start; i < range.end + 1; i++) {
    if (!lastRange || !goog.math.Range.containsPoint(lastRange, i)) {
      var count = this.calcRowCountInPage_(i);
      fragment.appendChild(this.createPage(i, count));
    }
  }

  // In short, we are creating a virtual content, which contains a top margin +
  // a real dom content + a bottom margin. These three's height always comes
  // to (rowHeight * total), so that a browser native scrollbar indicates
  // a real size and position.
  this.updateVirualSizing();

  // We promise rows' data before append DOMs because we want
  // minimum manipulation of the DOM tree.
  this.data_.promiseRows(range.start * this.rowCountPerPage, this.getChildCount())
    .wait(goog.bind(this.onResolved, this));

  // Finally append DOMs to the DOM tree.
  if (!lastRange || lastRange.end < range.end) {
    content.appendChild(fragment);
  } else {
    dh.insertChildAt(content, fragment, 0);
  }
  // Make sure all the children entered in the Document.
  this.forEachChild(function(c) {
    if (!c.isInDocument()) c.enterDocument();
  });
};


/**
 * @param {goog.result.SimpleResult} result .
 */
goog.ui.List.prototype.onResolved = function(result) {
  this.forEachChild(function(row) {
    var data = this.data_.getRowByIndex(row.getIndex());
    if (data) {
      row.renderContent(data);
    }
  }, this);
};


/**
 * @private
 * @param {number} pageIndex .
 * @return {number} .
 */
goog.ui.List.prototype.calcRowCountInPage_ = function(pageIndex) {
  var total = this.data_.getTotal();
  if (total < (pageIndex + 1) * this.rowCountPerPage) {
    return total % this.rowCountPerPage;
  }
  return this.rowCountPerPage;
};


/**
 * @param {number} index The page index.
 * @param {number} rowCount .
 * @return {Node} .
 */
goog.ui.List.prototype.createPage = function(index, rowCount) {
  var dh = this.getDomHelper();
  var page = dh.getDocument().createDocumentFragment();
  var start = index * this.rowCountPerPage;
  var end = start + rowCount;
  for (var i = start; i < end; i++) {
    var row = new this.rowClassRef_(i, this.rowHeight, this.rowRenderer_, dh);
    row.createDom();
    dh.appendChild(page, row.getElement());
    this.addChild(row);
  }
  return page;
};



/**
 * An event dispached by list.Item.
 * @constructor
 * @extends {goog.events.Event}
 * @param {goog.ds.DataNode} data .
 * @param {Object=} row .
 */
goog.ui.List.ClickRowEvent = function(data, row) {
  goog.base(this, goog.ui.list.EventType.CLICKROW, row);

  /**
   * @type {goog.ds.DataNode}
   */
  this.data = data;
};
goog.inherits(goog.ui.List.ClickRowEvent, goog.events.Event);
















/**
 * @constructor
 * @param {number} index .
 * @param {number} height .
 * @param {Function=} opt_renderer .
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List.Item = function(index, height, opt_renderer, opt_domHelper) {
  goog.base(this, opt_domHelper);

  /**
   * @private
   * @type {number}
   */
  this.index_ = index;

  /**
   * @private
   * @type {number}
   */
  this.height_ = height;

  /**
   * @private
   */
  this.renderer_ = opt_renderer || goog.nullFunction;
};
goog.inherits(goog.ui.List.Item, goog.ui.Component);


/**
 * @return {number} .
 */
goog.ui.List.Item.prototype.getIndex = function() {
  return this.index_;
};


/** @inheritDoc */
goog.ui.List.Item.prototype.createDom = function() {
  var dh = this.getDomHelper();
  // XXX: Adding height is kind of expensive process.
  // We can relegate this to a module user.
  this.setElementInternal(dh.createDom('div', {
    style: 'height:' + this.height_ + 'px'
  }));
};


/**
 * TODO: Accept renderer from outside.
 *
 * @param {goog.ds.FastDataNode} data .
 */
goog.ui.List.Item.prototype.renderContent = function(data) {
  this.getElement().innerHTML = this.renderer_(data);
};

