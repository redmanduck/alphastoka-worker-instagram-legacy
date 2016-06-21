var fs = require('fs');
var MAX_DEPTH = 3;
var IMAGE_SAMPLE = 1;
var QUEUE_NAME = "nightking";
var MLAB_API_KEY = "ucQuRaICqjzsxmtTVyuXp3dxzNheiKmy";
var MLAB_TEMP_COLLECTION = "raw"
/*
 * Create new view port
 */
function createPage() {
    var p = require('webpage').create();
    p.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36';
    p.viewportSize = {
        width: 1024,
        height: 1300
    };
    return p;
}

var lodis = {};

function waitFor(testFx, onReady, timeOutMillis) {
    var maxtimeOutMillis = timeOutMillis ? timeOutMillis : 3000, //< Default Max Timout is 3s
        start = new Date().getTime(),
        condition = false,
        interval = setInterval(function() {
            if ( (new Date().getTime() - start < maxtimeOutMillis) && !condition ) {
                // If not time-out yet and condition not yet fulfilled
                condition = (typeof(testFx) === "string" ? eval(testFx) : testFx()); //< defensive code
            } else {
                if(!condition) {
                    // If condition still not fulfilled (timeout but condition is 'false')
                    console.log("'waitFor()' timeout");
                    phantom.exit(1);
                } else {
                    // Condition fulfilled (timeout and/or condition is 'true')
                    console.log("'waitFor()' finished in " + (new Date().getTime() - start) + "ms.");
                    typeof(onReady) === "string" ? eval(onReady) : onReady(); //< Do what it's supposed to do once the condition is fulfilled
                    clearInterval(interval); //< Stop this interval
                }
            }
        }, 250); //< repeat check every 250ms
};

//List of nodes to start from (root nodes)
//becuase seedList will grow with rabbit mq
// var seedList =  [{ username: 'ssabpisa', depth : 0}];

//Colection result
var collection = {};

function typeKeys(page, string) {
    for (var i = 0; i < string.length; i++) {
        page.sendEvent('keypress', string[i], null, null, 0);
    }
}

function getImage(index, page) {
    return page.evaluate(function(index) {
        return $("#pImage_" + index).parent().parent().parent().attr('href')
    }, index);
}

