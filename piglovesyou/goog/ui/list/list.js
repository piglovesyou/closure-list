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



var rowHeight = 80;
var rowCountPerPage = 5;
var totalRows = 30;
var totalHeight = rowHeight * totalRows;
var pageHeight = rowHeight * rowCountPerPage;
var totalPage = Math.ceil(totalHeight / pageHeight);

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

  goog.dom.removeChildren(content);

  var top = element.scrollTop;
  var paddingTopPage = Math.floor(top/pageHeight);

  var boxMiddle = top + this.elementHeight / 2;
  var pageMiddle = paddingTopPage * pageHeight + pageHeight / 2;

  var isEdge = paddingTopPage == 0 && boxMiddle < pageMiddle ||
               paddingTopPage + 1 == totalPage && boxMiddle > pageMiddle;
  var concretePageCount = isEdge ? 1 : 2;

  var page1index;
  if (isEdge) {
    page1index = paddingTopPage;
  } else {
    page1index = boxMiddle > pageMiddle ?
      paddingTopPage : paddingTopPage - 1;
  }

  content.style.height = pageHeight * concretePageCount + 'px';
  dh.append(content, 
    this.createPage(page1index),
    isEdge ? null : this.createPage(page1index + 1));
  content.style.paddingTop = page1index * pageHeight + 'px'
  content.style.paddingBottom = (totalPage - page1index - concretePageCount) * pageHeight + 'px';
};


goog.ui.List.prototype.createPage = function(index) {
  var dh = this.getDomHelper();

  var page = dh.createDom('div', {
    id: 'page_' + index
  });
  for (var i=0; i < rowCountPerPage; i++) {
    dh.appendChild(page,
      dh.createDom('div', {
        style: 'height:' + rowHeight + 'px'
      }, '' + (index * rowCountPerPage + i)));
  }
  return page;
};


/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};
