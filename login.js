var page = require('webpage').create();
page.settings.userAgent = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/48.0.2564.82 Safari/537.36';

var userInfo = require('./config');

function wait(f){
    setTimeout(f, 1500);
}

function typeKeys(page, string){
  for(var i = 0; i < string.length; i++){
    page.sendEvent('keypress', string[i], null, null, 0);
  }

}

page.viewportSize = {
  width: 600,
  height: 800
};
var url = 'https://www.instagram.com';
page.open(url, function (status) {
  //Find the location of login button
  var linkLoc = page.evaluate(function() {
      return $("._k6cv7").offset();
  });

  page.sendEvent('click', linkLoc.left, linkLoc.top);

  wait(page.render('screens/login.png'));

  //Find username field and password fields
  var UserNameLoc = page.evaluate(function() {
     return $("input[name=username]").offset();
  });
  var PasswordLoc = page.evaluate(function() {
     return $("input[name=password]").offset();
  });
  var ButtonLoc = page.evaluate(function() {
     return $("button").offset();
  });


  page.sendEvent('click', UserNameLoc.left, UserNameLoc.top);
  typeKeys(page, userInfo.username);
  page.sendEvent('click', PasswordLoc.left, PasswordLoc.top);
  typeKeys(page, userInfo.password);

  wait(page.render('screens/typing_user.png'));
  page.sendEvent('click', ButtonLoc.left, ButtonLoc.top);

  setTimeout(function(){
    phantom.exit();
  }, 2000);



});
