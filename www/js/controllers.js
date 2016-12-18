var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

var $cordovaToast;

angular.module('app.controllers', [])

.controller("MenuCtrl", function($scope, $cordovaInAppBrowser){
  $scope.openForeignLink = function(addr){
    var browse = new $cordovaInAppBrowser(addr, '_system');
  }
})

.controller("HomeCtrl", function($scope, $cordovaInAppBrowser, $http, rssFeed){
  $scope.$on("$ionicView.enter", function(){
    $scope.resetMessages();
  });

  $scope.refresh = function(){
    $scope.resetMessages();
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
    $scope.resetMessages();
    var obj = localStorage.getItem("newsRSS");
    if(obj != undefined){
      $scope.rss = JSON.parse(obj);
    }else{
      $scope.resetMessages();
      $scope.addError("Couldn't connect to the internet!");
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

  $scope.addError = function(msg){
    var elem = document.createElement("b");
    elem.setAttribute("class", "error");
    elem.innerHTML = msg;
    document.getElementById("news-messages").appendChild(elem);
  }

  $scope.resetMessages = function(){
    document.getElementById("news-messages").innerHTML = "";
  }

  $scope.addSuccess = function(msg){
    var elem = document.createElement("b");
    elem.setAttribute("class", "success");
    elem.innerHTML = msg;
    document.getElementById("news-messages").appendChild(elem);
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
    $scope.resetMessages();
    var obj = localStorage.getItem("newsRSS");
    if(obj != undefined && $stateParams.articleId != ""){
      $scope.art = JSON.parse(obj)[$stateParams.articleId];
      document.getElementById("article-content").innerHTML = rssFeed.parseRawDescription($scope.art.rawDescription);
    }else{
      $scope.resetMessages();
      $scope.addError("Couldn't find that article!");
    }
  };

  $scope.addError = function(msg){
    var elem = document.createElement("b");
    elem.setAttribute("class", "error");
    elem.innerHTML = msg;
    document.getElementById("art-messages").appendChild(elem);
  }

  $scope.resetMessages = function(){
    document.getElementById("art-messages").innerHTML = "";
  }

  $scope.addSuccess = function(msg){
    var elem = document.createElement("b");
    elem.setAttribute("class", "success");
    elem.innerHTML = msg;
    document.getElementById("art-messages").appendChild(elem);
  };
})

.controller('ScheduleCtrl', function($scope, $cordovaToast, $cordovaNetwork, Schedule, LetterDay, MySchedule, $ionicSideMenuDelegate, $ionicGesture) {
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
    console.log("refreshing");
    $scope.classes = [];
    $scope.letter = LetterDay.letter();
    console.log($scope.letter);
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
        console.log($cordovaNetwork.connection);
          if($cordovaNetwork.connection != "none"){
            $cordovaToast.show("Schedule is refreshing...", "long", "bottom");
          }
          else{
            $cordovaToast.show("Please connect to the internet", "long", "bottom");
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

.controller("AnnouncementsCtrl", function($scope, $cordovaInAppBrowser, $http, rssFeed){
  $scope.$on("$ionicView.enter", function(){
    $scope.resetMessages();
  });

  $scope.openSystemLink = function(url){
    var browse = new $cordovaInAppBrowser(url, '_system', null)
  }

  $scope.refresh = function(){
    $scope.resetMessages();
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
    $scope.resetMessages();
    var obj = localStorage.getItem("announceRSS");
    if(obj != undefined){
      $scope.rss = JSON.parse(obj);
    }else{
      $scope.resetMessages();
      $scope.addError("Couldn't connect to the internet!");
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

  $scope.addError = function(msg){
    var elem = document.createElement("b");
    elem.setAttribute("class", "error");
    elem.innerHTML = msg;
    document.getElementById("announce-messages").appendChild(elem);
  }

  $scope.resetMessages = function(){
    document.getElementById("announce-messages").innerHTML = "";
  }

  $scope.addSuccess = function(msg){
    var elem = document.createElement("b");
    elem.setAttribute("class", "success");
    elem.innerHTML = msg;
    document.getElementById("announce-messages").appendChild(elem);
  }



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

.controller('SettingsCtrl', function($scope, $cordovaToast, MySchedule, Schedule, LetterDay) {
  var refreshEnable = true;
  $scope.forceRefresh = function(){
    if(refreshEnable){
      $cordovaToast.show("Refreshing...", "short", "bottom");
      refreshEnable = false;
      Schedule.refresh().then(function(){
        refreshEnable = true;
        $cordovaToast.show("Complete!", "short", "bottom");
      }, function(){
        refreshEnable = true;
        $cordovaToast.show("Error...", "short", "bottom");
      });
    }
  }

  $scope.letterRefresh = function(){
    if(refreshEnable){
      $cordovaToast.show("Refreshing...", "short", "bottom");
      refreshEnable = false;
      LetterDay.refresh().then(function(){
        refreshEnable = true;
        $cordovaToast.show("Complete!", "short", "bottom");
      }, function(){
        refreshEnable = true;
        $cordovaToast.show("Error...", "short", "bottom");
      });
    }
  }

  $scope.setScheduleType = function(newType){
    Schedule.setCurrentType(newType);
    refresh();
  }

  $scope.scheduleTypes = Schedule.getTypes();
  $scope.scheduleType = Schedule.getCurrentType();

})

.controller('AddClassCtrl', function($scope, MySchedule, $cordovaToast, $stateParams, $ionicHistory) {
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
      $cordovaToast.show("Class added!", "short", "bottom");
      MySchedule.save();
      $ionicHistory.goBack();
      return true;
    }
    $cordovaToast.show("Error, class wasn't added", "long", "bottom");
  }

  $scope.update = function(cls){
    if($scope.isValid(cls)){
      MySchedule.removeClassById($stateParams.clsType, $stateParams.clsId);
      MySchedule.addClass(cls)
      $cordovaToast.show("Updated!", "short", "bottom");
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

.controller("AboutCtrl", function($scope, $cordovaAppVersion){
  $scope.appVersion = "Loading...";
  $cordovaAppVersion.getVersionNumber().then(function (version) {
    $scope.appVersion = version;
  });
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
    $scope.rem = Notifications.get($stateParams.reminderId);
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
});