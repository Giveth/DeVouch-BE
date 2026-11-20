import sanitizeHtml from "sanitize-html";

// Project descriptions are imported from external platforms. Whatever HTML
// they carry is reduced to the formatting below before it is stored; every
// other tag, attribute, URL scheme and style declaration is dropped.
//
// The policy is kept identical to the one the frontend applies when rendering
// (DeVouch-FE `src/helpers/description.ts`), so that sanitizing a stored value
// again there is a no-op. Change the two together.

const TEXT_ALIGN = /^(?:left|right|center|justify)$/i;
const COLOR_VALUES = [
  /^#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i,
  /^rgba?\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*(?:,\s*(?:0|1|0?\.\d+)\s*)?\)$/i,
  /^[a-z]{3,20}$/i,
];

// Video embeds: only a YouTube or Vimeo player URL with a well-formed video
// id is accepted. The iframe is then rebuilt from the validated parts alone,
// so no other query parameter or attribute from the source survives.
const YOUTUBE_HOSTS = ["www.youtube.com", "www.youtube-nocookie.com"];
const YOUTUBE_EMBED_PATH = /^\/embed\/([A-Za-z0-9_-]{11})$/;
// Player modes that are as long as a video id. They only work with query
// parameters, which are not kept, so they are rejected like any other URL.
const YOUTUBE_NON_VIDEO_IDS = ["videoseries", "live_stream"];
const VIMEO_HOST = "player.vimeo.com";
const VIMEO_EMBED_PATH = /^\/video\/(\d{1,12})\/?$/;
// Unlisted Vimeo videos only play with their `h` access hash.
const VIMEO_HASH = /^[0-9a-f]{6,32}$/;

const getVideoEmbed = (src?: string): { src: string; title: string } | null => {
  if (!src) return null;
  let url: URL;
  try {
    url = new URL(src);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" || url.port || url.username || url.password) {
    return null;
  }
  if (YOUTUBE_HOSTS.includes(url.hostname)) {
    const id = YOUTUBE_EMBED_PATH.exec(url.pathname)?.[1];
    return id && !YOUTUBE_NON_VIDEO_IDS.includes(id)
      ? {
          src: `https://${url.hostname}/embed/${id}`,
          title: "YouTube video player",
        }
      : null;
  }
  if (url.hostname === VIMEO_HOST) {
    const id = VIMEO_EMBED_PATH.exec(url.pathname)?.[1];
    if (!id) return null;
    const hash = url.searchParams.get("h");
    return {
      src:
        `https://${VIMEO_HOST}/video/${id}` +
        (hash && VIMEO_HASH.test(hash) ? `?h=${hash}` : ""),
      title: "Vimeo video player",
    };
  }
  return null;
};

// Links and images must be absolute. A relative URL was written for the page
// the description came from and would resolve against whichever site renders
// it instead.
const ABSOLUTE_LINK = /^\s*(?:https?:\/\/|mailto:)/i;
const ABSOLUTE_IMAGE = /^\s*https?:\/\//i;

