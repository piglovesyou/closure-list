
goog.provide('goog.ui.list.Data');


goog.require('goog.ds.FastDataNode');
goog.require('goog.ds.PrimitiveFastDataNode');
goog.require('goog.ds.SortedNodeList');
goog.require('goog.events.EventTarget');
goog.require('goog.labs.net.xhr');
goog.require('goog.net.XhrManager');


/**
 * @param {string|goog.Uri} url .
 * @param {number=} opt_totalRowCount .
 * @param {boolean=} opt_keepTotalUptodate .
 * @param {goog.net.XhrManager=} opt_xhrManager .
 * @constructor
 * @extends {goog.events.EventTarget}
 */
goog.ui.list.Data = function(url,
    opt_totalRowCount, opt_keepTotalUptodate, opt_xhrManager) {

  goog.base(this);

  /**
   * @type {goog.Uri}
   */
  this.url = goog.Uri.parse(url);

  /**
   * @private
   * @type {boolean}
   */
  this.keepTotalUptodate_ =
      goog.isDef(opt_keepTotalUptodate) ? opt_keepTotalUptodate : true;

  /**
   * @private
   * @type {goog.net.XhrManager}
   */
  this.xhr_ = opt_xhrManager || new goog.net.XhrManager;

  /**
   * @private
   */
  this.selectedIndexes_ = [];

  var dm = goog.ds.DataManager.getInstance();

  /**
   * @private
   * @type {goog.ds.DataNode}
   */
  this.root_ = new goog.ds.FastDataNode({}, this.getId());

  /**
   * Total count of rows in a list.
   *
   * @private
   * @type {goog.ds.PrimitiveFastDataNode}
   */
  this.total_ = new goog.ds.PrimitiveFastDataNode(
      goog.isNumber(opt_totalRowCount) ? opt_totalRowCount : 50,
      'total', this.root_);
  this.root_.add(this.total_);

  /**
   * @private
   * @type {goog.ui.list.Data.BasicNodeList}
   */
  this.rows_ = new goog.ui.list.Data.BasicNodeList('rows', this.root_);
  goog.ds.Util.makeReferenceNode(this.rows_, 'rows');
  this.root_.add(this.rows_);

  dm.addDataSource(this.root_);

  // Monitor a ds a list.Data belongs to.
  this.attachListeners_(true);
};
goog.inherits(goog.ui.list.Data, goog.events.EventTarget);


/**
 * @enum {string}
 */
goog.ui.list.Data.EventType = {
  UPDATE_TOTAL: 'updatetotal',
  UPDATE_ROW: 'updaterow'
};


/**
 * @type {?goog.ds.FastDataNode}
 */
goog.ui.list.Data.prototype.ds_;


/**
 * @type {string}
 */
goog.ui.list.Data.prototype.id_;


/**
 * Used as a request parameter to represent how much rows we want.
 * @type {string}
 * @private
 */
goog.ui.list.Data.prototype.countParamKey_ = 'count';


/**
 * @return {string} .
 */
goog.ui.list.Data.prototype.getCountParamKey = function() {
  return this.countParamKey_;
};


/**
 * @param {string} key .
 */
goog.ui.list.Data.prototype.setCountParamKey = function(key) {
  this.countParamKey_ = key;
};


/**
 * Used as a request parameter to represent from what index of rows we want.
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
 * @param {string} key .
 */
goog.ui.list.Data.prototype.setOffsetParamKey = function(key) {
  this.offsetParamKey_ = key;
};


/**
 * Used as "path" to rows total value in a responded JSON.
 * So when you get a JSON from a server like:
 *    {
 *      results: {
 *        total: 888,
 *        items: [
 *          {id: 'x', title, 'xxx'},
 *          {id: 'y', title, 'yyy'},
 *          {id: 'z', title, 'zzz'}
 *        ]
 *      },
 *      error: null
 *    }
 * Then, set 'results.total' as a path to the value.
 *
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
 * @private
 * @param {boolean} attach .
 */
goog.ui.list.Data.prototype.attachListeners_ = function(attach) {
  var dm = goog.ds.DataManager.getInstance();
  var totalListener = this.boundTotalListener ||
      (this.boundTotalListener = goog.bind(this.handleTotalChanged, this));
  var rowsListener = this.boundRowsListener ||
      (this.boundRowsListener = goog.bind(this.handleRowChanged, this));
  var totalDataPath = '$' + this.getId() + '/total';
  var rowsDataPath = '$' + this.getId() + '/rows/...';

  if (attach) {
    dm.addListener(totalListener, totalDataPath);
    dm.addListener(rowsListener, rowsDataPath);
  } else {
    dm.removeListeners(totalListener, totalDataPath);
    dm.removeListeners(rowsListener, rowsDataPath);
  }
};


