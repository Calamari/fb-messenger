var USE_RECORDER = true;
var PERMISSIONS = 'user_friends,read_mailbox';
var APP_ID = '727715177341271';

angular.module('jazMessenger.services', [])

.factory('User', function() {
  function User(id, name, link, imageUrl) {
    this.id = id;
    this.name = name;
    this.link = link;
    this.imageUrl = imageUrl;
  }

  User.fromApi = function(response) {
    var user = new User(response.id, response.name, response.link, response.picture.data.url);

    return user;
  };

  return User;
})

// Records api calls. If call is already done, serve the stored result,
// else get it and store it
.factory('FBRecorder', function($timeout) {
  var CACHE_KEY = 'jazMessenger:FBRecorder';

  return {
    api: function(url, cb) {
      var cacheKey = CACHE_KEY + ':' + url;

      if (USE_RECORDER && localStorage[cacheKey]) {
        // console.log("CACHE hit", url);
        $timeout(function() {
          cb(JSON.parse(localStorage[cacheKey]));
        }, 10);
      } else {
        // console.log("CACHE miss", url);
        FB.api(url, function(response) {
          // console.log("CACHE write", url, response);
          localStorage[cacheKey] = JSON.stringify(response);
          cb(response);
        });
      }
    }
  };
})

.factory('Facebook', function(FBRecorder, FBApiError, $q, $timeout) {
  var deferred = $q.defer(),
      promise = deferred.promise;

  Facebook = {
    // will be set automatically on login
    userId: null,

    login: function(cb) {
      FB.login(function(response) {
        if (response.status === 'connected') {
          Facebook.userId = response.authResponse.userID;
          cb(null, login);
        } else {
          Facebook.userId = null;
          cb(response.error);
        }
      }, { scope: PERMISSIONS });
    },

    logout: function(cb) {
      FB.logout(cb);
    },

    isMe: function(userOrId) {
      return Facebook.userId === userOrId || Facebook.userId === userOrId.id;
    },

    getPage: function(pagingUrl) {
      var pageDeferred = $q.defer();
      promise.then(function() {
        // console.log("get Page", pagingUrl);
        FB.api(pagingUrl, function(response) {
          if (response.error) {
            pageDeferred.reject(response.error);
            return FBApiError(response.error);
          }
          // console.log("got page url", response);
          pageDeferred.resolve(response);
        });
      });
      return pageDeferred.promise;
    },

    getMe: function() {
      promise.then(function() {
        FB.api('/me?fields=name,link,id,picture', function(response) {
          console.log('Successful login: ', response);
        });
      });
    },
    getUser: function(userId) {
      var userDeferred = $q.defer();
      promise.then(function() {
        FBRecorder.api('/' + userId + '?fields=name,link,id,picture,birthday,about,locale', function(response) {
          if (response.error) {
            userDeferred.reject(response.error);
            return FBApiError(response.error);
          }
          userDeferred.resolve(response);
        });
      });
      return userDeferred.promise;
    },
    getMessages: function() {
      var messageDeferred = $q.defer();
      promise.then(function() {
        FBRecorder.api('/me/inbox', function(response) {
          if (response.error) {
            messageDeferred.reject(response.error);
            return FBApiError(response.error);
          }
          messageDeferred.resolve(response);
        });
      });
      return messageDeferred.promise;
    },
    // getFriends: function() {
    //   promise.then(function() {
    //     FB.api('/'+ID+'/friendlists', function(response) {
    //       console.log('Friends: ', response);
    //     });
    //   });
    // }
  };
  function handleLoginResponse(response) {
    console.log('handleLoginResponse', response);
    Facebook.userId = response.authResponse.userID;
    deferred.resolve();
  }

  // Lets login when facebook stuff has been loaded
  window.facebookLoading.register(function() {
    FB.getLoginStatus(function(response) {
      console.log("RESP", response);
      if (response.status === 'connected') {
        handleLoginResponse(response);
      } else {
        Facebook.login(function(error, response) {
          if (error) {
            deferred.reject('Could not log in.');
          } else {
            handleLoginResponse(response);
          }
        });
      }
    });
  });

  return Facebook;
})

.factory('FBApiError', function($ionicPopup) {
  function catchError(error) {
    if (error.type === 'OAuthException') {
      FB.logout(function() {
        var alertPopup = $ionicPopup.alert({
          title: 'Error: ' + error.code + ' - ' + error.type,
          template: error.message
        });
        alertPopup.then(function(res) {
          FB.login();
          // location.href = 'https://www.facebook.com/dialog/oauth?client_id=' + APP_ID + '&redirect_uri=' + location.href;
        });
      });
      return true;
      FB.api('/dialog/oauth?client_id=' + APP_ID, function(response) {
        console.log("RECONNECT", response);
        if (response.status === 'connected') {
          Facebook.userId = response.authResponse.userID;
        } else {
          // Facebook.userId = null;
          showPopup(response.error);
        }
      }, { scope: PERMISSIONS });
      // Facebook.login(function(err) {
      //   if (err) {
      //     showPopup(err);
      //   }
      // });
      return true;
    }
  }
  function showPopup(error) {
    var alertPopup = $ionicPopup.alert({
      title: 'Error: ' + error.code + ' - ' + error.type,
      template: error.message
    });
  }

  return function(error) {
    if (!catchError(error)) {
      showPopup(error);
    }
  };
})

