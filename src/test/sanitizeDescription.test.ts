import { describe, expect, jest, test } from "@jest/globals";
import Showdown from "showdown";
import {
  isUnsanitizedFormOf,
  sanitizeDescriptionFields,
  sanitizeDescriptionHtml,
  sanitizeToFixedPoint,
} from "../features/import-projects/sanitizeDescription";

const clean = sanitizeDescriptionHtml;
const converter = new Showdown.Converter();
const markdown = (text: string) => clean(converter.makeHtml(text));

// Nothing in a sanitized description may be able to run code or load a
// document, whatever else is left of the input.
const expectInert = (html: string) => {
  expect(html).not.toMatch(
    /<\s*(script|svg|math|object|embed|style|form|input|button|textarea|link|meta|base|noscript|details|video|audio|source)\b/i
  );
  expect(html).not.toMatch(/<[^>]*\son[a-z]+\s*=/i);
  expect(html).not.toMatch(
    /(?:href|src|action|formaction)\s*=\s*["']?\s*(?!https?:|mailto:)[a-z][a-z0-9+.-]*:/i
  );
  expect(html).not.toMatch(/srcdoc/i);
};

describe("executable content is removed", () => {
  test("script elements, with their content", () => {
    expect(clean("<p>Hi</p><script>alert(1)</script>")).toBe("<p>Hi</p>");
    expect(clean('<script src="https://evil.example/x.js"></script>')).toBe("");
    expect(clean("<SCRIPT>alert(1)</SCRIPT>after")).toBe("after");
  });

  test("img with an error handler", () => {
    expect(clean("<img src=x onerror=alert(1)>")).toBe("");
    expect(
      clean('<img src="https://e.com/a.png" onerror="alert(1)" alt="a">')
    ).toBe('<img src="https://e.com/a.png" alt="a" />');
    expect(clean('<img/src="https://e.com/a.png"/onerror=alert(1)>')).toBe(
      '<img src="https://e.com/a.png" />'
    );
  });

  test("event handler attributes on any element", () => {
    expect(clean('<p onclick="alert(1)" onmouseover=alert(2)>x</p>')).toBe(
      "<p>x</p>"
    );
    expect(clean('<a href="https://e.com" ONCLICK="alert(1)">x</a>')).toBe(
      '<a href="https://e.com" target="_blank" rel="noopener noreferrer nofollow">x</a>'
    );
    expect(clean("<div onfocus=alert(1) tabindex=0 autofocus>x</div>")).toBe(
      "<div>x</div>"
    );
  });

  test.each([
    "javascript:alert(1)",
    "JaVaScRiPt:alert(1)",
    " javascript:alert(1)",
    "jav&#x09;ascript:alert(1)",
    "jav\tascript:alert(1)",
    "java\nscript:alert(1)",
    "&#106;avascript:alert(1)",
    "&#x6A;avascript:alert(1)",
    "\u0001javascript:alert(1)",
    "vbscript:msgbox(1)",
    "data:text/html,<script>alert(1)</script>",
    "data:text/html;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg==",
    "blob:https://e.com/1",
    "file:///etc/passwd",
  ])("link with a dangerous URL: %j", (href) => {
    const out = clean(`<a href="${href}">x</a>`);
    expect(out).toBe("<a>x</a>");
  });

  test("images only load over http(s)", () => {
    expect(clean('<img src="javascript:alert(1)">')).toBe("");
    expect(clean('<img src="data:image/svg+xml;base64,PHN2Zz4=">')).toBe("");
    expect(clean('<img src="x" srcset="javascript:alert(1) 1x">')).toBe("");
  });

  test("svg, math and other executable or embedding markup", () => {
    for (const payload of [
      "<svg onload=alert(1)><circle/></svg>",
      "<svg><script>alert(1)</script></svg>",
      '<svg><a xlink:href="javascript:alert(1)"><text>x</text></a></svg>',
      "<svg><animate onbegin=alert(1) attributeName=x dur=1s></svg>",
      '<svg><foreignObject><iframe src="javascript:alert(1)"></iframe></foreignObject></svg>',
      "<math><mtext><style><img src=x onerror=alert(1)></style></mtext></math>",
      '<object data="https://e.com/x.swf"></object>',
      '<embed src="https://e.com/x.swf">',
      '<form action="https://e.com"><input name=a><button formaction="javascript:alert(1)">b</button></form>',
      "<style>body{background:url(javascript:alert(1))}</style>",
      '<link rel="stylesheet" href="https://e.com/x.css">',
      '<meta http-equiv="refresh" content="0;url=https://e.com">',
      '<base href="https://e.com/">',
      "<details open ontoggle=alert(1)><summary>x</summary></details>",
      '<video src=x onerror=alert(1)><source onerror="alert(1)"></video>',
      "<body onload=alert(1)>",
      "<marquee onstart=alert(1)>x</marquee>",
      "<textarea><img src=x onerror=alert(1)></textarea>",
      '<noscript><p title="</noscript><img src=x onerror=alert(1)>"></noscript>',
    ]) {
      expectInert(clean(payload));
    }
    expect(clean("<svg onload=alert(1)><circle/></svg>")).toBe("");
  });

  test("inline styles keep text presentation only", () => {
    expect(
      clean(
        '<p style="position:fixed;top:0;left:0;width:100%;height:100%;z-index:9999;background:url(https://e.com/x);color:red;text-align:center">x</p>'
      )
    ).toBe('<p style="color:red;text-align:center">x</p>');
    expect(
      clean(
        '<p style="color:expression(alert(1));background-color:url(x)">x</p>'
      )
    ).toBe("<p>x</p>");
  });

  test("ids and unknown classes are dropped", () => {
    expect(
      clean('<p id="root" class="fixed inset-0 ql-size-huge" data-x="1">x</p>')
    ).toBe('<p class="ql-size-huge">x</p>');
  });
});

describe("encoded and malformed payloads", () => {
  test("escaped markup stays escaped text", () => {
    const escaped = "&lt;script&gt;alert(1)&lt;/script&gt;";
    expect(clean(escaped)).toBe(escaped);
    expect(clean("&#60;img src=x onerror=alert(1)&#62;")).toBe(
      "&lt;img src=x onerror=alert(1)&gt;"
    );
  });

  test.each([
    "<scr<script>ipt>alert(1)</scr</script>ipt>",
    '<img src="x" onerror=alert(1)//',
    "<<img src=x onerror=alert(1)>>",
    "<img src=x onerror=alert(1)",
    '<img """><script>alert(1)</script>">',
    "<!--><img src=x onerror=alert(1)>-->",
    "<![CDATA[<img src=x onerror=alert(1)>]]>",
    "<script\n>alert(1)</script\n>",
    "<script/x>alert(1)</script>",
    "<a href=javascript&colon;alert(1)>x</a>",
    "<a href='javascript:alert(1)' href='https://e.com'>x</a>",
    "<p><svg><p><style><img src=x onerror=alert(1)>",
    "<iframe/src=javascript:alert(1)>",
    "<img src=`x`onerror=alert(1)>",
    "<p title='x' onclick=alert(1) title='y'>x</p>",
    "\u0000<script>alert(1)</script>",
    "<scr\u0000ipt>alert(1)</scr\u0000ipt>",
  ])("malformed markup cannot smuggle a payload: %j", (payload) => {
    const once = clean(payload);
    expectInert(once);
    // Sanitizing what a browser would re-parse must not surface anything new.
    expect(clean(once)).toBe(once);
  });
});

describe("iframes", () => {
  const SANDBOX =
    "allow-scripts allow-same-origin allow-presentation allow-popups allow-popups-to-escape-sandbox";

  test.each([
    "https://evil.example/x",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    "https://www.youtube.com.evil.example/embed/dQw4w9WgXcQ",
    "https://www.youtube.com@evil.example/embed/dQw4w9WgXcQ",
    "https://evil.example/https://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://youtube.com/embed/dQw4w9WgXcQ",
    "//www.youtube.com/embed/dQw4w9WgXcQ",
    "http://www.youtube.com/embed/dQw4w9WgXcQ",
    "https://www.youtube.com:8443/embed/dQw4w9WgXcQ",
    "https://www.youtube.com/embed/videoseries?list=PL123",
    "https://www.youtube.com/embed/live_stream?channel=UC123",
    "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    "https://www.youtube.com/embed/../redirect?q=https://evil.example",
    "https://player.vimeo.com/video/abc",
    "https://vimeo.com/123456789",
    "/embed/dQw4w9WgXcQ",
    "",
  ])("is removed for source %j", (src) => {
    expect(clean(`<p>a</p><iframe src="${src}"></iframe><p>b</p>`)).toBe(
      "<p>a</p><p>b</p>"
    );
  });

  test("is removed when it has no src, or only srcdoc", () => {
    expect(clean("<iframe></iframe>")).toBe("");
    expect(clean('<iframe srcdoc="<script>alert(1)</script>"></iframe>')).toBe(
      ""
    );
  });

  test("a YouTube embed is rebuilt from the video id alone", () => {
    expect(
      clean(
        '<iframe class="ql-video x" frameborder="0" allowfullscreen="true" src="https://www.youtube.com/embed/dQw4w9WgXcQ?showinfo=0&autoplay=1" onload="alert(1)" srcdoc="<script>alert(1)</script>" sandbox="allow-top-navigation" allow="camera; microphone" name="top"></iframe>'
      )
    ).toBe(
      `<iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ" title="YouTube video player" allowfullscreen="true" loading="lazy" sandbox="${SANDBOX}"></iframe>`
    );
    expect(
      clean(
        '<iframe src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"></iframe>'
      )
    ).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
  });

  test("a Vimeo embed keeps only the id and a well-formed access hash", () => {
    expect(
      clean(
        '<iframe src="https://player.vimeo.com/video/123456789?h=abcdef1234&autoplay=1"></iframe>'
      )
    ).toBe(
      `<iframe class="ql-video" src="https://player.vimeo.com/video/123456789?h=abcdef1234" title="Vimeo video player" allowfullscreen="true" loading="lazy" sandbox="${SANDBOX}"></iframe>`
    );
    expect(
      clean(
        '<iframe src="https://player.vimeo.com/video/123456789?h=%22onload%3Dalert(1)"></iframe>'
      )
    ).toContain('src="https://player.vimeo.com/video/123456789"');
  });

  test("the Quill video wrapper survives", () => {
    const out = clean(
      '<div class="ql-video-wrapper"><iframe class="ql-video" src="https://www.youtube.com/embed/dQw4w9WgXcQ"></iframe></div>'
    );
    expect(out).toMatch(
      /^<div class="ql-video-wrapper"><iframe class="ql-video" /
    );
  });
});

describe("legitimate formatting is kept", () => {
  test("block and inline formatting, lists, quotes, code and tables", () => {
    const html =
      "<h1>T</h1><h2>S</h2><p>a <strong>b</strong> <em>c</em> <u>u</u> <s>s</s> <sub>1</sub> <sup>2</sup></p>" +
      '<ul><li>1</li></ul><ol start="3"><li>2</li></ol><blockquote>q</blockquote>' +
      "<pre><code>x &lt; y</code></pre>" +
      '<table><thead><tr><th colspan="2">h</th></tr></thead><tbody><tr><td>d</td></tr></tbody></table>';
    expect(clean(html)).toBe(html);
    expect(clean("a<br>b<hr>c")).toBe("a<br />b<hr />c");
  });

  test("safe links are kept and open in a new tab without an opener", () => {
    expect(clean('<a href="https://example.com/a?b=1&amp;c=2#d">x</a>')).toBe(
      '<a href="https://example.com/a?b=1&amp;c=2#d" target="_blank" rel="noopener noreferrer nofollow">x</a>'
    );
    expect(clean('<a href="mailto:hi@example.com">m</a>')).toContain(
      'href="mailto:hi@example.com"'
    );
    expect(
      clean('<a href="https://example.com" target="_top" rel="opener">x</a>')
    ).toBe(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">x</a>'
    );
  });

  test("relative and protocol-relative URLs are dropped", () => {
    expect(clean('<a href="/admin">x</a>')).not.toContain("href");
    expect(clean('<a href="//evil.example">x</a>')).not.toContain("href");
    expect(clean('<img src="/a.png">')).toBe("");
    expect(clean('<img src="//e.com/a.png">')).toBe("");
  });

  test("safe images are kept", () => {
    expect(
      clean(
        '<img src="https://example.com/a.png" alt="A" title="t" width="100" height="50">'
      )
    ).toBe(
      '<img src="https://example.com/a.png" alt="A" title="t" width="100" height="50" />'
    );
  });

  test("Quill classes and text styles", () => {
    expect(
      clean(
        '<p class="ql-indent-1" style="text-align: center;"><span class="ql-size-large ql-font-monospace" style="color: rgb(230, 0, 0); background-color: #ffff00;">x</span></p>'
      )
    ).toBe(
      '<p class="ql-indent-1" style="text-align:center"><span class="ql-size-large ql-font-monospace" style="color:rgb(230, 0, 0);background-color:#ffff00">x</span></p>'
    );
  });

  test("text content, entities and non-ASCII characters", () => {
    expect(clean("<p>Tom &amp; Jerry &lt;3 é 漢字 🎉 'q' \"d\"</p>")).toBe(
      "<p>Tom &amp; Jerry &lt;3 é 漢字 🎉 'q' \"d\"</p>"
    );
  });
});

describe("markdown", () => {
  test("ordinary markdown converts to the expected HTML", () => {
    const out = markdown(
      [
        "# Title",
        "",
        "Some **bold** and _em_ text with [a link](https://example.com) and ![pic](https://example.com/a.png)",
        "",
        "- one",
        "- two",
        "",
        "1. first",
        "",
        "> quote",
        "",
        "```",
        "code <b>",
        "```",
      ].join("\n")
    );
    expect(out).toContain("<h1>Title</h1>");
    expect(out).toContain("<strong>bold</strong>");
    expect(out).toContain("<em>em</em>");
    expect(out).toContain(
      '<a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">a link</a>'
    );
    expect(out).toContain('<img src="https://example.com/a.png" alt="pic" />');
    expect(out).toMatch(/<ul>\s*<li>one<\/li>\s*<li>two<\/li>\s*<\/ul>/);
    expect(out).toMatch(/<ol>\s*<li>first<\/li>\s*<\/ol>/);
    expect(out).toMatch(/<blockquote>\s*<p>quote<\/p>\s*<\/blockquote>/);
    expect(out).toContain("<pre><code>code &lt;b&gt;\n</code></pre>");
  });

  test("HTML and dangerous links written inside markdown are neutralised", () => {
    const out = markdown(
      [
        "Intro",
        "",
        "[click](javascript:alert(1))",
        "",
        "![x](javascript:alert(1))",
        "",
        "<img src=x onerror=alert(1)>",
        "",
        "<script>alert(1)</script>",
        "",
        '<iframe src="https://evil.example"></iframe>',
        "",
        '<a href="https://example.com" onclick="alert(1)">ok</a>',
      ].join("\n")
    );
    expectInert(out);
    expect(out).not.toContain("alert(1)");
    expect(out).not.toContain("<iframe");
    expect(out).toContain("<p>Intro</p>");
    expect(out).toContain('href="https://example.com"');
  });
});

describe("repeated sanitization", () => {
  test.each([
    "<p>Hi</p><script>alert(1)</script>",
    "Tom & Jerry < 3 > 2",
    "&lt;script&gt;alert(1)&lt;/script&gt;",
    "&amp;lt;b&amp;gt; &amp;amp; &quot;x&quot; &nbsp;",
    '<a href="https://example.com/?a=1&b=2">x</a>',
    '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ?start=3"></iframe>',
    '<iframe src="https://player.vimeo.com/video/1?h=abcdef12"></iframe>',
    '<p style="color: RED; text-align: CENTER">x</p>',
    "<p>unclosed <b>bold <i>italic",
    "<table><tr><td>no tbody</td></tr></table>",
    '<img src="https://e.com/a b.png" alt="&quot;q&quot; <x>">',
    converter.makeHtml("# T\n\n`a < b` and **c** <span onclick=x>d</span>"),
  ])("output is stable for %j", (input) => {
    const once = clean(input);
    const twice = clean(once);
    expect(twice).toBe(once);
    expect(clean(twice)).toBe(once);
  });

  test("text is not escaped a second time", () => {
    expect(clean(clean(clean("a & b < c")))).toBe("a &amp; b &lt; c");
  });
});

describe("sanitizeDescriptionFields", () => {
  const payload = '<p>ok</p><img src=x onerror="alert(1)"><script>x</script>';

  test("plain-text descriptions are stored verbatim", () => {
    const text = "We <3 public goods & a < b.\nUse <script> tags? No: 2 > 1";
    expect(sanitizeDescriptionFields({ description: text }).description).toBe(
      text
    );
    expect(
      sanitizeDescriptionFields({ description: text }, "text").description
    ).toBe(text);
  });

  test("text is never turned into markup", () => {
    const { description, descriptionHtml } = sanitizeDescriptionFields({
      description: payload,
    });
    expect(description).toBe(payload);
    expect(descriptionHtml).toBeUndefined();
  });

  test("descriptionHtml is sanitized for every format", () => {
    for (const format of ["text", "html", undefined] as const) {
      expect(
        sanitizeDescriptionFields({ descriptionHtml: payload }, format)
          .descriptionHtml
      ).toBe("<p>ok</p>");
    }
  });

  test("an HTML description is sanitized", () => {
    expect(
      sanitizeDescriptionFields({ description: payload }, "html").description
    ).toBe("<p>ok</p>");
  });

  test("missing values stay missing", () => {
    expect(sanitizeDescriptionFields({ description: null }, "html")).toEqual({
      description: null,
      descriptionHtml: undefined,
    });
    expect(
      sanitizeDescriptionFields(
        { description: "", descriptionHtml: null },
        "html"
      )
    ).toEqual({ description: "", descriptionHtml: null });
  });

  test("a non-string value declared as HTML comes out as a sanitized string", () => {
    const hostile = { toString: () => "<script>alert(1)</script><b>x</b>" };
    expect(
      sanitizeDescriptionFields(
        { description: hostile, descriptionHtml: hostile },
        "html"
      )
    ).toEqual({ description: "<b>x</b>", descriptionHtml: "<b>x</b>" });
    expect(
      sanitizeDescriptionFields({ descriptionHtml: ["<i onclick=x>a</i>"] })
        .descriptionHtml
    ).toBe("<i>a</i>");
  });
});

describe("links", () => {
  test("a link without a usable address is left as plain text, with no target or rel", () => {
    expect(clean('<a href="/admin" target="_top" rel="opener">x</a>')).toBe(
      "<a>x</a>"
    );
    expect(clean('<a target="_self" rel="opener">x</a>')).toBe("<a>x</a>");
  });

  test("target and rel written in the source never survive, in any order", () => {
    const expected =
      '<a href="https://e.com" target="_blank" rel="noopener noreferrer nofollow">x</a>';
    expect(
      clean('<a rel="opener" target="_top" href="https://e.com">x</a>')
    ).toBe(expected);
    expect(
      clean('<a target="_top" href="https://e.com" rel="opener">x</a>')
    ).toBe(expected);
  });
});

describe("content inside a video iframe", () => {
  // It used to be escaped once more on every pass, so the value never settled
  // and grew each time it was sanitized.
  const embed = (inner: string) =>
    `<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ">${inner}</iframe>`;

  test.each([
    "fallback text",
    "&lt;b&gt; &amp; x",
    "<p>fallback</p><script>alert(1)</script>",
    "</p><img src=x onerror=alert(1)>",
    "&amp;amp;lt;span&amp;amp;gt;",
  ])("is dropped, and the result is stable: %j", (inner) => {
    const once = clean(embed(inner));
    expect(once).toMatch(/^<iframe [^>]*><\/iframe>$/);
    expect(once).toBe(clean(embed("")));
    expect(clean(once)).toBe(once);
  });

  test("markup after an unclosed iframe does not leak out as text", () => {
    const once = clean(
      '<iframe src="https://www.youtube.com/embed/dQw4w9WgXcQ"><p>after</p><img src=x onerror=alert(1)>'
    );
    expect(once).not.toMatch(/onerror|&lt;/);
    expect(clean(once)).toBe(once);
  });
});

describe("isUnsanitizedFormOf", () => {
  const raw = '<p onclick="x">Hi <a href="https://e.com">there</a></p>';

  test("recognises a stored value that only lacks sanitizing", () => {
    expect(isUnsanitizedFormOf(raw, clean(raw))).toBe(true);
  });

  test("is false when the content differs, is equal, or is missing", () => {
    expect(isUnsanitizedFormOf(raw, clean("<p>Other</p>"))).toBe(false);
    expect(isUnsanitizedFormOf(clean(raw), clean(raw))).toBe(false);
    expect(isUnsanitizedFormOf(null, clean(raw))).toBe(false);
    expect(isUnsanitizedFormOf(raw, null)).toBe(false);
  });
});

describe("large and adversarial inputs", () => {
  const timed = (input: string) => {
    const start = Date.now();
    const out = clean(input);
    return { out, ms: Date.now() - start };
  };

  // The largest description in production is about 1.7 MB: a short text with
  // one image pasted inline as a data URI. No size limit may reject it.
  test("a megabyte-sized description with an inline image is handled quickly", () => {
    const html =
      "<p>Before</p>" +
      `<p><img src="data:image/png;base64,${"A".repeat(1_700_000)}"></p>` +
      '<p>After <a href="https://example.com">link</a></p>';
    const { out, ms } = timed(html);
    expect(out).toBe(
      '<p>Before</p><p></p><p>After <a href="https://example.com" target="_blank" rel="noopener noreferrer nofollow">link</a></p>'
    );
    expect(ms).toBeLessThan(5000);
  });

  test("a megabyte of ordinary markup stays linear", () => {
    const { out, ms } = timed(
      '<p>Text <strong>bold</strong> <a href="https://example.com">l</a></p>'.repeat(
        15_000
      )
    );
    expect(out.length).toBeGreaterThan(1_000_000);
    expect(ms).toBeLessThan(5000);
  });

  test("thousands of payloads in one description are all removed", () => {
    const { out } = timed(
      '<img src=x onerror=alert(1)><script>alert(1)</script><a href="javascript:alert(1)">x</a><svg onload=alert(1)>'.repeat(
        5_000
      )
    );
    expect(out).toBe("<a>x</a>".repeat(5_000));
  });

  test.each([
    ["unclosed nested blocks", "<div>".repeat(20_000) + "x"],
    ["nested links", '<a href="https://e.com">'.repeat(20_000) + "x"],
    ["nested table cells", "<table><tr><td>".repeat(5_000) + "x"],
    ["nested iframes", "<iframe>".repeat(20_000) + "x"],
    ["nested discarded tags", "<svg><math><style>".repeat(10_000) + "x"],
    ["unterminated tags", "<".repeat(100_000)],
    ["unterminated comments", "<!--".repeat(50_000)],
    [
      "one enormous style attribute",
      `<p style="${"color:red;".repeat(50_000)}">x</p>`,
    ],
  ])("%s neither throw nor leave an unstable result", (_name, input) => {
    const { out, ms } = timed(input);
    expectInert(out);
    expect(clean(out)).toBe(out);
    expect(ms).toBeLessThan(15_000);
  });
});

// Checks the structure of the output rather than looking for known payloads:
// every tag in it must be on the allowlist with allowlisted attributes, and
// once those tags are taken away no `<` or `>` may be left, i.e. all text is
// escaped. Inputs are generated from a fixed seed, so a failure reproduces.
describe("generated markup", () => {
  const TAGS = new Set(
    "h1 h2 h3 h4 h5 h6 p div span br hr strong b em i u s del sub sup blockquote code pre ul ol li a img table caption thead tbody tfoot tr th td iframe".split(
      " "
    )
  );
  const ATTRIBUTES: Record<string, string[]> = {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    ol: ["start"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
    iframe: ["src", "title", "allowfullscreen", "loading", "sandbox"],
  };
  const TAG = /<\/?([a-z0-9]+)((?:\s[a-z-]+="[^"<>]*")*)\s?\/?>/g;

  const assertWellFormed = (html: string) => {
    for (const [, name, attributes] of html.matchAll(TAG)) {
      expect(TAGS.has(name)).toBe(true);
      for (const [, attribute, value] of attributes.matchAll(
        /\s([a-z-]+)="([^"]*)"/g
      )) {
        expect([...(ATTRIBUTES[name] ?? []), "style", "class"]).toContain(
          attribute
        );
        if (attribute === "href")
          expect(value).toMatch(/^(https?:\/\/|mailto:)/);
        if (attribute === "src" && name === "img")
          expect(value).toMatch(/^https?:\/\//);
        if (attribute === "src" && name === "iframe")
          expect(value).toMatch(
            /^https:\/\/(www\.youtube(-nocookie)?\.com\/embed\/[\w-]{11}|player\.vimeo\.com\/video\/\d+(\?h=[0-9a-f]+)?)$/
          );
        if (attribute === "style")
          expect(value).toMatch(
            /^((color|background-color|text-align):[^;:]+;?)+$/
          );
        if (attribute === "class")
          expect(value).toMatch(/^(ql-[a-z0-9-]+ ?)+$/);
      }
    }
    expect(html.replace(TAG, "")).not.toMatch(/[<>]/);
  };

  let seed = 20261120;
  const random = () =>
    (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const pick = <T>(items: T[]): T => items[Math.floor(random() * items.length)];
  const tags = [
    ...TAGS,
    ..."script style svg math textarea select option form button noscript title xmp plaintext template object embed details body html head frameset font".split(
      " "
    ),
  ];
  const attributes = [
    'href="javascript:alert(1)"',
    'href="https://e.com"',
    'src="https://www.youtube.com/embed/dQw4w9WgXcQ"',
    'src="https://e.com/a.png"',
    "src=x",
    "onerror=alert(1)",
    'style="color:red;position:fixed"',
    'style="color:red;}</style><script>alert(1)</script>"',
    'class="ql-size-huge x"',
    "id=x",
    'title="</p><script>"',
    "alt='\"><img src=x onerror=alert(1)>'",
    'srcdoc="<script>1</script>"',
    'href="&#x6a;avascript:alert(1)"',
  ];
  const texts = [
    "x",
    "a < b",
    "&lt;script&gt;",
    "&amp;lt;",
    "-->",
    "<!--",
    "]]>",
    "<![CDATA[",
    "&",
    "<",
    "</",
    "&#x3c;img src=x onerror=alert(1)&#x3e;",
    '"',
    "'",
    "`",
  ];
  const generate = () => {
    let html = "";
    for (let i = 1 + Math.floor(random() * 14); i > 0; i--) {
      const roll = random();
      if (roll < 0.45) {
        html +=
          `<${pick(tags)}` +
          (random() < 0.5 ? ` ${pick(attributes)}` : "") +
          (random() < 0.3 ? ` ${pick(attributes)}` : "") +
          (random() < 0.93 ? ">" : "");
      } else if (roll < 0.7) html += `</${pick(tags)}>`;
      else html += pick(texts);
    }
    return html;
  };

  test("is always well formed, on the allowlist, and stable", () => {
    for (let i = 0; i < 5000; i++) {
      const input = generate();
      const once = clean(input);
      try {
        assertWellFormed(once);
        expect(clean(once)).toBe(once);
      } catch (error) {
        throw new Error(
          `input ${JSON.stringify(input)} -> ${JSON.stringify(once)}: ${error}`
        );
      }
    }
  });
});

// Every description seen so far settles on the first pass. These cover the
// limit itself, with a stand-in for a pass that never settles.
describe("markup that does not settle", () => {
  const expectFixedPoint = (value: string) => expect(clean(value)).toBe(value);

  test("the default is the real sanitizer and returns what it settles on", () => {
    const html = '<p>Hi <b>there</b></p><img src=x onerror="alert(1)">';
    expect(sanitizeToFixedPoint(html)).toBe(clean(html));
    expect(clean(html)).toBe("<p>Hi <b>there</b></p>");
  });

  test("stops as soon as a pass changes nothing", () => {
    const pass = jest.fn((html: string) => clean(html));
    sanitizeToFixedPoint("<p>x</p>", pass, 5);
    expect(pass).toHaveBeenCalledTimes(2);
  });

  test("markup that keeps changing is reduced to its text, within the limit", () => {
    // Reformats any markup it is given, for ever; leaves plain text alone.
    const pass = jest.fn((html: string) =>
      html.includes("<") ? `${html}<br />` : html
    );
    const result = sanitizeToFixedPoint(
      "<p>Tom &amp; Jerry <b>forever</b></p>",
      pass,
      5
    );
    expect(result).toBe("Tom &amp; Jerry forever");
    // Five passes, then one to confirm the text is stable. Never a loop.
    expect(pass).toHaveBeenCalledTimes(6);
    expectFixedPoint(result);
  });

  test("if even the text keeps changing, nothing is stored", () => {
    const pass = jest.fn((html: string) => `${html}!`);
    expect(sanitizeToFixedPoint("<p>x</p>", pass, 5)).toBe("");
    expect(pass).toHaveBeenCalledTimes(6);
  });

  test("the fallback cannot carry markup, whatever the passes produced", () => {
    // A pass that is broken outright: it hands back a different payload
    // every time. The result is still inert text or nothing.
    let n = 0;
    const hostile = () =>
      `<script>alert(${n++})</script><img src=x onerror=alert(${n})><a href="javascript:x">y${n}</a>`;
    const result = sanitizeToFixedPoint("<p>x</p>", hostile, 5);
    expect(result).not.toMatch(/[<>]/);
    expectFixedPoint(result);

    // Text that spells out markup stays escaped text.
    const escaped = sanitizeToFixedPoint(
      "x",
      (html) =>
        html === "x"
          ? "<b>&lt;script&gt;alert(1)&lt;/script&gt;</b>"
          : html.includes("<")
            ? `${html}<i></i>`
            : html,
      2
    );
    expect(escaped).toBe("&lt;script&gt;alert(1)&lt;/script&gt;");
    expectFixedPoint(escaped);
  });

  test("a limit of one pass still returns only a verified fixed point", () => {
    expect(sanitizeToFixedPoint("<p>a <b>b</b></p>", clean, 1)).toBe("a b");
  });

  test.each([
    "<p>".repeat(200) + "x",
    "<p><div>".repeat(100) + "x" + "</p>".repeat(50),
    "<table><p>".repeat(60) + "x",
    "<a><p><li><td>".repeat(80) + "x",
    "<p><b><div><i><p>".repeat(60) + "x</b>",
    "</p></div></td>".repeat(100) + "<p>x",
  ])(
    "deeply mis-nested markup settles and keeps its formatting: %#",
    (html) => {
      const once = clean(html);
      expectFixedPoint(once);
      expect(once).toContain("x");
      expect(once).toMatch(/<(?:p|div|table|a|li|b)>/);
    }
  );
});

describe("links need somewhere to go", () => {
  test.each([
    '<a href="https://">x</a>',
    '<a href="http://">x</a>',
    '<a href="https:///path">x</a>',
    '<a href="https://?q=1">x</a>',
    '<a href="https://#top">x</a>',
    '<a href="  https:// ">x</a>',
  ])("%j is left as plain text", (html) => {
    expect(clean(html)).toBe("<a>x</a>");
  });

  test("a link with a host is kept", () => {
    expect(clean('<a href="https://e.com">x</a>')).toBe(
      '<a href="https://e.com" target="_blank" rel="noopener noreferrer nofollow">x</a>'
    );
    expect(clean('<a href="HTTP://e.com/p?q#f">x</a>')).toContain(
      'href="HTTP://e.com/p?q#f"'
    );
    expect(clean('<a href="mailto:a@e.com">x</a>')).toContain(
      'href="mailto:a@e.com"'
    );
  });
});