/**
 * @param {string} objName .
 */
goog.ui.list.Data.prototype.setObjectNameTotalInJson = function(objName) {
  this.objectNameTotalInJson_ = objName;
};


/**
 * Used as "path" to rows' array in a responded JSON.
 * So when you get a JSON from a server like:
 *    {
 *      results: {
 *        total: 888,
 *        items: [
 *          {id: 'x', title, 'xxx'},
 *          {id: 'y', title, 'yyy'},
 *          {id: 'z', title, 'zzz'}
 *        ]
 *      },
 *      error: null
 *    }
 * Then, set 'results.items' as a path to the value.
 *
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
 * @param {string} objName .
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
  return /**@type{number}*/(this.total_.get());
};


/**
 * @protected
 * @param {string} path .
 */
goog.ui.list.Data.prototype.handleRowChanged = function(path) {
  var expr = goog.ds.Expr.create(path);
  var index = goog.ui.list.Data.BasicNodeList.getKeyAsNumber(/** @type {!string} */(expr.getLast()));
  var node = expr.getNode();
  goog.asserts.assert(node);
  this.dispatchEvent({
    type: goog.ui.list.Data.EventType.UPDATE_ROW,
    row: node,
    index: index
  });
};


/**
 * @protected
 * @param {string} path .
 */
goog.ui.list.Data.prototype.handleTotalChanged = function(path) {
  this.dispatchEvent(goog.ui.list.Data.EventType.UPDATE_TOTAL);
};


/**
 * @param {number} from .
 * @param {number} count .
 * @return {Array} .
 */
goog.ui.list.Data.prototype.collect = function(from, count) {
  var me = this;

  var collected = [];
  var iter = goog.iter.range(from, from + count);

  if (!goog.iter.every(iter, function(count) {
    var row = me.rows_.get(count.toString());
    if (row) {
      collected.push(row);
      return true;
    }
    return false;
  })) {
    // TODO: Maybe we should trim a partialCount from
    //   right as well (check existing descending).
    var partialFrom = from + collected.length;
    var partialCount = count - collected.length;
    var url = me.buildUrl(partialFrom, partialCount);

    if (this.onFly_ != url) {

      // Newer request has always maximum priority.
      if (this.onFly_) this.xhr_.abort(this.onFly_);
      this.onFly_ = url;

      this.xhr_.send(url, url,
          undefined, undefined, undefined, undefined, function(e) {

        if (me.isDisposed()) return;
        me.onFly_ = null;
        if (!e.target.isSuccess()) return;

        var json = e.target.getResponseJson();

        if (me.keepTotalUptodate_) {
          var lastTotal = me.total_.get();
          var newTotal = +goog.getObjectByName(me.objectNameTotalInJson_, json);
          if (goog.isNumber(newTotal) && lastTotal != newTotal) {
            me.total_.set(newTotal);
          }
        }

        var items = goog.getObjectByName(me.objectNameRowsInJson_, json) || [];
        if (!goog.array.isEmpty(items)) {
          goog.iter.reduce(goog.iter.range(partialFrom,
              partialFrom + partialCount), function(i, rowIndex) {
            var row = items[i];
            if (row) {
              var node = me.addRowAt(row, rowIndex);
              collected.push(node);
            }
            return ++i;
          }, 0);
        }
      });
    }
  }
  return collected;
};


/**
 * @param {Object} rawObject .
 * @param {number} index .
 * @return {goog.ds.DataNode} .
 */
goog.ui.list.Data.prototype.addRowAt = function(rawObject, index) {
  var node = new goog.ds.FastDataNode(rawObject,
      'row:' + index, this.rows_);
  this.rows_.addAt(node, index);
  this.dispatchRowChange_(node, index);
  return node;
};


/**
 * @private
 * @param {goog.ds.DataNode} node .
 * @param {number} index .
 */
goog.ui.list.Data.prototype.dispatchRowChange_ = function(node, index) {
  var dm = goog.ds.DataManager.getInstance();
  dm.fireDataChange(this.rows_.getDataPath() +
      goog.ds.STR_PATH_SEPARATOR + '[' + index + ']');
};


/**
 * @param {number} index .
 * @return {?goog.ds.DataNode} .
 */
goog.ui.list.Data.prototype.getRowByIndex = function(index) {
  return this.rows_.getByIndex(index);
};


/**
 * @param {number} from .
 * @param {number} count .
 * @return {string} .
 * @protected
 * @suppress {underscore}
 */
goog.ui.list.Data.prototype.buildUrl = function(from, count) {
  var url = this.url.clone();
  url.setParameterValue(this.offsetParamKey_, from);
  url.setParameterValue(this.countParamKey_, count);
  return url.toString();
};


/**
 * @param {Array.<number>} indexes .
 */
