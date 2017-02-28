var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function isLetter(str){
  return str == "A" || str == "B" || str == "C" || str == "D" || str == "E" || str == "F" || str == "G";
}

angular.module('app.controllers', ['ionic', 'ionic.native', 'ngCordova'])

//Controller for the side menu
.controller("MenuCtrl", function($scope, $cordovaInAppBrowser, Settings, $ionicModal, $timeout){
  $scope.openForeignLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_system');
  }

  $scope.openLocalLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_blank', {location:"yes",enableViewportScale:"yes"});
  }

  $scope.superMode = Settings.getSuperMode();
})

//Home screen controller (News feed)
.controller("NewsCtrl", function($scope, $http, $cordovaInAppBrowser, rssFeed, Messages, $q){
  //Open a link in another app
  $scope.openForeignLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_system');
  }

  function finalizeRefresh(allEvents){
    allEvents.sort(function(a, b){
      return parseInt(a.date) < parseInt(b.date) ? 1: -1;
    })
    //Store the object
    localStorage.setItem("newsRSS", JSON.stringify(allEvents));
    localStorage.setItem("newsRSSRefreshTime", Date.now());
    //Update the scope
    $scope.rss = allEvents;
    //Tells the refresher to stop spinning
    $scope.$broadcast('scroll.refreshComplete');
  }

  $scope.externalRefresh = function(errorCallback){
    var allEvents = [];
    var curDownloads = 2;
    var errors = false;
    //Currently pulling from the RSS feed of trending events (Easy to change)
    return $q.all([
      $http.get("http://www.pingry.org/rss.cfm?news=14").then(function(data){
        var obj = rssFeed.parseXML(data.data);
        allEvents = allEvents.concat(obj);
        return true;
      }, function(){
        return false;
      }),

      $http.get("http://www.pingry.org/rss.cfm?news=13").then(function(data){
        var obj = rssFeed.parseXML(data.data);
        allEvents = allEvents.concat(obj);
        return true;
      }, function(){
        return false;
      })
    ]).then(function(errors){
      if(!errors.includes(false)){
        finalizeRefresh(allEvents);
      }else{
        Messages.showError("Couldn't connect to the internet!");
        if(!!errorCallback){
          errorCallback();
        }
      }
    })
  }

  function localRefresh(){
    var obj = localStorage.getItem("newsRSS");
    if(obj != undefined){
      $scope.rss = JSON.parse(obj);
    }else{
      Messages.showError("Couldn't connect to the internet!");
    }
  };
  

  var lastRefresh = localStorage.getItem("pingryNewsRSSRefreshTime");
  if(lastRefresh != null && lastRefresh != ""){
    //Refresh if it's been an hour
    if(parseInt(lastRefresh) + 360000 < Date.now()){
      $scope.externalRefresh(localRefresh);
    }else{
      localRefresh();
    }
  }else{
    $scope.externalRefresh(localRefresh);
  }

})

.controller('ArticleCtrl', function($scope, $stateParams, $cordovaInAppBrowser, rssFeed){

  //Local refresh on enter in case a new article was found on refresh
  $scope.$on('$ionicView.enter', function(){$scope.localRefresh();})

  document.getElementById("article-content").onclick = function (e) {
    e = e ||  window.event;
    var element = e.target || e.srcElement;

    if (element.tagName == 'A') {
      $cordovaInAppBrowser.open(element.href, "_system");
      return false;
    }
    else if(element.parentNode.tagName =='A') {
      $cordovaInAppBrowser.open(element.parentNode.href, "_system");
      return false;
    }
  };

  $scope.localRefresh = function(){
    //Gets from local storage since argument was passed from news and the local storage is in sync with news
    var obj = localStorage.getItem("newsRSS");
    if(obj != undefined && $stateParams.articleId != ""){
      $scope.art = JSON.parse(obj)[$stateParams.articleId];
      //Parses the raw description to fix links and such
      content = rssFeed.parseRawDescription($scope.art.rawDescription)
      document.getElementById("article-content").innerHTML = content;
    }else{
      Messages.showError("Couldn't find that article!");
    }
  };
})

