
var express = require('express');
var app = express();





app.configure(function() {
  app.use(express.static(__dirname));
});



app.get('/', function(req, res) {
  res.redirect('piglovesyou/goog/demos/list.html');
});

var total = 40;

var createItems = function(offset, size) {
  var items = [];
  // console.log(offset, offset + size);
  for (var i = offset; i < offset + size && i < total; i++) {
    items.push({
      id: 'id' + i,
      title: 'yeah',
      body: 'ohh... '
    });
  }
  return items;
};

var createResponse = function(offset, size) {
  return {
    total: total,
    items: createItems(offset, size)
  };
};

app.get('/api', function(req, res) {
  res.writeHead(200, {'Content-Type': 'application/json;charset=UTF8'});
  var s = Math.min(+req.query.count, 50);
  var r = createResponse(+req.query.offset, s);
  res.end(JSON.stringify(r));
});



app.listen(1337, function() {
  console.log('Ready.');
});

