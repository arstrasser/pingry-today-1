angular.module('app.routes', [])

.config(function($stateProvider, $urlRouterProvider) {

  // Ionic uses AngularUI Router which uses the concept of states
  // Learn more here: https://github.com/angular-ui/ui-router
  // Set up the various states which the app can be in.
  // Each state's controller can be found in controllers.js
  $stateProvider

  // setup an abstract state for the tabs directive
  .state('main', {
    url: '/main',
    abstract: true,
    templateUrl: 'templates/menu.html',
    controller: 'MenuCtrl'
  })

  // Each tab has its own nav history stack:

  .state('main.news', {
    url: '/news',
    views: {
      'sideMenu': {
        templateUrl: 'templates/news.html',
        controller: 'NewsCtrl'
      }
    }
  })
  .state('main.article', {
    url: '/news/article/:articleId',
    views: {
      'sideMenu': {
        templateUrl: 'templates/article.html',
        controller: 'ArticleCtrl'
      }
    }
  })
  .state('main.schedule', {
    url: '/schedule',
    views: {
      'sideMenu': {
        templateUrl: 'templates/schedule.html',
        controller: 'ScheduleCtrl'
      }
    }
  })
  .state('main.lunch', {
    url: '/lunch',
    views: {
      'sideMenu': {
        templateUrl: 'templates/lunch.html',
        controller: 'LunchCtrl'
      }
    }
  })
  .state('main.announcements', {
    url: '/announcements',
    views: {
      'sideMenu': {
        templateUrl: 'templates/announcements.html',
        controller: 'AnnouncementsCtrl'
      }
    }
  })
  .state('main.settings', {
    url: '/settings',
    views: {
      'sideMenu': {
        templateUrl: 'templates/settings.html',
        controller: 'SettingsCtrl'
      }
    }
  })
  .state('main.about', {
    url: '/about',
    views: {
      'sideMenu': {
        templateUrl: 'templates/about.html',
        controller: 'AboutCtrl'
      }
    }
  })
  .state('main.classManage', {
    url: '/settings/classManage',
    views: {
      'sideMenu': {
        templateUrl: 'templates/class-manage.html',
        controller: 'ClassManageCtrl'
      }
    }
  })
  .state('main.addClass', {
    url: '/settings/addClass/:clsType/:clsId',
    cache: false,
    views: {
      'sideMenu': {
        templateUrl: 'templates/add-class.html',
        controller: 'AddClassCtrl'
      }
    }
  })
  .state('main.reminders', {
    url: '/reminders',
    views: {
      'sideMenu': {
        templateUrl: 'templates/reminders.html',
        controller: 'ReminderCtrl'
      }
    }
  })
  .state('main.addReminder', {
    url: '/reminders/add/:reminderId',
    views: {
      'sideMenu': {
        templateUrl: 'templates/add-reminder.html',
        controller: 'AddReminderCtrl'
      }
    }
  })
  .state('main.athletics', {
    url: '/athletics',
    views: {
      'sideMenu': {
        templateUrl: 'templates/athletics.html',
        controller: 'AthleticsCtrl'
      }
    }
  })
  .state('main.todo', {
    url: '/todo/:blockNum',
    views: {
      'sideMenu': {
        templateUrl: 'templates/todo.html',
        controller: 'TodoCtrl'
      }
    }
  })
  .state('main.clubCalendar', {
    url: '/clubCalendar',
    views: {
      'sideMenu': {
        templateUrl: 'templates/club-calendar.html',
        controller: 'ClubCtrl'
      }
    }
  });

  // if none of the above states are matched, use this as the fallback
  $urlRouterProvider.otherwise('/main/schedule');

});