.controller('ScheduleCtrl', function($scope, $cordovaDialogs, Schedule, LetterDay, MySchedule, $ionicSideMenuDelegate, $ionicGesture, Messages, $cordovaDatePicker, $cordovaDeviceFeedback, $ionicPlatform, Settings, $window) {
  //Set up triggers to change the day on swipe
  //var elem = angular.element(document.querySelector("#scheduleContent"));
  var elem = $("#scheduleContent");
  $ionicGesture.on("swipeleft", $scope.nextDay, elem);
  $ionicGesture.on("swiperight", $scope.prevDay, elem);
  
  //Disable menu dragging in the schedule so that we can swipe the schedule to change days
  $scope.$on('$ionicView.enter', function(){$ionicSideMenuDelegate.canDragContent(false);})
  $scope.$on('$ionicView.leave', function(){$ionicSideMenuDelegate.canDragContent(true);});

  //Initialize curDay to the current day
  var curDay = new Date();
  $scope.letter = "";
  $scope.periodList = [];

  //Formats the date in the top of the screen
  function formatDate(d){
    //If the current day is the same as today, just say that it's today
    var now = new Date();
    if(d.getDate() == now.getDate() && d.getMonth() == now.getMonth() && d.getYear() == now.getYear()){
      return "Today"
    }
    //Otherwise, return the whole date
    var year = d.getFullYear();
    var month = monthNames[d.getMonth()];
    var day = d.getDate();
    var weekday = weekDays[d.getDay()];
    return weekday+", "+month+" "+day+" "+year;
  }

  //Refresh the schedule
  function refresh(){
    //Stores the schedule for the day
    $scope.classes = [];
    //Stores the letter day
    $scope.letter = LetterDay.letter();
    console.log($scope.letter);
    //If today is a valid letter day
    if($scope.letter !== undefined && $scope.letter.length == 1 && isLetter($scope.letter)){
      for(i = 0; i < Schedule.getToday().length; i++){
        //Fix pass by refrence by converting it to and back from a string
        var tClass = JSON.parse(JSON.stringify(Schedule.get(i)));
        tClass.color = undefined;
        //If you have a swap class, deals with it by recalling this function with the correct option
        if(tClass.type == "swap"){
          //If you have first lunch
          if(!MySchedule.get("block", LetterDay.classes()[2]) || MySchedule.get("block", LetterDay.classes()[2]).firstLunch){
            tClass = tClass.options[0];
          }
          else{ //Second Lunch
            tClass = tClass.options[1];
          }
        }

        //If you have a block type class
        if(tClass.type == "block"){
          var blockNum = LetterDay.classes()[tClass.id-1];
          if(MySchedule.get("block", blockNum) == undefined){
            tClass.name = "Block "+blockNum;
          }else{
            tClass.color = MySchedule.get("block", blockNum).color;
            tClass.name = MySchedule.get("block", blockNum).name;
            tClass.clickUrl = "#/main/todo/"+MySchedule.get("block", blockNum).time.id;
          }
        }
        //If you have a Community Time type class
        else if(tClass.type == "CT"){
          if(tClass.name !== "Assembly"){
            tClass.name = Schedule.getCTSchedule();
          }
        }
        //If you have a flex type class
        else if(tClass.type == "flex"){
          //Gets all flex classes
          var flexes = MySchedule.getAllType("flex");
          //Variable to check whether to append or overwrite the current name
          var modified = false;
          //Iterate through the list for scheudled flex meetings
          for(var j=0; j < flexes.length; j++){
            //If the day of the week or the letter day matches and this is the right flex
            if((flexes[j].time.day == LetterDay.letter() || flexes[j].time.day == LetterDay.dayOfWeek()) && tClass.id == flexes[j].time.id){
              if(modified){
                tClass.name += " & "+flexes[j].name;
              }else{
                tClass.name = flexes[j].name;
                modified = true;
              }
              tClass.color = flexes[j].color;
            }
          }
          //If this is first flex
          if(tClass.id == 1){
            //Checks to see if first period takes flex
            var adjBlock = MySchedule.get("block", LetterDay.classes()[0]);
            if(adjBlock !== undefined && adjBlock.takesFlex){
              if(modified){
                tClass.name += " & "+adjBlock.name;
              }else{
                tClass.name = adjBlock.name;
                modified = true;
              }
              tClass.color = adjBlock.color;
            }
          }
          //If this is second flex (It's a 0 because addClass persistence requires a boolean value which is either a 0 or a 1)
          else if(tClass.id == 0){
            //Checks if 3rd class of the day takes the flex
            var adjBlock = MySchedule.get("block", LetterDay.classes()[2]);
            if(adjBlock !== undefined && adjBlock.takesFlex){
              tClass.color = adjBlock.color;
              if(modified){
                tClass.name += " & "+adjBlock.name;
              }else{
                tClass.name = adjBlock.name;
                modified = true;
              }
            }

            //Checks if the 4th class of the day takes the flex
            adjBlock = MySchedule.get("block", LetterDay.classes()[3]);
            if(adjBlock !== undefined && adjBlock.takesFlex){
              tClass.color = adjBlock.color;
              if(modified){
                tClass.name += " & "+adjBlock.name;
              }else{
                tClass.name = adjBlock.name;
                modified = true;
              }
            }
          }
        }
        //If you have a Conference Period Type Class
        else if(tClass.type == "CP"){
          //Gets the current assembly schedule for scheduled CP's
          tClass.name = Schedule.getCPSchedule();
          //Gets user scheduled CP's
          var CPs = MySchedule.getAllType("CP");
          //Iterate through user scheduled CP's
          for(var j=0; j < CPs.length; j++){
            //If the letter day or weekday line up
            if(CPs[j].time.day == LetterDay.letter() || CPs[j].time.day == LetterDay.dayOfWeek()){
              tClass.color = CPs[j].color;
              if(tClass.name == "CP"){
                tClass.name = CPs[j].name; //Overwrites if newName hasn't been set yet
              }else{
                tClass.name += " & "+CPs[j].name; //Otherwise, appends
              }
            }
          }
        }

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
      //Add a dash between each of the classes in the class list for friendly display
      var c = "";
      for(i=0; i < LetterDay.classes().length; i++){
        c+=LetterDay.classes()[i];
        if(i+1 < LetterDay.classes().length){
          c+="-";
        }
      }
      $scope.periodList = c;

      if(Schedule.getCurrentScheduleName() == "Unknown Assembly"){
        $cordovaDialogs.alert("This day has an assembly schedule that is not recognized.\n"+
              "A normal schedule is shown, but please only use it as a guideline.")
      }

    }
    //If today is not a valid letter day
    else{
      //If there is no stored letter day schedule
      if($scope.letter == "empty"){
        //If not connected to the internet
        //Messages.showError("Please connect to the internet!");
        Schedule.refresh().then(function(val){
          if(!val){
            Messages.showError("Couldn't connect to the internet!");
          }
        });
        LetterDay.refresh().then(function(val){
          if(!val){
            Messages.showError("Couldn't connect to the internet!");
          }
        });
      }
      else if($scope.letter == "refreshing"){
        //Messages.showNormal("Refreshing...");
      }
    }
    //Sets the display date
    $scope.displayDate = formatDate(curDay);
  }

  //Updates the date in the Letterday and Schedule functions to match the time the user selected
  //Refreshes the schedule
  function updateDate(){
    LetterDay.changeDay(curDay);
    Schedule.changeDay(curDay);
    refresh();
  }

  //Resets the current day to today
  $scope.$on('$ionicView.beforeEnter', function(){
    //resets the schedule to the current date
    curDay = new Date();
    $ionicPlatform.ready(function() {
      updateDate();
    });
  })


  $scope.$on("scheduleRefreshComplete", function(e, args){
    console.log(("triggerred"));
    if(args.success || $scope.letter == "refreshing"){
      refresh();
    }else{
      //Messages.showError("Couldn't connect to the internet!");
    }
  })

  $scope.$on("letterRefreshComplete", function(e, args){
    if(args.success){
      refresh();
    }else{
      //Messages.showError("Couldn't connect to the internet!");
    }
  })

  //Reset the current day to today
  $scope.resetDate = function(){
    curDay = new Date();
    $cordovaDeviceFeedback.haptic(0);
    updateDate();
  }

  $scope.isLetter = isLetter;

  //Opens the date picker to pick a day to jump to
  $scope.openDatePicker = function(){
    $cordovaDatePicker.show({
      mode:"date",
      date:curDay,
      todayText:"Today"
    }).then(function(date){
      if(!!date){
        curDay = date;
        updateDate();
      }
    });
  }

  //Formats the time for classes in 12 hour format
  $scope.formatTime = function(str){
    //Compensate for special events that don't have a time
    if(str == "" || str == undefined){
      return str;
    }
    hour = parseInt(str.substring(0,2));
    minute = parseInt(str.substring(3,5));
    if(hour > 12){
      hour -= 12;
    }
    return hour + ":" + (minute<10?"0":"") + minute;
  }

  //Jumps to the next day
  $scope.nextDay = function(){
    curDay.setDate(curDay.getDate()+1);
    updateDate();
  }

  //Jumps to the previous day
  $scope.prevDay = function(){
    curDay.setDate(curDay.getDate()-1);
    updateDate();
  }

  $scope.clickedClass = function(cls){
    if(!!cls.clickUrl && Settings.getSuperMode()){
      $window.location.href=cls.clickUrl;
    }
  }

})

//Nothing in the lunch controller because it is currently implemented through an in app browser in the menu controller
.controller('LunchCtrl', function($scope){
  //Old HTML code is in lunch.html
})

//Announcements contrller
.controller("AnnouncementsCtrl", function($scope, $cordovaInAppBrowser, $ionicModal, $http, rssFeed, Messages){
  //Open a web link in the browser
  $scope.openSystemLink = function(url){
    $cordovaInAppBrowser.open(url, '_system')
  }

  //Refreshes the announcements
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

  //Locally refreshes from local storage
  $scope.localRefresh = function(){
    var obj = localStorage.getItem("announceRSS");
    if(obj != undefined){
      $scope.rss = JSON.parse(obj);
    }else{
      Messages.showError("Couldn't connect to the internet!");
    }
  };

  $scope.openAnnounce = function(index){
    $scope.modal.scope.announcement = $scope.rss[index];
    $scope.modal.scope.announcement.rawDescription = rssFeed.parseRawDescription($scope.modal.scope.announcement.rawDescription);
    $scope.modal.modalEl.onclick = function (e) {
      e = e ||  window.event;
      var element = e.target || e.srcElement;

      if (element.tagName == 'A') {
        $cordovaInAppBrowser.open(element.href, "_system");
        return false;
      }
      else if(element.parentNode.tagName =='A') {
        $cordovaInAppBrowser.open(element.parentNode.href, "_system");
        return false;
      }
    };
    $scope.modal.show();
  }

  //Finds the last refresh time
  var lastRefresh = localStorage.getItem("pingryRSSRefreshTime");
  //If it's been over an hour, run a full refresh
  if(lastRefresh != null && lastRefresh != ""){
    if(parseInt(lastRefresh) + 360000 < Date.now()){
      $scope.refresh();
    }else{
      $scope.localRefresh();
    }
  }
  else{
    $scope.refresh();
  }

  $ionicModal.fromTemplateUrl("templates/announcement-popup.html", {
    scope: $scope
  }).then(function(modal){
    $scope.modal = modal;
  });
})

//Settings controller
.controller('SettingsCtrl', function($scope, $cordovaDialogs, MySchedule, Schedule, LetterDay, Messages, Settings, AthleticCalendars) {
  //Stops refresh overload from spam since refreshes are fairly processor intensive
  var refreshEnable = true;

  $scope.scheduleOverrideHelp = function(){
    $cordovaDialogs.alert(
      "A schedule override allows you to fix incorrect schedules.\n"+
      "If you select a schedule here, it changes every day to have that schedule."
    );
  }

  //Refresh the calendar events
  $scope.forceRefresh = function(){
    //Only refresh if not currently refreshing
    if(refreshEnable){
      Messages.showNormal("Refreshing...");
      refreshEnable = false;
      Schedule.refresh().then(function(val){
        if(val){
          Messages.showSuccess("Success!");
        }else{
          Messages.showError("Couldn't connect to the internet!");
        }
        refreshEnable = true;
      });
    }
  }

  //Refresh the letterday schedule
  $scope.letterRefresh = function(){
    //Only refresh if not currently refreshing
    if(refreshEnable){
      Messages.showNormal("Refreshing...");
      refreshEnable = false;
      LetterDay.refresh().then(function(val){
        if(val){
          Messages.showSuccess("Success!");
        }else{
          Messages.showError("Couldn't connect to the internet!");
        }
        refreshEnable = true;
      });
    }
  }

  //Sets the schedule type to a new type and turns override mode on
  $scope.setScheduleType = function(newType){
    if(newType == "-1"){
      Schedule.setOverride(false);
    }
    else {
      Schedule.setOverride(true);
      Schedule.setCurrentType(parseInt(newType));
    }
  }

  //Updates the athletic maps option to true or false
  $scope.updateAthleticSubscription = function(val){
    Settings.setAthleticSubscription(val);
  }

  $scope.updateAthleticMaps = function(val){
    Settings.setAthleticMaps(val);
  }

  $scope.athleticCalendars = AthleticCalendars.getCalendars();
  $scope.selectedAthleticCalendar = Settings.getAthleticSubscription();

  //Adds an extra feature
  $scope.addExtra = function(option){
    if(!Settings.getExtraOptions().includes(option)){
      Settings.addExtraOption(option);
    }
  }

  //Disables and extra feature
  $scope.removeExtra = function(option){
    if(Settings.getExtraOptions().includes(option)){
      Settings.removeExtraOption(option);
    }
  }

  //Set all variables to their respective values
  $scope.athleticMaps = Settings.getAthleticMaps();
  $scope.superMode = Settings.getSuperMode();
  $scope.hackerTheme = Settings.getExtraOptions().includes("hackerTheme");
  $scope.overrideSett = "-1";
  $scope.scheduleTypes = Schedule.getTypes();
})

//Add or Modify Class controller
.controller('AddClassCtrl', function($scope, MySchedule, $cordovaDialogs, $stateParams, $ionicHistory, Messages) {
  //Colors configuration
  $scope.colors = ["#DC143C", "#FF3E96", "#EE00EE", "#4876FF", "#8EE5EE", "#00EE76", "#71C671", "#EEEE00", "#EE9A00", "#CDB7B5", "#666"];

  //Resets the view
  $scope.resetView = function(){
    //Resets the view to a new class
    if(!modify){
      //Resets the values
      $scope.cls = {"name":"", "color":"", "type":"", "firstLunch":false, "takesFlex":false, "firstFlex":true, "timeType":"", "time":{"day":"", "id":false}, "tasks":[]};
    }
  }

  //Lunch help popup
  $scope.lunchHelp = function(){
    $cordovaDialogs.alert('First lunch is for:\nScience, Health, Art, Math, and Economic Classes');
  }

  //Updates the selected color to the element with index i
  $scope.updateColorSelect = function(clr){
    $scope.cls.color = clr;
  }

  //Deletes the current class
  $scope.delete = function(){
    $cordovaDialogs.confirm("Delete this class?").then(function(answer){
      if(answer == 1){
        MySchedule.removeClassById($stateParams.clsType, $stateParams.clsId);
        MySchedule.save();
        $ionicHistory.goBack();
      }
    });
  }

  //Submits the class and adds it to the class list
  $scope.submit = function(cls){
    //Should always be valid because button is disabled otherwise
    if($scope.isValid(cls)){
      MySchedule.addClass(cls);
      Messages.showNormal("Class added!");
      MySchedule.save();
      $ionicHistory.goBack();
      return true;
    }
    //Shouldn't happen but...
    Messages.showError("Error, class wasn't added");
  }

  //Updates the current class
  $scope.update = function(cls){
    if($scope.isValid(cls) && modify){
      MySchedule.removeClassById($stateParams.clsType, $stateParams.clsId);
      MySchedule.addClass(cls)
      Messages.showSuccess("Updated!");
      MySchedule.save();
      $ionicHistory.goBack();
    }
  }

  //Returns true if the class configuration is valid (no null values or unset items)
  $scope.isValid = function(cls){
    //Class has a name
    if(cls.name == ""){
      return false;
    }
    //Color is selected
    if(cls.color == ""){
      return false;
    }
    //if the class is a block
    if(cls.type == "block"){
      //Makes sure you have a period selected and it's not a flex period
      return cls.time.id != "" && cls.time.id != false && cls.time.id !== true && (MySchedule.get("block", cls.time.id) == undefined || 
        (modify && $stateParams.clsType == "block" && MySchedule.getAll()[$stateParams.clsType][parseInt($stateParams.clsId)].type == "block" && MySchedule.getAll()[$stateParams.clsType][parseInt($stateParams.clsId)].time.id == cls.time.id));
    }
    //If the class is a flex or a CP
    if(cls.type == "flex" || cls.type == "CP"){
      //Makes sure the timing type is set and that a day is selected
      return (cls.timeType == "letter" || cls.timeType == "weekday") && (cls.time.day !== "" && cls.time.day != undefined);
    }
    return false;
  }

  //Resets the view
  $scope.$on('$ionicView.enter', function(){$scope.resetView();})

  //Modify determines whether or not we are changing the current class
  var modify = false;
  //If we aren't passed parameters or we are passed invalid parameters that specify a class to modify
  if($stateParams.clsType == undefined || $stateParams.clsType == "" || MySchedule.getAll()[$stateParams.clsType] == undefined || MySchedule.getAll()[$stateParams.clsType].length <= parseInt($stateParams.clsId)){
    modify = false;
    //Default class config
    $scope.cls = {"name":"", "color":"", "type":"", "firstLunch":false, "takesFlex":false, "firstFlex":true, "timeType":"", "time":{"day":"", "id":false}, "tasks":[]};
  }else{
    //Modify a class
    modify = true;
    //Get the class
    $scope.cls = JSON.parse(JSON.stringify(MySchedule.getAll()[$stateParams.clsType][parseInt($stateParams.clsId)]));
  }
  $scope.modify = modify;
})

//Class management controller (should be self explanatory)
.controller("ClassManageCtrl", function($scope, MySchedule){
  $scope.$on('$ionicView.enter', function(){
    $scope.myclasses = MySchedule.getAll().block;
    $scope.myflexes = MySchedule.getAll().flex;
    $scope.mycps = MySchedule.getAll().CP;
  });
})

//About controller
.controller("AboutCtrl", function($scope, $cordovaInAppBrowser, $cordovaAppVersion, Settings, Messages){
  $scope.appVersion = "Loading...";
  //Set the app version
  $cordovaAppVersion.getVersionNumber().then(function (version) {
    $scope.appVersion = version;
  });

  
  $scope.$on("$ionicView.enter", function(){clicks = 0;})
  var clicks = 0;
  $scope.addClick = function(){
    clicks++;
    if(clicks == 15){
      //Activates super mode if you click 15 times on my name (no more, no less)
      window.setTimeout(function(){if(clicks == 15){Settings.setSuperMode(true);$cordovaDeviceFeedback.haptic(0);Messages.showNormal("Super Mode Activated!");}}, 2000);
    }
  }
  $scope.openEmail = function(){
    $cordovaInAppBrowser.open("http://www.pingry.org/hp/pingry-today-app-support", '_system');
  }
})

//Reminder controller
.controller("ReminderCtrl", function($scope, $cordovaDevice, Notifications){
  //We have to prompt the user for permission to show notifications if on iOS
  if($cordovaDevice.device !== undefined && $cordovaDevice.device.platform === "iOS") {
    window.plugin.notification.local.promptForPermission();
  }
  $scope.reminders = Notifications.getAll();
})

.controller("AddReminderCtrl", function($scope, $stateParams, $ionicHistory, Notifications, $cordovaDatePicker, $cordovaDialogs){
  //Whether or not we are modifying a reminder
  var modify = false;
  //If we aren't passed parameters or are passed invalid parameters of what reminder to modify
  if($stateParams.reminderId == undefined || $stateParams.reminderId == "" || Notifications.getAll().length < parseInt($stateParams.reminderId)){
    modify = false;
    //Initialize a reminder with the default specs
    $scope.rem = {"description":"", "time":{"day":"", "time":(new Date(1970, 0, 1, 8, 0, 0)), "date":(new Date())}};
  }else{
    modify = true;
    //Gets the reminder (JSON parse and stringify allow pass by value instead of pass by reference)
    var rem = JSON.parse(JSON.stringify(Notifications.get($stateParams.reminderId)));
    //sets the dates to JS dates (JSON stores only the string)
    rem.time.time = parseStringForDate(rem.time.time);
    rem.time.date = parseStringForDate(rem.time.date);
    $scope.rem = rem;
  }
  $scope.modify = modify;

  //Formats a time for readability
  $scope.formatTime = function(time){
    var hours = time.getHours();
    //Whether or not the date needs an AM or PM
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

  //Formats a date for readability
  $scope.formatDate = function(date){
    return monthNames[date.getMonth()]+" "+date.getDate()+", "+date.getFullYear();
  }

  //Opens a date picker to set the date on a single date reminder
  $scope.openDatePicker = function(curDate){
    $cordovaDatePicker.show({
      mode:"date",
      date:curDate,
    }).then(function(date){
      //Sets the date
      $scope.rem.time.date = date;
    })
  }

  //Opens a time picker to set the reminder time
  $scope.openTimePicker = function(curDate){
    $cordovaDatePicker.show({
      mode:"time",
      date:curDate,
    }).then(function(date){
      //Sets the time
      $scope.rem.time.time = date;
    })
  }

  //Validates the reminder
  $scope.isValid = function(reminder){
    return reminder.type != '' && reminder.description != '' && (reminder.time.day != '' || reminder.type == 'single');
  }

  //Adds the reminder
  $scope.submit = function(reminder){
    if($scope.isValid(reminder)){
      Notifications.add(reminder);
      Notifications.update();
      $ionicHistory.goBack();
    }
  }

  //Updates the reminder to match the new reminder
  $scope.update = function(reminder){
    if($scope.isValid(reminder)){
      Notifications.remove($stateParams.reminderId);
      Notifications.add(reminder);
      Notifications.update();
      $ionicHistory.goBack();
    }
  }

  //Deletes this reminder
  $scope.delete = function(reminder){
    $cordovaDialogs.confirm("Delete this reminder?").then(function(answer){
      if(answer == 1){
        Notifications.remove($stateParams.reminderId);
        Notifications.update();
        $ionicHistory.goBack();
      }
    })
  }
})

//Athletics Controller
.controller("AthleticsCtrl", function($scope, $http, $cordovaInAppBrowser, $ionicLoading, icalFeed, Messages, Settings, AthleticCalendars, $q){
  //Formats a 24 hour time in 12 hour format
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

  //Formats a date and time
  $scope.formatTime = function(time){
    var jsTime = new Date(time);
    if(jsTime.getHours() == 0 && jsTime.getMinutes() == 0){
      return (jsTime.getMonth()+1)+"/"+jsTime.getDate()
    }
    return fixTime(jsTime.getHours(), jsTime.getMinutes())+" "+(jsTime.getMonth()+1)+"/"+jsTime.getDate();
  }

  //Opens a map location on click
  $scope.openMapsLocation = function(loc){
    //But only if th setting is enabled (enabled by default)
    if(Settings.getAthleticMaps()){
      $cordovaInAppBrowser.open("http://maps.google.com/?q="+loc, '_system');
    }
  }

  //Resorts the list of events
  function resort(events){
    //Iterate over the events to fix Javscript Time objecs and such (also removing past events)
    for(var i = 0; i < events.length; i++){
      //Time type event
      if(events[i].type == "time"){
        //If the event end time is less than the current time
        if(events[i].startTime < Date.now()){
          //Remove the event
          events.splice(i,1);
          i--;
        }
      }
      //Day type event
      else if(events[i].type == "day"){
        //If the event's time is less than the current time and the event isn't today
        if(events[i].time < Date.now() && dateToDayString(parseStringForDate(events[i].time)) != dateToDayString(new Date())){
          //Remove the event
          events.splice(i,1);
          i--;
        }
        else{
          //Set the start time to be the time (makes for easier sorting and display)
          events[i].startTime = events[i].time;
        }
      }
    }

    //Add descriptions for each event and fix titles
    for(var i = 0; i < events.length; i++){
      if(events[i].desc == undefined){
        var title = events[i].title;
        var desc = title.substring(title.indexOf(" - ")+3);
        var title = title.substring(0, title.indexOf(" - "));
        events[i].title = title;
        events[i].desc = desc;
      }
    }

    //Sorts the event by time, then by title, then by description
    events.sort(
      function(a,b){
        if(a.startTime==b.startTime){
          if(a.title == b.title){
            return a.desc.localeCompare(b.desc);
          }else{
            return a.title.localeCompare(b.title);
          }
        }
        else{
          return a.startTime>b.startTime?1:-1;
        }
      }
    );

    //Only take the first 15 events
    if(events.length > 25){
      events = events.slice(0,25);
    }
    //Update local storage
    localStorage.setItem("athleticEvents", JSON.stringify(events));
    localStorage.setItem("athleticEventsRefreshTime", Date.now());
    $scope.events = events;
    $ionicLoading.hide();
    $scope.$broadcast('scroll.refreshComplete');
  }

  
  $scope.rawEvents = [];
  $scope.calendars = AthleticCalendars.getCalendars();
  //Refreshes from all the calendars
  $scope.refresh = function(){
    $scope.rawEvents = [];
    var queuedEvents = [];
    for(var i = 0; i < $scope.calendars.length; i++){
      if(Settings.getAthleticSubscription() == "" || Settings.getAthleticSubscription() == $scope.calendars[i][1]){
        queuedEvents.push(
          $http.get($scope.calendars[i][1]).then(function(data){
            var obj = icalFeed.parseCalendar(data.data);
            //List of raw events to be parsed in the resort function
            $scope.rawEvents = $scope.rawEvents.concat(obj);
            return true;
          }, function(err){
            //Messages.showError("Couldn't get calendar: "+err.config.url);
            console.log("Couldn't get calendar: "+err.config.url);
            return false;
          })
        );
      }
    }
    $q.all(queuedEvents).then(function(errors){
      count = 0;
      for(var i = 0; i < errors.length; i++){
        if(!errors[i]){
          count++;
        }
      }
      if(count/errors.length < 0.3){
        for(var i = 0; i < $scope.rawEvents.length; i++){
          if(!!$scope.rawEvents[i].startTime){
            $scope.rawEvents[i].startTime = $scope.rawEvents[i].startTime.getTime();
          }
          if(!!$scope.rawEvents[i].endTime){
            $scope.rawEvents[i].endTime = $scope.rawEvents[i].endTime.getTime();
          }
        }
        resort($scope.rawEvents);
      }else{
        $scope.localRefresh();
        $ionicLoading.hide();
        $scope.$broadcast('scroll.refreshComplete');
        Messages.showError("Couldn't refresh!");
      }
    })
  };

  //Refresh from local storage
  $scope.localRefresh = function(){
    var obj = localStorage.getItem("athleticEvents");
    if(obj != undefined && JSON.parse(obj) != undefined){
      events = JSON.parse(obj);
      $scope.events = events;
    }else{
      Messages.showError("Couldn't connect!");
      $scope.events = [];
    }
  };

  //Last refresh time
  var lastRefresh = localStorage.getItem("athleticEventsRefreshTime");
  if(lastRefresh != null && lastRefresh != ""){
    //If it's been over an hour
    if(parseInt(lastRefresh) + 360000 < Date.now()){
      $ionicLoading.show({template: 'Loading...'});
      $scope.refresh();
    }else{
      $scope.localRefresh();
    }
  }else{
    $ionicLoading.show({template: 'Loading...'});
    $scope.refresh();
  }

  $scope.$on("$ionicView.enter", function(){
    if(Settings.getAthleticSubscriptionChanged()){
      $scope.events = [];
      $ionicLoading.show({template: 'Loading...'});
      $scope.refresh();
      Settings.setAthleticSubscriptionChanged(false);
    }
  });
})

.controller("TodoCtrl", function($scope, MySchedule, LetterDay, Schedule, $stateParams, $ionicScrollDelegate, $timeout, $location){
  $scope.formatDate = function(str){
    if(!str){
      return "";
    }
    return parseInt(str.substring(4, 6))+"/"+parseInt(str.substring(6,8));
  }

  $scope.addTask = function(clsIndex, e){
    var elem = $(e.currentTarget.children[0]);
    if(elem.val() != ""){
      $scope.classes[clsIndex].tasks.push({name:elem.val(), date:"", completed:false});
      elem.val("");
    }
    elem.parent().parent().addClass('todo-background-new-assignment');
    MySchedule.save();
  }

  $scope.removeTask = function(taskIndex, clsIndex, e) {
        $(e.target.parentNode).animate({opacity:0}, 1000, "swing", 
      function(){
        if($(e.target).is(":visible")){
          $(e.target.parentNode).css("opacity", 1);
        }
        else{
          $(e.target.parentNode).hide();
          $scope.classes[clsIndex].removeOffset++;
          $scope.$apply();
          MySchedule.save();
        }
      }
    );
  }

  $scope.newTaskUnfocus = function(e) {
    $(e.target).parent().parent().parent().addClass('todo-background-new-assignment');
  }

  $scope.newTaskFocus = function(e) {
    angular.element(e.currentTarget).parent().parent().removeClass('todo-background-new-assignment')
  }

  function refresh() {
    var startingClass;
    var nextDate = LetterDay.nextLetterDayDate(new Date());
    var loop = true;
    var scheduleCurrentDay = Schedule.getCurrentDay();
    if(nextDate !== undefined){
      var classes = LetterDay.classesOf(nextDate);
      if(dateToDayString(nextDate) == dateToDayString(new Date())){
        var sched = Schedule.getForDay(nextDate);
        for(var j = 0; j < sched.length; j++){
          thisClass = sched[j];
          if(sched[j].type == "swap"){
            if(!MySchedule.get("block", classes[2]) || MySchedule.get("block", classes[2]).firstLunch){
              thisClass = thisClass.options[0];
            }else{
              thisClass = thisClass.options[1];
            }
          }
          if(thisClass.type == "block"){
            var d = new Date();
            d.setHours(parseInt(thisClass.endTime.substring(0,2)));
            d.setMinutes(parseInt(thisClass.endTime.substring(3,5)));
            if(d.getTime() > nextDate.getTime()){
              startingClass = classes[parseInt(thisClass.id) - 1];
            }
          }
        }
      }
      else{
        startingClass = classes[0];
      }
      Schedule.changeDay(scheduleCurrentDay);
    }else{
      startingClass = 1;
    }

    var allClasses = MySchedule.getAllType("block");
    var classList = [];
    for(var i = 0; i < 7; i++){
      var thisClass = MySchedule.get("block", (startingClass-1+i)%7 + 1);
      if(thisClass != undefined){
        classList.push(thisClass);
      }
    }

    for(var i = 0; i < classList.length; i++){
      for(var j = 0; j < classList[i].tasks.length; j++){
        if(classList[i].tasks[j].completed == true){
          classList[i].tasks.splice(j, 1);
          j--;
        }
      }
    }


    $scope.classes = classList;
  }

  $scope.$on('$ionicView.beforeEnter', function(){
    if(MySchedule.isChanged()){
      refresh();
    }
  })

  $scope.$on('$ionicView.enter', function(){
    if($stateParams.blockNum != ""){
      $timeout(function(){
        $location.hash("todo-class-"+$stateParams.blockNum);
        $ionicScrollDelegate.anchorScroll(true);
        $timeout(function(){
          $("#todo-class-"+$stateParams.blockNum).animate({backgroundColor:"#4298f4"}, 300);
          $("#todo-class-"+$stateParams.blockNum).animate({backgroundColor:"#FFF"}, 1300);
        }, 300);
      });
    }
  });

  $scope.$on("letterRefreshComplete", function(e, args){
    if(args.success){
      refresh();
    }else{
      //Messages.showError("Couldn't connect to the internet!");
    }
  });

});

/*
[
  {
    name:""
    tasks:[
      {
        name:""
        date:""
        completed:false
      }
      {
        name:""
        date:""
        completed:true
      }
    ]
  }
]
*/