
goog.provide('goog.ui.list.Data');


goog.require('goog.ds.FastDataNode');
goog.require('goog.ds.PrimitiveFastDataNode');
goog.require('goog.ds.SortedNodeList');
goog.require('goog.events.EventTarget');
goog.require('goog.labs.net.xhr');
goog.require('goog.net.XhrManager');
goog.require('goog.result.SimpleResult');


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
   * @type {goog.ui.list.Data.SortedNodeList}
   */
  this.rows_ =
      new goog.ui.list.Data.SortedNodeList('rows', function(newone, oldone) {
    var newNodeName = newone.getDataName();
    var oldNodeName = oldone.getDataName();
    return newNodeName < oldNodeName ? -1 :
           newNodeName > oldNodeName ? 1 : 0;
  }, this.root_);
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


/** @type {string} */
goog.ui.list.Data.RowNodeNamePrefix = 'r';


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
}


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
  var node = goog.ds.Expr.create(path).getNode();
  goog.asserts.assert(node);
  this.dispatchEvent({
    type: goog.ui.list.Data.EventType.UPDATE_ROW,
    row: node,
    index: node.getIndex()
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
  var result = new goog.result.SimpleResult();

  if (!goog.iter.every(iter, function(count) {
    var row = me.rows_.get(goog.ui.list.Data.RowNodeNamePrefix + count);
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
              var node = new goog.ui.list.Data.RowNode(rowIndex, row,
                  goog.ui.list.Data.RowNodeNamePrefix + rowIndex, me.rows_);
              me.rows_.add(node);
              collected.push(node);
            }
            return ++i;
          }, 0);
        }
        result.setValue(collected);
      });
    }
  }
  return collected;
};


/**
 * @param {number} index .
 * @return {?goog.ds.DataNode} .
 */
goog.ui.list.Data.prototype.getRowByIndex = function(index) {
  return this.rows_.get(goog.ui.list.Data.RowNodeNamePrefix + index);
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
 * We want sortedNodeList to have a name.
 * @param {string} name .
 * @param {Function} compareFn .
 * @param {goog.ds.DataNode} parent .
 * @extends {goog.ds.SortedNodeList}
 * @constructor
 */
goog.ui.list.Data.SortedNodeList = function(name, compareFn, parent) {
  goog.base(this, compareFn);
  this.name_ = name;
  this.parent_ = parent;
};
goog.inherits(goog.ui.list.Data.SortedNodeList, goog.ds.SortedNodeList);


/** @inheritDoc */
goog.ui.list.Data.SortedNodeList.prototype.add = function(node) {
  goog.base(this, 'add', node);
  var dm = goog.ds.DataManager.getInstance();
  dm.fireDataChange(this.getDataPath() + goog.ds.STR_PATH_SEPARATOR + '[' +
      node.getDataName().slice(goog.ui.list.Data.RowNodeNamePrefix.length) +
  ']');
};


/**
 * @return {string} .
 */
goog.ui.list.Data.SortedNodeList.prototype.getDataPath = function() {
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
goog.ui.list.Data.SortedNodeList.prototype.getChildNode = function(key) {
  var index = this.getKeyAsNumber(key);
  if (index >= 0) {
    return this.get(goog.ui.list.Data.RowNodeNamePrefix + index);
  }
  return null;
};


/**
 * goog.ds.FastListNode.prototype.getKeyAsNumber_
 * @param {string} key .
 * @return {?number} .
 */
goog.ui.list.Data.SortedNodeList.prototype.getKeyAsNumber = function(key) {
  if (key.charAt(0) == '[' && key.charAt(key.length - 1) == ']') {
    return Number(key.substring(1, key.length - 1));
  } else {
    return null;
  }
};


/**
 * @return {goog.ds.DataNode} .
 */
goog.ui.list.Data.SortedNodeList.prototype.getParent = function() {
  return this.parent_;
};


/**
 * @return {string} .
 */
goog.ui.list.Data.SortedNodeList.prototype.getDataName = function() {
  return this.name_;
};


/**
 * @param {number} index .
 * @param {Object} root JSON-like object to initialize data node from.
 * @param {string} dataName Name of this data node.
 * @param {goog.ds.DataNode=} opt_parent Parent of this data node.
 * @extends {goog.ds.FastDataNode}
 * @constructor
 */
goog.ui.list.Data.RowNode = function(index, root, dataName, opt_parent) {
  goog.base(this, root, dataName, opt_parent);

  /**
   * @type {number}
   * @private
   */
  this.index_ = index;
};
goog.inherits(goog.ui.list.Data.RowNode, goog.ds.FastDataNode);


/**
 * @return {number}
 */
goog.ui.list.Data.RowNode.prototype.getIndex = function() {
  return this.index_;
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


