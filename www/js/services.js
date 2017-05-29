// Allows us to set the weekday of the provided date
Date.prototype.setDay = function(dayOfWeek) {
    this.setDate(this.getDate() - this.getDay() + dayOfWeek);
};

function monthNameToInt(str){
  switch(str){
    case "Jan":
      return 0;
    case "Feb":
      return 1;
    case "Mar":
      return 2;
    case "Apr":
      return 3;
    case "May":
      return 4;
    case "Jun":
      return 5;
    case "Jul":
      return 6;
    case "Aug":
      return 7;
    case "Sep":
      return 8;
    case "Oct":
      return 9;
    case "Nov":
      return 10;
    case "Dec":
      return 11;
  }
}

function parseStringForTime(d, str){
  var local = false;
  if(str.indexOf("Z") == -1){
    local = true;
  }
  //Initializes the date to be 1 day ahead because setting the time goes backwards a day for some reason...
  if(str.indexOf("T") != -1){
    str = str.substring(str.indexOf("T")+1);
  }
  if(str.indexOf(".") != -1){
    str = str.substring(0, str.indexOf(".")) + str.substring(str.indexOf(".")+4);
  }
  //Replace all spaces
  str = str.replace(/ /g, "");
  //Replace all colons
  str = str.replace(/:/g, "");
  d.setHours(parseInt(str.substring(0,2)));
  d.setMinutes(parseInt(str.substring(2,4)));
  d.setSeconds(parseInt(str.substring(4,6)));
  if(str.substring(6,7) == "-" || str.substring(6,7) == "+"){
    d.setTime(d.getTime() - (d.getTimezoneOffset()/60.0 + parseInt(str.substring(6))/100.0)*1000*60*60);
  }
  //If this is already in EST, disable over-compensation for timezones

  if(!local){
    d.setTime(d.getTime() - d.getTimezoneOffset()*1000*60)
  }
  return d.getTime();
}

//Parses a string for a date
function parseStringForDate(str){
  if(str instanceof Date){
    return str;
  }
  var d = new Date(0);

  //Replace all dashes
  str = str.substring(0,10).replace(/-/g, "") + str.substring(10);
  if(str.indexOf(" ") == -1){
    d.setYear(parseInt(str.substring(0,4)));
    d.setDate(parseInt(str.substring(6,8)));
    d.setMonth(parseInt(str.substring(4,6))-1);
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    if(str.length > 9){
      str = str.substring(8);
      parseStringForTime(d, str);
    }
  }else if(str.substring(3,4) == ","){
    str = str.substring(5);
    d.setDate(parseInt(str.substring(0,2)));
    d.setMonth(monthNameToInt(str.substring(3,6)));
    d.setYear(parseInt(str.substring(7,11)));
    if(str.length > 11){
      str = str.substring(11);
      parseStringForTime(d, str);
    }
  }
  else{
    console.warn("INVALID: "+str);
  }
  return d;
}

// If Array doesn't have the includes function (older web browsers) then add it in
if (!Array.prototype.includes) {
  Array.prototype.includes = function(searchElement) {
    'use strict';
    if (this == null) {
      throw new TypeError('Array.prototype.includes called on null or undefined');
    }
    var O = Object(this);
    var len = parseInt(O.length, 10) || 0;
    if (len === 0) {
      return false;
    }
    var n = parseInt(arguments[1], 10) || 0;
    var k;
    if (n >= 0) {
      k = n;
    } else {
      k = len + n;
      if (k < 0) {k = 0;}
    }
    var currentElement;
    while (k < len) {
      currentElement = O[k];
      if (searchElement === currentElement ||
         (searchElement !== searchElement && currentElement !== currentElement)) { // NaN !== NaN
        return true;
      }
      k++;
    }
    return false;
  };
}

function dateToDayString(d){
  return ""+d.getFullYear()+(d.getMonth()+1<10?"0":"")+(d.getMonth()+1)+(d.getDate()<10?"0":"")+d.getDate();
};

angular.module('app.services', ['ionic', 'ionic.native', 'ngCordova'])

