//popular in thailand
STARTING_POINT = "https://www.youtube.com/playlist?list=PLdIIlX5liCIrtDfmACBd9ik4kQryWkH6R";

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

