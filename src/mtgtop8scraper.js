import * as cheerio from 'cheerio';
import { markdownScryfallLlink } from './scryfall.js';

export async function getEventForDate(date) {

    const params = new URLSearchParams();

    params.append("compet_check[P]", "1"); // Professional REL only
    params.append("date_start", date);
    params.append("date_end", date);

    const response = await fetch("https://mtgtop8.com/search", {
    method: "POST",
    headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "User-Agent": "Mozilla/5.0",
        "Referer": "https://mtgtop8.com/search",
        "Origin": "https://mtgtop8.com"
    },
    body: params.toString()
    });

    return await response.text();
}

function fixFormatName(name){
    switch (name.toLowerCase()){
        case 'block':
            return 'Block Constructed';
        default:
            return name;
    }
}

async function buildEventReport(rows) {
    if (!rows.length) return '';
    const baseUrl = 'https://mtgtop8.com/'

    // Helper: normalize date (DD/MM/YY → DD/MM/YYYY)
    const normalizeDate = (dateStr) => {
        const [d, m, y] = dateStr.split('/');
        const year = y.length === 2 ? `20${y}` : y;
        return `${d}/${m}/${year}`;
    };

    // Sort by rank priority
    const rankOrder = (rank) => {
        if (rank === '1') return 1;
        if (rank === '2') return 2;
        if (rank === '3-4') return 3;
        if (rank === '5-8') return 5;
        return 99;
    };

    const sorted = [...rows].sort(
        (a, b) => rankOrder(a.rank) - rankOrder(b.rank)
    );

    const winner = sorted.find(r => r.rank === '1');

    const date = normalizeDate(winner.date);
    const format = winner.format;
    const event = winner.event;

    let report = `On ${date}. ${winner.player} won the ${fixFormatName(format)} ${event} playing `;
    report += `[${winner.deck}](${baseUrl}${winner.deckUrl}).\n`;
    report += `The top 8 of the event were:\n`;

    sorted
        .filter(r => ['1', '2', '3-4', '5-8'].includes(r.rank))
        .forEach(row => {
        report += `${row.rank}. ${row.player} - `;
        report += `[${row.deck}](${baseUrl}${row.deckUrl})\n`;
        });
    const links = await getDeckUrlsForEvent(winner.date)
    const decklists = []
    for (const link of links){
        const decklist = await getDeckList(link)
        decklists.push(decklist)
    }
    const mostCommonCards = findMostCommonCards(decklists)

    if (mostCommonCards.mainboardCards.length == 1) {
        report += `The most popular maindeck card was ${await markdownScryfallLlink(mostCommonCards.mainboardCards[0].cardname)} with ${mostCommonCards.mainboardCards[0].total} copies.\n`
    }else{
        report += `The most popular maindeck cards were ${await formatCards(mostCommonCards.mainboardCards)}\n`
    }

    if (mostCommonCards.sideboardCards.length == 1) {
        report += `The most popular sideboard card was ${await markdownScryfallLlink(mostCommonCards.sideboardCards[0].cardname)} with ${mostCommonCards.sideboardCards[0].total} copies.\n`
    }else{
        report += `The most popular sideboard cards were ${await formatCards(mostCommonCards.sideboardCards)}\n`
    }

    return report;
}

export async function getFullEventReport(date = new Intl.DateTimeFormat('en-GB').format(new Date), dataOnly = false){
    const html = await getEventForDate(date)
    const $ = cheerio.load(html);
    const table = $('table.Stable');
    const rows = table.find('tr.hover_tr');
    const data = rows.map((_, row) => {
        const cells = $(row).find('td');
        return {
            deck: cells.eq(1).text().trim(),
            player: cells.eq(2).text().trim(),
            format: cells.eq(3).text().trim(),
            event: cells.eq(4).text().trim(),
            rank: cells.eq(6).text().trim(),
            date: cells.eq(7).text().trim(),
            deckUrl: cells.eq(1).find('a').attr('href'),
            playerUrl: cells.eq(2).find('a').attr('href'),
        };
    }).get();

    const groupedData = Object.values(
        data.reduce((acc, item) => {
            if (!acc[item.event]) {
            acc[item.event] = [];
            }
            acc[item.event].push(item);
            return acc;
        }, {})
    );

    if (dataOnly) { return groupedData; }

    let finalReport = "";

    for (const eventGroup of groupedData) {
        const report = await buildEventReport(eventGroup);
        finalReport += report + "\n";
    }
    return finalReport.length ? '### ' + finalReport.trim() : '';
}

