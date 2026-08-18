const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");
const html = fs.readFileSync(path.join(root, "dashboard.html"), "utf8");

const cssMatch = html.match(/<style>([\s\S]*?)<\/style>/);
const bodyMatch = html.match(/<body>([\s\S]*?)<script>/);
const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>\s*<\/body>/);

if (!cssMatch || !bodyMatch || !scriptMatch) {
  throw new Error("Could not split dashboard.html into CSS, markup, and script");
}

const src = path.join(root, "src");
fs.mkdirSync(src, { recursive: true });

const extraCss = `
html, body, #root { height: 100%; }
#flow-root { display: contents; }
`;

const css = cssMatch[1]
  .trim()
  .replace(/url\("fonts\//g, 'url("../fonts/');

fs.writeFileSync(path.join(src, "app.css"), css + "\n" + extraCss);

if (process.argv.includes("--js")) {
  fs.writeFileSync(
    path.join(src, "flow.js"),
    "export function bootFlow() {\n" +
      "  if (window.__flowScriptLoaded) return;\n" +
      "  window.__flowScriptLoaded = true;\n" +
      scriptMatch[1].replace(/^\s+/, "") +
      "\n}\n"
  );
}

const ATTR = {
  class: "className",
  for: "htmlFor",
  tabindex: "tabIndex",
  colspan: "colSpan",
  rowspan: "rowSpan",
  readonly: "readOnly",
  maxlength: "maxLength",
  minlength: "minLength",
  cellpadding: "cellPadding",
  cellspacing: "cellSpacing",
  "stroke-width": "strokeWidth",
  "stroke-linecap": "strokeLinecap",
  "stroke-linejoin": "strokeLinejoin",
  "stroke-dasharray": "strokeDasharray",
  "stroke-dashoffset": "strokeDashoffset",
  "stroke-miterlimit": "strokeMiterlimit",
  "fill-rule": "fillRule",
  "clip-path": "clipPath",
  "clip-rule": "clipRule",
  "font-size": "fontSize",
  "font-family": "fontFamily",
  "font-weight": "fontWeight",
  "text-anchor": "textAnchor",
  "stop-color": "stopColor",
  "stop-opacity": "stopOpacity",
  "color-interpolation-filters": "colorInterpolationFilters",
  novalidate: "noValidate",
  autocomplete: "autoComplete",
  autofocus: "autoFocus",
  spellcheck: "spellCheck",
  contenteditable: "contentEditable",
  crossorigin: "crossOrigin",
  datetime: "dateTime",
  inputmode: "inputMode",
  srcset: "srcSet",
  usemap: "useMap",
  "xlink:href": "xlinkHref",
  "xmlns:xlink": "xmlnsXlink",
  "fill-opacity": "fillOpacity",
  "stroke-opacity": "strokeOpacity",
  "alignment-baseline": "alignmentBaseline",
  "dominant-baseline": "dominantBaseline",
};

const VOID = new Set([
  "area", "base", "br", "col", "embed", "hr", "img", "input",
  "link", "meta", "param", "source", "track", "wbr",
]);

function styleToJsx(value) {
  const parts = value.split(";").map((p) => p.trim()).filter(Boolean);
  const obj = parts.map((pair) => {
    const i = pair.indexOf(":");
    const key = pair.slice(0, i).trim();
    const val = pair.slice(i + 1).trim();
    const camel = key.startsWith("--")
      ? `"${key}"`
      : key.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `${camel}: "${val.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
  });
  return `style={{${obj.join(", ")}}}`;
}

function convertAttrs(raw, tag, isInputLike) {
  let s = raw;
  s = s.replace(/\sstyle="([^"]*)"/g, (_, v) => " " + styleToJsx(v));
  if (isInputLike) {
    s = s.replace(/\svalue=/g, " defaultValue=");
    s = s.replace(/\schecked(\s|\/|$)/g, " defaultChecked$1");
  }
  if (tag === "option") s = s.replace(/\sselected(\s|\/|$)/g, " defaultSelected$1");
  s = s.replace(/\snovalidate\b/g, " noValidate");
  s = s.replace(/\s([a-zA-Z_:][-a-zA-Z0-9_:]*)=/g, (m, name) => {
    const mapped = ATTR[name] || ATTR[name.toLowerCase()];
    return mapped ? ` ${mapped}=` : m;
  });
  s = s.replace(/\s(className|htmlFor|noValidate|defaultChecked|defaultSelected|hidden|disabled|multiple|required|readOnly|autoFocus|autoPlay|controls|loop|muted|open|reversed|scoped|seamless|itemScope)=(?!")/g, " $1={true} ");
  return s;
}

function htmlToJsx(input) {
  let out = input.replace(/<!--([\s\S]*?)-->/g, (_, c) => `{/*${c.replace(/\*\//g, "* /")}*/}`);
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*?)\s*\/>/g, (_, tag, attrs) => {
    const t = tag.toLowerCase();
    return `<${tag}${convertAttrs(attrs, t, t === "input" || t === "textarea")} />`;
  });
  out = out.replace(/<([a-zA-Z][a-zA-Z0-9]*)([^>]*?)>/g, (_, tag, attrs) => {
    const t = tag.toLowerCase();
    const converted = convertAttrs(attrs, t, t === "input" || t === "textarea");
    if (VOID.has(t)) return `<${tag}${converted} />`;
    return `<${tag}${converted}>`;
  });
  out = out.replace(/>([^<{]+)</g, (m, text) => {
    if (!/[{}]/.test(text)) return m;
    const escaped = text.replace(/\{/g, "{'{'}").replace(/\}/g, "{'}'}");
    return `>${escaped}<`;
  });
  return out;
}

const jsx = htmlToJsx(bodyMatch[1].trim());
fs.writeFileSync(
  path.join(src, "FlowUi.jsx"),
  "export default function FlowUi() {\n  return (\n    <>\n" +
    jsx.split("\n").map((line) => "      " + line).join("\n") +
    "\n    </>\n  );\n}\n"
);

console.log("Wrote src/app.css" + (process.argv.includes("--js") ? ", src/flow.js" : "") + ", src/FlowUi.jsx");
