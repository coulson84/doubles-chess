
async function init() {
  Array.from(document.querySelectorAll("link[rel='import']")).forEach(
    (link) => {
        const href = link.getAttribute("href");

        if(!href) {
            throw new ReferenceError("No href on link[rel='import']");
        }
      fetch(href).then((response) => {
        response.text().then(async (html) => {
          await mountComponentFromHTML(html);
          (globalThis).postUpgrade?.();
        });
      });
    }
  );
}

init();

// We can take the HTML, parse it, extract parts and re-assemble it inside the CustomElement.
async function mountComponentFromHTML(html) {
  let dom = new DOMParser().parseFromString(html, "text/html");

  // We use the <title> of the HTML as the name for the component
  let name = dom.head.querySelector("title")?.innerText;

  if (!name) {
    throw new ReferenceError("No <title> found in the HTML to extract the name from");
  }
  // We get the attributes from the <body> tag
  let namedAttributesMap = dom.body.attributes;

  let attributes = [];
  for (let attribute of namedAttributesMap) {
    attributes.push(`"${attribute.name}"`);
  }
  // We will inject the <head> into the Shadow DOM so that external resources like fonts are loaded
  let headText = dom.head.innerHTML;

  // We will later inject the script (this demo assumes only a one script tag per file)
  let scripts = dom.body.querySelectorAll("script");
  let scriptTexts = Array.from(scripts).map(script => script.innerText);

  // We will later inject the style (this demo assumes only a one style tag per file)
  let styles = dom.body.querySelectorAll("style");
  let styleTexts = Array.from(styles).map(style => style.innerText);

  // In order to get raw "template", we’ll remove the style and script tags.
  // This is a limitation / convention of this demo.
  scripts.forEach(script => script.remove());
  styles.forEach(style => style.remove());

  // The <body> is our template
  let template = dom.body.outerHTML;

  let construct = `customElements.define(
  '${name}',
  class HTMLComponent extends HTMLElement {
    constructor() {
      super();

      var shadow = this.attachShadow({ mode: "open" });

      let head = document.createElement("head");
      head.innerHTML = \`${headText}\`;
      shadow.appendChild(head);

      let body = document.createElement("body");
      body.innerHTML = \`${template}\`;
      shadow.appendChild(body);

      for (const styleText of [\`${styleTexts.join("`,`")}\`]) {
        if(!styleText.trim()) {
          continue;
        }
        let style = document.createElement("style");
        style.innerText = styleText;
        body.appendChild(style);
      }

      for (const scriptText of [\`${scriptTexts.join("`,`")}\`]) {
        if(!scriptText.trim()) {
          continue;
        }
        new Function("document", "attributes", scriptText)(
            this.shadowRoot,
            this.attributes
        );
      }

    }
    static get observedAttributes() {
      return [${
        attributes.join(",\n        ")}
      ];
    }

    attributeChangedCallback(name, oldValue, newValue) {
      this.shadowRoot.dispatchEvent(
        new CustomEvent("attribute.changed", {
          composed: true,
          detail: { name, oldValue, newValue, value: newValue }
        })
      );
    }
  }
);
`;

  await import(
    `data:text/javascript;base64,${btoa(construct)}`
  );
}