.factory('LetterDay', function($http, icalFeed, Schedule, $rootScope) {
  var time = localStorage.getItem("lastLetterRefresh");
  var dates = localStorage.getItem("letterDayDates");

  if(time == null || time == undefined || parseInt(time) + 604800000 < Date.now() ){ //Refresh if not refreshed or if it's been a week
    refreshData();
  }

  //Fix undefined dates if necessary, or parse the json string
  if(dates == undefined || dates == null || dates == ""){
    dates = {"A":[], "B":[], "C":[], "D":[], "E":[], "F":[], "G":[]};
  }else{
    dates = JSON.parse(dates);
  }

  //Times objects: Contains Letter, Scheduled classes, and the dates of that day
  var times = [
    {"letter":"A", "schedule":[1,2,3,4], "dates":dates.A},
    {"letter":"B", "schedule":[5,6,7,1], "dates":dates.B},
    {"letter":"C", "schedule":[2,3,4,5], "dates":dates.C},
    {"letter":"D", "schedule":[6,7,1,2], "dates":dates.D},
    {"letter":"E", "schedule":[3,4,5,6], "dates":dates.E},
    {"letter":"F", "schedule":[7,1,2,3], "dates":dates.F},
    {"letter":"G", "schedule":[4,5,6,7], "dates":dates.G}
  ];

  var refreshing = false;

  //Function to refresh all data from the letter day ical
  function refreshData(){
    refreshing = true;
    var letterDayURL = "http://www.pingry.org/calendar/calendar_384.ics"; //URL of the LetterDay calendar for the Upper School
    //Returns a promise so that you can run async functions after this function completes
    //(e.g.Calling LetterDay.refresh.then(function(){code here}))
    return $http.get(letterDayURL).then(function(data){
      var calEvents = icalFeed.parseCalendar(data.data);
      var obj = {"A":[], "B":[], "C":[], "D":[], "E":[], "F":[], "G":[]};
      //Iterate through calendar events
      for(i = 0; i < calEvents.length; i++){
        //Ensures that it is a day long event
        if(calEvents[i].type == "day"){
          //Adds the first letter of that event to the calendar
          if(calEvents[i].title.length == 1 && obj.hasOwnProperty(calEvents[i].title.substring(0,1))){
            obj[calEvents[i].title.substring(0,1)].push(dateToDayString(calEvents[i].time));
          }
        }
      }

      //Update localStorage items
      localStorage.setItem("letterDayDates", JSON.stringify(obj));
      localStorage.setItem("lastLetterRefresh", JSON.stringify(Date.now()));

      //Updates the arrays in current memory
      times[0].dates = obj.A;
      times[1].dates = obj.B;
      times[2].dates = obj.C;
      times[3].dates = obj.D;
      times[4].dates = obj.E;
      times[5].dates = obj.F;
      times[6].dates = obj.G;

      //Updates the letter day if there are different letter days for the current date
      updateDay(d);
      refreshing = false;
      $rootScope.$broadcast("letterRefreshComplete", {success: true});
      return true;
    },function(){
      refreshing = false;
      $rootScope.$broadcast("letterRefreshComplete", {success:false});
      return false;
    });
  }

  //Function to get the index of the current date in one of the date arrays
  function getIndexOf(str){
    //Iterate through each letter
    for(i = 0; i < times.length; i+=1){
      //Iterate through each date
      for(j = 0; j < times[i].dates.length; j++){
        //If the date equals the date we're looking for
        if(times[i].dates[j] == str){
          //Return the index
          return i;
        }
      }
    }
    //Returns -1 if it can't find it
    return -1;
  };

  //Function to convert a letter day letter into a numerical index of the times object
  function letterToNumber(letter){
    switch(letter){
      case "A":
        return 0;
      case "B":
        return 1;
      case "C":
        return 2;
      case "D":
        return 3;
      case "E":
        return 4;
      case "F":
        return 5;
      case "G":
        return 6;
      default:
        return -1;
    }
  }

  var d;
  var curDay;
  //Updates the current letter day and the current date
  function updateDay(day){
    d = day;
    curDay = getIndexOf(dateToDayString(day));
  }

  //Initialize the date to be the current date
  updateDay(new Date());

  return {
    isRefreshing: function(){return refreshing;},
    refresh: refreshData, //Refresh the LetterDay schedule from the online calendar
    letter: function() {
      if(curDay != -1){
        return times[curDay].letter;
      }
      else if(times[0].dates.length== 0 && (refreshing || Schedule.isRefreshing())){
        return "refreshing";
      }
      //If the schedule isn't updated, return an empty string
      else if(times[0].dates.length == 0){
        return "empty";
      }
      return "";
    },
    changeDay: function(day){updateDay(day);}, //Changes the current day to the given date
    letterOf: function(day){ //Returns what letter a given date would be
      var dayString = dateToDayString(day);
      var index = getIndexOf(dayString);
      if(index == -1){
        return "";
      }
      return times[index].letter;
    },
    classes: function() { //Returns an array of class numbers for the current day
      if(curDay != -1){
        return times[curDay].schedule;
      }
      return undefined;
    },
    getDatesOf: function(letter){ //Gets all the dates for a given letter day
      return times[letterToNumber(letter)].dates;
    },
    classesOf: function(day){ //Returns the classes of the given date
      var ind = getIndexOf(dateToDayString(day));
      if(ind != -1)
        return times[ind].schedule;
      return [];
    },
    dayOfWeek: function(){ //Returns the current date's day of the week
      return d.getDay();
    },
    nextLetterDayDate: function(d){
      while(getIndexOf(dateToDayString(d)) == -1){
        d.setDate(d.getDate()+1);
      }
      return d;
    }
  };
}).factory('Schedule', function($http, icalFeed, $rootScope, $q){
  /*
      Schedule types are listed below
    Format: an array of classes
    Class format: Name, Type, startTime, endTime, (id)
    Swap Class format: must be type swap and contain an options attribute that contains two classes (one for first lunch and one for second lunch)

  */
  var normalSchedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:15"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:20", "endTime":"09:40"},
    {"name":"Community Time", "type":"CT", "startTime":"09:45", "endTime":"10:10"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:15", "endTime":"11:20"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:25", "endTime":"11:55"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:25", "endTime":"12:30"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:55", "endTime":"13:00"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:30", "endTime":"13:00"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:05", "endTime":"13:25"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:30", "endTime":"14:35"},
    {"name":"CP", "type":"CP", "startTime":"14:40", "endTime":"15:25"}
  ];

  var facultyCollabSchedule = [
    {"name":"Faculty Meetings", "type":"Other", "startTime":"08:05", "endTime":"09:30"},
    {"name":"Attendance", "type":"Other", "startTime":"09:35", "endTime":"09:40"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"09:40", "endTime":"10:40"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"10:40", "endTime":"11:00"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"11:05", "endTime":"12:10"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"12:15", "endTime":"12:45"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:15", "endTime":"13:00"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:45", "endTime":"13:30"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"13:00", "endTime":"13:30"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:35", "endTime":"13:55"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"14:00", "endTime":"14:45"},
    {"name":"CP", "type":"CP", "startTime":"14:50", "endTime":"15:25"}
  ];

  var assembly30Schedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:15"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:20", "endTime":"09:40"},
    {"name":"Community Time", "type":"CT", "startTime":"09:45", "endTime":"10:15"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:20", "endTime":"11:20"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:25", "endTime":"11:55"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:25", "endTime":"12:30"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:55", "endTime":"13:00"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:30", "endTime":"13:00"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:05", "endTime":"13:25"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:3", "endTime":"14:35"},
    {"name":"CP", "type":"CP", "startTime":"14:40", "endTime":"15:25"}
  ];

  var assembly35Schedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:15"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:15", "endTime":"09:35"},
    {"name":"Community Time", "type":"CT", "startTime":"09:40", "endTime":"10:15"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:20", "endTime":"11:20"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:25", "endTime":"11:55"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:25", "endTime":"12:25"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:00", "endTime":"13:00"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:30", "endTime":"13:00"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:05", "endTime":"13:30"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:35", "endTime":"14:35"},
    {"name":"CP", "type":"CP", "startTime":"14:40", "endTime":"15:25"}
  ];

  var assembly60Schedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:10"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:10", "endTime":"09:30"},
    {"name":"Assembly", "type":"CT", "startTime":"09:35", "endTime":"10:35"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:40", "endTime":"11:45"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:50", "endTime":"12:20"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:50", "endTime":"12:45"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:20", "endTime":"13:15"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:45", "endTime":"13:15"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:20", "endTime":"13:35"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:40", "endTime":"14:40"},
    {"name":"CP", "type":"CP", "startTime":"14:45", "endTime":"15:25"}
  ];

  var assembly40Schedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:15"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:15", "endTime":"09:30"},
    {"name":"Assembly", "type":"CT", "startTime":"09:35", "endTime":"10:15"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:20", "endTime":"11:25"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:30", "endTime":"12:00"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:30", "endTime":"12:35"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:00", "endTime":"13:05"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:35", "endTime":"13:05"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:10", "endTime":"13:25"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:30", "endTime":"14:35"},
    {"name":"CP", "type":"CP", "startTime":"14:40", "endTime":"15:25"}
  ];

  var reviewSchedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:00", "endTime":"08:05"},
    {"name":"Block 1", "type":"staticblock", "id":"1", "startTime":"08:10", "endTime":"08:55"},
    {"name":"Block 2", "type":"staticblock", "id":"2", "startTime":"09:00", "endTime":"09:45"},
    {"name":"US Meeting", "type":"CT", "startTime":"09:50", "endTime":"10:10"},
    {"name":"Block 3", "type":"staticblock", "id":"3", "startTime":"10:15", "endTime":"11:00"},
    {"name":"Block 4", "type":"staticblock", "id":"4", "startTime":"11:05", "endTime":"11:50"},
    {"name":"Swappable 1", "type":"swap", "determinant":"5", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:55", "endTime":"12:25"},
      {"name":"Block 5", "type":"staticblock", "id":"5", "startTime":"11:55", "endTime":"12:40"}]},
    {"name":"Swappable 2", "type":"swap", "determinant":"5", "options":[
      {"name":"Period 5", "type":"staticblock", "id":"5", "startTime":"12:30", "endTime":"13:15"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:45", "endTime":"13:15"}]},
    {"name":"Flex 2", "type":"specialflex", "id":"0", "startTime":"13:15", "endTime":"13:35"},
    {"name":"Block 6", "type":"staticblock", "id":"6", "startTime":"13:40", "endTime":"14:25"},
    {"name":"Block 7", "type":"staticblock", "id":"7", "startTime":"14:30", "endTime":"15:15"},
  ]

  var winterFestivalSchedule = [
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:10"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:10", "endTime":"09:30"},
    {"name":"Winter Festival", "type":"Other", "startTime":"09:35", "endTime":"11:00"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"11:05", "endTime":"12:10"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"12:15", "endTime":"12:45"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:15", "endTime":"13:10"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"12:45", "endTime":"13:40"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"13:10", "endTime":"13:40"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:45", "endTime":"13:55"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"14:00", "endTime":"14:50"},
    {"name":"CP", "type":"CP", "startTime":"14:55", "endTime":"15:30"}
  ];

  var unknownSchedule = [
    {"name":"Unknown Assembly Today", "type":"Other", "startTime":"", "endTime":""},
    {"name":"Attendance", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:15"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:20", "endTime":"09:40"},
    {"name":"Community Time", "type":"CT", "startTime":"09:45", "endTime":"10:10"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:15", "endTime":"11:20"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:25", "endTime":"11:55"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:25", "endTime":"12:30"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:55", "endTime":"13:00"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:30", "endTime":"13:00"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:05", "endTime":"13:25"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:30", "endTime":"14:35"},
    {"name":"CP", "type":"CP", "startTime":"14:40", "endTime":"15:25"}
  ];
  //Variable to store all the schedule types
  var typeList = [
    ["Normal",normalSchedule],
    ["Faculty Collaboration",facultyCollabSchedule],
    ["Assembly 30 Minutes", assembly30Schedule],
    ["Assembly 35 Minutes", assembly35Schedule], 
    ["Assembly 40 Minutes", assembly40Schedule], 
    ["Assembly 60 Minutes", assembly60Schedule], 
    ["Review Day", reviewSchedule], 
    ["Winter Festival", winterFestivalSchedule], 
    ["Unknown Assembly", unknownSchedule]
  ];


  //Initializes the current day to be the system current day
  var curDay = new Date();

  //Variable to count how many schedules are currently active
  var refreshing = false;

  var time = localStorage.getItem("lastScheduleRefresh");
  if(time == null || time == undefined || parseInt(time) + 604800000 < Date.now()){ //Refresh if not ever loaded or if it's been a week
    refreshData();
  }

  var manualOverriddenSchedules = localStorage.getItem("manualOverriddenSchedules");
  if(manualOverriddenSchedules == null || manualOverriddenSchedules == undefined){
    manualOverriddenSchedules = {};
    localStorage.setItem("manualOverriddenSchedules", "{}");
  }else{
    manualOverriddenSchedules = JSON.parse(manualOverriddenSchedules);
  }

  //Schedule override mode disables dynamic schedule determination
  var schedOverride = false;

  //Community Time event schedule
  var CTSchedule = localStorage.getItem("CTSchedule");
  //Special Schedule day schedule
  var scheduledDays = localStorage.getItem("ScheduledDays");
  //CP assembly/event schedule
  var CPSchedule = localStorage.getItem("CPSchedule");
  //Faculty collaboration day schedule
  var facultyCollabDays = localStorage.getItem("facultyCollabDays");

  //Initialize current schedule to be the normal schedule
  var curSchedule = typeList[0][1];

  var curScheduleName = typeList[0][0];

  //Error catching and JSON parsing from the local storage
  if(CTSchedule != null){CTSchedule = JSON.parse(CTSchedule);}
  if(CPSchedule != null){CPSchedule = JSON.parse(CPSchedule);}
  if(scheduledDays != null){scheduledDays = JSON.parse(scheduledDays);}
  if(facultyCollabDays != null){facultyCollabDays = JSON.parse(facultyCollabDays);}

  //Checks the scheduled days array for the current day and updates the current schedule to reflect it
  function updateCurrentSchedule(){
    //If not in Schedule override mode
    if(!schedOverride){
      //If today has a special schedule
      curSchedule = typeList[0][1];
      curScheduleName = typeList[0][0];
      if(manualOverriddenSchedules[dateToDayString(curDay)] != undefined){
        curSchedule = manualOverriddenSchedules[dateToDayString(curDay)];
        curScheduleName = "manual";
      }
      else if(scheduledDays != null && scheduledDays[dateToDayString(curDay)] != undefined){
        //Iterate over the schedule types
        for(i = 0; i < typeList.length; i++){
          //if found the respective schedule for the day
          if(typeList[i][0] == scheduledDays[dateToDayString(curDay)]){
            curSchedule = typeList[i][1];
            curScheduleName = typeList[i][0];
            break;
          }
        }
      }
      //Check if it's a faculty collaboration day
      else if(facultyCollabDays != null){
        for(var i = 0; i < facultyCollabDays.length; i++){
          if(facultyCollabDays[i] == dateToDayString(curDay)){
            curSchedule = typeList[1][1];
            curScheduleName = typeList[i][0];
            break;
          }
        }
      }
    }
  }

  //Checks if there is a special schedule
  updateCurrentSchedule();

  //Refreshes the schedule from the calendar
  function refreshData(){
    //Google school calendar URL
    var specialScheduleURL = "http://calendar.google.com/calendar/ical/pingry.org_kg3ab8ps5pa70oj41igegj9kjo%40group.calendar.google.com/public/basic.ics";
    //Faculty Collaboration day calendar URL
    var collabDatesURL = "http://www.pingry.org/calendar/calendar_388.ics";

    var assemblyOverrideURL = "http://mirror.pingry.k12.nj.us/software/AssemblyScheduleOverride.json";

    refreshing = true;
    return $q.all([
      //Faculty collaboration day schedule refresh
      $http.get(collabDatesURL).then(function(data){
        //Parses the calendar
        var calEvents = icalFeed.parseCalendar(data.data);
        var days = [];
        //Iterate over the events
        for(i=0; i<calEvents.length; i++){
          //If the event title contains the text Faculty Collaboration Day
          if(calEvents[i].title.indexOf("Faculty Collaboration Day") != -1){
            //Add the date string to a temporary array
            days.push(dateToDayString(calEvents[i].time));
          }
        }
        //Update the current faculty collab days
        facultyCollabDays = days;

        //Update the local storage
        localStorage.setItem("facultyCollabDays", JSON.stringify(days));
        return true;
      }, function(){return false;}) ,

      //Returns the larger parse so that we can call .then on the function and using async
      $http.get(specialScheduleURL).then(function(data){
        //Initialize variables:
        var calEvents = icalFeed.parseCalendar(data.data);
        var collabDays = [];
        var CT = {};
        var CP = {};
        var specialSchedule = {};

        //Iterate over the calendar events
        for(i=0; i < calEvents.length; i++){
          //If it's a timed event (not a day-long event)
          if(calEvents[i].type == "time" && !!calEvents[i].endTime){
            //Community Time
            if(
              ((calEvents[i].startTime.getHours() == 9 && calEvents[i].startTime.getMinutes() == 45) ||   //Starts at 9:45
                (calEvents[i].startTime.getHours() == 9 && calEvents[i].startTime.getMinutes() == 50)) && //  or      9:50
              ((calEvents[i].endTime.getHours() == 10 && calEvents[i].endTime.getMinutes() == 10) ||      //Ends   at 10:10
                (calEvents[i].endTime.getHours() == 10 && calEvents[i].endTime.getMinutes() == 15))) {    //  or      10:15

              //If community time already has an event scheduled, appends event name
              if(CT[dateToDayString(calEvents[i].startTime)]) {

                //Fixes Duplicate events - TODO: Figure out why this bug occurs
                if(CT[dateToDayString(calEvents[i].startTime)] != calEvents[i].title){
                  CT[dateToDayString(calEvents[i].startTime)] += " & "+calEvents[i].title;
                }
              }
              //Otherwise, just set the variable to the event title
              else {
                CT[dateToDayString(calEvents[i].startTime)] = calEvents[i].title;
              }
            }

            //CP
            else if(
                ((calEvents[i].startTime.getHours() == 14 && calEvents[i].startTime.getMinutes() == 45) || //Starts at 2:45
                (calEvents[i].startTime.getHours() == 14 && calEvents[i].startTime.getMinutes() == 40) ||  //  or      2:40
                (calEvents[i].startTime.getHours() == 14 && calEvents[i].startTime.getMinutes() == 35))    //  or      2:35

              && ((calEvents[i].endTime.getHours() == 15 && calEvents[i].endTime.getMinutes() == 25) ||    //Ends at   3:25
                (calEvents[i].endTime.getHours() == 15 && calEvents[i].endTime.getMinutes() == 30) ||      //  or      3:30
                (calEvents[i].endTime.getHours() == 15 && calEvents[i].endTime.getMinutes() == 15))){      //  or      3:15

              //If CP already has an event scheduled, append current event name
              if(CP[dateToDayString(calEvents[i].startTime)]){
                CP[dateToDayString(calEvents[i].startTime)] += " & "+calEvents[i].title;
              }
              //Otherwise, just set the variable to the event title
              else{
                CP[dateToDayString(calEvents[i].startTime)] = calEvents[i].title;
              }
            }

            //Assembly
            else if(calEvents[i].title.indexOf("Assembly") != -1){

              //Switch based on assembly length
              switch ((calEvents[i].endTime.getTime() - calEvents[i].startTime.getTime())/60000){
                case 60:  //60 minutes
                  specialSchedule[dateToDayString(calEvents[i].endTime)] = "Assembly 60 Minutes";
                  break;
                case 35:  //35 minutes
                  specialSchedule[dateToDayString(calEvents[i].endTime)] = "Assembly 35 Minutes";
                  break;
                case 40:
                  specialSchedule[dateToDayString(calEvents[i].endTime)] = "Assembly 40 Minutes";
                  break;
                default:  //Else
                  //Check for Winter Festival Schedule
                  if(calEvents[i].title.indexOf("Winter Festival") != -1){
                    specialSchedule[dateToDayString(calEvents[i].endTime)] = "Winter Festival";
                  }
                  //Unknown assembly
                  else{
                    console.log("Unknown Assembly:");
                    console.log(calEvents[i]);
                    console.log((calEvents[i].endTime.getTime() - calEvents[i].startTime.getTime())/60000);
                    specialSchedule[dateToDayString(calEvents[i].endTime)] = "Unknown Assembly";
                  }
                  break;
              }
            }else{
              //console.log("Unknown: "+calEvents[i].startTime.getHours() +" : "+calEvents[i].startTime.getMinutes()+" - "+calEvents[i].endTime.getHours() +" : "+calEvents[i].endTime.getMinutes());
            }

          }
          //If it's a day type event (occurs for the whole day)
          else if(calEvents[i].type == "day"){
            if(calEvents[i].title.toLowerCase().indexOf("review day") != -1){
              specialSchedule[dateToDayString(calEvents[i].time)] = "Review Day";
            }
            /*
            // Faculty Collaboration day implementation commented out since using alternate calendar.
            // For faster performance but lower accuracy, uncomment this and remove the first calendar parse.
            if(calEvents[i].title.indexOf("Collab") != -1 && calEvents[i].title.indexOf("Fac") != -1){
              facultyCollabDays.push(dateToDayString(calEvents[i].time));
            }*/
          }
          else{
            //Unknown event type
            console.log("Unknown type: ");
            console.log(calEvents[i]);
          }
        }
        //Community time schedule update in storage and in runtime
        localStorage.setItem("CTSchedule", JSON.stringify(CT));
        CTSchedule = CT;

        //CP Schedule update in storage and in runtime
        localStorage.setItem("CPSchedule", JSON.stringify(CP));
        CPSchedule = CP

        //Special Schedule update in storage and in runtime
        localStorage.setItem("ScheduledDays", JSON.stringify(specialSchedule));
        scheduledDays = specialSchedule;

        //Update the last refresh time
        localStorage.setItem("lastScheduleRefresh", Date.now());

        //Updates the current schedule type to reflect new information
        updateCurrentSchedule();
        return true;
      }, function(){
        return false;
      }).then(function(value){
        if(value == false){
          return false;
        }
        return $http.get(assemblyOverrideURL).then(function(data){
            list = data.data
            manualOverriddenSchedules = {};
            for(var i = 0; i < list.length; i++){
              var day = list[i].date;
              var type = list[i].type;
              if(type == "automatic"){
                console.log(list[i].name);
                scheduledDays[day] = list[i].name;
              }else if(type == "manual"){
                scheduledDays[day] = "manual";
                manualOverriddenSchedules[day] = list[i].classes;
              }
            }
            localStorage.setItem("ScheduledDays", JSON.stringify(scheduledDays));
            localStorage.setItem("manualOverriddenSchedules", JSON.stringify(manualOverriddenSchedules));
            return true;
          },function(){return false;});
      })
    ])
    .then(function(values){
      success = !values.includes(false);
      refreshing = false;
      $rootScope.$broadcast("scheduleRefreshComplete", {success:(success)});
      return success;
    });
  }

  return {
    isRefreshing: function(){return refreshing;},
    refresh: refreshData,  //Triggers a full schedule refresh from the internet
    get: function(id){
      return curSchedule[id];  //returns the current schedule list element of index id
    },
    getCTSchedule: function(){ //Returns the scheduled activity for community time for the current day
      if(CTSchedule != null && CTSchedule[dateToDayString(curDay)] != undefined){
        return CTSchedule[dateToDayString(curDay)];
      }
      return "Community Time";
    },
    getCPSchedule: function(){ //Returns the scheduled activity for conference for the current day
      if(CPSchedule != null && CPSchedule[dateToDayString(curDay)] != undefined){
        return CPSchedule[dateToDayString(curDay)];
      }
      return "CP";
    },
    getForDay: function(d){
      var oldDay = curDay;
      curDay = d;
      updateCurrentSchedule();
      var temp = curSchedule;
      curDay = oldDay;
      updateCurrentSchedule();
      return temp;
    },
    getTypes: function(){
      return typeList; //Returns the schedule type list
    },
    getToday: function(){
      return curSchedule; //Returns the current full Schedule for today
    },
    getCurrentScheduleName: function(){ //returns the current schedule type index
      return curScheduleName;
    },
    setCurrentType: function(newSched){ //sets the current schedule type to the given type
      curSchedule =  newSched;
    },
    setOverride: function(val){ //Turns schedule override mode on or off
      schedOverride = val;
    },
    changeDay: function(day){ //updates the current date
      curDay = day;
      updateCurrentSchedule();
    },
    getCurrentDay: function(){
      return curDay;
    }
  }
}).factory('MySchedule', function(Schedule, LetterDay, $localForage){
  var myClasses;
  var modified = false; //modified variable to update the main schedule interface

  function reload(){
    myClasses = JSON.parse(localStorage.getItem("myClasses"));
    //If invalid storage or myClasses
    if(!!myClasses && !!myClasses.block){
      localStorage.setItem("myClasses", null);
      $localForage.setItem("myClasses", myClasses);
    }else{
      myClasses = {"block":[], "flex":[], "CP":[]};
      $localForage.getItem("myClasses").then(function(value){
        if(value != null){
          myClasses = value;
        }
      })
    }
  }

  reload(); //Loads the current classes from local storage

  return {
    isChanged: function(){
      return modified; //Accessor for whether or not user classes were updated
    },
    setChanged: function(val){
      modified = val; //Modifier for whether or not user classes were updated
    },
    load: function(){
      reload();
      modified = true;
    },
    getAll: function(){
      return myClasses; //returns all classes
    },
    getAllType: function(id){
      return myClasses[id]; //returns all classes of type "id"
    },
    get: function(type, time){
      //Iterate through all classes of type "type" for one that matches the given time
      for(var i = 0; i < myClasses[type].length; i++){
        if(myClasses[type][i].time.id == time){
          return myClasses[type][i];
        }
      }
      return undefined; //Returns undefined if it couldn't find a class
    },
    set: function(type, cls){
      for(var i = 0; i < myClasses[type].length; i++){
        if(cls.time == myClasses[type][i].time){
          myClasses[type][i] = cls;
          return cls;
        }
      }
      myClasses[type].push(cls);
      return cls;
    },
    removeClass: function(type, cls){
      for(var i = 0; i < myClasses[type].length; i++){
        if(cls == myClasses[type][i]){
          myClasses[type].splice(i,1);
          return true;
        }
      }
      return false;
    },
    removeClassById: function(type, id){
      myClasses[type].splice(id,1);
    },
    addClass: function(cls){
      console.log(cls);
      myClasses[cls.type].push(cls);
    },
    addClassWithType: function(type, cls){
      //Deprecated function to add a class to a specific place
      console.warn("Add Class with Type is deprecated, please use Add Class");
      myClasses[type].push(cls);
    },
    save: function(){
      $localForage.setItem("myClasses", myClasses);
      //localStorage.setItem("myClasses", JSON.stringify(myClasses));
      modified = true;
    }
  }
})

