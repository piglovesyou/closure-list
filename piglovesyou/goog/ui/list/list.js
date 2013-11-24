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






/**
 * @constructor
 * @param {goog.dom.DomHelper=} opt_domHelper .
 * @extends {goog.ui.Component}
 */
goog.ui.List = function(opt_domHelper) {
  goog.base(this, opt_domHelper);

  this.lastConcretePageRange = new goog.math.Range(-1, -1);
};
goog.inherits(goog.ui.List, goog.ui.Component);


/** @inheritDoc */
goog.ui.List.prototype.createDom = function() {
  goog.base(this, 'createDom');
};


/** @inheritDoc */
goog.ui.List.prototype.decorateInternal = function(element) {
  goog.base(this, 'decorateInternal', element);
  this.contentEl = this.getElementByClass('my-list-container');

  // this.contentEl.style.height = 40 + 'px';
};


/** @inheritDoc */
goog.ui.List.prototype.canDecorate = function(element) {
  if (element) {
    return true;
  }
  return false;
};



var rowHeight = 100;
var rowCountPerPage = 5;
var totalRows = 27;
var lastPageIndex = Math.ceil(totalRows / rowCountPerPage) - 1;
var totalHeight = rowHeight * totalRows;
var pageHeight = rowHeight * rowCountPerPage;

/** @inheritDoc */
goog.ui.List.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var eh = this.getHandler();
  var dh = this.getDomHelper();
  var element = this.getElement();
  this.elementHeight = goog.style.getContentBoxSize(element).height;

  eh.listen(element, 'scroll', this.redraw);
  this.redraw();
};


goog.ui.List.prototype.redraw = function() {
  var dh = this.getDomHelper();
  var element = this.getElement();
  var content = this.contentEl;

  var top = element.scrollTop;
  var paddingTopPage = Math.floor(top / pageHeight);

  var boxMiddle = top + this.elementHeight / 2;
  var pageMiddle = paddingTopPage * pageHeight + pageHeight / 2;
  var boxPosLessThanPagePos = boxMiddle < pageMiddle;

  var isEdge = paddingTopPage == 0 && boxPosLessThanPagePos ||
               paddingTopPage == lastPageIndex && !boxPosLessThanPagePos;
  var rangeLength = isEdge ? 1 : 2;

  var range;
  if (isEdge) {
    range = new goog.math.Range(paddingTopPage, paddingTopPage);
  } else {
    var page1index = !boxPosLessThanPagePos ?
      paddingTopPage : paddingTopPage - 1;
    range = new goog.math.Range(page1index, page1index + rangeLength - 1);
  }

  if (goog.math.Range.equals(range, this.lastConcretePageRange)) {
    return;
  }
  this.lastConcretePageRange = range;

  var concreateContentHeight = this.calcConcreteRowCount(range) * rowHeight;

  goog.dom.removeChildren(content);
  content.style.height = concreateContentHeight + 'px';
  content.style.paddingTop = range.start * pageHeight + 'px';
  content.style.paddingBottom =
      totalHeight - range.start * pageHeight - concreateContentHeight + 'px';
  dh.append(content,
      this.createPage(range.start), isEdge ? null : this.createPage(range.end));
};


goog.ui.List.prototype.calcConcreteRowCount = function(range) {
  return goog.iter.reduce(goog.iter.range(range.start, range.end + 1), function(count, i) {
    return count + this.getRowCountInPage(i);
  }, 0, this);
};


var lastPageRows = totalRows % rowCountPerPage;
if (lastPageRows == 0) lastPageRows = rowCountPerPage;
goog.ui.List.prototype.getRowCountInPage = function(pageIndex) {
  return pageIndex == lastPageIndex ? lastPageRows : rowCountPerPage;
}


goog.ui.List.prototype.createPage = function(index) {
  var dh = this.getDomHelper();

  var page = dh.createDom('div', {
    id: 'page_' + index
  });
  var start = index * rowCountPerPage;
  var end = start + this.getRowCountInPage(index);
  for (var i = start; i < end; i++) {
    dh.appendChild(page,
      dh.createDom('div', {
        style: 'height:' + rowHeight + 'px'
      }, '' + i));
  }
  return page;
};


/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};
