(function(exports) {
  var fs = require('fs');
  var path = require('path');
  var webinosPath = require("webinos-utilities").webinosPath.webinosPath();
  var eventEmitter = require('events').EventEmitter;
  var util = require('util');
  var notifyCache;
  var filePath;

  function loadCache() {
    if (typeof notifyCache === "undefined") {
      notifyCache = loadList();
    }

    return notifyCache;
  }

  function getListFilename() {
    var f;
    if (typeof filePath === "undefined") {
      f = path.join(webinosPath,"userData/notifications.json");
    } else {
      f = path.join(filePath,"userData/notifications.json");
    }
    return f;
  }

  function loadList() {
    var listFile = getListFilename();
    var list;
    if (fs.existsSync(listFile)) {
    var fileContents = fs.readFileSync(listFile);
      list = JSON.parse(fileContents);
    } else {
      list = { notifications: {} };
    }
    return list;
  }

  function saveList(list) {
    var listFile = getListFilename();
    var fileContents = JSON.stringify(list,null,2);
    fs.writeFileSync(listFile,fileContents);
    notifyCache = list;
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
    loadCache();

    var notify;
    if (notifyCache.notifications.hasOwnProperty(id)) {
      notify = notifyCache.notifications[id];
    }

    return notify;
  };

  NotificationManager.prototype.getNotifications = function(type) {
    loadCache();

    var lst = { notifications: {}};

    for (var id in notifyCache.notifications) {
      if (notifyCache.notifications.hasOwnProperty(id) && (typeof type === "undefined" || notifyCache.notifications[id].type === type)) {
        lst.notifications[id] = notifyCache.notifications[id];
      }
    }

    return lst;
  };

  NotificationManager.prototype.addNotification = function(type,data) {
    loadCache();

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

  NotificationManager.prototype.updateAfterRemoteSync = function(remoteList) {
    //
    // Remote initiated sync occurred (we received updates from PZH)
    //
    // Load the contents from file.
    var syncList = loadList();
    var nId;

    // Check for new notifications.
    for (nId in syncList.notifications) {
      if (syncList.notifications.hasOwnProperty(nId) && !remoteList.notifications.hasOwnProperty(nId)) {
        // New notification found => add it.
        remoteList.notifications[nId] = syncList.notifications[nId];
        this.emit(remoteList.notifications[nId].type, remoteList.notifications[nId]);
        this.emit(this.notifyType.all, remoteList.notifications[nId]);
      }
    }

//    // Check for removed notifications.
//    for (nId in remoteList.notifications) {
//      if (remoteList.notifications.hasOwnProperty(nId) && !syncList.notifications.hasOwnProperty(nId)) {
//        // Notification not found in sync list - is it new?
//        if (remoteList.notifications[nId].hasOwnProperty("requiresSync") && remoteList.notifications[nId].requiresSync === true) {
//          // Do nothing - wait for the new item to be sync'd.
//        } else {
//          // Notification not new, remove it from local list.
//          delete remoteList.notifications[nId];
//        }
//      }
//    }

    saveList(remoteList);
  };

  exports.setFilePath = function(fp) { filePath = fp; };
  exports.notificationManager = new NotificationManager();
  exports.PromptHandler = require("./handlers/promptNotificationHandler/promptHandler").Handler;
  exports.TrayHandler = require("./handlers/trayNotificationHandler/trayHandler").Handler;
  exports.EmailHandler = require("./handlers/emailNotificationHandler/emailHandler").Handler;

})(module.exports);