//RSS Parsing
.factory('rssFeed', function(){
  return {
    //Parses and rss feed that is in XML format
    parseXML: function(data){
      var list = [];
      while(data.indexOf("<item>") != -1){ //While there are still items in the feed
        data = data.substring(data.indexOf("<item>"));
        //Gets the title between the title tags
        var title = data.substring(data.indexOf("<title>")+8, data.indexOf("</title>"))
        title = title.substring(title.indexOf("CDATA[")+6);
        title = title.substring(0, title.indexOf("]"));
        //Gets the article link (NOT YET IMPLEMENTED)
        var link = data.substring(data.indexOf("<link>")+6, data.indexOf("</link>")); //TODO: Implement article linking to the pingry site
        //Parsing of the article for the description
        var temp = data.substring(data.indexOf("<description>")+13, data.indexOf("</description>"));
        var desc = "";
        while(temp.indexOf("CDATA[") != -1){
          temp = temp.substring(temp.indexOf("CDATA[")+6);
          //Removes any stray brackets from the parse
          while(temp.indexOf("[")!= -1 && temp.indexOf("[") < temp.indexOf("]")){
            temp = temp.substring(0, temp.indexOf("["))+temp.substring(temp.indexOf("]")+1)
          }
          desc += temp.substring(0, temp.indexOf("]"));
          temp = temp.substring(temp.indexOf("]")+3);
        }
        var rawDesc = desc;
        var img = "";

        //Parses the description to remove all HTML tags to help with pretty printing
        //rawDesc is a variable that contains the raw, unparsed description
        while(desc.indexOf("<")!= -1){
          if(desc.substring(desc.indexOf("<")+1, desc.indexOf("<")+4) == "img"){
            img = desc.substring(desc.indexOf("<")+1, desc.indexOf(">"));
            img = img.substring(img.indexOf('src="')+5);
            img = img.substring(0,img.indexOf('"'));
            if(img.substring(0,7) != "http://" && img.substring(0,8) != "https://"){
              img = 'http://www.pingry.org'+img;
            }
          }else if(desc.substring(desc.indexOf("<")+1, desc.indexOf(">")+3) == "br"){
            desc = desc.substring(0, desc.indexOf("<"))+"\n"+desc.substring(desc.indexOf("<"));
          }
          desc = desc.substring(0, desc.indexOf("<")) + desc.substring(desc.indexOf(">")+1);
          //desc = desc.substring(0, desc.indexOf("<")) + desc.substring(desc.indexOf(">"+1));
        }

        //Published date of the article (NOT YET IMPLEMENTED)
        var date = parseStringForDate(data.substring(data.indexOf("<pubDate>")+9, data.indexOf("</pubDate")));
        data = data.substring(data.indexOf("</item>")+7); //updates the parse to avoid readding the same item
        //Image uses an inline if statement so that it returns the word "none" as a url if there is no image, or it returns the correct URL with pingry.org added
        list.push({"title":title, "image":img==""?'none':img, "link":link, "description":desc, "rawDescription":rawDesc, "date":date.getTime()});
      }
      return list;
    },
    //Function to fix all src attributes in the HTML tags to include pingry.org
    parseRawDescription: function(desc){
      var i = 0;
      var parse = desc;
      desc = "";
      while(parse.indexOf("src=") != -1){ //While there are src elements in the parse
        //Adds the first portion until the src attribute
        desc += parse.substring(0,parse.indexOf("src=")+5);
        //Updates parse to avoid infinite loop over the same item
        parse = parse.substring(parse.indexOf("src=")+5);
        if(parse.substring(0,7) != "http://" && parse.substring(0,8) != "https://"){
          //Insert the extra portion needed in the URL
          desc += "http://www.pingry.org";
        }
      }
      desc += parse; //Add the remaining portion to the end of the string
      return desc;
    }
  }
})

