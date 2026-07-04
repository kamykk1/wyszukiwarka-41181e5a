// Deno tests for send-mailing HTML sanitization / XSS blocking.
//
// Run with: deno test supabase/functions/send-mailing/sanitize_test.ts
//
// These tests focus on the pure helpers `sanitizeHtml` and `escapeHtml`
// which guard every user-controlled string that lands inside the outbound
// email HTML. They must remain in sync with the runtime used in
// supabase/functions/send-mailing/index.ts.

import {
  assertEquals,
  assert,
  assertStringIncludes,
  assertFalse,
} from "https://deno.land/std@0.224.0/assert/mod.ts";

import { escapeHtml, sanitizeHtml } from "./index.ts";

// ---------------- escapeHtml ----------------

Deno.test("escapeHtml escapes all HTML metacharacters", () => {
  assertEquals(
    escapeHtml(`<script>alert("x&y")</script>'`),
    "&lt;script&gt;alert(&quot;x&amp;y&quot;)&lt;/script&gt;&#39;",
  );
});

Deno.test("escapeHtml handles null and undefined safely", () => {
  assertEquals(escapeHtml(null as unknown as string), "");
  assertEquals(escapeHtml(undefined as unknown as string), "");
});

Deno.test("escapeHtml blocks XSS via subject/name fields", () => {
  const payloads = [
    `<img src=x onerror=alert(1)>`,
    `"><script>alert(1)</script>`,
    `<svg/onload=alert(1)>`,
    `javascript:alert(1)`,
    `<iframe src="javascript:alert(1)"></iframe>`,
  ];
  for (const p of payloads) {
    const out = escapeHtml(p);
    assertFalse(out.includes("<"), `must not contain raw < for: ${p}`);
    assertFalse(out.includes(">"), `must not contain raw > for: ${p}`);
    // Executable JS URIs get their < > escaped which alone neutralises the
    // vector even if the "javascript:" text remains.
    assertFalse(/<script/i.test(out), `must not contain <script for: ${p}`);
  }
});

// ---------------- sanitizeHtml ----------------

Deno.test("sanitizeHtml strips <script> blocks entirely", () => {
  const out = sanitizeHtml(`<p>hello</p><script>alert(1)</script><p>bye</p>`);
  assertEquals(out, `<p>hello</p><p>bye</p>`);
});

Deno.test("sanitizeHtml strips <style>, <iframe>, <object>, <embed>", () => {
  const out = sanitizeHtml(
    `<style>body{}</style><iframe src="x"></iframe><object data="x"></object><embed src="x">`,
  );
  assertEquals(out, "");
});

Deno.test("sanitizeHtml removes on* event handlers (double, single, unquoted)", () => {
  const cases = [
    `<img src="x" onerror="alert(1)">`,
    `<img src='x' onerror='alert(1)'>`,
    `<img src=x onerror=alert(1)>`,
    `<a href="#" ONCLICK="alert(1)">x</a>`,
    `<body onload="alert(1)">`,
  ];
  for (const html of cases) {
    const out = sanitizeHtml(html);
    assertFalse(/\son\w+\s*=/i.test(out), `handler survived in: ${html} -> ${out}`);
    assertFalse(/alert\(1\)/.test(out) && /on\w+/i.test(out), `event handler still wired: ${out}`);
  }
});

Deno.test("sanitizeHtml removes javascript: URLs", () => {
  const inputs = [
    `<a href="javascript:alert(1)">x</a>`,
    `<a href="JAVASCRIPT:alert(1)">x</a>`,
    `<a href="  javascript:alert(1)">x</a>`,
  ];
  for (const html of inputs) {
    const out = sanitizeHtml(html);
    assertFalse(/javascript:/i.test(out), `javascript: URL survived: ${out}`);
  }
});

Deno.test("sanitizeHtml preserves safe markup used by templates", () => {
  const safe = `<h2>Hello</h2><p><strong>Bold</strong> and <a href="https://example.com">link</a></p>`;
  assertEquals(sanitizeHtml(safe), safe);
});

