#!/usr/bin/env python3
"""Audit public HTML, sitemap coverage, and declared crawler access; no credentials.

Uses Python's standard library and curl. User-agent probes are diagnostic only:
they cannot establish access by a verified provider crawler through edge rules.
"""

import argparse
import concurrent.futures
import datetime
import hashlib
import json
import re
import subprocess
import tempfile
import urllib.parse
import urllib.robotparser
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path


class PublicHTML(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = []
        self.main_text = []
        self.canonical = None
        self.description = None
        self.robots = []
        self.headings = []
        self.in_title = False
        self.in_main = False
        self.in_heading = False
        self.skipped = 0

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "title":
            self.in_title = True
        if tag == "main":
            self.in_main = True
        if tag in {"script", "style"}:
            self.skipped += 1
        if tag == "h1":
            self.headings.append([])
            self.in_heading = True
        if tag == "link" and "canonical" in attrs.get("rel", "").split():
            self.canonical = attrs.get("href")
        if tag == "meta":
            name = attrs.get("name", "").lower()
            if name == "description":
                self.description = attrs.get("content")
            if name in {"robots", "googlebot"}:
                self.robots.append(attrs.get("content", ""))

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False
        if tag == "main":
            self.in_main = False
        if tag == "h1":
            self.in_heading = False
        if tag in {"script", "style"}:
            self.skipped = max(0, self.skipped - 1)

    def handle_data(self, data):
        if self.skipped:
            return
        if self.in_title:
            self.title.append(data)
        if self.in_main:
            self.main_text.append(data)
        if self.in_heading and self.headings:
            self.headings[-1].append(data)


def fetch(url, user_agent="PublicDiscoveryAudit/1.0", head=False):
    with tempfile.TemporaryDirectory(prefix="public-discovery-") as directory:
        headers = Path(directory) / "headers"
        body = Path(directory) / "body"
        args = ["curl", "-sS", "-L", "--max-redirs", "5", "--max-time", "30",
                "--proto", "=https,http", "--proto-redir", "=https,http",
                "-A", user_agent, "-D", str(headers), "-o", str(body),
                "-w", "%{http_code}\n%{url_effective}", url]
        if head:
            args.insert(1, "-I")
        result = subprocess.run(args, capture_output=True, text=True)
        if result.returncode:
            return {"url": url, "error": "curl failed", "exit_code": result.returncode}, ""
        status, effective = result.stdout.split("\n", 1)
        blocks = re.split(r"\r?\n\r?\n", headers.read_text().strip())
        selected = {}
        for line in blocks[-1].splitlines()[1:]:
            if ":" in line:
                key, value = line.split(":", 1)
                key = key.lower()
                if key in {"content-type", "x-robots-tag", "link", "content-signal",
                           "cf-mitigated", "cache-control", "location"}:
                    selected[key] = value.strip()
        content = body.read_text(errors="replace") if body.exists() else ""
        return {"url": url, "status": int(status), "effective_url": effective,
                "headers": selected}, content


def audit(origin):
    robots_result, robots_text = fetch(origin + "/robots.txt")
    parser = urllib.robotparser.RobotFileParser()
    parser.parse(robots_text.splitlines())
    bots = ["Googlebot", "OAI-SearchBot", "ChatGPT-User", "GPTBot",
            "Claude-SearchBot", "Claude-User", "ClaudeBot", "Google-Extended"]
    robots_result["declared_access"] = {
        bot: {"home": parser.can_fetch(bot, origin + "/"),
              "preview": parser.can_fetch(bot, origin + "/preview/audit-example")}
        for bot in bots
    }
    robots_result["policy"] = [line for line in robots_text.splitlines()
                               if line.lower().startswith("content-signal:")]
    llms_result, llms = fetch(origin + "/llms.txt")
    sitemap_result, sitemap = fetch(origin + "/sitemap.xml")
    sitemap_urls = set()
    try:
        root = ET.fromstring(sitemap)
        sitemap_urls = {node.text for node in root.findall("{*}url/{*}loc") if node.text}
        sitemap_result["url_count"] = len(sitemap_urls)
    except ET.ParseError:
        sitemap_result["error"] = "Invalid sitemap XML or non-XML response"

    linked = {url for url in re.findall(r"\]\((https?://[^)]+)\)", llms)
              if urllib.parse.urlsplit(url).netloc == urllib.parse.urlsplit(origin).netloc}
    priority = {origin + path for path in ["/", "/about-svcc", "/locations",
                "/programs", "/admissions", "/financial-aid", "/tuition-and-fees",
                "/academic-calendar", "/class-schedule", "/directory"]}

    def page(url):
        result, html = fetch(url)
        if "text/html" in result.get("headers", {}).get("content-type", ""):
            document = PublicHTML()
            document.feed(html)
            text = " ".join(" ".join(document.main_text).split())
            result.update(title="".join(document.title), canonical=document.canonical,
                          description=document.description, robots=document.robots,
                          h1=["".join(parts).strip() for parts in document.headings],
                          main_text_words=len(text.split()),
                          main_text_sha256=hashlib.sha256(text.encode()).hexdigest(),
                          in_sitemap=result.get("effective_url") in sitemap_urls)
        return result

    urls = sorted((linked | priority) - {origin + "/sitemap.xml"})
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        pages = list(pool.map(page, urls))
    probes = []
    for bot in ["OAI-SearchBot", "Claude-SearchBot", "GPTBot", "ClaudeBot"]:
        result, _ = fetch(origin + "/", user_agent=bot, head=True)
        result["user_agent"] = bot
        probes.append(result)
    return {
        "checked_at": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "origin": origin, "robots": robots_result, "llms": llms_result,
        "sitemap": sitemap_result, "pages": pages,
        "user_agent_probes": probes,
        "limitations": ["User-agent probes do not verify access by real provider crawlers.",
                        "Indexing, citations, content correctness, and billing are not established.",
                        "Robots parser ignores Content-Signal and uses Python robotparser semantics."],
    }


def main():
    args = argparse.ArgumentParser(description=__doc__)
    args.add_argument("--origin", required=True, help="Public HTTPS origin, without credentials")
    args.add_argument("--output", type=Path, required=True)
    options = args.parse_args()
    parsed = urllib.parse.urlsplit(options.origin)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc or parsed.username or parsed.password or parsed.query or parsed.fragment or parsed.path not in {"", "/"}:
        args.error("Use an HTTP(S) origin without credentials, path, query, or fragment")
    report = audit(options.origin.rstrip("/"))
    options.output.parent.mkdir(parents=True, exist_ok=True)
    options.output.write_text(json.dumps(report, indent=2) + "\n")
    failures = [page for page in report["pages"] if page.get("status") != 200]
    print(json.dumps({"output": str(options.output), "pages": len(report["pages"]),
                      "non_200": [{"url": p["url"], "status": p.get("status")} for p in failures],
                      "sitemap_urls": report["sitemap"].get("url_count")}))


if __name__ == "__main__":
    main()