//Used to parse an icalendar feed
//Used for letter day parsing, special schedule parsing, community time events, and more calendars on the school website
.factory('icalFeed', function(){
  function weekdayToNum(str){
    switch(str){
      case "SU":
        return 0;
      case "MO":
        return 1;
      case "TU":
        return 2;
      case "WE":
        return 3;
      case "TH":
        return 4;
      case "FR":
        return 5;
      case "SA":
        return 6;
      default:
        return -1;
    }
  }

  return {
    //The main function to parse a calendar content
    parseCalendar: function(data){
      //List of events
      var list = [];
      //While there is an event left in the string
      while(data.indexOf("BEGIN:VEVENT") != -1){
        //String of the currrent event
        var event = data.substring(data.indexOf("BEGIN:VEVENT"), data.indexOf("END:VEVENT"));
        //Unique identifier of the event
        var uid = event.substring(event.indexOf("UID:")+4);
        uid = uid.substring(0, Math.min(uid.indexOf("\r"), uid.indexOf("\n")));
        //Name of the event
        var title = event.substring(event.indexOf("SUMMARY:")+8);
        title = title.substring(0, Math.min(title.indexOf("\r"), title.indexOf("\n")));
        //Location of the event
        var loc = "";
        if(event.indexOf("LOCATION") != -1){
          loc = event.substring(event.indexOf("LOCATION:")+9);
          loc = loc.substring(0, Math.min(loc.indexOf("\r"), loc.indexOf("\n")));
          loc = loc.replace(/\\/g, "");
        }
        //Start time of the event
        var dtstart = event.substring(event.indexOf("DTSTART")+7);
        dtstart = dtstart.substring(0, Math.min(dtstart.indexOf("\r"), dtstart.indexOf("\n")));
        var dtend; //End time of the event
        var type; //type of event (day long or time-based) (This is a custom field not found in the ical file)

        //Normal Day-type event
        if(dtstart.indexOf("VALUE=") != -1){
          type="day";
          //Eliminates extra text on the beginning of the date
          dtstart = dtstart.substring(dtstart.indexOf("VALUE=")+6);
          if(dtstart.substring(0, 5) == "DATE:"){
            dtstart = dtstart.substring(5);
          }
          //Parses the start time and converts it to a javascript date
          dtstart = parseStringForDate(dtstart);
        }

        //Normal Time-type event:
        else if(dtstart.substring(0,1) == ":"){
          type="time";
          //Eliminate extra colon
          dtstart = dtstart.substring(1);
          //Parse the strings for javascript dates

          dtstart = parseStringForDate(dtstart);


          //Parse for the event end time
          if(event.indexOf("DTEND") != -1){
            dtend = event.substring(event.indexOf("DTEND:")+6);
            dtend = dtend.substring(0, Math.min(dtend.indexOf("\r"), dtend.indexOf("\n")));
            dtend = parseStringForDate(dtend);
          }else{
            dtend = "";
          }
        }

        //Time-based event that Includes Timezone
        else if(dtstart.indexOf("TZID") != -1){
          type="time";
          //Eliminate extra content
          dtstart = dtstart.substring(dtstart.indexOf("TZID=")+5);
          //Parse the end time
          if(event.indexOf("DTEND") != -1){
            dtend = event.substring(event.indexOf("DTEND")+6);
            dtend = dtend.substring(0, Math.min(dtend.indexOf("\r"), dtend.indexOf("\n")));
            dtend = dtend.substring(dtend.indexOf("TZID=")+5);
          }else{
            dtend = "";
          }
          //Assuming EST time zone -- otherwise fails
          if(dtstart.substring(0,17) == "America/New_York:"){
            //Remove the America/New_York time zone identifier
            dtstart = dtstart.substring(17);
            //Parse for times
            dtstart = parseStringForDate(dtstart);

            if(dtend != ""){
              dtend = dtend.substring(17);
              //dtstart = new Date(dtstart.substring(0,4), parseInt(dtstart.substring(4,6))-1, dtstart.substring(6,8), dtstart.substring(9,11), dtstart.substring(11,13), dtstart.substring(13,15));
              dtend = parseStringForDate(dtend);
            }
          }else{
            //If a time zone other than America/New_York
            type="unknown";
          }
        }
        else{
          //If it isn't one of the above timing types
          type="unknown";
        }

        //If an element contains a recurrence-id this means it is part of a sequence, except it was modified
        //THe recurrence id contains the id of the event that should have been part of the series
        //This element's attributes are the correctly modified attributes of the event
        //We just add a "reccurenceId" attribute to the object during parsing and after parsing remove the incorrect object
        if(event.indexOf("RECURRENCE-ID") != -1){
          var recId = event.substring(event.indexOf("RECURRENCE-ID")+14);
          recId = recId.substring(0, Math.min(recId.indexOf("\r"), recId.indexOf("\n")));
          recId = recId.substring(recId.indexOf(":")+1);
          //Parse for JS Date
          recId = new Date(recId.substring(0,4), parseInt(recId.substring(4,6))-1, recId.substring(6,8), recId.substring(9,11), recId.substring(11,13), recId.substring(13,15));

          //Add the object to the list to be dealt with later after parsing
          var obj = {"uid":uid, "title":title, "type":type, "location":loc, "recurrenceId":recId};
          if(type == "day"){
            obj.time = dtstart;
          }else if(type == "time"){
            obj.startTime = dtstart;
            if(dtend != ""){
              obj.endTime = dtend;
            }
          }
          list.push(obj);
        }

        //This is to check if the event recurs
        else if(event.indexOf("RRULE:") != -1){
          //A string to help with parsing of the next objects
          var recurrence = event.substring(event.indexOf("RRULE:"));
          recurrence = recurrence.substring(0, Math.min(recurrence.indexOf("\r"), recurrence.indexOf("\n")));

          //The date the pattern repeats until
          var until = recurrence.substring(recurrence.indexOf("UNTIL")+6);
          until = until.substring(0, until.indexOf(";"));
          //Convert the string into a JS date
          until = parseStringForDate(until);
          //The frequency of the repeat (Yearly, Monthly, Weekly, or Daily)
          var freq = recurrence.substring(recurrence.indexOf("FREQ")+5);
          freq = freq.substring(0, freq.indexOf(";"));

          var byday;

          //Yearly repeating has not been implemented since no events so far repeat yearly
          //If necessary, they can be implemented here
          if(freq == "YEARLY"){

          }
          //Monthly repeating events
          else if(freq == "MONTHLY"){
            //If it repeats by a specific day of the month (only currently implemented method of monthly repetition)
            if(recurrence.indexOf("BYDAY") != -1) {
              //Days of the month it repeats by
              byday = recurrence.substring(recurrence.indexOf("BYDAY")+6);

              //Format of BYDAY will look something like: "1MO,2WE,3TH" or "5WE" or "2TU"
              //The first number is the week number (FIRST monday or SECOND Thursday)
              //The second two characters identify the day of the week (MO is Monday and TU is Tuesday)
              var weekNums = []; //contains the week number (First, Second, Third)
              var byDays = []; // contains the weekday (Monday, Tuesday, Wednesday)
              while(byday.length > 1){
                weekNums.push(parseInt(byday.substring(0,1)));
                byDays.push(weekdayToNum(byday.substring(1,3)));
                byday = byday.substring(4);
              }
              
              //Date exceptions to the repeating rule
              var exdates = [];
              var parse = event.substring(event.indexOf("EXDATE"));
              //While there are still dates left to parse for
              while(parse.indexOf("EXDATE") != -1){
                //Temporarily hold the current exdate in temp variable
                var temp = parse.substring(parse.indexOf("EXDATE")+7, Math.min(parse.indexOf("\r"), parse.indexOf("\n")));
                temp = temp.substring(temp.indexOf(":")+1);
                //Parse for a date
                temp = parseStringForDate(temp);
                //Add the date to an array
                exdates.push(dateToDayString(temp));
                //Remove the parsed date from the string
                parse = parse.substring(parse.indexOf("\n")+1);
              }

              //Repetition starts at the current day
              var curDay = dtstart;
              if(type=="time" && dtend != ""){
                //Length of the event (in milliseconds) (if applicable)
                timeDiff = dtend.getTime() - dtstart.getTime();
              }
              //While we should add dates
              while(curDay.getTime() <= until.getTime()){
                //The month we should be in
                var curMonth = curDay.getMonth();
                for(var i=0; i<byDays.length; i++){
                  curDay.setDate(1);
                  //Gets the nth occurence of a weekday in a month (Credits: Aditya Gollapudi):
                            if(byDays[i] >= curDay.getDay()){
                              curDay.setDate(((byDays[i] - curDay.getDay())+(7*(weekNums[i]-1))) + 1);
                            }else{
                              curDay.setDate(((7-curDay.getDay()) + byDays[i]) + (7*(weekNums[i] - 1)) + 1);
                            }

                  //Makes sure we are in the same month (if there isn't a 5th Wednesday for example so it goes into the next month)
                  if(curDay.getMonth() == curMonth){
                    //If it isn't a date exception
                    if(!exdates.includes(dateToDayString(curDay))){
                      //add the object to the list of events
                      var obj = {"uid":uid, "title":title, "type":type, "location":loc, "recurring":true}
                      if(type == "day"){
                        obj.time = curDay;
                      }else if(type == "time"){
                        obj.startTime = new Date(curDay);
                        if(!!timeDiff){
                          obj.endTime = new Date(curDay.getTime() + timeDiff); //Add the time difference back on
                        }
                      }
                      list.push(obj);
                    }
                  }
                }
                //Increments the month
                curDay.setMonth(curMonth+1);
                curDay.setDate(1);
              }
            }
          }
          //Weekly repeating events
          else if(freq == "WEEKLY"){
            //Find how it repeats
            byday = recurrence.substring(recurrence.indexOf("BYDAY")+6);
            var days = [];
            while(byday.length > 1){
              days.push(weekdayToNum(byday.substring(0,2)));
              byday = byday.substring(3);
            }
            //Days array will now contain an array of weekday numbers
            // (e.g. [1, 2] for Monday and Tuesday or [5] for Friday or [1,2,3,4,5] for Monday through Friday)

            //Date exemptions (dates when the repetition doesn't apply)
            var exdates = [];
            var parse = event.substring(event.indexOf("EXDATE"));
            while(parse.indexOf("EXDATE") != -1){
              //Find the first date
              var temp = parse.substring(parse.indexOf("EXDATE")+7, parse.indexOf("\n"));
              //Eliminate extra padding
              temp = temp.substring(temp.indexOf(":")+1);
              //Parse the string for a JS date
              temp = parseStringForDate(temp);
              //Add the date in string form to the array
              exdates.push(dateToDayString(temp));
              //Move to the next event
              parse = parse.substring(parse.indexOf("\n")+1);
            }
            //gets the start time of the repeating event
            var curDay = dtstart;
            if(type=="time" && dtend != ""){
              //If there is a time based repeating event, store the event length
              timeDiff = dtend.getTime() - dtstart.getTime();
            }

            //For each event
            while(curDay.getTime() <= until.getTime()){
              //Starts at Sunday
              curDay.setDay(0);
              //For each day of the week the event should repeat for
              for(var i=0; i<days.length; i++){
                //Sets the day of the week to that day
                curDay.setDay(days[i]);
                //If this date is not an exempt date
                var exists = false;
                if(!exdates.includes(dateToDayString(curDay))){
                  //Add the date to the list of events
                  var obj = {"uid":uid, "title":title, "type":type, "location":loc, "recurring":true}
                  //Figure out timing of the event
                  if(type == "day"){
                    obj.time = curDay;
                  }else if(type == "time"){
                    obj.startTime = new Date(curDay.getTime());
                    if(!!timeDiff){
                      obj.endTime = new Date(curDay.getTime() + timeDiff);
                    }
                  }
                  list.push(obj);
                }
              }
              //Goes to the next week
              curDay.setDate(curDay.getDate()+7);
            }
          }
        }

        //Normal, non-repeating event
        else{
          //Add the object to the array of events
          var obj = {"uid":uid, "title":title, "location":loc, "type":type};
          if(type == "day"){
            obj.time = dtstart;
          }else if(type == "time"){
            obj.startTime = dtstart;
            if(dtend != "")
              obj.endTime = dtend;
          }else{
            //Log unknown event types to the console
            //Still adds them but doesn't
            console.log("Unknown event: ");
            console.log(obj);
          }
          list.push(obj);
        }
        //Adjust parse to get the next event
        data = data.substring(data.indexOf("END:VEVENT")+10);
      }

      //Sorting algorithm to sort events by descending order for easy debugging
      /*
      list.sort(function(a,b){
        if(a.type == "unknown"){
          return -1;
        }
        return (a.type=="time"?a.startTime:a.time).getTime() > (b.type=="time"?b.startTime:b.time).getTime()?-1:1;
      })
      console.log(list);
      */
      //Parsing to fix reccurring events
      //Fixing Recurrence Id to work and override the events
      //For each object in the array
      for(var i =0; i < list.length; i++){
        //If it has a recurrenceId
        if(list[i].recurrenceId !== undefined){
          found = false
          //Loop through to find the event that the recurrenceId refers to
          for(var j=0; j < list.length; j++){
            //If it matches times and it is not the object we just got
            if(list[j].type == "time" && i!=j){
              if(list[i].recurrenceId.getTime() == list[j].startTime.getTime() && list[i].uid == list[j].uid){
                //Delete the object (since it's been overridden)
                list.splice(j,1);
                if(j < i){
                  i--;
                }
                found = true;
                //Break out of the loop and move to the next object
                break;
              }
            }
          }
          if(!found){
            console.log("Not Found: ");
            console.log(list[i]);
          }
        }
      }
      return list;
    }
  }
})

