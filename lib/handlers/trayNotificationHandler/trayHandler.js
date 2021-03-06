(function() {
  var TrayHandler = function() {
    var notificationManager = require('webinos-notifications').notificationManager;
    var webinosPath = require("webinos-utilities").webinosPath.webinosPath();
    var fs = require('fs');
    var path = require('path');

    // Listen for **all** notifications
    notificationManager.on(notificationManager.notifyType.all, function(notify) {
      var msg;

      switch (notify.type) {
        case notificationManager.notifyType.permissionRequest:
          msg = "User " +  notify.data.request.subjectInfo.userId + " has requested access to " + notify.data.request.resourceInfo.apiFeature;
          break;
        case notificationManager.notifyType.permissionResponse:
          var responseTo = notificationManager.getNotification(notify.data.responseTo);
          if (typeof responseTo !== "undefined") {
            var response;
            if (parseInt(notify.data.response) > 2) {
              response = "permitted";
            } else  {
              response = "denied"
            }
            msg = "User " +  responseTo.data.request.subjectInfo.userId + " was " + response + " access to " + responseTo.data.request.resourceInfo.apiFeature;
          }
          break;
        case notificationManager.notifyType.connectionRequest:
          msg = notify.data.user.email + " has requested to connect with your zone";
          break;
        default:
          break;
      }

      if (typeof msg !== "undefined") {
        var uuid = require("node-uuid");
        var file = path.join(webinosPath,"wrt",uuid.v1() + ".notify");
        fs.writeFileSync(file,msg);
      }
    });
  }

  exports.Handler = TrayHandler;
})()