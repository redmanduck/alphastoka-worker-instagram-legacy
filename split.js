var fs = require('fs');
var filename = process.argv[process.argv.length - 2];
var chunkcount = process.argv[process.argv.length - 1];

var big = require('./' + filename);

var chunks = function(array, size) {
  var results = [];
  while (array.length) {
    results.push(array.splice(0, size));
  }
  return results;
};

results = chunks(big, chunkcount)

for(var i = 0; i < results.length; i++){
    fs.writeFileSync('lnw_chunks/brands_' + i + '.json', JSON.stringify(results[i]));
}
