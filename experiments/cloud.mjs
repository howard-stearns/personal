// Using some of the guts of Distributed Security because it's convenient for the authorization checks.
import Security from "https://kilroy-code.github.io/distributed-security/lib/security.mjs";

function path(resourceTag, ownerTag) {
  return resourceTag + '/' + ownerTag;
}

const Storage = {

  async store(resourceTag, ownerTag, string, signature) {
    if (!await Security.verify(ownerTag, signature, string))
      throw new Error(`Signature ${signature} for ${string} does not match owner of ${ownerTag}.`);

    let item = path(resourceTag, ownerTag);
    if (!string) {
      return delete data[item];
    }
    return data[item] = string;
  },

  async retrieve(resourceTag, ownerTag) {
    let item = path(resourceTag, ownerTag)
    return data[item];
  },
  data = {}
};
export default Storage;
