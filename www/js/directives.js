angular.module('app.directives', [])


.directive('fallbackSrc', function(){
  var fallbackSrc = {
    link: function postLink(scope, elem, iAttrs) {
      elem.bind('error', function() {
        angular.element(this).attr("src", iAttrs.fallbackSrc);
      });
    }
   }
   return fallbackSrc;
});