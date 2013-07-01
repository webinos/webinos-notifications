(function(exports) {
  var fs = require('fs');
  var path = require('path');
  var webinosPath = require("webinos-utilities").webinosPath.webinosPath();
  var eventEmitter = require('events').EventEmitter;
  var util = require('util');
  var notifyCache = loadList();

  function getListFilename() {
    return path.join(webinosPath,"userData/notifications.json");
  }

  function loadList() {
    var listFile = getListFilename();
    var fileContents = fs.readFileSync(listFile);
    return JSON.parse(fileContents);
  }

  function saveList(list) {
    var listFile = getListFilename();
    var fileContents = JSON.stringify(list,null,2);
    fs.writeFileSync(listFile,fileContents);
  }

  var NotificationManager = function() {
    eventEmitter.call(this);
    this.notifyType = {
      all: "all",
      notification: "notification",
      permissionRequest: "permissionRequest",
      permissionResponse: "permissionResponse",
      connectionRequest: "connectionRequest"
    };
  };

  util.inherits(NotificationManager, eventEmitter);

  NotificationManager.prototype.getNotification = function(id) {
    var notify;
    if (notifyCache.notifications.hasOwnProperty(id)) {
      notify = notifyCache.notifications[id];
    }

    return notify;
  };

  NotificationManager.prototype.getNotifications = function(type) {
    var lst = {};

    for (var id in notifyCache.notifications) {
      if (notifyCache.notifications.hasOwnProperty(id) && notifyCache.notifications[id].type === type) {
        lst[id] = notifyCache.notifications[id];
      }
    }

    return lst;
  };

  NotificationManager.prototype.addNotification = function(type,data) {
    var uuid = require('node-uuid');
    var notify = {};
    notify.id = uuid.v1();
    notify.timestamp = new Date();
    notify.type = type;
    notify.data = data;
    notify.requiresSync = true;
    notifyCache.notifications[notify.id] = notify;
    saveList(notifyCache);

    this.emit(notify.type, notify);
    this.emit(this.notifyType.all, notify);

    return notify;
  };

  NotificationManager.prototype.updateAfterLocalSync  = function() {
    //
    // Locally initiated sync occurred (we have sent updates to PZH)
    //
    // Load the contents from file.
    var syncList = loadList();
    var nId;

    // List has been sync'd so clear all 'requiresSync' flags.
    for (nId in syncList.notifications) {
      if (syncList.notifications.hasOwnProperty(nId)) {
        if (syncList.notifications[nId].hasOwnProperty("requiresSync")) {
          delete syncList.notifications[nId].requiresSync;
        }
      }
    }

    notifyCache = syncList;

    saveList(syncList);
  };

  NotificationManager.prototype.updateAfterRemoteSync = function() {
    //
    // Remote initiated sync occurred (we received updates from PZH)
    //
    // Load the contents from file.
    var syncList = loadList();
    var nId;

    // Check for new notifications.
    for (nId in syncList.notifications) {
      if (syncList.notifications.hasOwnProperty(nId) && !notifyCache.notifications.hasOwnProperty(nId)) {
        // New notification found => add it.
        notifyCache.notifications[nId] = syncList.notifications[nId];
        this.emit(notifyCache.notifications[nId].type, notifyCache.notifications[nId]);
        this.emit(this.notifyType.all, notifyCache.notifications[nId]);
      }
    }

    // Check for removed notifications.
    for (nId in notifyCache.notifications) {
      if (notifyCache.notifications.hasOwnProperty(nId) && !syncList.notifications.hasOwnProperty(nId)) {
        // Notification not found in sync list - is it new?
        if (notifyCache.notifications[nId].hasOwnProperty("requiresSync") && notifyCache.notifications[nId].requiresSync === true) {
          // Do nothing - wait for the new item to be sync'd.
        } else {
          // Notification not new, remove it from local list.
          delete notifyCache.notifications[nId];
        }
      }
    }

    saveList(notifyCache);
  };

  exports.notificationManager = new NotificationManager();
  exports.PromptHandler = require("./handlers/promptNotificationHandler/promptHandler").Handler;
  exports.TrayHandler = require("./handlers/trayNotificationHandler/trayHandler").Handler;
  exports.EmailHandler = require("./handlers/emailNotificationHandler/emailHandler").Handler;

})(module.exports);