Deno.test("sanitizeHtml handles null/undefined safely", () => {
  assertEquals(sanitizeHtml(null as unknown as string), "");
  assertEquals(sanitizeHtml(undefined as unknown as string), "");
});

// ---------------- End-to-end template rendering ----------------
// Mirrors the substitution pipeline inside index.ts to prove no XSS survives
// when malicious user input flows into subject / name / message placeholders.

function renderEmail(opts: { template: string; subject: string; name: string; message: string }): string {
  const safeTemplate = sanitizeHtml(opts.template);
  const safeSubject = escapeHtml(opts.subject);
  const safeName = escapeHtml(opts.name);
  const safeMessage = sanitizeHtml(String(opts.message ?? "")).replace(/\n/g, "<br/>");
  return safeTemplate
    .replace(/\{\{subject\}\}/g, safeSubject)
    .replace(/\{\{name\}\}/g, safeName)
    .replace(/\{\{message\}\}/g, safeMessage);
}

Deno.test("renderEmail blocks XSS via subject", () => {
  const html = renderEmail({
    template: `<h1>{{subject}}</h1>`,
    subject: `</h1><script>alert('xss')</script>`,
    name: "",
    message: "",
  });
  assertFalse(/<script/i.test(html), html);
  assertStringIncludes(html, "&lt;script&gt;");
});

Deno.test("renderEmail blocks XSS via name", () => {
  const html = renderEmail({
    template: `<p>Hi {{name}}</p>`,
    subject: "s",
    name: `<img src=x onerror=alert(1)>`,
    message: "",
  });
  assertFalse(/onerror/i.test(html), html);
  assertFalse(/<img/i.test(html), html);
});

Deno.test("renderEmail blocks XSS via admin-supplied HTML message", () => {
  const html = renderEmail({
    template: `<div>{{message}}</div>`,
    subject: "s",
    name: "",
    message: `<p>hi</p><script>steal()</script><a href="javascript:evil()">x</a><img src=y onerror=alert(1)>`,
  });
  assertFalse(/<script/i.test(html), html);
  assertFalse(/javascript:/i.test(html), html);
  assertFalse(/onerror/i.test(html), html);
  assertStringIncludes(html, "<p>hi</p>");
});

Deno.test("renderEmail blocks XSS via admin template itself", () => {
  const html = renderEmail({
    template: `<h1>{{subject}}</h1><script>alert(1)</script><iframe src="x"></iframe><div onclick="hack()">{{message}}</div>`,
    subject: "Newsletter",
    name: "",
    message: "safe body",
  });
  assertFalse(/<script/i.test(html), html);
  assertFalse(/<iframe/i.test(html), html);
  assertFalse(/onclick/i.test(html), html);
  assertStringIncludes(html, "<h1>Newsletter</h1>");
  assertStringIncludes(html, "safe body");
});

Deno.test("renderEmail neutralises common XSS cheat-sheet payloads", () => {
  const payloads = [
    `<svg/onload=alert(1)>`,
    `<body onload=alert(1)>`,
    `<a href="jAvAsCrIpT:alert(1)">x</a>`,
    `<math><mtext></mtext><script>alert(1)</script></math>`,
    `"><script>alert(String.fromCharCode(88,83,83))</script>`,
    `<object data="javascript:alert(1)"></object>`,
    `<embed src="javascript:alert(1)">`,
  ];
  for (const p of payloads) {
    const html = renderEmail({
      template: `<div>{{message}}</div>`,
      subject: "s",
      name: "",
      message: p,
    });
    assertFalse(/<script/i.test(html), `script survived: ${p} -> ${html}`);
    assertFalse(/javascript:/i.test(html), `javascript: survived: ${p} -> ${html}`);
    assertFalse(/\son\w+\s*=/i.test(html), `event handler survived: ${p} -> ${html}`);
    assertFalse(/<iframe|<object|<embed/i.test(html), `dangerous tag survived: ${p} -> ${html}`);
  }
});

Deno.test("renderEmail preserves message line breaks as <br/>", () => {
  const html = renderEmail({
    template: `<div>{{message}}</div>`,
    subject: "s",
    name: "",
    message: "line1\nline2",
  });
  assertStringIncludes(html, "line1<br/>line2");
});
