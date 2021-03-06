/** @jsx h */
import { h, jsx, serve } from "https://deno.land/x/sift@0.4.2/mod.ts";

import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.15-alpha/deno-dom-wasm.ts";

import LRU from "https://deno.land/x/lru@1.0.2/mod.ts";

const lru = new LRU<Map<string, string>>(100);

async function get(url: string) {
  const map = new Map();
  if (url.indexOf(":ogp.deno.dev") > 0) {
    return map;
  }
  try {
    const cache = lru.get(url);
    if (cache) {
      console.log("return cache");
      return cache;
    }
    const response: Response = await fetch(url);
    const parser: DOMParser = new DOMParser();
    const document: HTMLDocument | null = parser.parseFromString(
      await response.text(),
      "text/html",
    );
    if (!document) {
      return map;
    }
    document.getElementsByTagName("meta").forEach((a) => {
      const name = a.attributes.getNamedItem("name");
      if (name && name.value?.startsWith("twitter:")) {
        const content = a.attributes.getNamedItem("content");
        map.set(name.value, content.value);
      }
      const property = a.attributes.getNamedItem("property");
      if (property && property.value?.startsWith("og:")) {
        const content = a.attributes.getNamedItem("content");
        map.set(property.value, content.value);
      }
    });
    console.log(map);
    lru.set(url, map);
    return map;
  } catch (error) {
    return map;
  }
}

type Attr = { title: string, description: string, url: string, image: string, site: string };

function Large({ title, description, url, image, site }: Attr) {
  return (
    <div class="card" style="max-width: 500px">
      <div class="card-body">
        {title &&
          <h5 class="card-title">{title}</h5>
        }
        {description &&
          <p class="card-text">{description}</p>
        }
        <p class="card-text"><small class="text-muted"><a href={encodeURI(url)} class="stretched-link" target="_blank">{url}</a></small></p>
      </div>
      {image &&
        <img src={image} class="card-img-bottom" alt={site} style="max-width: 100%" />
      }
    </div>
  );
}

function Small({ title, description, url, image, site }: Attr) {
  return (
    <div class="card mb-3" style="max-width: 600px;">
      <div class="row g-0">
        <div class="col-md-3">
          <img src={image} class="img-fluid rounded-start" alt={site} style="max-width: 150px; max-height: 150px" />
        </div>
        <div class="col-md-9">
          <div class="card-body">
            <h5 class="card-title">{title}</h5>
            <p class="card-text">{description.substring(0, 100) + (description.length >= 100 ? "..." : "")}</p>
            <p class="card-text"><small class="text-muted"><a href={encodeURI(url)} class="stretched-link" target="_blank">{url}</a></small></p>
          </div>
        </div>
      </div>
    </div>
  );
}

function App({ map, url, size }: { map: Map<string, string>, url: string, size: string | null }) {
  let image = map.get("og:image") || map.get("twitter:image:src") || "";
  if (image.startsWith("/")) {
    const u = new URL(url);
    image = u.protocol + "//" + u.host + image;
  }
  const title = map.get("og:title") || map.get("twitter:title") || "";
  const description = map.get("og:description") || map.get("twitter:description") || "";
  const site = map.get("og:site_name") || map.get("twitter:site") || "";
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossOrigin="anonymous"></link>
      </head>
      <body>
        {size === "small" ?
          <Small title={title} description={description} url={url} site={site} image={image} />
          :
          <Large title={title} description={description} url={url} site={site} image={image} />
        }
      </body>
    </html>
  );
}

function Default({ baseUrl }: { baseUrl: string }) {
  const exampleUrlLarge = baseUrl + "/?size=large&url=https://github.com";
  const iframeLarge = `<iframe src="${exampleUrlLarge}" height="500" style="width: 500px; max-width: 100%;"></iframe>`;
  const exampleUrlSmall = baseUrl + "/?size=small&url=https://github.com";
  const iframeSmall = `<iframe src="${exampleUrlSmall}" height="200" style="width: 800px; max-width: 100%;"></iframe>`;
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Open Graph Preview</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossOrigin="anonymous"></link>
      </head>
      <body>
        <div class="container">
          <h1>Open Graph Preview</h1>
          <div class="alert alert-primary" role="alert">
            Specify "url" Parameter
          </div>
          <h2>Large Example</h2>
          <h3>URL</h3>
          <div>
            <a href={exampleUrlLarge} target="_blank">{exampleUrlLarge}</a>
          </div>
          <h3>Embed Code</h3>
          <div class="card">
            <div class="card-body" style="padding-bottom: 0px">
              <pre><code>{iframeLarge}</code></pre>
            </div>
          </div>
          <h3>Preview</h3>
          <div dangerouslySetInnerHTML={{ __html: iframeLarge }}></div>
          <h2>Small Example</h2>
          <h3>URL</h3>
          <div>
            <a href={exampleUrlSmall} target="_blank">{exampleUrlSmall}</a>
          </div>
          <h3>Embed Code</h3>
          <div class="card">
            <div class="card-body" style="padding-bottom: 0px">
              <pre><code>{iframeSmall}</code></pre>
            </div>
          </div>
          <h3>Preview</h3>
          <div dangerouslySetInnerHTML={{ __html: iframeSmall }}></div>
        </div>
      </body>
    </html>
  );
}

async function handler(req: Request) {
  const requestUrl = new URL(req.url);
  const url = requestUrl.searchParams.get("url");
  const size = requestUrl.searchParams.get("size");
  if (!url) {
    return jsx(<Default baseUrl={requestUrl.origin} />);
  }
  const map = await get(url);
  return jsx(<App map={map} url={url} size={size} />);
}

const NotFound = () => (
  <div>
    <h1>Page not found</h1>
  </div>
);

serve({
  "/": (req) => { return handler(req) },
  404: () => jsx(<NotFound />, { status: 404 }),
});

