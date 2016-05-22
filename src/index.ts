/// <reference path="../typings/main.d.ts" />
try { require("source-map-support").install(); } catch (e) { /* empty */ }
const Gitter = require("node-gitter");
import * as RequestStatic from "request";
const request: typeof RequestStatic = require("request");
import TwitterWatcher, { BOLD_KEYWORDS } from "./twitterwatcher";
import { configure, getLogger } from "log4js";
configure({
    appenders: [{ type: "console", layout: { type: "basic" } }]
});
let logger = getLogger();

async function main() {
    if (process.env.GITTER_ROOM == null
        || process.env.GITTER_TOKEN == null
        || process.env.TWITTER_CONSUMER_TOKEN == null
        || process.env.TWITTER_CONSUMER_SECRET == null
        || process.env.TWITTER_ACCESS_TOKEN_KEY == null
        || process.env.TWITTER_ACCESS_TOKEN_SECRET == null) {
        logger.fatal("Tokens not found.");
        return;
    }
    let roomPath = process.env.GITTER_ROOM;
    let gitter = new Gitter(process.env.GITTER_TOKEN);
    let room = await gitter.rooms.join(roomPath);
    let watcher = new TwitterWatcher(async (status) => {
        let url = `https://twitter.com/${status.user.screen_name}/status/${status.id_str}`;
        let text = status.text;
        text = escapeGitterMarkdown(text);
        text = boldifyKeywords(text);
        let mainText = `[${status.user.screen_name}] ${text}`;
        try {
            let minified = await minifyURL(url);
            room.send(`${mainText} ${minified}`);
        } catch (e) {
            logger.error(e.stack != null ? e.stack : e);
            room.send(`${mainText} ${url.substring(1)}`);
        }
    });
    watcher.on("since", async (since: Date) => {
        try {
            logger.info(await room.send(`Since ${since}.`));
        } catch (e) {
            logger.error(e);
        }
    });
    watcher.watch({
        consumerKey: process.env.TWITTER_CONSUMER_TOKEN,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });
}

function minifyURL(url: string) {
    return new Promise((resolve, reject) => {
        request(
            `https://is.gd/create.php?format=simple&url=${encodeURIComponent(url)}`,
            (err, result, body) => {
                if (err != null) {
                    reject(err);
                    return;
                }
                resolve(body);
            });
    });
}

function escapeGitterMarkdown(text: string) {
    text = text.replace(/\n/g, " ");
    text = text.replace(/\*/g, "＊");
    text = text.replace(/~/g, "〜");
    text = text.replace(/#/g, "＃");
    text = text.replace(/>/g, "＞");
    text = text.replace(/@/g, "＠");
    text = text.replace(/`/g, "｀");
    const LINK = /\[(.*?)\]\((.*?)\)/;
    while (text.match(LINK) != null) {
        text = text.replace(LINK, "[$1]❨$2❩");
    }
    return text;
}

function boldifyKeywords(text: string) {
    BOLD_KEYWORDS
        .sort((a, b) => -(a.length - b.length))
        .forEach(keyword => {
            text = text.replace(new RegExp(`(${keyword})`, "gi"), "**$1**");
        });
    return text;
}

main()
    .catch((e: any) => logger.error(e.stack));
