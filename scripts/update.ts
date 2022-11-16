#!/usr/bin/env deno run --allow-net=dumps.wikimedia.org --allow-read=. --allow-write=.

import { readLines } from "https://deno.land/std@0.152.0/io/mod.ts";
import { readerFromStreamReader } from "https://deno.land/std@0.152.0/streams/mod.ts";

const DEST_DIR = import.meta.resolve("../data/");
const DUMPS_BASE_URL = "https://dumps.wikimedia.org/enwiktionary/latest/";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

if (import.meta.main) {
  main();
}

async function main() {
  const res = await fetch_dump("enwiktionary-latest-all-titles-in-ns0.gz", {
    etag: await read_etag(DEST_DIR),
    base_url: DUMPS_BASE_URL,
  });
  if (res.status === 304) {
    // Not Modified
    return;
  }
  const titles = read_titles(res);
  const grouped_titles = await group_by_grapheme_count(titles);

  await ensure_empty(DEST_DIR);
  await write_grouped_titles(DEST_DIR, grouped_titles);
  await write_etag(DEST_DIR, res.headers.get("ETag"));
}

async function read_etag(base_dir: string): Promise<string | null> {
  try {
    return await Deno.readTextFile(new URL(".etag", base_dir));
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      return null;
    } else {
      throw e;
    }
  }
}

async function write_etag(
  base_dir: string,
  etag: string | null,
): Promise<void> {
  if (etag === null) {
    return;
  }
  await Deno.writeTextFile(new URL(".etag", base_dir), etag);
}

async function fetch_dump(
  name: string,
  options: { etag: string | null; base_url: string },
): Promise<Response> {
  const req = new Request(new URL(name, options.base_url));
  if (options.etag) {
    req.headers.set("If-None-Match", options.etag);
  }
  const res = await fetch(req);
  return new Response(
    res.body?.pipeThrough(new DecompressionStream("gzip")),
    res,
  );
}

async function* read_titles(res: Response): AsyncIterableIterator<string> {
  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText} (${res.url})`);
  }
  if (!res.body) {
    throw new Error(`No body (${res.url})`);
  }

  const titles = readLines(readerFromStreamReader(res.body.getReader()));
  await titles.next(); // skip header
  yield* titles;
}

async function group_by_grapheme_count(
  strings: AsyncIterable<string>,
): Promise<Map<number, string[]>> {
  const groups = new Map<number, string[]>();
  for await (const s of strings) {
    const grapheme_count = Array.from(segmenter.segment(s)).length;
    if (grapheme_count === 0) {
      continue;
    }
    let group = groups.get(grapheme_count);
    if (!group) {
      group = [];
      groups.set(grapheme_count, group);
    }
    group.push(s);
  }
  return groups;
}

async function write_grouped_titles(
  dest_dir: string,
  grouped_titles: Map<number, string[]>,
): Promise<void> {
  await Promise.all(Array.from(grouped_titles, ([count, titles]) => {
    const path = new URL(`${String(count).padStart(3, "0")}.txt`, dest_dir);
    return Deno.writeTextFile(path, titles.map((s) => s + "\n").join(""));
  }));
}

async function ensure_empty(dir: string): Promise<void> {
  try {
    for await (const f of Deno.readDir(dir)) {
      await Deno.remove(new URL(f.name, dir));
    }
  } catch (e) {
    if (e instanceof Deno.errors.NotFound) {
      await Deno.mkdir(dir, { recursive: true });
    } else {
      throw e;
    }
  }
}
