#!/usr/bin/env node
/**
 * Turn a Reddit post's text (markdown or plain text) into a JSX component
 * with the same structure/classes as your example.
 *
 * Usage:
 *   node reddit2component.js \
 *     --in post.md \
 *     --out Week925.js \
 *     --name Week925 \
 *     --title "Player Projections Powered by Vegas Player Props - Week 10" \
 *     --author "Sang Han" \
 *     --date "November 9, 2024" \
 *     --reddit "https://www.reddit.com/r/fantasyfootball/comments/xxxxxx/" \
 *     --image "https://example.com/header.jpg"
 */

const fs = require("fs");
const path = require("path");

// --- tiny arg parser ---
const args = process.argv.slice(2);
function getArg(flag, def = "") {
  const ix = args.indexOf(flag);
  if (ix === -1 || ix === args.length - 1) return def;
  return args[ix + 1];
}
function hasFlag(flag) {
  return args.includes(flag);
}

const inFile = getArg("--in");
const outFile = getArg("--out", "RedditPost.js");
const compName = getArg("--name", "RedditPost");
const title = getArg("--title", "Post Title");
const author = getArg("--author", "Author");
const dateStr = getArg("--date", "January 1, 1970");
const redditUrl = getArg("--reddit", "");
const imageUrl = getArg("--image", "https://placehold.co/600x600");

if (!inFile) {
  console.error("Missing --in <markdown file>.");
  process.exit(1);
}

// --- helpers ---
const escapeHtml = (s) =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;") // we’ll put back links later
    .replace(/>/g, "&gt;");

const restoreLinks = (html) =>
  // restore simple markdown links [text](url)
  html.replace(
    /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,
    '<a class="underline" href="$2">$1</a>'
  );

// very small markdown → JSX converter tailored to your layout
function mdToJsx(md) {
  const lines = md.replace(/\r\n/g, "\n").split("\n");

  let out = [];
  let buf = [];
  let inList = false;
  let listItems = [];

  const flushParagraph = () => {
    if (buf.length) {
      const text = buf.join(" ").trim();
      if (text) {
        const html = restoreLinks(escapeHtml(text));
        out.push(
          `                <p class="text-lg">\n                    ${html}\n                </p>`
        );
      }
      buf = [];
    }
  };

  const flushList = () => {
    if (!listItems.length) return;
    out.push(`                <ul class="list-disc list-inside text-lg">`);
    for (const li of listItems) {
      out.push(`                    <li>${restoreLinks(escapeHtml(li))}</li>`);
    }
    out.push(`                </ul>`);
    listItems = [];
  };

  const listMatcher = /^(\s*)([-*]|\d+\.)\s+(.*)$/;
  const h3Matcher = /^\s*#{3}\s+(.*)$/;

  for (let raw of lines) {
    // headings (###)
    const h3 = raw.match(h3Matcher);
    if (h3) {
      flushParagraph();
      flushList();
      out.push(`                <h3 class="text-xl font-bold mt-4">${restoreLinks(
        escapeHtml(h3[1].trim())
      )}</h3>`);
      continue;
    }

    // list items
    const li = raw.match(listMatcher);
    if (li) {
      flushParagraph();
      inList = true;
      listItems.push(li[3].trim());
      continue;
    }

    // blank line separates blocks
    if (/^\s*$/.test(raw)) {
      if (inList) {
        flushList();
        inList = false;
      } else {
        flushParagraph();
      }
      continue;
    }

    // normal text line → paragraph buffer
    buf.push(raw.trim());
  }

  // flush tail
  if (inList) flushList();
  flushParagraph();

  return out.join("\n");
}

const md = fs.readFileSync(inFile, "utf8");
const bodyJsx = mdToJsx(md);

// compose final component using your Week9 structure/classes
const component = `export default function ${compName}(props) {
    return (
        <div class="card shadow-lg p-6 bg-base-100">
            <div class="card-body space-y-6">
                <img class="object-cover h-72 w-72 m-auto" src="${imageUrl}" />

                <h2 class="text-2xl font-bold ">${escapeHtml(title)}</h2>
                <h2 class=" text-sm pr-8 pl-8">By ${escapeHtml(author)}</h2>
                <div class="flex justify-center items-center space-x-4">
                    <button class="btn btn-primary" id="prevBtn" onClick={props.movePastWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <h2 class=" text-sm pr-8 pl-8">${escapeHtml(dateStr)}</h2>
                    <button class="btn ${hasFlag("--enable-next") ? "btn-primary" : " btn-disabled"}" id="nextBtn" onClick={props.moveNextWeek}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" class="w-5 h-5">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
                ${
                  redditUrl
                    ? `                <a class="underline" href="${redditUrl}">
                    Original Reddit Post Link
                </a>`
                    : ""
                }
${bodyJsx}
            </div>
        </div>
    );
}
`;

fs.writeFileSync(outFile, component, "utf8");
console.log(`✅ Wrote \${outFile} (\${compName})`);