//Recursive walk function
function walk(user, page) {

    console.log("Stalking", user.username, "depth", user.depth, user);
    if (page) page.close();
    page = createPage();
    var url = 'https://www.instagram.com/' + user.username;

    page.open(url, function(status) {

        console.log("[" + status + "]");

        page.injectJs('scripts/sockjs-0.3.js');
        page.injectJs('scripts/stomp.js');

        page.onCallback = function(data) {
          console.log('CALLBACK: ' + JSON.stringify(data));
        };

        //RabbitMQ broker connection
        page.evaluate(function(QUEUE_NAME) {
            var ws = new SockJS('http://127.0.0.1:15674/stomp');
            window.client = Stomp.over(ws);

            var on_connect = function() {
                window.callPhantom({ evt: 'connected' });
                var headers = { 'prefetch-count' : 1, 'ack': 'client' };
                window.client.subscribe("/amq/queue/" + QUEUE_NAME, function(d) {
                    window.callPhantom({ evt: 'subscribe'});
                    // d.ack();
                    window.msg = d;
                }, headers);
            };

            var on_error =  function() {
                window.callPhantom({ evt: 'error' });
            };

            window.client.connect('guest', 'guest', on_connect, on_error, '/');

        }, QUEUE_NAME);


        //things we can do immediately
        var head = page.evaluate(function() {
            return $("header").text()
        });

        var rawData = {
            user: user,
            images: [],
            comments: [],
            liketimes: []
        };

        //Find "fllowing" button which will bring up followign list
        var followingLink = page.evaluate(function(user) {
            return $($("header ul a")[1]).offset();
        }, user);
        page.sendEvent('click', followingLink.left, followingLink.top);

        //Collect followers (w)
        setTimeout(function() {
            //get each item
            var followingItems = page.evaluate(function(user) {
                var L = document.querySelectorAll("._mmgca a");
                var l = [];
                for (var x = 0; x < L.length; x++) {
                    l.push({
                        username: L[x].text,
                        depth: (user.depth + 1)
                    });
                }
                return l;
            }, user);

            if (user.depth < MAX_DEPTH) {
                // seedList = seedList.concat(followingItems);
                page.evaluate(function(followingItems, QUEUE_NAME){
                    for(var j = 0 ;j<followingItems.length; j++){
                        var toCommander = followingItems[j];
                        if(lodis[user.username] === true){
                            console.log("Lodis caught ", user.username, " already");
                        }else{
                            window.client.send("/amq/queue/" + QUEUE_NAME, {priority: 9},  JSON.stringify(toCommander));
                        }

                    }
                }, followingItems, QUEUE_NAME);
            } else {
                console.log("Max depth reached, will not go deeper.");
            }

            rawData.followers = followingItems;
            rawData.header = head;

            page.render('data/' + user.username + '_1.png');

        }, 1500); //wait this long for follower list to load


        //List of nth position of images to get
        var Nlist = [];
        for (var i = 0; i <= IMAGE_SAMPLE - 1; i++) {
            Nlist.push(i);
        }

        //Download Nth Image
        function getNthImage(n, done) {

            var nthImageUri = getImage(n, page);

            var subPage = createPage();
            var surl = 'https://www.instagram.com' + nthImageUri;

            console.log('going to ', surl)
            subPage.open(surl, function(status) {
                setTimeout(function() {
                        //attempt to load more comments first
                        var loadMoreComments = subPage.evaluate(function() {
                            return $("article button")[1];
                        });
                        if (loadMoreComments)
                            subPage.sendEvent('click', loadMoreComments.left, loadMoreComments.top);
                        //Wait for page to load results
                        setTimeout(function() {
                            if (loadMoreComments) {
                                //find comments section
                                var comments = subPage.evaluate(function() {
                                    return $("._123ym").text()
                                });

                                //find likes section
                                var likesTime = subPage.evaluate(function() {
                                    return $("._d39wz").text()
                                });

                                var avatar = subPage.evaluate(function() {
                                    var img = $("img")[0];
                                    return {
                                        alt: $(img).attr('alt'),
                                        src: $(img).attr('src')
                                    }
                                });

                                var imageData = subPage.evaluate(function() {
                                    var img = $("img[id*='pImage']");
                                    return {
                                        alt: $(img).attr('alt'),
                                        src: $(img).attr('src')
                                    }
                                });

                                rawData.images.push(avatar);
                                rawData.images.push(imageData);
                                rawData.comments.push(comments);
                                rawData.liketimes.push(likesTime);

                                //Save
                                subPage.render('data/' + user.username + '_img' + n + '.png');
                                subPage.close();
                            }

                            //save collection
                            if (nthImageUri !== null) collection[user.username] = rawData;
                            var next = Nlist.shift();
                            if (!next) {
                                done();
                            } else {
                                getNthImage(next, done);
                            }

                        }, 1000); //wait for load result

                    }, 1000) //wait for page load html


            });
        }

        setTimeout(function() {
            //done is called when Nlist is exhausted
            var done = function() {
                // var next = null;
                // do {
                //     next = seedList.shift();
                // } while (next in collection);

                var next = page.evaluate(function(QUEUE_NAME) {
                    if(!window.msg){
                        window.client.disconnect();
                        return null;
                    }
                    var x = JSON.parse(window.msg.body);
                    window.msg.ack();
                    window.client.disconnect();
                    return x;
                }, QUEUE_NAME);

                console.log(next);

                //save profile data
                // rawData.
                page.evaluate(function(rawData, MLAB_API_KEY, MLAB_TEMP_COLLECTION){
                    window._saveDone = false;
                    $.ajax( { url: "https://api.mlab.com/api/1/databases/alphastoka/collections/" +
                                    MLAB_TEMP_COLLECTION + "/?apiKey=" + MLAB_API_KEY,
                              data: JSON.stringify( rawData ),
                              type: "POST",
                              success: function(){
                                window._saveDone = true;
                              },
                              contentType: "application/json" } );

                }, rawData, MLAB_API_KEY, MLAB_TEMP_COLLECTION);


                waitFor(function check(){
                    return page.evaluate(function(){
                        return window._saveDone;
                    });
                }, function onReady(){
                    if (!next) {
                        console.log('end of Q');
                        phantom.exit();
                    } else {
                        lodis[user.username] = true;
                        walk(next, page);
                    }
                }, 6000); // 6 seconds maximum timeout


            }

            getNthImage(Nlist.shift(), done);
        }, 1500); //find nth image

    }); //main page open
} //end of walk

//start with dummy user with no following
walk({ username: 'gaysorn' , depth: 0 });
