var monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
var weekDays = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

angular.module('app.controllers', ['ionic', 'ionic.native', 'ngCordova'])

//Controller for the side menu
.controller("MenuCtrl", function($scope, $cordovaInAppBrowser, Settings, $ionicModal, $timeout){
  $scope.openForeignLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_system');
  }

  $scope.openLocalLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_self');
  }
})

//Home screen controller (News feed)
.controller("HomeCtrl", function($scope, $http, $cordovaInAppBrowser, rssFeed, Messages){
  //Open a link in another app
  $scope.openForeignLink = function(addr){
    $cordovaInAppBrowser.open(addr, '_system');
  }

  $scope.forceRefresh = function(){
    //Currently pulling from the RSS feed of trending events (Easy to change)
    $http.get("http://www.pingry.org/rss.cfm?news=14").then(function(data){
      var obj = rssFeed.parseXML(data.data);
      //Store the object
      localStorage.setItem("newsRSS", JSON.stringify(obj));
      localStorage.setItem("newsRSSRefreshTime", Date.now());
      //Update the scope
      $scope.rss = obj;
    }, function(){
      Messages.showError("Couldn't connect to the internet!");
    }).finally(function(){
      //Tells the refresher to stop spinning
      $scope.$broadcast('scroll.refreshComplete');
    });
  }

  //Refresh the local feed
  function externalRefresh(){
    //Currently pulling from the RSS feed of trending events (Easy to change)
    return $http.get("http://www.pingry.org/rss.cfm?news=14").then(function(data){
      var obj = rssFeed.parseXML(data.data);
      //Store the object
      localStorage.setItem("newsRSS", JSON.stringify(obj));
      localStorage.setItem("newsRSSRefreshTime", Date.now());
      //Update the scope
      $scope.rss = obj;
    }, localRefresh);
  };

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
      externalRefresh();
    }else{
      localRefresh();
    }
  }else{
    externalRefresh();
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

.controller('ScheduleCtrl', function($scope, $cordovaNetwork, Schedule, LetterDay, MySchedule, $ionicSideMenuDelegate, $ionicGesture, Messages, $cordovaDatePicker) {
  //Set up triggers to change the day on swipe
  var elem = angular.element(document.querySelector("#scheduleContent"));
  $ionicGesture.on("swipeleft", $scope.nextDay, elem);
  $ionicGesture.on("swiperight", $scope.prevDay, elem);
  
  //Disable menu dragging in the schedule so that we can swipe the schedule to change days
  $scope.$on('$ionicView.enter', function(){$ionicSideMenuDelegate.canDragContent(false);})
  $scope.$on('$ionicView.leave', function(){$ionicSideMenuDelegate.canDragContent(true);});

  //Initialize curDay to the current day
  var curDay = new Date();
  $scope.letter = "";
  $scope.periodList = [];

  window.setInterval(
    //Checks every second to see if anything that matters to the schedule has changed
    function(){
      if(Schedule.wasChanged() || MySchedule.isChanged() || LetterDay.isChanged()){
        refresh();
        Schedule.setChanged(false);
        LetterDay.setChanged(false);
        MySchedule.setChanged(false);
      }
    },
    1000
  );

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
    //If today is a valid letter day
    if($scope.letter !== undefined && $scope.letter.length == 1){
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

      if(Schedule.getTypes()[Schedule.getCurrentType()][0] == "Unknown Assembly"){
        alert("Warning:\n"+
              "This day has an assembly schedule that is not recognized.\n"+
              "A normal schedule is shown, but please only use it as a guideline.")
      }

    }
    //If today is not a valid letter day
    else{
      //If there is no stored letter day schedule
      if($scope.letter == "empty"){
        //TODO: improve this system to use variables
        //If not connected to the internet
        if($cordovaNetwork.connection == "none" || $cordovaNetwork.connection == undefined){
          Messages.showError("Please connect to the internet!");
        }
        //Otherwise tells user that we are refreshing
        else{
          Messages.showNormal("Refreshing...");
        }
      }
      //set the letter to be empty
      $scope.letter = "";
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
  $scope.$on('$ionicView.enter', function(){
    //resets the schedule to the current date
    curDay = new Date();
    if(Schedule.wasChanged() || MySchedule.isChanged() || LetterDay.isChanged()){
      Schedule.setChanged(false);
      LetterDay.setChanged(false);
      MySchedule.setChanged(false);
    }
    updateDate();
  })

  //Reset the current day to today
  $scope.resetDate = function(){
    curDay = new Date();
    updateDate();
  }

  //Opens the date picker to pick a day to jump to
  $scope.openDatePicker = function(){
    $cordovaDatePicker.show({
      mode:"date",
      date:curDay,
    }).then(function(date){
      curDay = date;
      updateDate();
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
})

//Nothing in the lunch controller because it is currently implemented through an in app browser in the menu controller
.controller('LunchCtrl', function($scope, $ionicGesture){
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
  }else{
    $scope.refresh();
  }

  $ionicModal.fromTemplateUrl("templates/announcement-popup.html", {
    scope: $scope
  }).then(function(modal){
    $scope.modal = modal;
  });
})

//Settings controller
.controller('SettingsCtrl', function($scope, MySchedule, Schedule, LetterDay, Messages, Settings) {
  //Stops refresh overload from spam since refreshes are fairly processor intensive
  var refreshEnable = true;

  //Refresh teh calendar events
  $scope.forceRefresh = function(){
    //Only refresh if not currently refreshing
    if(refreshEnable){
      Messages.showNormal("Refreshing...");
      refreshEnable = false;
      Schedule.refresh().then(
      function(){ //Success
        refreshEnable = true;
        Messages.showSuccess("Complete!");
      }, function(){ //Error
        refreshEnable = true;
        Messages.showError("Couldn't connect");
      });
    }
  }

  //Refresh the letterday schedule
  $scope.letterRefresh = function(){
    //Only refresh if not currently refreshing
    if(refreshEnable){
      Messages.showNormal("Refreshing...");
      refreshEnable = false;
      LetterDay.refresh().then(
      function(){ //Success
        refreshEnable = true;
        Messages.showSuccess("Complete!");
      }, function(){ //Failure
        refreshEnable = true;
        Messages.showError("Couldn't connect");
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
  $scope.updateAthletic = function(val){
    Settings.setAthleticMaps(val);
  }

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
  $scope.scheduleType = Schedule.getCurrentType();

})

//Add or Modify Class controller
.controller('AddClassCtrl', function($scope, MySchedule, $stateParams, $ionicHistory, Messages) {
  //Colors configuration
  $scope.colors = ["#DC143C", "#FF3E96", "#EE00EE", "#4876FF", "#8EE5EE", "#00EE76", "#71C671", "#EEEE00", "#EE9A00", "#CDB7B5", "#666"];

  //Resets the 
  $scope.resetView = function(){
    //Resets the view to a new class
    if(!modify){
      //Resets the values
      $scope.cls = {"name":"", "type":"", "firstLunch":false, "takesFlex":false, "firstFlex":true, "timeType":"", "time":{"day":"", "id":false}};
      //Removes any selected colors
      while(document.getElementsByClassName("selected-color") > 0){
        angular.element(document.getElementsByClassName("selected-color")[0]).removeClass("selected-color");
      }
    }
  }

  //Lunch help popup
  $scope.lunchHelp = function(e){
    window.alert('First lunch is for:\nScience, Health, Art, Math, and Economic Classes');
  }

  //Updates the selected color to the element with index i
  $scope.updateColorSelect = function(i){
    if(document.getElementsByClassName("selected-color").length > 0){
      angular.element(document.getElementsByClassName("selected-color")[0]).removeClass("selected-color");
    }
    angular.element(document.getElementById("color-"+i)).addClass("selected-color");
  }

  //Deletes the current class
  $scope.delete = function(){
    if(window.confirm("Delete this class?")){
      MySchedule.removeClassById($stateParams.clsType, $stateParams.clsId);
      $ionicHistory.goBack();
    }
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
    if(document.getElementsByClassName("selected-color").length < 1){
      return false;
    }
    //if the class is a block
    if(cls.type == "block"){
      //Makes sure you have a period selected and it's not a flex period
      return cls.time.id != "" && cls.time.id != false && cls.time.id !== true;
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
    $scope.cls = {"name":"", "type":"", "firstLunch":false, "takesFlex":false, "firstFlex":true, "timeType":"", "time":{"day":"", "id":false}};
  }else{
    //Modify a class
    modify = true;
    //Get the class
    $scope.cls = JSON.parse(JSON.stringify(MySchedule.getAll()[$stateParams.clsType][parseInt($stateParams.clsId)]));
    //Shouldn't be necessary in newer app versions
    $scope.cls.type = $stateParams.clsType;
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
.controller("AboutCtrl", function($scope, $cordovaAppVersion, Settings, Messages){
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
      window.setTimeout(function(){if(clicks == 15){Settings.setSuperMode(true);Messages.showNormal("Super Mode Activated!");}}, 2000);
    }
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

.controller("AddReminderCtrl", function($scope, $stateParams, $ionicHistory, Notifications, $cordovaDatePicker){
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
    if(window.confirm("Delete this reminder?")){
      Notifications.remove($stateParams.reminderId);
      Notifications.update();
      $ionicHistory.goBack();
    }
  }
})

//Athletics Controller
.controller("AthleticsCtrl", function($scope, $http, $cordovaInAppBrowser, $ionicLoading, icalFeed, Messages, Settings){
  //Keep track of downloads so that a reload can be both synchronous and asynchronous (download everything at once, THEN finish loading)
  var curDownloads = 0;

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
    time = new Date(time.getTime());
    if(time.getHours() == 0 && time.getMinutes() == 0){
      return (time.getMonth()+1)+"/"+time.getDate()
    }
    return fixTime(time.getHours(), time.getMinutes())+" "+(time.getMonth()+1)+"/"+time.getDate();
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
    console.log(events);
    //Iterate over the events to fix Javscript Time objecs and such (also removing past events)
    for(var i = 0; i < events.length; i++){
      //Time type event
      if(events[i].type == "time"){
        events[i].startTime = parseStringForDate(events[i].startTime);
        if(!!events[i].endTime)
          events[i].endTime = parseStringForDate(events[i].endTime);
        //If the event end time is less than the current time
        if(events[i].startTime.getTime() < Date.now()){
          //Remove the event
          events.splice(i,1);
          i--;
        }
      }
      //Day type event
      else if(events[i].type == "day"){
        events[i].time = parseStringForDate(events[i].time);
        //If the event's time is less than the current time and the event isn't today
        if(events[i].time.getTime() < Date.now() && dateToDayString(events[i].time) != dateToDayString(new Date())){
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
    console.log(events);

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
        if(a.startTime.getTime()==b.startTime.getTime()){
          if(a.title == b.title){
            return a.desc.localeCompare(b.desc);
          }else{
            return a.title.localeCompare(b.title);
          }
        }
        else{
          return a.startTime.getTime()>b.startTime.getTime()?1:-1
        }
      }
    );

    //Only take the first 15 events
    if(events.length > 15){
      events = events.slice(0,15);
    }
    console.log(events);
    console.log(JSON.stringify(events));
    //Update local storage
    localStorage.setItem("athleticEvents", JSON.stringify(events));
    localStorage.setItem("athleticEventsRefreshTime", Date.now());
    console.log(events);
    $scope.events = events;
    $ionicLoading.hide();
    $scope.$broadcast('scroll.refreshComplete');
  }

  /*
    Short javascript to run in the console on (http://www.pingry.org/cf_athletics/cms_athletic_feeds.cfm) to get a list of the links:
    for(var i = 0; i < document.getElementsByClassName("athletics_alert_btn").length; i++){
      var t = document.getElementsByClassName("athletics_alert_btn")[i].parentNode.children[2].getAttribute("href");
      console.log('"http://www.pingry.org/calendar/team_'+t.substring(t.indexOf("eventid=")+8)+'.ics",  //'+document.getElementsByClassName("athletics_alert_btn")[i].parentNode.children[0].innerHTML)
    }
  */
  $scope.rawEvents = [];
  //Refreshes from all the calendars
  $scope.refresh = function(){
    $scope.rawEvents = [];
    //List of athletic calendars (See above for details on how I got it) (Middle school calendars are manually commented out)
    var calendars = [
      "http://www.pingry.org/calendar/team_119.ics",  //Baseball - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_210.ics",  //Baseball - Boys Middle School A
//      "http://www.pingry.org/calendar/team_211.ics",  //Baseball - Boys Middle School B
//      "http://www.pingry.org/calendar/team_223.ics",  //Baseball - Boys MS
      "http://www.pingry.org/calendar/team_121.ics",  //Baseball - Boys Varsity
      "http://www.pingry.org/calendar/team_222.ics",  //Basketball - Boys Frosh
      "http://www.pingry.org/calendar/team_123.ics",  //Basketball - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_124.ics",  //Basketball - Boys Middle School A
//      "http://www.pingry.org/calendar/team_207.ics",  //Basketball - Boys Middle School B
//      "http://www.pingry.org/calendar/team_230.ics",  //Basketball - Boys Middle School C
      "http://www.pingry.org/calendar/team_125.ics",  //Basketball - Boys Varsity
      "http://www.pingry.org/calendar/team_126.ics",  //Basketball - Girls Junior Varsity
//      "http://www.pingry.org/calendar/team_205.ics",  //Basketball - Girls Middle School A
//      "http://www.pingry.org/calendar/team_206.ics",  //Basketball - Girls Middle School B
      "http://www.pingry.org/calendar/team_127.ics",  //Basketball - Girls Varsity
      "http://www.pingry.org/calendar/team_251.ics",  //Cross Country -  Frosh
      "http://www.pingry.org/calendar/team_249.ics",  //Cross Country - Boys Junior Varsity
      "http://www.pingry.org/calendar/team_97.ics",  //Cross Country - Boys Varsity
//      "http://www.pingry.org/calendar/team_99.ics",  //Cross Country - Coed MS
      "http://www.pingry.org/calendar/team_250.ics",  //Cross Country - Girls Junior Varsity
      "http://www.pingry.org/calendar/team_100.ics",  //Cross Country - Girls Varsity
      "http://www.pingry.org/calendar/team_129.ics",  //Fencing - Boys Varsity
//      "http://www.pingry.org/calendar/team_130.ics",  //Fencing - Coed MS
      "http://www.pingry.org/calendar/team_132.ics",  //Fencing - Girls Varsity
      "http://www.pingry.org/calendar/team_37.ics",  //Field Hockey - Girls Junior Varsity
//      "http://www.pingry.org/calendar/team_38.ics",  //Field Hockey - Girls MS
      "http://www.pingry.org/calendar/team_39.ics",  //Field Hockey - Girls Varsity
      "http://www.pingry.org/calendar/team_34.ics",  //Football - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_35.ics",  //Football - Boys MS
      "http://www.pingry.org/calendar/team_36.ics",  //Football - Boys Varsity
      "http://www.pingry.org/calendar/team_212.ics",  //Golf - Boys Junior Varsity
      "http://www.pingry.org/calendar/team_135.ics",  //Golf - Boys Varsity
      "http://www.pingry.org/calendar/team_213.ics",  //Golf - Girls Junior Varsity
      "http://www.pingry.org/calendar/team_138.ics",  //Golf - Girls Varsity
      "http://www.pingry.org/calendar/team_139.ics",  //Ice Hockey - Boys Junior Varsity
      "http://www.pingry.org/calendar/team_140.ics",  //Ice Hockey - Boys Varsity
//      "http://www.pingry.org/calendar/team_141.ics",  //Ice Hockey - Coed MS
      "http://www.pingry.org/calendar/team_142.ics",  //Ice Hockey - Girls Varsity
      "http://www.pingry.org/calendar/team_143.ics",  //Lacrosse - Boys Frosh
      "http://www.pingry.org/calendar/team_144.ics",  //Lacrosse - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_214.ics",  //Lacrosse - Boys Middle School A
//      "http://www.pingry.org/calendar/team_215.ics",  //Lacrosse - Boys Middle School B
//      "http://www.pingry.org/calendar/team_145.ics",  //Lacrosse - Boys MS
      "http://www.pingry.org/calendar/team_146.ics",  //Lacrosse - Boys Varsity
      "http://www.pingry.org/calendar/team_147.ics",  //Lacrosse - Girls Frosh
      "http://www.pingry.org/calendar/team_148.ics",  //Lacrosse - Girls Junior Varsity
//      "http://www.pingry.org/calendar/team_216.ics",  //Lacrosse - Girls Middle School A
//      "http://www.pingry.org/calendar/team_217.ics",  //Lacrosse - Girls Middle School B
//      "http://www.pingry.org/calendar/team_224.ics",  //Lacrosse - Girls MS
      "http://www.pingry.org/calendar/team_150.ics",  //Lacrosse - Girls Varsity
      "http://www.pingry.org/calendar/team_228.ics",  //Ski Team - Boys Junior Varsity
      "http://www.pingry.org/calendar/team_201.ics",  //Ski Team - Boys Varsity
      "http://www.pingry.org/calendar/team_229.ics",  //Ski Team - Girls Junior Varsity
      "http://www.pingry.org/calendar/team_202.ics",  //Ski Team - Girls Varsity
      "http://www.pingry.org/calendar/team_59.ics",  //Soccer - Boys Frosh
      "http://www.pingry.org/calendar/team_6.ics",  //Soccer - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_155.ics",  //Soccer - Boys Middle School A
//      "http://www.pingry.org/calendar/team_203.ics",  //Soccer - Boys Middle School B
//      "http://www.pingry.org/calendar/team_234.ics",  //Soccer - Boys Middle School C
      "http://www.pingry.org/calendar/team_61.ics",  //Soccer - Boys Varsity
      "http://www.pingry.org/calendar/team_248.ics",  //Soccer - Girls Frosh
      "http://www.pingry.org/calendar/team_63.ics",  //Soccer - Girls Junior Varsity
//      "http://www.pingry.org/calendar/team_226.ics",  //Soccer - Girls MS
      "http://www.pingry.org/calendar/team_5.ics",  //Soccer - Girls Varsity
//      "http://www.pingry.org/calendar/team_151.ics",  //Softball - Girls Junior Varsity
//      "http://www.pingry.org/calendar/team_218.ics",  //Softball - Girls Middle School A
//      "http://www.pingry.org/calendar/team_219.ics",  //Softball - Girls Middle School B
//      "http://www.pingry.org/calendar/team_225.ics",  //Softball - Girls MS
      "http://www.pingry.org/calendar/team_153.ics",  //Softball - Girls Varsity
      "http://www.pingry.org/calendar/team_158.ics",  //Squash - Boys Varsity
      "http://www.pingry.org/calendar/team_194.ics",  //Squash - Coed Junior Varsity
      "http://www.pingry.org/calendar/team_161.ics",  //Squash - Coed Varsity
      "http://www.pingry.org/calendar/team_162.ics",  //Squash - Girls Varsity
      "http://www.pingry.org/calendar/team_163.ics",  //Swimming - Boys Varsity
//      "http://www.pingry.org/calendar/team_165.ics",  //Swimming - Coed MS
      "http://www.pingry.org/calendar/team_166.ics",  //Swimming - Girls Varsity
      "http://www.pingry.org/calendar/team_167.ics",  //Tennis - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_168.ics",  //Tennis - Boys MS
      "http://www.pingry.org/calendar/team_169.ics",  //Tennis - Boys Varsity
      "http://www.pingry.org/calendar/team_235.ics",  //JV-2 Girls Tennis
      "http://www.pingry.org/calendar/team_77.ics",  //Tennis - Girls Junior Varsity
//      "http://www.pingry.org/calendar/team_78.ics",  //Tennis - Girls MS
      "http://www.pingry.org/calendar/team_79.ics",  //Tennis - Girls Varsity
      "http://www.pingry.org/calendar/team_171.ics",  //Track - Boys Varsity
//      "http://www.pingry.org/calendar/team_173.ics",  //Track - Coed MS
      "http://www.pingry.org/calendar/team_175.ics",  //Track - Girls Varsity
      "http://www.pingry.org/calendar/team_89.ics",  //Water Polo - Coed Junior Varsity
//      "http://www.pingry.org/calendar/team_220.ics",  //Water Polo - Coed MS
      "http://www.pingry.org/calendar/team_221.ics",  //Water Polo - Coed Varsity
      "http://www.pingry.org/calendar/team_208.ics",  //Winter Track - Boys Varsity
      "http://www.pingry.org/calendar/team_209.ics",  //Winter Track - Girls Varsity
      "http://www.pingry.org/calendar/team_179.ics",  //Wrestling - Boys Junior Varsity
//      "http://www.pingry.org/calendar/team_180.ics",  //Wrestling - Boys MS
      "http://www.pingry.org/calendar/team_181.ics",  //Wrestling - Boys Varsity
    ]
    curDownloads = calendars.length;
    for(var i = 0; i < calendars.length; i++){
      $http.get(calendars[i]).then(function(data){
        var obj = icalFeed.parseCalendar(data.data);
        //List of raw events to be parsed in the resort function
        $scope.rawEvents = $scope.rawEvents.concat(obj);
      }, function(err){
        Messages.showError("Couldn't get calendar: "+err.config.url);
      }).finally(function(){
        //Decrement downloads in progress
        curDownloads--;
        //If this was the last remaining downoad, resort the events to apply them to the scope
        if(curDownloads == 0){
          console.log($scope.rawEvents);
          resort($scope.rawEvents);
        }
      })
    }
  };

  //Refresh from local storage
  $scope.localRefresh = function(){
    var obj = localStorage.getItem("athleticEvents");
    if(obj != undefined){
      events = JSON.parse(obj);
      resort(events);
      $scope.events = events;
    }else{
      Messages.showError("Couldn't connect to the internet!");
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
});