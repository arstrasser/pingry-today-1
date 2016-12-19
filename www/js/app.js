// Ionic Starter App

// angular.module is a global place for creating, registering and retrieving Angular modules
// 'starter' is the name of this angular module example (also set in a <body> attribute in index.html)
// the 2nd parameter is an array of 'requires'
// 'starter.services' is found in services.js
// 'starter.controllers' is found in controllers.js


angular.module('app', ['ionic', 'ionic.native', 'ngCordova', 'app.routes', 'app.controllers', 'app.services', 'app.directives'])
.config(function($ionicConfigProvider)   {
    if (ionic.Platform.isAndroid()){
      $ionicConfigProvider.scrolling.jsScrolling(true);
    }
})

.config(function($sceDelegateProvider){
  $sceDelegateProvider.resourceUrlWhitelist([
    'self',
    'http://www.sagedining.com/menus/pingry'
  ]);
})

.run(function($ionicPlatform, $cordovaToast, $ionicHistory, LetterDay, Schedule, Settings) {
  $ionicPlatform.ready(function() {
    /*
    try{
      $cordovaToast.show("test", "bottom", 10);
    }catch(e){
      //Override the cordova toast functionality if on computer or unsupported platform
      $cordovaToast.show = function(msg){console.log(msg);}
      $cordovaToast.showShortBottom = function(msg){console.log(msg);}
      $cordovaToast.showWithOptions = function(obj){console.log(obj.message);}
    }
    */
    // Hide the accessory bar by default (remove this to show the accessory bar above the keyboard
    // for form inputs)
    if (window.cordova && window.cordova.plugins && window.cordova.plugins.Keyboard) {
      cordova.plugins.Keyboard.hideKeyboardAccessoryBar(true);
      cordova.plugins.Keyboard.disableScroll(true);
    }
    if (window.StatusBar) {
      // org.apache.cordova.statusbar required
      StatusBar.styleDefault();
    }
  });
});
