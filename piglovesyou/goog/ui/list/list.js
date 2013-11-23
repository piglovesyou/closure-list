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
var totalRows = 200;
var totalHeight = rowHeight * totalRows;
var pageHeight = rowHeight * rowCountPerPage;
var totalPage = Math.ceil(totalHeight / pageHeight);

/** @inheritDoc */
goog.ui.List.prototype.enterDocument = function() {
  goog.base(this, 'enterDocument');

  var eh = this.getHandler();
  var dh = this.getDomHelper();
  var element = this.getElement();
  var elementHeight = goog.style.getContentBoxSize(element).height;
  var content = this.contentEl;

  var createPage = function(index) {
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

  var redraw = function() {

    goog.dom.removeChildren(content);

    var top = element.scrollTop;

    var paddingTopPage = Math.floor(top/pageHeight);
    var isEdge = paddingTopPage == 0 && top + elementHeight / 2 < (pageHeight / 2) ||
                 paddingTopPage + 1 == totalPage &&
                    top + elementHeight / 2 > (paddingTopPage * pageHeight + pageHeight / 2);

    console.log(isEdge);

    if (isEdge) {
      var page1index = paddingTopPage;

      content.style.height = pageHeight + 'px';
      dh.append(content, 
        createPage(page1index));
      content.style.paddingTop = page1index * pageHeight + 'px'
      content.style.paddingBottom = (totalPage - page1index - 1) * pageHeight + 'px';
    } else {

      var boxMiddle = top + (elementHeight / 2);
      var pageMiddle = paddingTopPage + (pageHeight / 2);
      
      var needBottom = boxMiddle > pageMiddle;
      var page1index = needBottom ?
          paddingTopPage : paddingTopPage - 1;
      content.style.height = pageHeight * 2 + 'px';
      dh.append(content, 
        createPage(page1index),
        createPage(page1index + 1));
      content.style.paddingTop = page1index * pageHeight + 'px'
      content.style.paddingBottom = (totalPage - page1index - 2) * pageHeight + 'px';
    }
  };
  eh.listen(element, 'scroll', redraw);
  redraw();
};


/** @inheritDoc */
goog.ui.List.prototype.disposeInternal = function() {
  goog.base(this, 'disposeInternal');
};
