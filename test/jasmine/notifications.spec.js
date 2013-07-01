var fs = require('fs');
var path = require('path');

function copyNotificationsFile(fileName) {
  var webinosPath = require("webinos-utilities").webinosPath.webinosPath();
  var copyContent = fs.readFileSync(path.join(__dirname,fileName));
  fs.writeFileSync(path.join(webinosPath,"userData","notifications.json"),copyContent);
}

describe("basic functionality", function() {
  var notificationModule;
  var manager;

  beforeEach(function() {
    copyNotificationsFile("simple.notifications.json");
    notificationModule = require("../../lib/notifications.js");
    manager = notificationModule.notificationManager;
  });

  it("notification module loading", function() {
    expect(notificationModule.notificationManager).toBeDefined();
  });

  it("notification list loads", function() {
    expect(manager.list).not.toBeNull();
  });

  it("notification list is present", function() {
    expect(manager.getNotification("9fe0dc20-ccef-11e2-8b8b-0800200c9a66").id).not.toBeNull();
    expect(manager.getNotification("9fe0dc20-ccef-11e2-8b8b-0800200c9a66").id.length).toBeGreaterThan(0);
  });

  it("notification is permissionRequest", function() {
    expect(manager.getNotification("9fe0dc20-ccef-11e2-8b8b-0800200c9a66").type).toEqual("permissionRequest");
  })
});

describe("new notifications", function() {
  var notificationModule;
  var manager;

  beforeEach(function() {
    copyNotificationsFile("simple.notifications.json");
    notificationModule = require("../../lib/notifications.js");
    manager = notificationModule.notificationManager;
  });

  it("add new notification", function() {
    var newLocal = fs.readFileSync(path.join(__dirname,"new.notification.json"));
    var notifyData = JSON.parse(newLocal);

    var notificationId = "";
    manager.on("all" ,function (notify) {
      notificationId = notify.id;
    });

    // Add notification
    manager.addNotification("permissionRequest",notifyData);

    // Check notification was added
    expect(manager.getNotification(notificationId)).toBeDefined();

    // Check the new notification is flagged for sync
    expect(manager.getNotification(notificationId).id).toEqual(notificationId);
    expect(manager.getNotification(notificationId).requiresSync).toBeTruthy();

    // Update after sync
    manager.updateAfterLocalSync();

    // Check sync flag cleared
    expect(manager.getNotification(notificationId).requiresSync).toBeUndefined();
  });

  it("local sync update", function() {
    // Simulate an update caused by local sync (e.g. send update to PZH).
    copyNotificationsFile("new.local.notifications.json");

    // Update after sync
    manager.updateAfterLocalSync();

    // Check pre-existing notification
    expect(manager.getNotification("9fe0dc20-ccef-11e2-8b8b-0800200c9a66").id).not.toBeNull();

    // Check local notification exists in list
    expect(manager.getNotification("ffd6ecf0-cd1c-11e2-8b8b-0800200c9a66")).toBeDefined();
    expect(manager.getNotification("ffd6ecf0-cd1c-11e2-8b8b-0800200c9a66").requiresSync).toBeUndefined();
  });

  it("remote sync update", function() {
    var notificationId = "";
    manager.on("all",function (notify) {
      notificationId = notify.id;
    });

    // Simulate an update caused by remote sync (e.g. received an update from PZH).
    copyNotificationsFile("new.remote.notifications.json");

    // Update after sync
    manager.updateAfterRemoteSync();

    // Check pre-existing notification
    expect(manager.getNotification("9fe0dc20-ccef-11e2-8b8b-0800200c9a66").id).not.toBeNull();

    // Check remote notification exists in list
    expect(manager.getNotification("77d865d0-cd04-11e2-8b8b-0800200c9a66").id).not.toBeNull();
    expect(notificationId).toEqual("77d865d0-cd04-11e2-8b8b-0800200c9a66");
  });
});