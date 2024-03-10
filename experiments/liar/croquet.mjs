// Here are using https://croquet.io/croquet-os/ as our "Cloud".
// 1. Everyone present gets the same copy of the SynchronizedDatabase.
// 2. Every message published to the SynchronizedDatabase gets distributed to each browser's Interface.
// We use this for both storage and for message passing between users in different browsers.
//
// Note that there is no application-server at all! (No fetch, web socket, etc.)
// This app is running from static files on github pages. Magic!

export var callbacks = {}; // Our application populates this with callbacks we will use.

class SynchronizedDatabase extends Croquet.Model {
  // Croquet provides a synchronized cloud "database" as initialized by this init(), 
  // and all copies are updated based on the subscribed events.
  init() {
    this.Team = {};  // Demo does not currently use these first two.
    this.KeyRecovery = {};
    this.EncryptionKey = {};
    this.rezzingLiars = {}
    this.currentLiars = {};
    this.subscribe(this.sessionId, 'view-join', this.rezUser); // Published by Croquet itself when someone joins.
    this.subscribe(this.sessionId, 'view-announce', this.announceUser);
    this.subscribe(this.sessionId, 'view-exit', this.deleteUser); // Published by Croquet itself when someone leaves.
    this.subscribe(this.sessionId, 'store', this.store);
    this.subscribe(this.sessionId, 'post', this.post);
  }
  rezUser(viewId) { // A user has entered, but not yet dismissed their welcome dialog.
    this.rezzingLiars[viewId] = true; // A unique viewId is assigned by Croquet for each browser visting the page.
    this.publish(this.sessionId, "user-rezzed", viewId);
  }
  announceUser(userDatum) { // A user has dismissed their welcome dialog and set their {viewId, tag, text}.
    delete this.rezzingLiars[userDatum.viewId];
    this.currentLiars[userDatum.viewId] = userDatum;
    this.publish(this.sessionId, "user-announce", userDatum);
  }
  deleteUser(viewId) { // A user has left.
    let data = this.currentLiars[viewId];
    delete this.rezzingLiars[viewId];
    delete this.currentLiars[viewId];
    this.publish(this.sessionId, "user-deleted", data || {viewId});
  }
  store({collectionName, resourceName, payload}) { // Update the shared storage.
    let collection = this[collectionName];
    if (payload) collection[resourceName] = payload;
    else delete collection[resourceName];
  }
  post(signature) { // Post to everyone.
    this.publish(this.sessionId, 'posted', signature);
  }
}
SynchronizedDatabase.register("SynchronizedDatabase");

class Interface extends Croquet.View { // Interface between application and the SynchronizedDatabase.
  constructor(model) {
    super(model);
    this.model = model;
    // Set up this browser's display based on the SyncronizedDatabase (model).
    for (const viewId of Object.keys(model.rezzingLiars)) this.userRezzed(viewId)
    for (const userDatum of Object.values(model.currentLiars)) this.userAnnounced(userDatum);
    this.subscribe(this.sessionId, 'user-rezzed', this.userRezzed);
    this.subscribe(this.sessionId, 'user-announce', this.userAnnounced);
    this.subscribe(this.sessionId, 'user-deleted', this.userDeleted);
    this.subscribe(this.sessionId, 'posted', this.posted);    
  }

  // Handllers for the subscribed events.
  userRezzed(viewId) { // Add TaggedUser if (if the viewId is not ours), and start rezzing.
    if (this.viewId !== viewId) return callbacks.TaggedUser.add({parent: others, id: viewId}).rezz();
    me.rezz();
  }
  userAnnounced({viewId, tag, text}) {
    // Use the TaggedUser from rezzing if we have it. We might have arrived after that.
    let user = this._getTaggedUser(viewId) || callbacks.TaggedUser.add({parent: others, id: viewId})
    user.stopRezzing(text);
    user.setAttribute('tag', tag);
  }
  userDeleted({viewId, tag}) { // Anybody/everybody who is left (or visits next) will delete the user and their tag.
    let user = this._getTaggedUser(viewId);
    if (user !== me) user?.remove();
    if (tag) callbacks.destroy(tag).catch(x => x);
  }
  posted(signature) { // Someone (maybe us) has posted. Add it to the list.
    callbacks.EncryptedPost.add({parent: callbacks.posts, textContent: JSON.stringify(signature)});    
  }
  _getTaggedUser(viewId) {
    let isMe = this.viewId === viewId;
    return isMe ? me : document.getElementById(viewId);
  }

  // Called by our application.
  store(data) { // Store a signature in the cloud.
    this.publish(this.sessionId, 'store', data);
  }
  retrieve({collectionName, resourceName}) { // Retrieve it. We just reach into the synchronized model.
    return this.model[collectionName][resourceName];
  }
  announce(data) { // A user has picked a name (initials).
    this.publish(this.sessionId, 'view-announce', Object.assign({viewId: this.viewId}, data));
  }
  post(message) { // Post a message.
    this.publish(this.sessionId, 'post', signature);
  }
}

export var Cloud; // Will hold the Interface instance after connecting.
export const CroquetSession = Croquet.Session.join({
  apiKey: "17GxHzdAvd4INCAHfJoDm39LH6FkmkLa5qdLhGLqA",
  appId: "com.ki1r0y.distributed-security.liar",
  name: "liar.50",
  password: "demo",
  model: SynchronizedDatabase,
  view: Interface,
  rejoinLimit: 5e3
}).then(session => Cloud = session.view);
