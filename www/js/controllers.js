/**

TODOs:
 - Dont load same users simultanously twice
 - Store Users over reloads
 - Highlight unread stuff
 - Who wrote last indicator
 - Try out slide box with views for changing conversations (http://ionicframework.com/docs/api/directive/ionSlideBox/)
 - Highlight new items
*/

angular.module('jazMessenger.controllers', [])

.controller('DashCtrl', function($scope) {})

.controller('ConversationsCtrl', function($scope, Conversations, Facebook) {
  Conversations.all().then(function(conversations) {
    console.log("CONV", conversations);
    $scope.conversations = conversations;
  });

  // Facebook.getMe();
  // Facebook.getMessages();
  console.log($scope);

  $scope.remove = function(chat) {
    Conversations.remove(chat);
  };

  $scope.refresh = function() {
      $scope.$broadcast('scroll.refreshComplete');
    console.log("TODO");
  };
})

.controller('ConversationDetailCtrl', function($scope, $stateParams, Conversations) {
  $scope.moreDataCanBeLoaded = true;

  Conversations.all().then(function(conversations) {
    $scope.conversation = Conversations.get($stateParams.conversationId);
  });

  $scope.loadOlder = function() {
    $scope.conversation.loadPrevious(function() {
      $scope.$broadcast('scroll.refreshComplete');
    });
  };

  $scope.newerEntriesAvailable = function() {
    return true;
  };

  $scope.loadNewer = function() {
    if (!$scope.conversation) { return; }
    console.log("$scope.loadNewer");

    $scope.conversation.loadNext(function() {
      $scope.$broadcast('scroll.infiniteScrollComplete');
      $scope.moreDataCanBeLoaded = false;

      // We can ask every 10 seconds for new stuff
      $setTimeout(function() {
        $scope.moreDataCanBeLoaded = true;
      }, 10000);
    });
  };
})

.controller('AccountCtrl', function($scope) {
  $scope.settings = {
    enableFriends: true
  };
});
