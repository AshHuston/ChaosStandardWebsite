import fs from "fs/promises";
import axios from "axios";
import * as cheerio from "cheerio";

const sets = JSON.parse(
  await fs.readFile("./standardSets.json", "utf8")
);

const setMap = new Map(
  sets.map(set => [
    set.name.toLowerCase(),
    set
  ])
);

const html = (
  await axios.get(
    "https://mtg.fandom.com/wiki/Standard/Timeline"
  )
).data;

const $ = cheerio.load(html);

// TODO: inspect the exact table selector
$("table tr").each((_, row) => {
  const tds = $(row).find("td");

  if (tds.length < 3) return;

  const ended = $(tds[1]).text().trim();

  if (!ended) return;

  const legalSetsText = $(tds[2]).text();

  for (const set of sets) {
    if (
      legalSetsText
        .toLowerCase()
        .includes(set.name.toLowerCase())
    ) {
      set.legal_until = ended;
    }
  }
});

await fs.writeFile(
  "./standardSets.json",
  JSON.stringify(sets, null, 2)
);
