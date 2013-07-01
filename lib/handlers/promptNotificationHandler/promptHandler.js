(function() {
  var PromptHandler = function() {
    var logger = require("webinos-utilities").webinosLogging(__filename);
    var notificationManager = require('webinos-notifications').notificationManager;
    var promptTimeout = 20000;
    var path = require("path");

    if (require.resolve("webinos-dashboard")) {

      // Register the prompting dashboard module
      var dashboard = require("webinos-dashboard");
      dashboard.registerModule("prompt",path.join(__dirname,"./dashboard/"));

      // Listen for permission request notifications
      notificationManager.on(notificationManager.notifyType.permissionRequest, function(notify) {
        // Received permission request notification.
        //
        // Set prompt choices based on the following:
        // 0 = "Deny always";
        // 1 = "Deny for this session";
        // 2 = "Deny this time";
        // 3 = "Allow this time";
        // 4 = "Allow for this session";
        // 5 = "Allow always";

        var choices;
        switch (notify.data.promptType) {
          case 2:
            //Prompt oneshot
            choices = "0|2|3";
            break;
          case 3:
            //Prompt session
            choices = "0|1|2|3|4";
            break;
          default:
            //Prompt blanket
            choices = "0|1|2|3|4|5";
            break;
        }

        dashboard.open(
          {
            module:"prompt",
            data:{
              choices: choices,
              notifyId: notify.id,
              user: notify.data.request.subjectInfo.userId,
              feature: notify.data.request.resourceInfo.apiFeature,
              timeout: promptTimeout
            }
          },
          function() {
            logger.log("prompt success callback");
          },
          function(err) {
            logger.log("prompt error callback: " + err.toString());
          },
          function (response){
            logger.log("prompt complete callback: " + JSON.stringify(response));

            var responseTo = response.responseTo;
            var decision = parseInt(response.decision);
            notificationManager.addNotification(notificationManager.notifyType.permissionResponse, { responseTo: responseTo, response: decision });
          }
        );
      });

    } else {
      logger.log("webinos-dashboard not found - can't start prompt handler.");
    }
  };

  exports.Handler = PromptHandler;

})()