var mongoose = require('mongoose');
var Schema = mongoose.Schema;
mongoose.connect('mongodb://localhost/alphastoka');

var collectionData = require('./data/collection.json')

var Profile = mongoose.model('Profile', new Schema({
    any : {}
}, {strict: false}));

function getEmail(head){

}

function getPhoneNumber(head){

}

function getLanguage(object){
    //Look at all heads and comments
}

function getCategory(images){
    //Look at images and infer via watson
}

function getFollowerCount(head){
    var re = /([0-9]+[km]?)\sfollowers/i;
          var cc = (head + "").match(re)
          if(!cc || cc.length < 2){
            console.log(head)
            return 0;
          }

    if(cc[1].indexOf('m') > 0){
        return Number(cc[1].substr(0, cc[1].length - 1))*(1000000);
    }

    if(cc[1].indexOf('k') > 0){
        return Number(cc[1].substr(0, cc[1].length - 1))*(1000);
    }

    return Number(cc[1]);
}

for(var username in collectionData){
    var obj = collectionData[username];
    obj.follower_count = getFollowerCount(obj.header);
    var rprofile = new Profile(obj);
    rprofile.save(function(err){
        if (err) {
            console.log('error!');
        }else{
            console.log("Passed");
        }
    });
}

