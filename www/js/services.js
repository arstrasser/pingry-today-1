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

function parseStringForTime(str){
  var d = new Date(86400000);
  if(str.indexOf("T") != -1){
    str = str.substring(str.indexOf("T")+1);
  }
  //Replace all spaces
  str = str.replace(/ /g, "");
  //Replace all colons
  str = str.replace(/:/g, "");
  d.setHours(parseInt(str.substring(0,2)));
  d.setMinutes(parseInt(str.substring(2,4)));
  d.setSeconds(parseInt(str.substring(4,6)));
  if(str.substring(6,7) == "-" || str.substring(6,7) == "+"){
    d.setTime(d.getTime() - (d.getTimezoneOffset()/60 + parseInt(str.substring(6))/100)*1000*60*60);
  }
  //If this is already in EST, disable over-compensation for timezones
  if(str.substring(6,7) == "Z"){
    d.setTime(d.getTime() - d.getTimezoneOffset()*1000*60)
  }
  return d.getTime();
}

//Parses a string for a date
function parseStringForDate(str){
  var d = new Date(0);
  if(str.indexOf(" ") == -1){
    d.setYear(parseInt(str.substring(0,4)));
    d.setDate(parseInt(str.substring(6,8)));
    d.setMonth(parseInt(str.substring(4,6))-1);
    console.log(new Date(d.getTime()))
    d.setHours(0);
    d.setMinutes(0);
    d.setSeconds(0);
    if(str.length > 8){
      str = str.substring(8);
      d.setTime(d.getTime() + parseStringForTime(str));
    }
  }else if(str.substring(3,4) == ","){
    str = str.substring(4);
    d.setDate(parseInt(str.substring(0,2)));
    d.setMonth(monthNameToInt(str.substring(3,6)));
    d.setYear(parseInt(str.substring(7,11)));
    if(str.length > 11){
      str = str.substring(11);
      d.setTime(d.getTIme() + parseStringForTime(str));
    }
  }else if(str.indexOf(" ") == 4){
    d.setYear(parseInt(str.substring(0,4)));
    str = str.substring(str.indexOf(" ")+1);
    d.setDate(parseInt(str.substring(0,str.indexOf(" "))));
    str = str.substring(str.indexOf(" ")+1);
    d.setMonth(parseInt(str.substring(0,str.indexOf(" ")))-1);
    str = str.substring(str.indexOf(" ")+1);
    console.log(new Date(d.getTime()))
    if(str.length > 8){
      str = str.substring(8);
      d.setTime(d.getTIme() + parseStringForTime(str));
    }else{
      d.setHours(0);
      d.setMinutes(0);
      d.setSeconds(0);
    }
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

.factory('LetterDay', function($http, icalFeed) {
  var time = localStorage.getItem("lastLetterRefresh");
  var dates = localStorage.getItem("letterDayDates");
  var isChanged = false; //variable to tell whether or not the letterday schedule has been updated

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

  //Function to refresh all data from the letter day ical
  function refreshData(){
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
          if(calEvents[i].title.length == 2 && obj.hasOwnProperty(calEvents[i].title.substring(0,1))){
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

      //Set isChanged to true so that the current schedule refreshs
      isChanged = true;
      //Updates the letter day if there are different letter days for the current date
      updateDay(d);
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
    refresh: refreshData, //Refresh the LetterDay schedule from the online calendar
    letter: function() {
      if(curDay != -1){
        return times[curDay].letter;
      }
      //If the schedule isn't updated, return an empty string
      else if(times[0].dates.length == 0){
        return "empty";
      }
      return undefined;
    },
    changeDay: function(day){updateDay(day);}, //Changes the current day to the given date
    letterOf: function(day){ //Returns what letter a given date would be
      var dayString = dateToDayString(day);
      return times[getIndexOf(dayString)].letter;
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
    isChanged: function(){ //Returns whether or not the schedule has been updated recently
      return isChanged;
    },
    setChanged: function(val){ //Modifies the isChanged once the schedule has been updated
      isChanged = val;
    }
  };
}).factory('Schedule', function($http, icalFeed){
  var time = localStorage.getItem("lastScheduleRefresh");
  if(time == null || time == undefined || parseInt(time) + 604800000 < Date.now()){ //Refresh if not ever loaded or if it's been a week
    refreshData();
  }

  //Schedule override mode disables dynamic schedule determination
  var schedOverride = false;

  /*
      Schedule types are listed below
    Format: an array of classes
    Class format: Name, Type, startTime, endTime, (id)
    Swap Class format: must be type swap and contain an options attribute that contains two classes (one for first lunch and one for second lunch)

  */
  var normalSchedule = [
    {"name":"Attendence", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
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
    {"name":"Attendence", "type":"Other", "startTime":"09:35", "endTime":"09:40"},
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
    {"name":"Attendence", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
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
    {"name":"Attendence", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
    {"name":"Period 1", "type":"block", "id":"1", "startTime":"08:10", "endTime":"09:15"},
    {"name":"Flex 1", "type":"flex", "id":"1", "startTime":"09:15", "endTime":"09:35"},
    {"name":"Community Time", "type":"CT", "startTime":"09:40", "endTime":"10:15"},
    {"name":"Period 2", "type":"block", "id":"2", "startTime":"10:20", "endTime":"11:20"},
    {"name":"Swappable 1", "type":"swap", "options":[
      {"name":"First Lunch", "type":"Lunch", "startTime":"11:25", "endTime":"11:55"},
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:25", "endTime":"12:30"}]},
    {"name":"Swappable 2", "type":"swap", "options":[
      {"name":"Period 3", "type":"block", "id":"3", "startTime":"11:55", "endTime":"13:00"},
      {"name":"Second Lunch", "type":"Lunch", "startTime":"12:30", "endTime":"13:00"}]},
    {"name":"Flex 2", "type":"flex", "id":"0", "startTime":"13:05", "endTime":"13:30"},
    {"name":"Period 4", "type":"block", "id":"4", "startTime":"13:35", "endTime":"14:35"},
    {"name":"CP", "type":"CP", "startTime":"14:40", "endTime":"15:25"}
  ];

  var assembly60Schedule = [
    {"name":"Attendence", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
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

  var winterFestivalSchedule = [
    {"name":"Attendence", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
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
    {"name":"WARN: Unknown Assembly today", "type":"Other", "startTime":"00:00", "endTime":"00:00"},
    {"name":"Attendence", "type":"Other", "startTime":"08:05", "endTime":"08:10"},
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

  //Initializes the current day to be the system current day
  var curDay = new Date();

  //Variable to store all the schedule types
  var typeList = [["Normal",normalSchedule], ["Faculty Collaboration",facultyCollabSchedule], ["Assembly 30 Minutes", assembly30Schedule], ["Assembly 35 Mintues", assembly35Schedule], ["Assembly 60 Minutes",assembly60Schedule], ["Winter Festival", winterFestivalSchedule], ["Unknown Assembly", unknownSchedule]];

  //Community Time event schedule
  var CTSchedule = localStorage.getItem("CTSchedule");
  //Special Schedule day schedule
  var scheduledDays = localStorage.getItem("ScheduledDays");
  //CP assembly/event schedule
  var CPSchedule = localStorage.getItem("CPSchedule");
  //Faculty collaboration day schedule
  var facultyCollabDays = localStorage.getItem("facultyCollabDays");

  //Initialize current schedule to be the normal schedule
  var curSchedule = 0;
  //Initialize that wasChanged variable to false since the schedule is up to date
  var wasChanged = false;

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
      curSchedule = 0;
      if(scheduledDays != null && scheduledDays[dateToDayString(curDay)] != undefined){
        //Iterate over the schedule types
        for(i = 0; i < typeList.length; i++){
          //if found the respective schedule for the day
          if(typeList[i][0] == scheduledDays[dateToDayString(curDay)]){
            curSchedule = i;
            break;
          }
        }
      }
      //Check if it's a faculty collaboration day
      else if(facultyCollabDays != null){
        for(var i = 0; i < facultyCollabDays.length; i++){
          if(facultyCollabDays[i] == dateToDayString(curDay)){
            curSchedule = 1;
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
    var specialScheduleURL = "https://calendar.google.com/calendar/ical/pingry.org_kg3ab8ps5pa70oj41igegj9kjo%40group.calendar.google.com/public/basic.ics";
    //Faculty Collaboration day calendar URL
    var collabDatesURL = "http://www.pingry.org/calendar/calendar_388.ics";

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

      wasChanged = true;
      //Update the local storage
      localStorage.setItem("facultyCollabDays", JSON.stringify(days));
    })
    //Returns the larger parse so that we can call .then on the function and using async
    return $http.get(specialScheduleURL).then(function(data){
      //Initialize variables:
      var calEvents = icalFeed.parseCalendar(data.data);
      var collabDays = [];
      var CT = {};
      var CP = {};
      var specialSchedule = {};

      //Iterate over the calendar events
      for(i=0; i < calEvents.length; i++){
        //If it's a timed event (not a day-long event)
        if(calEvents[i].type == "time"){
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
            switch ((calEvents[i].endTime - calEvents[i].startTime)/60000){
              case 60:  //60 minutes
                specialSchedule[dateToDayString(calEvents[i].endTime)] = "Assembly 60 Minutes";
                break;
              case 35:  //35 minutes
                specialSchedule[dateToDayString(calEvents[i].endTime)] = "Assembly 35 Minutes";
                break;
              default:  //Else
                //Check for Winter Festival Schedule
                if(calEvents[i].title.indexOf("Winter Festival") != -1){
                  specialSchedule[dateToDayString(calEvents[i].endTime)] = "Winter Festival";
                }
                //Unknown assembly
                else{
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
          /*
          // Faculty Collaboration day implementation commented out since using alternate calendar.
          // For faster performance but lower accuracy, uncomment this.
          if(calEvents[i].title.indexOf("Collab") != -1 && calEvents[i].title.indexOf("Fac") != -1){
            collabDays.push(dateToDayString(calEvents[i].time));
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

      //Update wasChanged variable to trigger a schedule refresh
      wasChanged = true;
      });
    }
  
  return {
    wasChanged: function(){return wasChanged;}, //WasChanged Accessor
    setChanged: function(val){wasChanged=val;}, //WasChanged Modfier
    refresh: refreshData,  //Triggers a full schedule refresh from the internet
    get: function(id){
      return typeList[curSchedule][1][id];  //returns the current schedule list element of index id
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
    getTypes: function(){
      return typeList; //Returns the schedule type list
    },
    getToday: function(){
      return typeList[curSchedule][1]; //Returns the current full Schedule for today
    },
    getCurrentType: function(){ //returns the current schedule type index
      return curSchedule;
    },
    setCurrentType: function(newSched){ //sets the current schedule type to the given type
      curSchedule =  newSched;
    },
    setOverride: function(val){ //Turns schedule override mode on or off
      schedOverride = val;
      console.log("Changed to "+val);
    },
    changeDay: function(day){ //updates the current date
      curDay = day;
      updateCurrentSchedule();
    }
  }
}).factory('MySchedule', function(Schedule, LetterDay){
  var myClasses;
  var modified = false; //modified variable to update the main schedule interface

  function reload(){
    myClasses = JSON.parse(localStorage.getItem("myClasses"));
    //If invalid storage or myClasses
    if(!myClasses || !myClasses.block){
      //Initialize myClasses to defaults
      myClasses = {"block":[], "flex":[], "CP":[]};
      localStorage.setItem("myClasses", JSON.stringify(myClasses));
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
      console.log(myClasses);
    },
    addClassWithType: function(type, cls){
      //Deprecated function to add a class to a specific place
      console.warn("Add Class with Type is deprecated, please use Add Class");
      myClasses[type].push(cls);
    },
    save: function(){
      localStorage.setItem("myClasses", JSON.stringify(myClasses));
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
          }else if(desc.substring(desc.indexOf("<")+1, desc.indexOf(">")+3) == "br"){
            desc = desc.substring(0, desc.indexOf("<"))+"\n"+desc.substring(desc.indexOf("<"));
          }
          desc = desc.substring(0, desc.indexOf("<")) + desc.substring(desc.indexOf(">")+1);
          //desc = desc.substring(0, desc.indexOf("<")) + desc.substring(desc.indexOf(">"+1));
        }

        //Published date of the article (NOT YET IMPLEMENTED)
        var date = new Date(data.substring(data.indexOf("<pubDate>")+9, data.indexOf("</pubDate")));
        data = data.substring(data.indexOf("</item>")+7); //updates the parse to avoid readding the same item
        //Image uses an inline if statement so that it returns the word "none" as a url if there is no image, or it returns the correct URL with pingry.org added
        list.push({"title":title, "image":img==""?'none':'http://www.pingry.org'+img, "link":link, "description":desc, "rawDescription":rawDesc, "date":date});
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
        //Insert the extra portion needed in the URL
        desc += "http://www.pingry.org";
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
        uid = uid.substring(0, uid.indexOf("\n"));
        //Name of the event
        var title = event.substring(event.indexOf("SUMMARY:")+8);
        title = title.substring(0, title.indexOf("\n"));
        //Location of the event
        var loc = "";
        if(event.indexOf("LOCATION") != -1){
          loc = event.substring(event.indexOf("LOCATION:")+9);
          loc = loc.substring(0, loc.indexOf("\n"));
        }
        //Start time of the event
        var dtstart = event.substring(event.indexOf("DTSTART")+7);
        dtstart = dtstart.substring(0,dtstart.indexOf("\n"));
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
          dtstart = new Date(dtstart.substring(0,4), dtstart.substring(4,6), dtstart.substring(6,8));
        }
        
        //Normal Time-type event:
        else if(dtstart.substring(0,1) == ":"){
          type="time";
          //Eliminate extra colon
          dtstart = dtstart.substring(1);
          //Parse the strings for javascript dates
          var oc = false;
          if(dtstart.indexOf("Z")!= -1)
            oc = true;
          dtstart = new Date(dtstart.substring(0,4), dtstart.substring(4,6), dtstart.substring(6,8), dtstart.substring(9,11), dtstart.substring(11,13), dtstart.substring(13,15));
          if(oc)
            dtstart.setTime(dtstart.getTime() - dtstart.getTimezoneOffset()*1000*60);

          //Parse for the event end time
          dtend = event.substring(event.indexOf("DTEND:")+6);
          dtend = dtend.substring(0, dtend.indexOf("\n"));
          oc = false;
          if(dtend.indexOf("Z")!= -1)
            oc = true;
          dtend = new Date(dtend.substring(0,4), dtend.substring(4,6), dtend.substring(6,8), dtend.substring(9,11), dtend.substring(11,13), dtend.substring(13,15));
          if(oc)
            dtend.setTime(dtend.getTime() - dtend.getTimezoneOffset()*1000*60);
        }

        //Time-based event that Includes Timezone
        else if(dtstart.indexOf("TZID") != -1){
          type="time";
          //Eliminate extra content
          dtstart = dtstart.substring(dtstart.indexOf("TZID=")+5);
          //Parse the end time
          dtend = event.substring(event.indexOf("DTEND")+6);
          dtend = dtend.substring(0, dtend.indexOf("\n"));
          dtend = dtend.substring(dtend.indexOf("TZID=")+5);
          //Assuming EST time zone -- otherwise fails
          if(dtstart.substring(0,17) == "America/New_York:"){
            //Remove the America/New_York time zone identifier
            dtstart = dtstart.substring(17);
            dtend = dtend.substring(17);
            //Parse for times
            dtstart = new Date(dtstart.substring(0,4), dtstart.substring(4,6), dtstart.substring(6,8), dtstart.substring(9,11), dtstart.substring(11,13), dtstart.substring(13,15));      
            dtend = new Date(dtend.substring(0,4), dtend.substring(4,6), dtend.substring(6,8), dtend.substring(9,11), dtend.substring(11,13), dtend.substring(13,15));
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
          recId = recId.substring(0, recId.indexOf("\n"));
          recId = recId.substring(recId.indexOf(":")+1);
          //Parse for JS Date
          recId = new Date(recId.substring(0,4), recId.substring(4,6), recId.substring(6,8), recId.substring(9,11), recId.substring(11,13), recId.substring(13,15));
          
          //Add the object to the list to be dealt with later after parsing
          var obj = {"uid":uid, "title":title, "type":type, "location":loc, "recurrenceId":recId};
          if(type == "day"){
            obj.time = dtstart;
          }else if(type == "time"){
            obj.startTime = dtstart;
            obj.endTime = dtend;
          }
          list.push(obj);
        }

        //This is to check if the event recurs
        else if(event.indexOf("RRULE:") != -1){
          //A string to help with parsing of the next objects
          var recurrence = event.substring(event.indexOf("RRULE:"));
          recurrence = recurrence.substring(0, recurrence.indexOf("\n"));

          //The date the pattern repeats until
          var until = recurrence.substring(recurrence.indexOf("UNTIL")+6);
          until = until.substring(0, until.indexOf(";"));
          //Convert the string into a JS date
          until = new Date(until.substring(0,4), until.substring(4,6), until.substring(6,8), until.substring(9,11), until.substring(11,13), until.substring(13,15));      
          
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
                var temp = parse.substring(parse.indexOf("EXDATE")+7, parse.indexOf("\n"));
                temp = temp.substring(temp.indexOf(":")+1);
                //Parse for a date
                temp = new Date(temp.substring(0,4), temp.substring(4,6), temp.substring(6,8), temp.substring(9,11), temp.substring(11,13), temp.substring(13,15));
                //Add the date to an array
                exdates.push(dateToDayString(temp));
                //Remove the parsed date from the string
                parse = parse.substring(parse.indexOf("\n")+1);     
              }

              //repetition starts at the current day
              var curDay = dtstart;
              if(type=="time"){
                //Length of the event (in milliseconds) (if applicable)
                timeDiff = dtend.getTime() - dtstart.getTime();
              }
              //While we should add dates
              while(curDay < until){
                //The month we should be in
                var curMonth = curDay.getMonth();
                for(var i=0; i<days.length; i++){
                  curDay.setDate(1);
                  //Gets the nth occurence of a weekday in a month (Credits: Aditya Gollapudi):
                            if(byDays[i] >= curDay.getDay()){
                              curDay.setDate(((byDays[i] - curDay.getDay())+(7*(weekNums[i]-1))) + 1);
                            }else{
                              curDay.setDate(((7-curDay.getDay()) + byDays[i]) + (7*(weekNums[i] - 1)) + 1);
                            }

                  //If we reach another month (if there isn't a 5th Wednesday for example)
                  if(curDay.getMonth() != curMonth){
                    //Reset the month to the proper month, and don't add this date to the repeating pattern
                    curDay.setMonth(curMonth);
                  }
                  else{
                    //If it isn't a date exception
                    if(!exdates.includes(dateToDayString(curDay))){
                      //add the object to the list of events
                      var obj = {"uid":uid, "title":title, "type":type, "location":loc, "recurring":true}
                      if(type == "day"){
                        obj.time = curDay;
                      }else if(type == "time"){
                        obj.startTime = new Date(curDay);
                        obj.endTime = new Date(curDay.getTime() + timeDiff); //Add the time difference back on
                      }
                      list.push(obj);
                    }
                  }
                }
                //Increments the month
                curDay.setMonth(curMonth+1);
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
              temp = new Date(temp.substring(0,4), temp.substring(4,6), temp.substring(6,8), temp.substring(9,11), temp.substring(11,13), temp.substring(13,15));
              //Add the date in string form to the array
              exdates.push(dateToDayString(temp));
              //Move to the next event
              parse = parse.substring(parse.indexOf("\n")+1);     
            }
            //gets the start time of the repeating event
            var curDay = dtstart;
            if(type=="time"){
              //If there is a time based repeating event, store the event length
              timeDiff = dtend.getTime() - dtstart.getTime();
            }

            //For each event
            while(curDay < until){
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
                    obj.startTime = new Date(curDay);
                    obj.endTime = new Date(curDay.getTime() + timeDiff);
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

      //Parsing to fix reccurring events
      //Fixing Recurrence Id to work and override the events
      //For each object in the array
      for(var i =0; i < list.length; i++){
        //If it has a recurrenceId
        if(list[i].recurrenceId !== undefined){
          //Loop through to find the event that the recurrenceId refers to
          for(var j=0; j < list.length; j++){
            //If it matches times and it is not the object we just got
            if(list[j].type == "time" && i!=j){
              if(list[i].recurrenceId.getYear() == list[j].startTime.getYear() &&
                list[i].recurrenceId.getMonth() == list[j].startTime.getMonth() &&
                list[i].recurrenceId.getDate() == list[j].startTime.getDate() &&
                list[i].recurrenceId.getHours() == list[j].startTime.getHours() &&
                list[i].recurrenceId.getMinutes() == list[j].startTime.getMinutes()){

                //Delete the object (since it's been overridden)
                list.splice(j,1);

                //Break out of the loop and move to the next object
                break;
              }
            }
          }
        }
        console.log(list[i]);
      }
      return list;
    },
    //Function to parse through a list of events and returns that list with only future events
    futureOnly: function(events){
      //For each event in the list
      for(var i = 0; i < events.length; i++){
        //Time type event
        if(events[i].type == "time"){
          //If the event end time is less than the current time
          if(events[i].endTime.getTime() < Date.now()){
            //Remove the event
            events.splice(i,1);
          }
        }
        //Day type event
        else if(events[i].type == "day"){
          //If the event's time is less than the current time and the event isn't today
          if(events[i].time.getTime() < Date.now() && dateToDayString(events[i]) != dateToDayString(new Date())){
            //Remove the event
            events.splice(i,1);
          }
        }
      }
      //Returns the new array
      return events;
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
        reminders[i].time.time = new Date(reminders[i].time.time);

        //Convert the date (since a single date is stored) to a JS Date
        reminders[i].time.date = new Date(reminders[i].time.date);
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
    console.log("Scheduling "+desc+" at "+date);
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
      $cordovaToast.showWithOptions({message:msg, position:"middle", duration:"long", styling:{backgroundColor:"#F73333", textColor:"FFFFFF"}});
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

//Settings storage
.factory("Settings", function(){
  var athleticMaps = localStorage.getItem("athleticMaps");
  if(athleticMaps == "" || athleticMaps == undefined || athleticMaps == "true"){
    athleticMaps = true;
  }else{
    athleticMaps = false;
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
      console.log("yes");
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

  refreshExtraOptions();

  return {
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