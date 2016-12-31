// Ionic Pingry App

// angular.module is a global place for creating, registering and retrieving Angular modules


angular.module('app', ['ionic', 'ionic.native', 'ngCordova', 'app.routes', 'app.controllers', 'app.services', 'app.directives'])

.run(function($ionicPlatform, $cordovaToast, $ionicHistory, $window, LetterDay, Schedule, Settings) {
  $ionicPlatform.ready(function() {
    //Override the cordova toast functionality if on computer or unsupported platform
    if($window.plugins == undefined){
      $cordovaToast.show = function(msg){console.log(msg);}
      $cordovaToast.showShortBottom = function(msg){console.log(msg);}
      $cordovaToast.showWithOptions = function(obj){console.log(obj.message);}
    }

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