//Service for scheduling notifications
.factory("Notifications", function(LetterDay, $cordovaLocalNotifications){
  //Array of reminders
  var reminders = [];

  function refresh(){
    //Load reminders from the local storage
    reminders = localStorage.getItem("reminders");
    //If there aren't any reminders stored
    if(reminders == null || reminders == undefined || reminders == ""){reminders = [];} //If no reminders, initialize to an empty array
    else{
      //JSON parse the string
      reminders = JSON.parse(reminders);
      //Fix the JSON parse of dates
      for(var i = 0; i < reminders.length; i++){
        reminders[i].time.time = parseStringForDate(reminders[i].time.time);

        //Convert the date (since a single date is stored) to a JS Date
        reminders[i].time.date = parseStringForDate(reminders[i].time.date);
      }
    }
  }

  //Refresh the reminders from the local storage
  refresh();

  //Schedule all of the events in the reminders array
  function scheduleAll(){
    //Removes all prior scheduled notifications
    $cordovaLocalNotifications.cancelAll();
    //For each reminder
    for(var i = 0; i < reminders.length; i++){

      //Weekday repeat type
      if(reminders[i].type == "weekday"){
        //Start with today
        var d = new Date();
        //Set the Hours and minutes the the proper time
        d.setHours(reminders[i].time.time.getHours());
        d.setMinutes(reminders[i].time.time.getMinutes());
        //Reset seconds and milliseconds
        d.setSeconds(0);
        d.setMilliseconds(0);
        //Set the weekday to the right day
        d.setDay(parseInt(reminders[i].time.day));
        //Only schedule the next 100 to minimize storage load (Should last ~2 years)
        for(var j = 0; j < 100; j++){
          scheduleNotification(i*100+j, d, reminders[i].description)
          d.setDate(d.getDate()+7);
        }
      }

      //Letter Day repeat type
      else if(reminders[i].type == "letter"){
        //Gets all the future dates of
        var dates = LetterDay.getDatesOf(reminders[i].time.day);
        //Amount of notifications scheduled
        var amount = 0;
        //Schedules until runs out or just the next 100
        for(var j = 0; j < dates.length && amount < 100; j++){
          //Sets the day to the given date
          var d = new Date(dates[j]);
          //Set the hours and minutes to the proper time
          d.setHours(reminders[i].time.time.getHours());
          d.setMinutes(reminders[i].time.time.getMinutes());
          if(d.getTime() > Date.now()){
            //Schedule the notification
            //Ensures unique id by multiplying by 100 and adding j
            scheduleNotification(i*100 + j, d, reminders[i].description);
            amount++;
          }
        }
      }

      //Single event
      else if(reminders[i].type == "single"){
        //Date of the event
        var date = reminders[i].time.date;
        //Time of the event
        var time = reminders[i].time.time;
        //Date + Time combined to schedule the event for the notification
        var schedDate = new Date(date.getFullYear(), date.getMonth(), date.getDate(), time.getHours(), time.getMinutes());
        scheduleNotification(i*100, schedDate, reminders[i].description);
      }
    }
  }

  function scheduleNotification(id, date, desc){
    //Schedules a notification with the given parameters
    if(date.getTime() >= Date.now()){
      $cordovaLocalNotifications.schedule({
        id: id,
        at: date,
        text: desc,
        title: "Pingry",
        led: 'FFFFFF'
      });
    }else{
      console.log("Cancelled scheduling "+desc+" at "+date+" because it was too early.");
    }
  }

  return {
    getAll: function(){
      //Returns all the reminders
      return reminders;
    },
    get: function(num){
      //Returns the reminder at index num
      return reminders[num];
    },
    reschedule: scheduleAll, //Schedules all the notifications
    update: function(){
      //Update the localstorage and reschedule all notifications
      localStorage.setItem("reminders", JSON.stringify(reminders));
      scheduleAll();
    },
    add: function(reminder){
      //Adds the reminder to the list of remidners
      reminders.push(reminder);
    },
    remove: function(ind){
      //removes the reminder at index ind
      reminders.splice(ind, 1);
    },
    reset: function(){

    }
  }
})

