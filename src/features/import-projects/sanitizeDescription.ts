import sanitizeHtml from "sanitize-html";

// Project descriptions are imported from external platforms. Whatever HTML
// they carry is reduced to the formatting below before it is stored; every
// other tag, attribute, URL scheme and style declaration is dropped.
//
// The allowlist is the one the frontend applies when rendering (DeVouch-FE
// `src/helpers/description.ts`); change the two together. Nothing stored here
// may be wider than what the frontend allows. Two differences are deliberate:
// - text inside a video iframe is dropped here (see `textFilter` below);
// - the frontend also turns non-breaking spaces into ordinary ones. That is a
//   rendering preference, so the stored text keeps them.

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
      // `target` and `rel` never come from the source: they are set here on
      // a link that is kept, and dropped with the `href` otherwise, which
      // leaves a plain text anchor.
      const { href, target: _target, rel: _rel, ...rest } = attribs;
      return {
        tagName,
        attribs: ABSOLUTE_LINK.test(href ?? "")
          ? {
              ...rest,
              href,
              target: "_blank",
              rel: "noopener noreferrer nofollow",
            }
          : rest,
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
  // An iframe that did not resolve to a known video player, and an image
  // left without a source, are removed entirely.
  exclusiveFilter: (frame) =>
    (frame.tag === "iframe" || frame.tag === "img") && !frame.attribs.src,
  // A browser never renders what is written between `<iframe>` and
  // `</iframe>`, and the parser hands it over as raw text that would be
  // escaped once more every time the result is sanitized again. A video embed
  // needs no content, so it is dropped.
  textFilter: (text, tagName) => (tagName === "iframe" ? "" : text),
};

const sanitizePass = (html: string): string => sanitizeHtml(html, OPTIONS);

// Text with every tag removed. It parses back to the same text, so it is a
// value that further passes leave alone.
const textOnly = (html: string): string =>
  sanitizeHtml(html, { allowedTags: [], allowedAttributes: {} });

// One pass removes everything that is not allowed, but its output is not
// guaranteed to be what a second pass would produce: markup nested in a way
// HTML does not permit can be closed differently once it is parsed again.
// Both forms are equally safe; they are just not the same string.
//
// Passes are therefore repeated until the output stops changing. Every
// description seen so far settles on the first pass; the cap only bounds the
// work for input built to defeat that.
const MAX_PASSES = 5;

// Repeats `pass` until its output stops changing and returns that output.
//
// Markup that has not settled after `maxPasses` is not returned: it would be
// reformatted again by the next import or clean-up run, which would then see
// a "change" in a row nobody edited, every time. It is reduced to its text
// instead, which is stable - and to nothing if even that is not. Whatever is
// returned has been through `pass` and is left unchanged by it.
//
// `pass` and `maxPasses` are parameters so the limit can be tested; callers
// use the defaults.
export const sanitizeToFixedPoint = (
  html: string,
  pass: (html: string) => string = sanitizePass,
  maxPasses: number = MAX_PASSES
): string => {
  let current = pass(html);
  for (let done = 1; done < maxPasses; done++) {
    const next = pass(current);
    if (next === current) return current;
    current = next;
  }
  const text = textOnly(current);
  return pass(text) === text ? text : "";
};

// Sanitizes a string of HTML. The result is stable - sanitizing it again
// returns it unchanged. The importer relies on that to tell whether a stored
// row is up to date, and the clean-up script to be safe to re-run.
export const sanitizeDescriptionHtml = (html: string): string =>
  sanitizeToFixedPoint(html);

// True when `stored` holds the same content as `sanitized` and only differs
// by not having been sanitized yet - as opposed to the source having changed.
export const isUnsanitizedFormOf = (
  stored: unknown,
  sanitized: unknown
): boolean =>
  typeof stored === "string" &&
  typeof sanitized === "string" &&
  stored !== sanitized &&
  sanitizeDescriptionHtml(stored) === sanitized;

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
