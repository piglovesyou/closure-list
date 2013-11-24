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

  this.rowHeight = 100;
  this.rowCountPerPage = 5;
  this.totalRows = 17;
  this.updateParamsInternal();
};
goog.inherits(goog.ui.List, goog.ui.Component);


goog.ui.List.prototype.updateParamsInternal = function() {
  this.lastPageIndex = Math.ceil(this.totalRows / this.rowCountPerPage) - 1;
  this.pageHeight = this.rowHeight * this.rowCountPerPage;
  this.lastPageRows = this.totalRows % this.rowCountPerPage;
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

  eh.listen(element, 'scroll', this.redraw);
  this.redraw();
};


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

  var concreateContentHeight = this.calcConcreteRowCount(range) * this.rowHeight;

  goog.dom.removeChildren(content);
  content.style.height = concreateContentHeight + 'px';
  content.style.paddingTop = range.start * this.pageHeight + 'px';
  content.style.paddingBottom =
      (this.rowHeight * this.totalRows) - range.start * this.pageHeight - concreateContentHeight + 'px';
  dh.append(content,
      this.createPage(range.start),
      isEdge ? null : this.createPage(range.end));
};


goog.ui.List.prototype.calcConcreteRowCount = function(range) {
  return goog.iter.reduce(goog.iter.range(range.start, range.end + 1), function(count, i) {
    return count + this.getRowCountInPage(i);
  }, 0, this);
};


goog.ui.List.prototype.getRowCountInPage = function(pageIndex) {
  return pageIndex == this.lastPageIndex ? this.lastPageRows : this.rowCountPerPage;
}


goog.ui.List.prototype.createPage = function(index) {
  var dh = this.getDomHelper();

  var page = dh.getDocument().createDocumentFragment();
  var start = index * this.rowCountPerPage;
  var end = start + this.getRowCountInPage(index);
  for (var i = start; i < end; i++) {
    dh.appendChild(page,
      dh.createDom('div', {
        style: 'height:' + this.rowHeight + 'px'
      }, '' + i));
  }
  return page;
};


/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};
