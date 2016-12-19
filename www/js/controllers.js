var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

angular.module('app.controllers', ['ionic', 'ionic.native', 'ngCordova'])

.controller("MenuCtrl", function($scope, $cordovaInAppBrowser){
  $scope.openForeignLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_system');
  }

  $scope.openLocalLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_self');
  }
})

.controller("HomeCtrl", function($scope, $http, rssFeed, Messages){

  $scope.refresh = function(){
    $http.get("http://www.pingry.org/rss.cfm?news=14").then(function(data){
      var obj = rssFeed.parseXML(data.data);
      localStorage.setItem("newsRSS", JSON.stringify(obj));
      localStorage.setItem("newsRSSRefreshTime", Date.now());
      $scope.rss = obj;
    }, $scope.localRefresh).finally(function(){
       $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.localRefresh = function(){
    var obj = localStorage.getItem("newsRSS");
    if(obj != undefined){
      $scope.rss = JSON.parse(obj);
    }else{
      Messages.showError("Couldn't connect to the internet!");
    }
  };
  

  $scope.toggleHide = function(idName){
    var cur = document.getElementById("rss-desc-"+idName);
    if(cur.style.display == "none"){
      cur.style.display = "block";
    }else{
      cur.style.display = "none";
    }
    cur = document.getElementById("rss-open-"+idName);
    if(cur.style.display == "none"){
      cur.style.display = "inline";
    }else{
      cur.style.display = "none";
    }
    cur = document.getElementById("rss-close-"+idName);
    if(cur.style.display == "none"){
      cur.style.display = "inline";
    }else{
      cur.style.display = "none";
    }
  };

  var lastRefresh = localStorage.getItem("pingryNewsRSSRefreshTime");
  if(lastRefresh != null && lastRefresh != ""){
    if(parseInt(lastRefresh) + 360000 < Date.now()){
      $scope.refresh();
    }else{
      $scope.localRefresh();
    }
  }else{
    $scope.refresh();
  }

})

.controller('ArticleCtrl', function($scope, $stateParams, rssFeed){
  $scope.$on('$ionicView.enter', function(){$scope.localRefresh();})

  $scope.localRefresh = function(){
    var obj = localStorage.getItem("newsRSS");
    if(obj != undefined && $stateParams.articleId != ""){
      $scope.art = JSON.parse(obj)[$stateParams.articleId];
      document.getElementById("article-content").innerHTML = rssFeed.parseRawDescription($scope.art.rawDescription);
    }else{
      Messages.showError("Couldn't find that article!");
    }
  };
})

.controller('ScheduleCtrl', function($scope, $cordovaNetwork, Schedule, LetterDay, MySchedule, $ionicSideMenuDelegate, $ionicGesture, Messages, $cordovaDatePicker) {
  var elem = angular.element(document.querySelector("#scheduleContent"));
  $ionicGesture.on("swipeleft", $scope.nextDay, elem);
  $ionicGesture.on("swiperight", $scope.prevDay, elem);
  
  $scope.$on('$ionicView.enter', function(){$ionicSideMenuDelegate.canDragContent(false);})
  $scope.$on('$ionicView.leave', function(){$ionicSideMenuDelegate.canDragContent(true);});

  var curDay = new Date();
  $scope.letter = "";
  $scope.periodList = [];

  window.setInterval(
    function(){
      if(Schedule.wasChanged() || MySchedule.isChanged() || LetterDay.isChanged()){
        refresh();
        Schedule.setChanged(false);
        LetterDay.setChanged(false);
      }
    },
    1000
  );

  function formatDate(d){
    var now = new Date();
    if(d.getDate() == now.getDate() && d.getMonth() == now.getMonth() && d.getYear() == now.getYear()){
      return "Today"
    }
    var year = d.getFullYear();
    var month = monthNames[d.getMonth()];
    var day = d.getDate();
    var weekday = weekDays[d.getDay()];
    return weekday+", "+month+" "+day+" "+year;
  }

  function refresh(){
    $scope.classes = [];
    $scope.letter = LetterDay.letter();
    if($scope.letter !== undefined && $scope.letter.length == 1){
      for(i = 0; i < Schedule.getToday().length; i++){
        var tClass = Schedule.get(i);
        if(tClass.type == "swap"){
          if(!MySchedule.get("block", LetterDay.classes()[2]) || MySchedule.get("block", LetterDay.classes()[2]).firstLunch){
            tClass = tClass.options[0];
          }else{
            tClass = tClass.options[1];
          }
        }
        tClass.color = undefined;
        tClass.dispName = MySchedule.getScheduledClassName(MySchedule, tClass);
        tClass.dispTime = tClass.dispTime = tClass.startTime+" - "+tClass.endTime;
        if(tClass.color === undefined){
          if(tClass.type == "block"){
            tClass.color = "#fbb";
          }else if(tClass.type == "flex"){
            tClass.color = "#fff";
          }else if(tClass.type == "CT"){
            tClass.color = "#6ff";
          }else if(tClass.type == "Lunch"){
            tClass.color = "#ff3";
          }else if(tClass.type == "CP"){
            tClass.color = "#fb6";
          }else {
            tClass.color = "#ddd";
          }
        }
        $scope.classes.push(tClass);
      }
      var c = "";
      for(i=0; i < LetterDay.classes().length; i++){
        c+=LetterDay.classes()[i];
        if(i+1 < LetterDay.classes().length){
          c+="-";
        }
      }
      $scope.periodList = c;
    }else{
      if($scope.letter == "empty"){
        if($cordovaNetwork.connection == "none" || $cordovaNetwork.connection == undefined){
          Messages.showError("Please connect to the internet!");
        }
        else{
          Messages.showNormal("Refreshing...");
        }
      }
      $scope.letter = "";
    }
    $scope.displayDate = formatDate(curDay);
  }

  function updateDate(){
    LetterDay.changeDay(curDay);
    Schedule.changeDay(curDay);
    refresh();
  }

  refresh();

  $scope.$on('$ionicView.enter', function(){
    curDay = new Date();
    updateDate();
    if(MySchedule.isChanged()){
      refresh();
      MySchedule.setChanged(false);
    }
  })

  $scope.resetDate = function(){
    curDay = new Date();
    updateDate();
  }

  $scope.openDatePicker = function(){
    $cordovaDatePicker.show({
      mode:"date",
      date:curDay,
    }).then(function(date){
      curDay = date;
      updateDate();
    });
  }

  $scope.formatTime = function(str){
    hour = parseInt(str.substring(0,2));
    minute = parseInt(str.substring(3,5));
    if(hour > 12){
      hour -= 12;
    }
    return hour + ":" + (minute<10?"0":"") + minute;
  }

  $scope.nextDay = function(){
    curDay.setDate(curDay.getDate()+1);
    updateDate();
  }

  $scope.prevDay = function(){
    curDay.setDate(curDay.getDate()-1);
    updateDate();
  }
})

.controller('LunchCtrl', function($scope, $ionicGesture){
  var element = angular.element(document.getElementById("lunch-menu-zoom"));

  $ionicGesture.on('pinch', function(e){
    $scope.zoom = 
    element.style.transform = "scale("+e.gesture.scale+","+e.gesture.scale+")";
    console.log(e.gesture.scale)
  }, element);
})

.controller("AnnouncementsCtrl", function($scope, $cordovaInAppBrowser, $http, rssFeed, Messages){
  $scope.openSystemLink = function(url){
    $cordovaInAppBrowser.open(url, '_system')
  }

  $scope.refresh = function(){
    $http.get("http://www.pingry.org/rss.cfm?news=16").then(function(data){
      var obj = rssFeed.parseXML(data.data);
      localStorage.setItem("announceRSS", JSON.stringify(obj));
      localStorage.setItem("announceRSSRefreshTime", Date.now());
      $scope.rss = obj;
    }, $scope.localRefresh).finally(function(){
       $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.localRefresh = function(){
    var obj = localStorage.getItem("announceRSS");
    if(obj != undefined){
      $scope.rss = JSON.parse(obj);
    }else{
      Messages.showError("Couldn't connect to the internet!");
    }
  };

  $scope.toggleHide = function(idName){
    var cur = document.getElementById("rss-desc-"+idName);
    if(cur.style.display == "none"){
      cur.style.display = "block";
    }else{
      cur.style.display = "none";
    }
    cur = document.getElementById("rss-open-"+idName);
    if(cur.style.display == "none"){
      cur.style.display = "inline";
    }else{
      cur.style.display = "none";
    }
    cur = document.getElementById("rss-close-"+idName);
    if(cur.style.display == "none"){
      cur.style.display = "inline";
    }else{
      cur.style.display = "none";
    }
  };


  var lastRefresh = localStorage.getItem("pingryRSSRefreshTime");
  if(lastRefresh != null && lastRefresh != ""){
    if(parseInt(lastRefresh) + 360000 < Date.now()){
      $scope.refresh();
    }else{
      $scope.localRefresh();
    }
  }else{
    $scope.refresh();
  }

})

.controller('SettingsCtrl', function($scope, MySchedule, Schedule, LetterDay, Messages, Settings) {
  var refreshEnable = true;
  $scope.forceRefresh = function(){
    if(refreshEnable){
      Messages.showNormal("Refreshing...");
      refreshEnable = false;
      Schedule.refresh().then(function(){
        refreshEnable = true;
        Messages.showSuccess("Complete!");
      }, function(){
        refreshEnable = true;
        Messages.showError("Couldn't connect");
      });
    }
  }

  $scope.letterRefresh = function(){
    if(refreshEnable){
      Messages.showNormal("Refreshing...");
      refreshEnable = false;
      LetterDay.refresh().then(function(){
        refreshEnable = true;
        Messages.showNormal("Complete!");
      }, function(){
        refreshEnable = true;
        Messages.showError("Couldn't connect");
      });
    }
  }

  $scope.setScheduleType = function(newType){
    if(newType == "-1"){
      Schedule.setOverride(false);
    }
    else {
      Schedule.setOverride(true);
      Schedule.setCurrentType(parseInt(newType));
    }
  }

  $scope.addExtra = function(option){
    if(!Settings.getExtraOptions().includes(option)){
      Settings.addExtraOption(option);
    }
  }

  $scope.removeExtra = function(option){
    if(Settings.getExtraOptions().includes(option)){
      Settings.removeExtraOption(option);
    }
  }

  $scope.superMode = Settings.getSuperMode();
  $scope.hackerTheme = Settings.getExtraOptions().includes("hackerTheme");
  $scope.overrideSett = "-1";

  $scope.scheduleTypes = Schedule.getTypes();
  $scope.scheduleType = Schedule.getCurrentType();

})

.controller('AddClassCtrl', function($scope, MySchedule, $stateParams, $ionicHistory, Messages) {
  $scope.colors = ["#DC143C", "#FF3E96", "#EE00EE", "#4876FF", "#8EE5EE", "#00EE76", "#71C671", "#EEEE00", "#EE9A00", "#CDB7B5", "#666"];

  $scope.resetView = function(){
    if(!modify){
      $scope.cls = {"name":"", "type":"", "firstLunch":false, "takesFlex":false, "firstFlex":true, "timeType":"", "time":{"day":"", "id":false}};
      while(document.getElementsByClassName("selected-color") > 0){
        angular.element(document.getElementsByClassName("selected-color")[0]).removeClass("selected-color");
      }
    }
  }

  $scope.lunchHelp = function(e){
    window.alert('First lunch is for:\nScience, Health, Art, Math, and Economic Classes');
  }

  $scope.updateColorSelect = function(i){
    if(document.getElementsByClassName("selected-color").length > 0){
      angular.element(document.getElementsByClassName("selected-color")[0]).removeClass("selected-color");
    }
    angular.element(document.getElementById("color-"+i)).addClass("selected-color");
  }

  $scope.delete = function(){
    if(window.confirm("Delete this class?")){
      MySchedule.removeClassById($stateParams.clsType, $stateParams.clsId);
      $ionicHistory.goBack();
    }
  }

  $scope.submit = function(cls){
    if($scope.isValid(cls)){
      MySchedule.addClass(cls);
      Messages.showNormal("Class added!");
      MySchedule.save();
      $ionicHistory.goBack();
      return true;
    }
    Messages.showError("Error, class wasn't added");
  }

  $scope.update = function(cls){
    if($scope.isValid(cls)){
      MySchedule.removeClassById($stateParams.clsType, $stateParams.clsId);
      MySchedule.addClass(cls)
      Messages.showSuccess("Updated!");
      MySchedule.save();
      $ionicHistory.goBack();
    }
  }

  $scope.isValid = function(cls){
    if(cls.name == ""){
      return false;
    }
    if(document.getElementsByClassName("selected-color").length < 1){
      return false;
    }
    if(cls.type == "block"){
      return cls.time.id != "" && cls.time.id != false && cls.time.id !== true;
    }
    if(cls.type == "flex" || cls.type == "CP"){
      return (cls.timeType == "letter" || cls.timeType == "weekday") && (cls.time.day !== "" && cls.time.day != undefined);
    }
    return false;
  }

  $scope.$on('$ionicView.enter', function(){$scope.resetView();})

  $scope.classType = "";
  var modify = false;
  if($stateParams.clsType == undefined || $stateParams.clsType == "" || MySchedule.getAll()[$stateParams.clsType] == undefined || MySchedule.getAll()[$stateParams.clsType].length <= parseInt($stateParams.clsId)){
    modify = false;
    $scope.cls = {"name":"", "type":"", "firstLunch":false, "takesFlex":false, "firstFlex":true, "timeType":"", "time":{"day":"", "id":false}};
  }else{
    modify = true;
    $scope.cls = JSON.parse(JSON.stringify(MySchedule.getAll()[$stateParams.clsType][parseInt($stateParams.clsId)]));
    $scope.cls.type = $stateParams.clsType;
    console.log($scope.cls)
  }
  $scope.modify = modify;
})

.controller("ClassManageCtrl", function($scope, MySchedule){
  $scope.$on('$ionicView.enter', function(){
    $scope.myclasses = MySchedule.getAll().block;
    console.log($scope.myclasses);
    $scope.myflexes = MySchedule.getAll().flex;
    $scope.mycps = MySchedule.getAll().CP;
  });
})

.controller("AboutCtrl", function($scope, $cordovaAppVersion, Settings, Messages){
  $scope.appVersion = "Loading...";
  /*$cordovaAppVersion.getVersionNumber().then(function (version) {
    $scope.appVersion = version;
  });*/

  $scope.$on("$ionicView.enter", function(){clicks = 0;})
  var clicks = 0;
  $scope.addClick = function(){
    clicks++;
    if(clicks == 15){
      Settings.setSuperMode(true);
      Messages.showNormal("Super Mode Activated!");
    }
  }
})

.controller("ReminderCtrl", function($scope, $cordovaDevice, Notifications){
  if($cordovaDevice.device !== undefined && $cordovaDevice.device.platform === "iOS") {
    window.plugin.notification.local.promptForPermission();
  }
  $scope.reminders = Notifications.getAll();
})

.controller("AddReminderCtrl", function($scope, $stateParams, $ionicHistory, Notifications, $cordovaDatePicker){

  var modify = false;
  if($stateParams.reminderId == undefined || $stateParams.reminderId == "" || Notifications.getAll().length < parseInt($stateParams.reminderId)){
    modify = false;
    $scope.rem = {"description":"", "time":{"day":"", "time":(new Date(1970, 0, 1, 8, 0, 0)), "date":(new Date())}};
  }else{
    modify = true;
    var rem = JSON.parse(JSON.stringify(Notifications.get($stateParams.reminderId)));
    rem.time.time = new Date(rem.time.time);
    rem.time.date = new Date(rem.time.date);
    $scope.rem = rem;
  }
  $scope.modify = modify;

  $scope.formatTime = function(time){
    var hours = time.getHours();
    var AM = true;
    if(hours > 12){
      hours -= 12;
      AM = false;
    }else if(hours == 12){
      AM = false;
    }else if(hours == 0){
      hours = 12;
    }
    return (hours) + ":" + ((time.getMinutes()<10)?"0":"")+time.getMinutes()+" "+(AM?"AM":"PM");
  }

  $scope.formatDate = function(date){
    return monthNames[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();
  }

  $scope.openDatePicker = function(curDate){
    $cordovaDatePicker.show({
      mode:"date",
      date:curDate,
    }).then(function(date){
      $scope.rem.time.date = date;
    })
  }

  $scope.openTimePicker = function(curDate){
    $cordovaDatePicker.show({
      mode:"time",
      date:curDate,
    }).then(function(date){
      $scope.rem.time.time = date;
    })
  }

  $scope.isValid = function(reminder){
    return reminder.type != '' && reminder.description != '' && (reminder.time.day != '' || reminder.type == 'single');
  }

  $scope.submit = function(reminder){
    console.log(reminder);
    if($scope.isValid(reminder)){
      Notifications.add(reminder);
      Notifications.update();
      $ionicHistory.goBack();
    }
  }

  $scope.update = function(reminder){
    if($scope.isValid(reminder)){
      Notifications.remove($stateParams.reminderId);
      Notifications.add(reminder);
      Notifications.update();
      $ionicHistory.goBack();
    }
  }

  $scope.delete = function(reminder){
    if(window.confirm("Delete this reminder?")){
      Notifications.remove($stateParams.reminderId);
      Notifications.update();
      $ionicHistory.goBack();
    }
  }
})

.controller("AthleticsCtrl", function($scope, $http, $cordovaInAppBrowser, icalFeed, Messages){
  function fixTime(hours, minutes){
    var AM = true;
    if(hours > 12){
      hours -= 12;
      AM = false;
    }else if(hours == 12){
      AM = false;
    }else if(hours == 0){
      hours = 12;
    }
    return (hours) + ":" + ((minutes<10)?"0":"")+minutes+" "+(AM?"AM":"PM");
  }

  $scope.formatTime = function(time){
    time = new Date(time);
    if(time.getHours() == 0 && time.getMinutes() == 0){
      return (time.getMonth()+1)+"/"+time.getDate()
    }
    return fixTime(time.getHours(), time.getMinutes())+" "+(time.getMonth()+1)+"/"+time.getDate();
  }

  $scope.openMapsLocation = function(loc){
    $cordovaInAppBrowser.open("http://maps.google.com/?q="+loc, '_system');
  }

  function resort(){
    var events = $scope.events;
    for(var i = 0; i < events.length; i++){
      //Time type event
      if(events[i].type == "time"){
        events[i].startTime = new Date(events[i].startTime);
        events[i].endTime = new Date(events[i].endTime);
        //If the event end time is less than the current time
        if(events[i].startTime.getTime() < Date.now()){
          //Remove the event
          events.splice(i,1);
          i--;
        }
      }
      //Day type event
      else if(events[i].type == "day"){
        events[i].time = new Date(events[i].time);
        //If the event's time is less than the current time and the event isn't today
        if(events[i].time.getTime() < Date.now() && dateToDayString(events[i]) != dateToDayString(new Date())){
          //Remove the event
          events.splice(i,1);
          i--;
        }
        else{
          events[i].startTime = events[i].time;
        }
      }
    }

    events.sort(
      function(a,b){
        if(a.startTime==b.startTime){
          return 0;
        }
        else{
          return a.startTime>b.startTime?1:-1
        }
      }
    );
    if(events.length > 15){
      events = events.slice(0,15);
    }
    for(var i = 0; i < events.length; i++){
      var title = events[i].title;
      var desc = title.substring(title.indexOf(" - ")+3);
      var title = title.substring(0, title.indexOf(" - "));
      console.log(title);
      console.log(desc);
      events[i].title = title;
      events[i].desc = desc;
    }
    $scope.events = events;
  }


  $scope.refresh = function(){
    $http.get("http://www.pingry.org/calendar/team_125.ics").then(function(data){
      var obj = icalFeed.parseCalendar(data.data);
      localStorage.setItem("athleticEvents", JSON.stringify(obj));
      localStorage.setItem("athleticEventsRefreshTime", Date.now());
      $scope.events = obj;
      resort();
    }, $scope.localRefresh).finally(function(){
       $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.localRefresh = function(){
    var obj = localStorage.getItem("athleticEvents");
    if(obj != undefined){
      $scope.events = JSON.parse(obj);
      resort();
    }else{
      Messages.showError("Couldn't connect to the internet!");
    }
  };

  var lastRefresh = localStorage.getItem("athleticEventsRefreshTime");
  if(lastRefresh != null && lastRefresh != ""){
    if(parseInt(lastRefresh) + 360000 < Date.now()){
      $scope.refresh();
    }else{
      $scope.localRefresh();
    }
  }else{
    $scope.refresh();
  }
});