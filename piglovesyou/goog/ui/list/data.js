
goog.provide('goog.ui.list.Data');
goog.provide('goog.ui.list.Data.Event');


goog.require('goog.events.EventTarget');
goog.require('goog.labs.net.xhr');
goog.require('goog.result.SimpleResult');


/**
 * @param {string} uri Through which thousandrows interacts with a server
 *    by xhr. Also it is used as request id of xhr.
 * @param {number=} opt_totalRowCount .
 * @param {boolean=} opt_updateTotalWithJson .
 * @param {goog.net.XhrManager=} opt_xhrManager .
 * @constructor
 * @extends {goog.events.EventTarget}
 */
goog.ui.list.Data = function(uri,
    opt_totalRowCount, opt_updateTotalWithJson, opt_xhrManager) {

  goog.base(this);

  this.uri_ = uri;
  // this.updateTotalWithJson_ = !!opt_updateTotalWithJson;

  var dm = goog.ds.DataManager.getInstance();
  this.root_ = new goog.ds.FastDataNode({}, this.getId());

  var total = goog.isNumber(opt_totalRowCount) ? opt_totalRowCount : -1;
  this.total_ = new goog.ds.PrimitiveFastDataNode(total, 'total', this.root_);
  this.root_.add(this.total_);

  this.rows_ = new goog.ui.list.Data.SortedNodeList('rows', function(newone, oldone) {
    var newNodeName = newone.getDataName();
    var oldNodeName = oldone.getDataName();
    return newNodeName < oldNodeName ? -1 :
           newNodeName > oldNodeName ? 1 : 0;
  });
  goog.ds.Util.makeReferenceNode(this.rows_, 'rows');
  this.root_.add(this.rows_);

  dm.addDataSource(this.root_);
  // dm.addListener(goog.bind(this.handleDataChange_, this), '$' + this.getId() + '/...');
};
goog.inherits(goog.ui.list.Data, goog.events.EventTarget);


/**
 * @enum {string}
 */
goog.ui.list.Data.EventType = {
  UPDATE_TOTAL: 'updatetotal',
  UPDATE_PAGE: 'updatepage'
};


goog.ui.list.Data.RowNodeNamePrefix = 'r';


/**
 * @type {?goog.ds.FastDataNode}
 */
goog.ui.list.Data.prototype.ds_;


/**
 * @type {string}
 * @private
 */
goog.ui.list.Data.prototype.countParamKey_ = 'size';


/**
 * @return {string} .
 */
goog.ui.list.Data.prototype.getCountParamKey = function() {
  return this.countParamKey_;
};


/**
 * @param {string} .
 */
goog.ui.list.Data.prototype.setCountParamKey = function() {
  return this.countParamKey_;
};


/**
 * @type {string}
 * @private
 */
goog.ui.list.Data.prototype.offsetParamKey_ = 'offset';


/**
 * @return {string} .
 */
goog.ui.list.Data.prototype.getOffsetParamKey = function() {
  return this.offsetParamKey_;
};


/**
 * @param {string} .
 */
goog.ui.list.Data.prototype.setOffsetParamKey = function() {
  return this.offsetParamKey_;
};


/**
 * @type {string}
 * @private
 */
goog.ui.list.Data.prototype.objectNameTotalInJson_ = 'total';


/**
 * @return {string} .
 */
goog.ui.list.Data.prototype.getObjectNameTotalInJson = function() {
  return this.objectNameTotalInJson_;
};


/**
 * @param {string} .
 */
goog.ui.list.Data.prototype.setObjectNameTotalInJson = function(objName) {
  this.objectNameTotalInJson_ = objName;
};


/**
 * @type {string}
 * @private
 */
goog.ui.list.Data.prototype.objectNameRowsInJson_ = 'items';


/**
 * @return {string} .
 */
goog.ui.list.Data.prototype.getObjectNameRowsInJson = function() {
  return this.objectNameRowsInJson_;
};


/**
 * @param {string} .
 */
goog.ui.list.Data.prototype.setObjectNameRowsInJson = function(objName) {
  this.objectNameRowsInJson_ = objName;
};


/**
 * @return {string} .
 */
goog.ui.list.Data.prototype.getId = function() {
  return this.id_ || (this.id_ = 'closurelist:' + goog.getUid(this));
};


/**
 * @return {number} .
 */
goog.ui.list.Data.prototype.getTotal = function() {
  return this.total_.get();
};


/**
 * @type {string}
 */
goog.ui.list.Data.prototype.id_;


/**
 * @param {goog.math.Range} range.
 * @return {goog.result.Result} .
 */
goog.ui.list.Data.prototype.getRows = function(from, count) {
  var me = this;
  var collected = [];

  var rv = goog.iter.every(goog.iter.range(from, from + count), function(count) {
    var row = me.rows_.get(goog.ui.list.Data.RowNodeNamePrefix + count);
    if (row) {
      collected.push(row);
      return true;
    }
    return false;
  });

  var result = new goog.result.SimpleResult();
  if (rv) {
    result.setValue(collected);
  } else {
    var x = goog.labs.net.xhr.getJson(me.buildUrl(from, count));
    goog.array.clear(collected);
    x.wait(function(x) {
      var json = x.getValue();
      me.total_.set(goog.getObjectByName('total', json));
      var rows = collected = goog.getObjectByName('items', json);
      if (!goog.array.isEmpty(rows)) {
        goog.iter.reduce(goog.iter.range(from, from + count), function(i, rowIndex) {
          var row = rows[i];
          if (row) {
            var node = goog.ds.FastDataNode.fromJs(row,
                goog.ui.list.Data.RowNodeNamePrefix + rowIndex, me.rows_);
            me.rows_.add(node);
            collected[i] = node;
          }
          return ++i;
        }, 0);
      }
      result.setValue(collected);
    });
  }
  return result;
};


/**
 * @param {number} index .
 * @param {number} count .
 * @return {string} .
 * @protected
 * @suppress {underscore}
 */
goog.ui.list.Data.prototype.buildUrl = function(index, count) {
  var uri = goog.Uri.parse(this.uri_);
  uri.setParameterValue(this.countParamKey_, count);
  uri.setParameterValue(this.offsetParamKey_, index * count);
  return uri.toString();
};


/** @inheritDoc */
goog.ui.list.Data.prototype.disposeInternal = function() {
  if (this.xhr_) {
    goog.array.forEach(this.xhr_.getOutstandingRequestIds(), function(id) {
      this.abort(id, true);
    }, this.xhr_);
    this.xhr_.dispose();
    this.xhr_ = null;
  }
  goog.ds.DataManager.getInstance().get().removeNode('$' + this.getId());
  this.ds_ = null;
  goog.base(this, 'disposeInternal');
};


/**
 * We want sortedNodeList to have a name.
 * @param {string} name .
 * @param {Function} compareFn .
 * @param {Array.<goog.ds.DataNode>=} opt_nodes .
 * @extends {goog.ds.SortedNodeList}
 * @constructor
 */
goog.ui.list.Data.SortedNodeList = function(name, compareFn, opt_nodes) {
  goog.base(this, compareFn, opt_nodes);
  this.name_ = name;
};
goog.inherits(goog.ui.list.Data.SortedNodeList, goog.ds.SortedNodeList);


/**
 * @return {string} .
 */
goog.ui.list.Data.SortedNodeList.prototype.getDataName = function() {
  return this.name_;
};



// // Test.
// var data = new goog.ui.list.Data('/api');
// function go() {
//   var r = data.getRows(0, 4);
//   r.wait(function(r) {
//     console.log(r.getValue());
//   });
// }
// go();
// setTimeout(go, 2000);


