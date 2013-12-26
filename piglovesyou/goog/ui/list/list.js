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
 * @param {goog.ui.list.Data} data .
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
goog.ui.List = function(data, rowRenderer, opt_rowCountPerPage, opt_domHelper) {
  goog.base(this, opt_domHelper);

  this.data = data;

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

  if (rowRenderer instanceof goog.ui.List.Item) {
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

  this.updateParamsInternal();
};
goog.inherits(goog.ui.List, goog.ui.Component);
goog.exportSymbol('goog.ui.List', goog.ui.List);


/** @type {string} */
goog.ui.list.RowNodeNamePrefix = goog.ui.list.Data.RowNodeNamePrefix;


/***/
goog.ui.List.prototype.updateParamsInternal = function() {
  this.lastPageIndex =
      Math.ceil(this.data.getTotal() / this.rowCountPerPage) - 1;
  this.pageHeight = this.rowHeight * this.rowCountPerPage;

  // Cache for a speed.
  this.lastPageRows = this.data.getTotal() % this.rowCountPerPage;
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
  this.contentEl.style.paddingBottom = this.rowHeight * this.data.getTotal() -
      this.lastRange.start * this.pageHeight - this.getChildCount() * this.rowHeight + 'px';
};


/** @inheritDoc */
goog.ui.List.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');
  var eh = this.getHandler();
  var element = this.getElement();

  eh.listen(element, goog.events.EventType.SCROLL, this.redraw)
    .listen(this.data,
        goog.ui.list.Data.EventType.UPDATE_TOTAL, this.handleTotalUpdate_);
  this.redraw();
};


/**
 * @private
 * @param {goog.events.Event} e .
 */
goog.ui.List.prototype.handleTotalUpdate_ = function(e) {
  this.updateParamsInternal();
  this.updateVirualSizing(this.getChildCount());
};


/***/
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
  this.lastRange = range;

  this.removeChildren(true); // We can not to remove them every time. But how?

  var appendArgs = [content];
  for (var i = range.start; i < range.end + 1; i++) {
    var count = this.calcRowCountInPage_(i);
    appendArgs.push(this.createPage(i, count));
  }

  // In short, we are creating a virtual content, which contains a top margin +
  // a real dom content + a bottom margin. These three's height always comes
  // to (rowHeight * total), so that a browser native scrollbar indicates
  // a real size and position.
  this.updateVirualSizing();
  // content.style.height = concreateContentHeight + 'px';

  this.data.promiseRows(range.start * this.rowCountPerPage, this.getChildCount())
    .wait(goog.bind(this.onResolved, this));
  dh.append.apply(dh, appendArgs);
  this.forEachChild(function(child) {
    child.enterDocument();
  });
};


/**
 * @param {goog.result.SimpleResult} result .
 */
goog.ui.List.prototype.onResolved = function(result) {
  this.forEachChild(function(row) {
    var data = this.data.getRowByIndex(row.getIndex());
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
  var total = this.data.getTotal();
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


/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};

















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
