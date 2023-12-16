#!/usr/bin/env -S deno run --allow-net --watch app.tsx

/** @jsx jsx */
/** @jsxFrag Fragment */
import { Hono } from "https://deno.land/x/hono@v3.11.7/mod.ts";
import { jsx } from "https://deno.land/x/hono@v3.7.2/middleware.ts";

import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.43/deno-dom-wasm.ts";

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
        if (content) {
          map.set(name.value, content.value);
        }
      }
      const property = a.attributes.getNamedItem("property");
      if (property && property.value?.startsWith("og:")) {
        const content = a.attributes.getNamedItem("content");
        if (content) {
          map.set(property.value, content.value);
        }
      }
    });
    let favicon = document.querySelector("link[rel='icon']")?.getAttribute(
      "href",
    );
    if (!favicon) {
      const u = new URL(url);
      u.pathname = "/favicon.ico";
      u.search = "";
      u.hash = "";
      favicon = u.toString();
    }
    map.set("favicon", favicon);
    //console.log(map);
    lru.set(url, map);
    return map;
  } catch (error) {
    return map;
  }
}

type Attr = {
  title: string;
  description: string;
  url: string;
  image: string;
  site: string;
  favicon?: string;
};

function Large({ title, url, image, site }: Attr) {
  return (
    <div class="card" style="max-width: 500px; height: 350px">
      {image &&
        (
          <img
            src={image}
            class="card-img-top"
            alt={site}
            style="max-width: 100%"
          />
        )}
      <div
        class="card-body"
        style="overflow: hidden;;"
      >
        <p class="card-text">
          <small class="text-muted">
            <a
              href={encodeURI(url)}
              class="stretched-link"
              style="text-decoration: none;color: black;"
              target="_blank"
            >
              {new URL(url).hostname}
            </a>
          </small>
        </p>
        {title &&
          (
            <div
              class="card-title"
              style="max-width: 500px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
            >
              {title}
            </div>
          )}
        {
          /* {description &&
          <p class="card-text">{description}</p>
        } */
        }
      </div>
    </div>
  );
}

function Small({ title, description, url, favicon }: Attr) {
  return (
    <div class="card" style="height: 150px; width: 100%">
      <div class="card-body" style="overflow: hidden; ">
        <h5
          class="card-title"
          style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >
          <img src={favicon} style="height: 25px; margin: 5px" />
          {title}
        </h5>
        <p
          class="card-text"
          style="max-width: 100%;white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
        >
          {description}
        </p>
        <p class="card-text">
          <small class="text-muted">
            <a href={encodeURI(url)} class="stretched-link" target="_blank">
              {new URL(url).hostname}
            </a>
          </small>
        </p>
      </div>
    </div>
  );
}

function App(
  { map, url, size }: {
    map: Map<string, string>;
    url: string;
    size: string | null;
  },
) {
  let image = map.get("og:image") || map.get("twitter:image:src") || "";
  if (image.startsWith("/")) {
    const u = new URL(url);
    image = u.protocol + "//" + u.host + image;
  }
  const title = map.get("og:title") || map.get("twitter:title") || "";
  const description = map.get("og:description") ||
    map.get("twitter:description") || "";
  const site = map.get("og:site_name") || map.get("twitter:site") || "";
  const favicon = map.get("favicon");
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3"
          crossOrigin="anonymous"
        >
        </link>
      </head>
      <body>
        {size === "small"
          ? (
            <Small
              title={title}
              description={description}
              url={url}
              site={site}
              image={image}
              favicon={favicon}
            />
          )
          : (
            <Large
              title={title}
              description={description}
              url={url}
              site={site}
              image={image}
            />
          )}
      </body>
    </html>
  );
}

function Default({ baseUrl }: { baseUrl: string }) {
  const exampleUrlLarge = baseUrl + "/?size=large&url=https://github.com";
  const iframeLarge =
    `<iframe src="${exampleUrlLarge}" height="350" width="500"></iframe>`;
  const exampleUrlSmall = baseUrl + "/?size=small&url=https://github.com";
  const iframeSmall =
    `<iframe src="${exampleUrlSmall}" height="150" style="width: 100%;"></iframe>`;
  return (
    <html>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Open Graph Preview</title>
        <link
          href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css"
          rel="stylesheet"
          integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3"
          crossOrigin="anonymous"
        >
        </link>
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
        <br />
      </body>
    </html>
  );
}

async function handler(req: Request) {
  const requestUrl = new URL(req.url);
  const url = requestUrl.searchParams.get("url");
  const size = requestUrl.searchParams.get("size");
  if (!url) {
    return <Default baseUrl={requestUrl.origin} />;
  }
  const map = (new URL(url).hostname === requestUrl.hostname)
    ? new Map()
    : await get(url);
  return <App map={map} url={url} size={size} />;
}

const NotFound = () => (
  <div>
    <h1>Page not found</h1>
  </div>
);

const app = new Hono();
app.get("/", (c) => {
  return c.html(handler(c.req.raw));
})
  .notFound((c) => c.html(<NotFound />));

Deno.serve(app.fetch);