export async function getDeckList(deckUrl) {
    const html = await fetch(deckUrl).then(res => res.text())
    const $ = cheerio.load(html);

    const mainboard = [];
    const sideboard = [];
    let section = 'mainboard';

    // Walk elements in DOM order
    $('.deck_line, div, span').each((_, el) => {
    const $el = $(el);
    const text = $el.text().trim().toUpperCase();

    // Detect SIDEBOARD marker
    if (text === 'SIDEBOARD') {
        section = 'sideboard';
        return;
    }

    // Only process actual card rows
    if (!$el.hasClass('deck_line')) return;

    const countText = $el
        .clone()
        .children()
        .remove()
        .end()
        .text()
        .trim();

    const count = parseInt(countText, 10);
    const cardName = $el.find('span').first().text().trim();

    if (!Number.isNaN(count) && cardName) {
        const target = section === 'sideboard' ? sideboard : mainboard;
        target.push({ cardname: cardName, count });
    }
    });

    return { mainboard, sideboard };
}

function findMostCommonCards(decklists, blacklist = ['plains', 'island', 'swamp', 'mountain', 'forest']) {
  const blacklistSet = new Set(
    blacklist.map(name => name.trim().toLowerCase())
  );

  const countCards = (lists) => {
    const totals = new Map();
    for (const list of lists) {
        
      for (const { cardname, count } of list) {
        if (blacklistSet.has(cardname.toLowerCase())) continue;

        totals.set(cardname, (totals.get(cardname) || 0) + count);
      }
    }

    let max = 0;
    for (const total of totals.values()) {
      if (total > max) max = total;
    }

    return [...totals.entries()]
      .filter(([, total]) => total === max)
      .map(([cardname, total]) => ({ cardname, total }));
  };

  return {
    mainboardCards: countCards(decklists.map(d => d.mainboard)),
    sideboardCards: countCards(decklists.map(d => d.sideboard))
  };
}

export async function getDeckUrlsForEvent(
  date = new Intl.DateTimeFormat('en-GB').format(new Date())
) {
  const html = await getEventForDate(date);
  const $ = cheerio.load(html);

  const baseUrl = 'https://mtgtop8.com/';

  return $('table.Stable tr.hover_tr')
    .map((_, row) => {
      const cells = $(row).find('td');
      const rank = cells.eq(6).text().trim();

      // Skip non–Top 8 decks
      if (rank === 'Other') return null;

      const href = cells.eq(1).find('a').attr('href');
      return href ? new URL(href, baseUrl).href : null;
    })
    .get()
    .filter(Boolean);
}

async function formatCards(cards) {
  if (!Array.isArray(cards) || cards.length === 0) return "";

  const count = cards[0].total;
  const names = cards.map(c => c.cardname);

  let list;
  if (names.length === 1) {
    list = await markdownScryfallLlink(names[0]);
  } else if (names.length === 2) {
    list = `${await markdownScryfallLlink(names[0])} and ${await markdownScryfallLlink(names[1])}`;
  } else {
    list = `${await markdownScryfallLlink(names.slice(0, -1).join(", "))} and ${await markdownScryfallLlink(names.at(-1))}`;
  }

  return `${list}. Each with ${count} copies.`;
}

// Just a lil test
//console.log(await getFullEventReport("18/10/15"))

console.log(await getFullEventReport("18/10/15", true))
