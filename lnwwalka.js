var cheerio = require('cheerio')
var request = require('superagent')
var xlsx = require('node-xlsx');
var fs = require('fs');
URL = "https://www.lnwshop.com/shop/sureshopping/levelone";
TERMINATE_P = 256; //max 256
TERMINATE_R = 0;
FRI = 7663;

var arg = process.argv[process.argv.length - 1];

// $ = cheerio.load('<h2 class="title">Hello world</h2>');

var results = [];
var finalResults = []

function writeCSV(A){
    var L = []
    var H = Object.keys(A[0]);

    for(var i  = 0; i < A.length; i++){
        var l = [];

        for(var j = 0; j < H.length; j++){
           var h = H[j];
           l.push(A[i][h]);
        }

        L.push(l);
    }

    L.unshift(H);
    var buffer = xlsx.build([{name: "Level One Brands", data: L}]); // Returns a buffer
    fs.writeFileSync('output/' + arg + '.xlsx', buffer);
}

function deepGet(){
    var next = Object.assign({}, results.pop());
    if(!next.href) return;

    var url = next.href + "contactus";
    console.log(url);
    request.get(url)
    .end(function(err,res){
        if(!res) {
            console.log("Eh!", next.href, "failed");
            // finalResults.push(next);
            deepGet()
            return;
        }

        $ = cheerio.load(res.text);

        console.log("[DONE]", next.href)
        next.phone = $(".telephoneTR .bodyTD").text();
        next.email = $(".emailTR .bodyTD").text();
        var view_count = $(".pageviewsTR .bodyTD").text().replace(/,/g, "").match(/[0-9,]+/g);
        var visitor_count = $(".visitsTR .bodyTD").text().replace(/,/g, "").match(/[0-9,]+/g);

        if(view_count && view_count.length > 0){
            next.view_count = view_count[0]
        }

        if(visitor_count && visitor_count.length > 0){
            next.visitor_count = visitor_count[0]
        }

        finalResults.push(next);

        if(results.length == 0){
            fs.writeFileSync('brands.json', JSON.stringify(finalResults));
            writeCSV(finalResults);
        }else{
            console.log('Progress ', finalResults.length, TERMINATE_R)
            deepGet()
        }
    });
}


function getListing(pp){

    if(pp > TERMINATE_P){
        fs.writeFileSync('brands_nocontact.json', JSON.stringify(results));
        deepGet();
        return;
    }

    request
        .get(URL + "/?p=" + pp)
        .end(function(err, res) {
                $ = cheerio.load(res.text);
                var B = $(".box_pinterest").parent();

                for (var i = 0; i < B.length; i++) {
                    var href = $(B[i]).attr("href");
                    var href = $(B[i]).attr("href");
                    var img = $(B[i]).find("img").attr("src");
                    var title = $(B[i]).find("b").text();
                    var desc = $(B[i]).find("span").first().text().replace(/ /g,'').replace(/\n/g, ' ').replace(/,/g, "")

                    results.push({
                        'href': href,
                        'img': img,
                        'title': title,
                        'desc': desc
                    });

                }

                console.log('listing', pp);
                getListing(pp+1);
    });
}

// getListing(1);
results = require('./' + arg)
deepGet()

/*
 * Create new view port
 */
// function createPage() {
//     var p = require('webpage').create();
//     p.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36';
//     p.viewportSize = {
//         width: 1024,
//         height: 1300
//     };
//     return p;
// }

// function walk(url, p) {
//     console.log('walking', p)
//     var page = createPage();
//     page.open(url + "?p=" + p, function(status) {

//         var bresults = page.evaluate(function() {
//             var B = $(".box_pinterest").parent();
//             var results = [];
//             for(var i = 0 ; i  < B.length ; i++){
//                 var href = $(B[i]).attr("href");
//             }

//             return B;
//         });


//         console.log(p, "/", 256, status);
//         console.log(bresults);
//         setTimeout(function() {
//             walk(URL, p + 1)
//         }, 1000);
//     });
// }

// walk(URL, 1);