.factory('Users', function(Facebook, User, $q) {
  var cachedUsers = {};

  return {
    store: function(data) {
      cachedUsers[data.id] = data;
    },
    load: function(id) {
      var deferred = $q.defer();
      // console.log("cachedUsers Id?", id, cachedUsers[id]);
      if (cachedUsers[id]) {
        deferred.resolve(cachedUsers[id]);
      } else {
        Facebook.getUser(id).then(function(userData) {
          cachedUsers[id] = User.fromApi(userData);
          // console.log("got user id", id, userData, cachedUsers[id]);
          deferred.resolve(cachedUsers[id]);
        });
      }
      return deferred.promise;
    }
  };
})

.factory('Message', function(Facebook) {
  function Message() {}

  Message.fromApi = function(response) {
    var msg = new Message();
    msg.text = response.message;
    msg.createdAt = new Date(response.created_time);
    msg.author = response.from;
    msg.fromMe = Facebook.isMe(msg.author);
    return msg;
  };

  return Message;
})

.factory('Conversation', function(User, Message, Facebook) {
  function Conversation() {}

  Conversation.fromApi = function(response) {
    // console.log("CONVERSATION", response);
    var conversation = new Conversation();
    conversation.id = response.id;
    conversation.unread = response.unread;
    conversation.lastMessage = response.comments.data[response.comments.data.length-1].message;
    conversation.chatPartner = response.to.data[0];
    conversation.messages = response.comments.data.map(function(comment) {
      return Message.fromApi(comment);
    });
    conversation.createdAt = new Date(response.updated_time);
    conversation.paging = response.comments.paging;

    return conversation;
  };

  Conversation.prototype._loadMore = function(pagingType, cb) {
    var self = this;
    Facebook.getPage(this.paging[pagingType]).then(function(response) {
      // console.log('Conversation.prototype.loadMore', pagingType, response, self);
      if (response.paging && response.paging[pagingType]) {
        self.paging[pagingType] = response.paging[pagingType];
      }
      if (response.data && response.data.length) {
        response.data.forEach(function(comment) {
          self.messages.push(Message.fromApi(comment));
        });
        self.messages.sort(function(a, b) {
          return a.createdAt.getTime() - b.createdAt.getTime();
        });
      }
      cb && cb();
    }, function(error) {
      cb && cb(error);
    });
  };

  Conversation.prototype.loadPrevious = function(cb) {
    // They are sorted differently in facebook
    this._loadMore('next', cb);
  };

  Conversation.prototype.loadNext = function(cb) {
    // They are sorted differently in facebook
    this._loadMore('previous', cb);
  };

  return Conversation;
})

.factory('ConversationList', function(Users, Conversation) {
  var ConversationList, self;
  ConversationList = self = {
    conversations: [],
    fromApi: function(response) {
      response.data.forEach(function(item) {
        var conversation = Conversation.fromApi(item);
        if (!self.get(conversation.id)) {
          Users.load(conversation.chatPartner.id).then(function(user) {
            conversation.chatPartner = user;
          });
          conversation.messages.forEach(function(message) {
            Users.load(message.author.id).then(function(user) {
              message.author = user;
            });
          });
          self.conversations.push(conversation);
        }
      });
      // console.log("THE MESSAGES", ConversationList.conversations);
    },
    get: function(id) {
      var matchingConversation = null;
      for (var i = 0; i < self.conversations.length; i++) {
        if (self.conversations[i].id === id) {
          matchingConversation = self.conversations[i];
          break;
        }
      }
      return matchingConversation;
    }
  };

  return ConversationList;
})


.factory('Conversations', function(Facebook, FBApiError, Users, ConversationList, $q) {
  var conversations = [];

  return {
    all: function() {
      var deferred = $q.defer();
      Facebook.getMessages().then(function(response) {
        if (response.error) {
          FBApiError(response.error);
        } else {
          ConversationList.fromApi(response);
        }
        deferred.resolve(ConversationList.conversations);
      });
      return deferred.promise;
    },
    remove: function(chat) {
      // chats.splice(chats.indexOf(chat), 1);
    },
    get: function(chatId) {
      return ConversationList.get(chatId);
    }
  };
});