goog.ui.list.Data.prototype.asSelected = function(indexes) {
  goog.array.forEach(this.selectedIndexes_, function(i) {
    if (!goog.array.contains(indexes, i)) {
      this.rows_.asSelected(i, false);
    }
  }, this);
  goog.array.forEach(indexes, function(i) {
    if (!goog.array.contains(this.selectedIndexes_, i)) {
      this.rows_.asSelected(i, true);
    }
  }, this);
  this.selectedIndexes_ = indexes;
};


/** @inheritDoc */
goog.ui.list.Data.prototype.disposeInternal = function() {
  this.attachListeners_(false);
  goog.ds.DataManager.getInstance().get().removeNode('$' + this.getId());
  this.root_ = null;
  this.total_ = null;
  this.rows_ = null;
  this.boundTotalListener = null;
  this.boundRowsListener = null;
  goog.base(this, 'disposeInternal');
};




/**
 * @constructor
 * @param {string} name .
 * @param {goog.ds.DataNode} parent .
 * @param {Array.<goog.ds.DataNode>=} opt_nodes .
 * @extends {goog.ds.BasicNodeList}
 */
goog.ui.list.Data.BasicNodeList = function(name, parent, opt_nodes) {
  // this.map_ = { "dataName": node };
  // this.list_ = [ node ];
  // this.indexMap_ = { "dataName": index };
  goog.base(this, opt_nodes);
  this.name_ = name;
  this.parent_ = parent;
};
goog.inherits(goog.ui.list.Data.BasicNodeList, goog.ds.BasicNodeList);


/**
 * @type {string}
 */
goog.ui.list.Data.BasicNodeList.SelectedKey = 'isSelected';


/**
 * @param {goog.ds.DataNode} node .
 * @param {number} index .
 */
goog.ui.list.Data.BasicNodeList.prototype.addAt = function(node, index) {
  this.list_[index] = node;
  var dataName = node.getDataName();
  if (dataName) {
    this.map_[dataName] = node;
    this.indexMap_[dataName] = index;
  }
};


/**
 * @private
 * @param {goog.ds.DataNode} node .
 * @param {number} index .
 */
goog.ui.list.Data.BasicNodeList.prototype.dispatchDataChange_ = function(node, index) {
  var dm = goog.ds.DataManager.getInstance();
  dm.fireDataChange(this.getDataPath() +
      goog.ds.STR_PATH_SEPARATOR + '[' + index + ']');
};


/**
 * @return {goog.ds.DataNode} .
 */
goog.ui.list.Data.BasicNodeList.prototype.getParent = function() {
  return this.parent_;
};


/**
 * @return {string} .
 */
goog.ui.list.Data.BasicNodeList.prototype.getDataName = function() {
  return this.name_;
};


/**
 * @return {string} .
 */
goog.ui.list.Data.BasicNodeList.prototype.getDataPath = function() {
  var parentPath = '';
  var myName = this.getDataName();
  if (this.getParent && this.getParent()) {
    parentPath = this.getParent().getDataPath() +
        (myName.indexOf(goog.ds.STR_ARRAY_START) != -1 ? '' :
        goog.ds.STR_PATH_SEPARATOR);
  }
  return parentPath + myName;
};


/**
 * @param {string} key .
 * @return {goog.ds.DataNode} .
 */
goog.ui.list.Data.BasicNodeList.prototype.getChildNode = function(key) {
  var index = goog.ui.list.Data.BasicNodeList.getKeyAsNumber(key);
  if (goog.isNumber(index) && index >= 0) {
    return this.getByIndex(index);
  }
  return null;
};


/**
 * goog.ds.FastListNode.prototype.getKeyAsNumber_
 * @param {string} key .
 * @return {?number} .
 */
goog.ui.list.Data.BasicNodeList.getKeyAsNumber = function(key) {
  if (key.charAt(0) == '[' && key.charAt(key.length - 1) == ']') {
    return Number(key.substring(1, key.length - 1));
  } else {
    return null;
  }
};


/**
 * @param {number} index .
 * @param {boolean} select .
 */
goog.ui.list.Data.BasicNodeList.prototype.asSelected = function(index, select) {
  var node = this.get(index.toString());
  // Is is offensive to use "isSelected" namespace?
  if (!node || !!node[goog.ui.list.Data.BasicNodeList.SelectedKey] == select) return;
  node[goog.ui.list.Data.BasicNodeList.SelectedKey] = select;
  this.setNode(index.toString(), node);
};





// // Test.
// var data = new goog.ui.list.Data('/api');
// function go() {
//   var r = data.getRows(0, 4);
//   r.wait(function(r) {
//     console.log(r.getValue());
//     console.log(data.getTotal());
//   });
// }
// go();
// setTimeout(go, 2000);


