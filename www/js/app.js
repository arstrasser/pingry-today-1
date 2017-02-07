// Ionic Pingry App

// angular.module is a global place for creating, registering and retrieving Angular modules


//PLUGINS:
/*
AppVersion
Datepicker
Device
Dialogs
Notification
InAppBrowser
Splashscreen
DeviceFeedback
Whitelist
Toast
LocalNotification

Application Events
StatusBar
Keyboard
*/

angular.module('app', ['ionic', 'ionic.native', 'ngCordova', 'app.routes', 'app.controllers', 'app.services', 'app.directives'])

.run(function($ionicPlatform, $cordovaToast, $ionicHistory, $window, LetterDay, Schedule, Settings, $cordovaAppVersion, $q, $cordovaDeviceFeedback) {
  $ionicPlatform.ready(function() {
    //Override the cordova toast functionality if on computer or unsupported platform
    if($window.plugins == undefined){
      $cordovaToast.show = function(msg){console.log(msg);}
      $cordovaToast.showShortBottom = function(msg){console.log(msg);}
      $cordovaToast.showWithOptions = function(obj){console.log(obj.message);}
      $cordovaAppVersion.getVersionNumber = function(){return $q.when("0.0.0")};
      $cordovaDeviceFeedback.haptic = function(a){console.log("bzzt");};
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

    LetterDay.refresh();
    Schedule.refresh();

  });
});
