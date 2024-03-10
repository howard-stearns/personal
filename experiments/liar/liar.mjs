import Security from "https://kilroy-code.github.io/distributed-security/index.mjs";
import { CroquetSession, Cloud, callbacks } from "./croquet.mjs";

// CUSTOM WEB COMPONENTS

class LiarElement extends HTMLElement { // We'll make two web components with this convience method.
  static add({parent = document.body,  // Add component to specified DOM parent, and set attributes.
	      textContent = "",
	      ...attributes}) {
    let elementName = customElements.getName(this),
	element = document.createElement(elementName);
    element.textContent = textContent;
    Object.entries(attributes).forEach(([name, value]) => element.setAttribute(name, value));
    parent.append(element);
    return element;
  }
}

class TaggedUser extends LiarElement { // A user has a name (initials) and their own Secruity tag.
  changeText(text) { // Update display for the given label.
    // Set identicon username, as that's what it bases color/shape on.
    this.shadowRoot.querySelector('minidenticon-svg').setAttribute('username', text); 
    this.shadowRoot.querySelector('name').textContent = text;
  }
  rezz() { // While a new user is joining, animate through different identicons.
    let identicon = this.shadowRoot.querySelector('minidenticon-svg'),
	text = '0',
	next = () => {
	  identicon.setAttribute('username', text);
	  text = (parseInt(text) + 1).toString();
	};
    this.timer = setInterval(next, 400);
  }
  stopRezzing(text) { // Stop animation and display the label.
    clearInterval(this.timer);
    this.changeText(text);
  }
  connectedCallback() { // Append template and handle clicks by toggling selected.
    const shadow = this.attachShadow({mode: 'open'}),
	  template = document.getElementById('avatar'),
	  clone = template.content.cloneNode(true);
    shadow.appendChild(clone);
    this.onclick = () => { // Toggle whether this user will be able to decrypt the post.
      this.classList.toggle('selected');
      this.constructor.updatePostLabel();
    };
  }
  static updatePostLabel() { // The post button changes based on how many of us are selected and whether any text has been entered to post.
    let hasText = input.value,
	nSelected = document.querySelectorAll('.selected').length;
    post.toggleAttribute('disabled', !hasText || !nSelected);
    post.textContent = hasText ? (nSelected ? `Post to ${nSelected} ${nSelected === 1 ? "person" : "people"}` : "Select people who will read post") : "Enter text to post";
  }
}
customElements.define("tagged-user", TaggedUser);


class EncryptedPost extends LiarElement {
  // A post initially has encrypted textContent. When attached, it will automatically
  // replace it with the plaintext if possible.
  async connectedCallback() {
    let result = await Security.decrypt(JSON.parse(this.textContent), me.getAttribute('tag')).catch(() => {});
    if (result) this.textContent = result.text;
    else this.classList.add('unavailable');
  }
}
customElements.define("encrypted-post", EncryptedPost);


// EVENT HANDLERS

welcome.onclose = async () => { // Save the initials, make a Security tag, and announce both to the cloud.
  localStorage.setItem('myText', initial.value);
  await CroquetSession;
  let tag = await Security.create();
  Cloud.announce({tag, text: initial.value});
}

initial.onkeydown = (event) => { if (event.key === 'Enter') welcome.close(); };

input.oninput = () => TaggedUser.updatePostLabel();
input.onkeydown = (event) => { // Enter key pushes the post button, if possible.
  console.log(event.key);
  if (event.key !== 'Enter') return;
  if (!document.querySelector('.selected')) return noneSelected.show();
  post.onclick();
};

post.onclick = async () => { // Post to cloud.
  // Encrypt for selected tags.
  let selected = [...document.querySelectorAll('.selected')],
      tags = selected.map(element => element.getAttribute('tag')),
      encrypted = await Security.encrypt(input.value, ...tags);
  Cloud.post(encrypted);  // Post through the cloud.
  // Reset displays.
  input.value = "";
  TaggedUser.updatePostLabel();
  selected.forEach(element => element.classList.remove('selected'));
};


// SETUP

initial.value = localStorage.getItem('myText') || 'H'; // This browser's user's initials.
Object.assign(callbacks, {TaggedUser, EncryptedPost, posts, destroy: Security.destroy}); // Things our cloud needs.
console.log(await Security.ready);

Security.Storage = { // Application must provide storage object with these two methods.

  async store(collectionName, resourceName, signature) { // Store a JWS signature in the cloud.
    let verified = await Security.verify(signature, {team: resourceName, notBefore: 'team'});
    if (!verified) throw new Error(`Signature ${signature} does not match owner of ${resourceName}.`);
    Cloud.store({collectionName, resourceName, payload: verified.payload.length ? signature : ''});
    return null; // Must not return undefined for jsonrpc.
  },

  async retrieve(collectionName, resourceName) {
    let result = Cloud.retrieve({collectionName, resourceName});
    return result;
  }
};

// Application must provide a function that always returns the same text for this user in this browser.
Security.getUserDeviceSecret = async function deviceSecret(tag) {
  let binary = new TextEncoder().encode(tag + "secret!"),
      digest = await crypto.subtle.digest("SHA-256", binary);
  return btoa(new Uint8Array(digest));
};
