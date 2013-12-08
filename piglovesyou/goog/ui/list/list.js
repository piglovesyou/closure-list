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
goog.require('goog.ui.list.Data');






/**
 * @constructor
 * @param {goog.ui.list.Data} data .
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List = function(data, opt_domHelper) {
  goog.base(this, opt_domHelper);

  this.data = data;

  this.rowHeight = 60;
  this.rowCountPerPage = 8;
  this.updateParamsInternal();
};
goog.inherits(goog.ui.List, goog.ui.Component);


goog.ui.list.RowNodeNamePrefix = goog.ui.list.Data.RowNodeNamePrefix;


goog.ui.List.prototype.updateParamsInternal = function() {
  console.log('updateParamsInternal', this.data.getTotal());
  this.lastPageIndex = Math.ceil(this.data.getTotal() / this.rowCountPerPage) - 1;
  this.pageHeight = this.rowHeight * this.rowCountPerPage;
  this.lastPageRows = this.data.getTotal() % this.rowCountPerPage;
  if (this.lastPageRows == 0) this.lastPageRows = this.rowCountPerPage;
  this.lastRange = new goog.math.Range(-1, -1);
};


/** @inheritDoc */
goog.ui.List.prototype.createDom = function() {
  goog.base(this, 'createDom');
};


/** @inheritDoc */
goog.ui.List.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);

  this.elementHeight = goog.style.getContentBoxSize(element).height;
  this.contentEl = this.getElementByClass('my-list-container');
};


/** @inheritDoc */
goog.ui.List.prototype.canDecorate = function(element) {
  if (element) {
    return true;
  }
  return false;
};



/** @inheritDoc */
goog.ui.List.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var eh = this.getHandler();
  var element = this.getElement();

  eh.listen(element, 'scroll', this.redraw)
    .listen(this.data, goog.ui.list.Data.EventType.UPDATE_TOTAL, this.updateParamsInternal);
  this.redraw();

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

  var concreteRowCount = goog.iter.reduce(goog.iter.range(range.start, range.end + 1), function(count, i) {
    return count + this.getRowCountInPage(i);
  }, 0, this);

  var concreateContentHeight = concreteRowCount * this.rowHeight;
  this.removeChildren(true); // Yeah, we can not to remove them every time. But how?

  // In short, we are creating a virtual content, which contains a top margin,
  // a real dom content and a bottom margin. These three's height always comes to
  // rowHeight * total, so that a browser native scrollbar indicates real size and position.
  content.style.paddingTop = range.start * this.pageHeight + 'px';
  content.style.paddingBottom =
      (this.rowHeight * this.data.getTotal()) - range.start * this.pageHeight - concreateContentHeight + 'px';
  // content.style.height = concreateContentHeight + 'px';

  var pageOnTop = this.createPage(range.start);
  var pageOnBottom = isEdge ? null : this.createPage(range.end);

  this.data.promiseRows(range.start * this.rowCountPerPage, concreteRowCount)
    .wait(goog.bind(this.onResolved, this));

  dh.append(content, pageOnTop, pageOnBottom);
  this.forEachChild(function(child) {
    child.enterDocument();
  });
};


goog.ui.List.prototype.onResolved = function(result) {
  this.forEachChild(function(row) {
    var data = this.data.getRowByIndex(row.getIndex());
    if (data) {
      row.renderContent(data);
    }
  }, this);
};


goog.ui.List.prototype.getRowCountInPage = function(pageIndex) {
  return pageIndex == this.lastPageIndex ? this.lastPageRows : this.rowCountPerPage;
};


/**
 * @param {number} index .
 * @return {Node} .
 */
goog.ui.List.prototype.createPage = function(index) {
  var dh = this.getDomHelper();
  var page = dh.getDocument().createDocumentFragment();
  var start = index * this.rowCountPerPage;
  var end = start + this.getRowCountInPage(index);
  for (var i = start; i < end; i++) {
    var row = new goog.ui.List.Item(i, this.rowHeight);
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
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List.Item = function(index, height, opt_domHelper) {
  goog.base(this, opt_domHelper);
  this.index = index;
  this.height = height;
};
goog.inherits(goog.ui.List.Item, goog.ui.Component);


goog.ui.List.Item.prototype.getIndex = function() {
  return this.index;
};


/** @inheritDoc */
goog.ui.List.Item.prototype.createDom = function() {
  var dh = this.getDomHelper();
  this.setElementInternal(dh.createDom('div', {
    style: 'height:' + this.height + 'px'
  }, '' + this.index));
};


/**
 * @param {goog.ds.FastDataNode} data .
 */
goog.ui.List.Item.prototype.renderContent= function(data) {
  this.getElement().innerHTML = data.id + ' ' + data.title;
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
