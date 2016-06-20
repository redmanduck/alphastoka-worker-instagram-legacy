var fs = require('fs');
var MAX_DEPTH = 2;
var IMAGE_SAMPLE = 2;

function createPage() {
    var p = require('webpage').create();
    p.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36';
    p.viewportSize = {
        width: 1024,
        height: 1300
    };
    return p;
}


var seedList = [{
    username: 'namwan_raknapak',
    depth: 0
}, {
    username: 'yummygallery_bkk',
    depth: 0
}, {
    username: 'woody_chai',
    depth: 0
}, {
    username: 'pimtha',
    depth: 0
}, {
    username: 'khimjularat',
    depth: 0
}];

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

function walk(user, page) {

    console.log("Stalking", user.username,"depth" , user.depth, " remaining: ", seedList.length, " collected: ", Object.keys(collection).length);
    if (page) page.close();
    page = createPage();
    var url = 'https://www.instagram.com/' + user.username;
    page.open(url, function(status) {
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
            return $("a[href*='/" + user.username + "/following']").offset();
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
                seedList = seedList.concat(followingItems);
            } else {
                console.log("Max depth reached.");
            }

            rawData.followers = followingItems;
            rawData.header = head;

            page.render('data/' + user.username + '_1.png');

        }, 1500);//wait this long for follower list to load

        // var imageLk0 = getImage(0, page);

        //List of nth position of images to get
        var Nlist = [];
        for (var i = 0; i <= IMAGE_SAMPLE - 1; i++) {
            Nlist.push(i);
        }

        function getNthImage(n, done) {

            var nthImageUri = getImage(Nlist.shift(), page);

            var subPage = createPage();
            var surl = 'https://www.instagram.com' + nthImageUri;

            console.log('going to ', surl)
            subPage.open(surl, function(status) {
                setTimeout(function() {
                        //attempt to load more comments first
                        var loadMoreComments = subPage.evaluate(function() {
                            return $("article button")[1];
                        });
                        if(loadMoreComments)
                            subPage.sendEvent('click', loadMoreComments.left, loadMoreComments.top);
                        //Wait for page to load results
                        setTimeout(function() {
                            if(loadMoreComments){
                                //find comments section
                                var comments = subPage.evaluate(function() {
                                    return $("._123ym").text()
                                });

                                //find likes section
                                var likesTime = subPage.evaluate(function() {
                                    return $("._d39wz").text()
                                });

                                var avatar = subPage.evaluate(function(){
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
                            if(nthImageUri !== null) collection[user.username] = rawData;
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
                var next = null;
                do{
                    next = seedList.shift();
                }while(next in collection);

                if (!next) {
                    console.log('end of Q');
                    fs.write('data/collection.json', JSON.stringify(collection), 'w');
                    phantom.exit();
                } else {
                    walk(next, page);
                }
            }

            getNthImage(Nlist.shift(), done);
        }, 1500); //find nth image

    }); //main page open
} //end of walk

walk(seedList.shift());