//Messaging provider through cordova toast
.factory("Messages", function($cordovaToast){
  function hide(){
    //Forces all the current toast messages to hide
    $cordovaToast.hide();
  }
  return {
    showError: function(msg){
      //Shows a message in the center of the screen with a red background and white text
      hide();
      $cordovaToast.showWithOptions({message:msg, position:"bottom", duration:"short", styling:{backgroundColor:"#F73333"}});
    },
    showSuccess: function(msg){
      //Shows a message at the bottom of the screen with a green background
      hide();
      $cordovaToast.showWithOptions({message:msg, position:"bottom", duration:"short", styling:{backgroundColor:"#53ed53"}});
    },
    showNormal: function(msg){
      //Shows a normal message
      hide();
      $cordovaToast.showShortBottom(msg);
    },
    forceHide: hide
  }
})

.factory("AthleticCalendars", function(){
  return {
    getCalendars: function(){
      /*
        Short javascript to run in the console on (http://www.pingry.org/cf_athletics/cms_athletic_feeds.cfm) to get a list of the links:

        var str = "";
        for(var i = 0; i < document.getElementsByClassName("athletics_alert_btn").length; i++){
          var t = document.getElementsByClassName("athletics_alert_btn")[i].parentNode.children[2].getAttribute("href");
          var temp = '["'+document.getElementsByClassName("athletics_alert_btn")[i].parentNode.children[0].innerHTML+'", "http://www.pingry.org/calendar/team_'+t.substring(t.indexOf("eventid=")+8)+'.ics"],\n';
          if(temp.indexOf("Middle School") != -1 || temp.indexOf("MS") != -1){
            temp = "//"+temp;
          }
          str += temp;
        }
        console.log(str);

      */
      return calendars = [
        ["Baseball - Boys Junior Varsity", "http://www.pingry.org/calendar/team_119.ics"],
        //["Baseball - Boys Middle School A", "http://www.pingry.org/calendar/team_210.ics"],
        //["Baseball - Boys Middle School B", "http://www.pingry.org/calendar/team_211.ics"],
        //["Baseball - Boys MS", "http://www.pingry.org/calendar/team_223.ics"],
        ["Baseball - Boys Varsity", "http://www.pingry.org/calendar/team_121.ics"],
        ["Basketball - Boys Frosh", "http://www.pingry.org/calendar/team_222.ics"],
        ["Basketball - Boys Junior Varsity", "http://www.pingry.org/calendar/team_123.ics"],
        //["Basketball - Boys Middle School A", "http://www.pingry.org/calendar/team_124.ics"],
        //["Basketball - Boys Middle School B", "http://www.pingry.org/calendar/team_207.ics"],
        //["Basketball - Boys Middle School C", "http://www.pingry.org/calendar/team_230.ics"],
        ["Basketball - Boys Varsity", "http://www.pingry.org/calendar/team_125.ics"],
        ["Basketball - Girls Junior Varsity", "http://www.pingry.org/calendar/team_126.ics"],
        //["Basketball - Girls Middle School A", "http://www.pingry.org/calendar/team_205.ics"],
        //["Basketball - Girls Middle School B", "http://www.pingry.org/calendar/team_206.ics"],
        ["Basketball - Girls Varsity", "http://www.pingry.org/calendar/team_127.ics"],
        ["Cross Country -  Frosh", "http://www.pingry.org/calendar/team_251.ics"],
        ["Cross Country - Boys Junior Varsity", "http://www.pingry.org/calendar/team_249.ics"],
        ["Cross Country - Boys Varsity", "http://www.pingry.org/calendar/team_97.ics"],
        //["Cross Country - Coed MS", "http://www.pingry.org/calendar/team_99.ics"],
        ["Cross Country - Girls Junior Varsity", "http://www.pingry.org/calendar/team_250.ics"],
        ["Cross Country - Girls Varsity", "http://www.pingry.org/calendar/team_100.ics"],
        ["Fencing - Boys Varsity", "http://www.pingry.org/calendar/team_129.ics"],
        //["Fencing - Coed MS", "http://www.pingry.org/calendar/team_130.ics"],
        ["Fencing - Girls Varsity", "http://www.pingry.org/calendar/team_132.ics"],
        ["Field Hockey - Girls Junior Varsity", "http://www.pingry.org/calendar/team_37.ics"],
        //["Field Hockey - Girls MS", "http://www.pingry.org/calendar/team_38.ics"],
        ["Field Hockey - Girls Varsity", "http://www.pingry.org/calendar/team_39.ics"],
        ["Football - Boys Junior Varsity", "http://www.pingry.org/calendar/team_34.ics"],
        //["Football - Boys MS", "http://www.pingry.org/calendar/team_35.ics"],
        ["Football - Boys Varsity", "http://www.pingry.org/calendar/team_36.ics"],
        ["Golf - Boys Junior Varsity", "http://www.pingry.org/calendar/team_212.ics"],
        ["Golf - Boys Varsity", "http://www.pingry.org/calendar/team_135.ics"],
        ["Golf - Girls Junior Varsity", "http://www.pingry.org/calendar/team_213.ics"],
        ["Golf - Girls Varsity", "http://www.pingry.org/calendar/team_138.ics"],
        ["Ice Hockey - Boys Junior Varsity", "http://www.pingry.org/calendar/team_139.ics"],
        ["Ice Hockey - Boys Varsity", "http://www.pingry.org/calendar/team_140.ics"],
        //["Ice Hockey - Coed MS", "http://www.pingry.org/calendar/team_141.ics"],
        ["Ice Hockey - Girls Varsity", "http://www.pingry.org/calendar/team_142.ics"],
        ["Lacrosse - Boys Frosh", "http://www.pingry.org/calendar/team_143.ics"],
        ["Lacrosse - Boys Junior Varsity", "http://www.pingry.org/calendar/team_144.ics"],
        //["Lacrosse - Boys Middle School A", "http://www.pingry.org/calendar/team_214.ics"],
        //["Lacrosse - Boys Middle School B", "http://www.pingry.org/calendar/team_215.ics"],
        //["Lacrosse - Boys MS", "http://www.pingry.org/calendar/team_145.ics"],
        ["Lacrosse - Boys Varsity", "http://www.pingry.org/calendar/team_146.ics"],
        ["Lacrosse - Girls Frosh", "http://www.pingry.org/calendar/team_147.ics"],
        ["Lacrosse - Girls Junior Varsity", "http://www.pingry.org/calendar/team_148.ics"],
        //["Lacrosse - Girls Middle School A", "http://www.pingry.org/calendar/team_216.ics"],
        //["Lacrosse - Girls Middle School B", "http://www.pingry.org/calendar/team_217.ics"],
        //["Lacrosse - Girls MS", "http://www.pingry.org/calendar/team_224.ics"],
        ["Lacrosse - Girls Varsity", "http://www.pingry.org/calendar/team_150.ics"],
        ["Ski Team - Boys Junior Varsity", "http://www.pingry.org/calendar/team_228.ics"],
        ["Ski Team - Boys Varsity", "http://www.pingry.org/calendar/team_201.ics"],
        ["Ski Team - Girls Junior Varsity", "http://www.pingry.org/calendar/team_229.ics"],
        ["Ski Team - Girls Varsity", "http://www.pingry.org/calendar/team_202.ics"],
        ["Soccer - Boys Frosh", "http://www.pingry.org/calendar/team_59.ics"],
        ["Soccer - Boys Junior Varsity", "http://www.pingry.org/calendar/team_6.ics"],
        //["Soccer - Boys Middle School A", "http://www.pingry.org/calendar/team_155.ics"],
        //["Soccer - Boys Middle School B", "http://www.pingry.org/calendar/team_203.ics"],
        //["Soccer - Boys Middle School C", "http://www.pingry.org/calendar/team_234.ics"],
        ["Soccer - Boys Varsity", "http://www.pingry.org/calendar/team_61.ics"],
        ["Soccer - Girls Frosh", "http://www.pingry.org/calendar/team_248.ics"],
        ["Soccer - Girls Junior Varsity", "http://www.pingry.org/calendar/team_63.ics"],
        //["Soccer - Girls MS", "http://www.pingry.org/calendar/team_226.ics"],
        ["Soccer - Girls Varsity", "http://www.pingry.org/calendar/team_5.ics"],
        ["Softball - Girls Junior Varsity", "http://www.pingry.org/calendar/team_151.ics"],
        //["Softball - Girls Middle School A", "http://www.pingry.org/calendar/team_218.ics"],
        //["Softball - Girls Middle School B", "http://www.pingry.org/calendar/team_219.ics"],
        //["Softball - Girls MS", "http://www.pingry.org/calendar/team_225.ics"],
        ["Softball - Girls Varsity", "http://www.pingry.org/calendar/team_153.ics"],
        ["Squash - Boys Varsity", "http://www.pingry.org/calendar/team_158.ics"],
        ["Squash - Coed Junior Varsity", "http://www.pingry.org/calendar/team_194.ics"],
        ["Squash - Coed Varsity", "http://www.pingry.org/calendar/team_161.ics"],
        ["Squash - Girls Varsity", "http://www.pingry.org/calendar/team_162.ics"],
        ["Swimming - Boys Varsity", "http://www.pingry.org/calendar/team_163.ics"],
        //["Swimming - Coed MS", "http://www.pingry.org/calendar/team_165.ics"],
        ["Swimming - Girls Varsity", "http://www.pingry.org/calendar/team_166.ics"],
        ["Tennis - Boys Junior Varsity", "http://www.pingry.org/calendar/team_167.ics"],
        //["Tennis - Boys MS", "http://www.pingry.org/calendar/team_168.ics"],
        ["Tennis - Boys Varsity", "http://www.pingry.org/calendar/team_169.ics"],
        ["JV-2 Girls Tennis", "http://www.pingry.org/calendar/team_235.ics"],
        ["Tennis - Girls Junior Varsity", "http://www.pingry.org/calendar/team_77.ics"],
        //["Tennis - Girls MS", "http://www.pingry.org/calendar/team_78.ics"],
        ["Tennis - Girls Varsity", "http://www.pingry.org/calendar/team_79.ics"],
        ["Track - Boys Varsity", "http://www.pingry.org/calendar/team_171.ics"],
        //["Track - Coed MS", "http://www.pingry.org/calendar/team_173.ics"],
        ["Track - Girls Varsity", "http://www.pingry.org/calendar/team_175.ics"],
        ["Water Polo - Coed Junior Varsity", "http://www.pingry.org/calendar/team_89.ics"],
        //["Water Polo - Coed MS", "http://www.pingry.org/calendar/team_220.ics"],
        ["Water Polo - Coed Varsity", "http://www.pingry.org/calendar/team_221.ics"],
        ["Winter Track - Boys Varsity", "http://www.pingry.org/calendar/team_208.ics"],
        ["Winter Track - Girls Varsity", "http://www.pingry.org/calendar/team_209.ics"],
        ["Wrestling - Boys Junior Varsity", "http://www.pingry.org/calendar/team_179.ics"],
        //["Wrestling - Boys MS", "http://www.pingry.org/calendar/team_180.ics"],
        ["Wrestling - Boys Varsity", "http://www.pingry.org/calendar/team_181.ics"]
      ];
    }
  }
})

