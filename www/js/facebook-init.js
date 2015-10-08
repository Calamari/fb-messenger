window.facebookLoading = {
  loaded: false,
  onLoadHandlers: [],
  register: function(cb) {
    if (this.loaded) {
      cb();
    } else {
      this.onLoadHandlers.push(cb);
    }
  },
  load: function() {
    this.loaded = true;
    this.onLoadHandlers.forEach(function(cb) {
      cb(window.FB);
    });
  }
};
window.fbAsyncInit = function() {
  FB.init({
    appId      : '727715177341271',
    // cookie     : true,  // enable cookies to allow the server to access
    //                     // the session
    xfbml      : false,  // parse social plugins on this page
    version    : 'v2.2' // use version 2.2
  });
  window.facebookLoading.load();
};

// Load the SDK asynchronously
(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = "//connect.facebook.net/en_US/sdk/debug.js";
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));