// Classes written by the Quill editor used on Giveth.
const QUILL_TEXT_CLASSES = [
  "ql-size-small",
  "ql-size-large",
  "ql-size-huge",
  "ql-font-monospace",
  "ql-indent-1",
  "ql-indent-2",
  "ql-indent-3",
  "ql-indent-4",
  "ql-indent-5",
  "ql-indent-6",
  "ql-indent-7",
  "ql-indent-8",
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "p",
    "div",
    "span",
    "br",
    "hr",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "s",
    "del",
    "sub",
    "sup",
    "blockquote",
    "code",
    "pre",
    "ul",
    "ol",
    "li",
    "a",
    "img",
    "table",
    "caption",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    "iframe",
  ],
  // No `id`, and `class` only through `allowedClasses` below: imported markup
  // must not be able to pick up a consumer's own utility classes or shadow
  // element ids.
  allowedAttributes: {
    "*": ["style"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    ol: ["start"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    iframe: ["src", "title", "allowfullscreen", "loading", "sandbox"],
  },
  allowedClasses: {
    "*": QUILL_TEXT_CLASSES,
    div: [...QUILL_TEXT_CLASSES, "ql-video-wrapper"],
    iframe: ["ql-video"],
  },
  // Inline styles are limited to text presentation. Anything that affects
  // layout (position, display, size, z-index, url(...) values) is removed.
  allowedStyles: {
    "*": {
      "text-align": [TEXT_ALIGN],
      color: COLOR_VALUES,
      "background-color": COLOR_VALUES,
    },
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: { img: ["http", "https"], iframe: ["https"] },
  allowedIframeHostnames: [...YOUTUBE_HOSTS, VIMEO_HOST],
  allowIframeRelativeUrls: false,
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // `//host/path` URLs are dropped: no imported description depends on them.
  allowProtocolRelative: false,
  transformTags: {
    a: (tagName, attribs) => {
      if (!ABSOLUTE_LINK.test(attribs.href ?? "")) delete attribs.href;
      return {
        tagName,
        attribs: {
          ...attribs,
          target: "_blank",
          rel: "noopener noreferrer nofollow",
        },
      };
    },
    img: (tagName, attribs) => {
      if (!ABSOLUTE_IMAGE.test(attribs.src ?? "")) delete attribs.src;
      return { tagName, attribs };
    },
    iframe: (tagName, attribs) => {
      const video = getVideoEmbed(attribs.src);
      const rebuilt: sanitizeHtml.Attributes = video
        ? {
            class: "ql-video",
            src: video.src,
            title: video.title,
            allowfullscreen: "true",
            loading: "lazy",
            // A page the player opens ("Watch on YouTube") is a normal tab:
            // without the escape flag it inherits this sandbox and cannot
            // submit forms or sign in.
            sandbox:
              "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox",
          }
        : {};
      return { tagName, attribs: rebuilt };
    },
  },
  // An iframe that did not resolve to a known video player is removed entirely.
  exclusiveFilter: (frame) => frame.tag === "iframe" && !frame.attribs.src,
};

// One pass removes everything that is not allowed, but its output is not
// always what a second pass would produce: markup nested in a way HTML does
// not permit (a `<p>` inside a `<p>`) is closed differently once it is parsed
// again. Both forms are equally safe; they are just not the same string.
const MAX_PASSES = 5;

// Sanitizes a string of HTML. The result is stable - sanitizing it again
// returns it unchanged - because passes are repeated until the output stops
// changing. The importer relies on that to tell whether a stored row is up to
// date, and the clean-up script to be safe to re-run.
export const sanitizeDescriptionHtml = (html: string): string => {
  let current = sanitizeHtml(html, OPTIONS);
  for (let pass = 1; pass < MAX_PASSES; pass++) {
    const next = sanitizeHtml(current, OPTIONS);
    if (next === current) break;
    current = next;
  }
  return current;
};

// What a source puts in its `description` field:
// - "html": markup that consumers render as HTML (Giveth's editor output).
// - "text": plain text or markdown source, where `<` and `>` are ordinary
//   characters. It is stored verbatim and must be escaped, never rendered as
//   HTML, by whoever displays it.
export type DescriptionFormat = "html" | "text";

export interface DescriptionFields {
  description?: any;
  descriptionHtml?: any;
}

// `null`/`undefined` mean "no value" and are kept as they are, so a missing
// description is not rewritten to an empty string. Anything else is HTML by
// declaration and must come out as a sanitized string, whatever type the
// source sent.
const sanitizeOptionalHtml = (value: unknown): string | null | undefined =>
  value === null || value === undefined
    ? value
    : sanitizeDescriptionHtml(
        typeof value === "string" ? value : String(value)
      );

// The one place that decides what is stored for a project's description
// fields. Used by the importer and by the clean-up script for existing rows,
// so both apply the same rules:
// - `descriptionHtml` is always HTML and always sanitized;
// - `description` is sanitized when the source declares it as HTML, and left
//   untouched when it is text.
export const sanitizeDescriptionFields = (
  fields: DescriptionFields,
  descriptionFormat: DescriptionFormat = "text"
): { description: any; descriptionHtml: string | null | undefined } => ({
  description:
    descriptionFormat === "html"
      ? sanitizeOptionalHtml(fields.description)
      : fields.description,
  descriptionHtml: sanitizeOptionalHtml(fields.descriptionHtml),
});