//Settings storage
.factory("Settings", function(){
  var athleticMaps = localStorage.getItem("athleticMaps");
  if(athleticMaps == "" || athleticMaps == undefined || athleticMaps == "true"){
    athleticMaps = true;
  }else{
    athleticMaps = false;
  }


  var athleticSubscription = localStorage.getItem("athleticSubscription");

  if(athleticSubscription == "" || athleticSubscription == undefined){
    athleticSubscription = "";
  }

  //Super Mode (Easter Egg!)
  var superMode = localStorage.getItem("superMode");
  if(superMode != "" && superMode != undefined && superMode != "false"){
    superMode = true;
  }else{
    superMode = false;
  }

  //Extra options storage that is unlocked by super mode
  var extraOptions = localStorage.getItem("extraOptions");
  if(extraOptions != "" && extraOptions != undefined){
    extraOptions = JSON.parse(extraOptions);
  }else{
    extraOptions = [];
  }

  function refreshExtraOptions(){
    console.log(extraOptions);
    if(extraOptions.includes("hackerTheme")){
      var elem = document.createElement("link");
      elem.rel = "stylesheet";
      elem.href = "css/hackerStyles.css";
      elem.id = "hacker-style";
      document.body.appendChild(elem);
    }else{
      if(document.getElementById("hacker-style") != null){
        document.body.removeChild(document.getElementById("hacker-style"));
      }
    }
  }

  var athleticSubscriptionChanged = false;

  refreshExtraOptions();

  return {
    getAthleticSubscription: function(){
      return athleticSubscription;
    },

    setAthleticSubscription: function(newVal){
      athleticSubscription = newVal;
      athleticSubscriptionChanged = true;
      localStorage.setItem("athleticSubscription", athleticSubscription);
      localStorage.setItem("athleticEvents", null);
      localStorage.setItem("athleticEventsRefreshTime", "");
    },

    getAthleticSubscriptionChanged: function(){
      return athleticSubscriptionChanged;
    },

    setAthleticSubscriptionChanged: function(val){
      athleticSubscriptionChanged = val;
    },

    //Gets whether or not athletic maps are enabled
    getAthleticMaps: function(){
      return athleticMaps;
    },
    //Sets whether or not athletic maps are enabled
    setAthleticMaps: function(val){
      athleticMaps = val;
      if(val){
        localStorage.setItem("athleticMaps", "true");
      }else{
        localStorage.setItem("athleticMaps", "false");
      }
    },
    //Gets whether or not super mode is activated
    getSuperMode: function(){
      return superMode;
    },
    //Sets super mode to true or false
    setSuperMode: function(val){
      superMode = val;
      if(val){
        localStorage.setItem("superMode", "true");
      }else{
        localStorage.setItem("superMode", "false");
      }
    },
    getExtraOptions: function(){ //Gets the extra options
      return extraOptions;
    },
    addExtraOption: function(option){ //Adds an extra option
      extraOptions.push(option);
      localStorage.setItem("extraOptions", JSON.stringify(extraOptions));
      refreshExtraOptions();
    },
    removeExtraOption: function(option){ //removes and extra option
      //Parse through to find the option
      for(var i = 0; i < extraOptions.length; i++){
        if(extraOptions[i] == option){
          //Remove it
          extraOptions.splice(i, 1);
          break;
        }
      }
      localStorage.setItem("extraOptions", JSON.stringify(extraOptions));
      refreshExtraOptions();
    }
  }
});

//STRUCTURES OF LOCAL STORAGE OBJECTS:

//Reminder List Structure
/*
[
  {"name":, "description":, "time":{"day":, "time":}, "type":"letter"/"weekday"}
  {"name":, "description":, "time":{"date":, "time":}, "type":"single"}
]
*/

//Class Properties Example
/*
{
  "block":[{"name":"Chinese 3", "firstLunch":false, takesFlex:false, "time":1}, {"name":"Advanced Topics", "firstLunch":false, takesFlex:false, "time":2}],
  "flex":[{"name":"Help Desk", "time":{"day":"C", "id":1}}, {"name":"STC Meeting", "time":{"day":1, "id":1}}],
  "CP":[{"name":"Orchestra", "time":"C"}],
}

"name", "startTime", "endTime", "type"
*/
