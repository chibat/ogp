/** @jsx h */
/// <reference no-default-lib="true"/>
/// <reference lib="dom" />
/// <reference lib="dom.asynciterable" />
/// <reference lib="deno.ns" />

import {
  DOMParser,
  HTMLDocument,
} from "https://deno.land/x/deno_dom@v0.1.15-alpha/deno-dom-wasm.ts";

import { serve } from "https://deno.land/std@0.114.0/http/server.ts";
import { h, renderSSR } from "https://deno.land/x/nano_jsx@v0.0.20/mod.ts";
import LRU from "https://deno.land/x/lru@1.0.2/mod.ts";
import { escapeHtml } from "https://deno.land/x/escape_html@1.0.0/mod.ts";

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

function App({ map, url }: { map: Map<string, string>, url: string }) {
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
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous"></link>
      </head>
      <body>
        <div class="card" style="max-width: 500px">
          <div class="card-body">
            {title &&
              <h5 class="card-title">{title}</h5>
            }
            {description &&
              <p class="card-text">{description}</p>
            }
            <p class="card-text"><small class="text-muted"><a href={encodeURI(url)} class="stretched-link" target="_blank">{escapeHtml(url)}</a></small></p>
          </div>
          {image &&
            <img src={image} class="card-img-bottom" alt={site} style="max-width: 100%" />
          }
        </div>
      </body>
    </html>
  );
}

function SpecifyUrl() {
  const iframe = '<iframe src="https://ogp.deno.dev/?url=https://github.com" height="500" style="width: 500px; max-width: 100%;"></iframe>';
  return (
    <html>
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>Open Graph Preview</title>
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.1.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-1BmE4kWBq78iYhFldvKuhfTAU6auU8tT94WrHftjDbrCEXSU1oBoqyl2QvZ6jIW3" crossorigin="anonymous"></link>
      </head>
      <body>
        <div class="container">
          <h1>Open Graph Preview</h1>
          <div class="alert alert-primary" role="alert">
            Specify "url" Parameter
          </div>
          <h2>Example</h2>
          <h3>URL</h3>
          <div>
            <a href="https://ogp.deno.dev/?url=https://github.com" target="_blank">https://ogp.deno.dev/?url=https://github.com</a>
          </div>
          <h3>Embed Code</h3>
          <div class="card">
            <div class="card-body" style="padding-bottom: 0px">
              <pre><code>{escapeHtml(iframe)}</code></pre>
            </div>
          </div>
          <h3>Preview</h3>
          {iframe}
        </div>
      </body>
    </html>
  );
}

const responseInit: ResponseInit = {
  headers: {
    "content-type": "text/html",
  }
};

async function handler(req: Request) {
  const url = new URL(req.url).searchParams.get("url");
  if (!url) {
    const html = renderSSR(<SpecifyUrl />);
    return new Response(html, responseInit);
  }
  const map = await get(url);
  const html = renderSSR(<App map={map} url={url} />);
  return new Response(html, responseInit);
}

console.log("Listening on http://localhost:8000");
await serve(handler);
