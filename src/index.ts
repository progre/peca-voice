/// <reference path="../typings/main.d.ts" />
try { require("source-map-support").install(); } catch (e) { /* empty */ }
const Gitter = require("node-gitter");
import TwitterWatcher from "./twitterwatcher";
import {configure, getLogger} from "log4js";
configure({
    appenders: [{ type: "console", layout: { type: "basic" } }]
});
let logger = getLogger();

async function main(roomPath: string) {
    if (process.env.GITTER_TOKEN == null
        || process.env.TWITTER_CONSUMER_TOKEN == null
        || process.env.TWITTER_CONSUMER_SECRET == null
        || process.env.TWITTER_ACCESS_TOKEN_KEY == null
        || process.env.TWITTER_ACCESS_TOKEN_SECRET == null) {
        logger.fatal("Tokens not found.");
        return;
    }
    let gitter = new Gitter(process.env.GITTER_TOKEN);
    let room = await gitter.rooms.join(roomPath);
    let watcher = new TwitterWatcher(status => {
        room.send(`https://twitter.com/${status.user.screen_name}/status/${status.id_str}`);
    });
    watcher.on("since", (since: Date) => {
        room.send(`Since ${since}.`);
    });
    watcher.watch({
        consumerKey: process.env.TWITTER_CONSUMER_TOKEN,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    });
}

main(process.argv[2])
    .catch((e: any) => logger.error(e.stack));
