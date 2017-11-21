try { require("source-map-support").install(); } catch (e) { /* empty */ }
import * as http from "http";
import * as fs from "fs";
const Gitter = require("node-gitter");
import { postStatus } from "./gitterinterface";
import { getLatests, getSince } from "./twitterinterface";
import { configure, getLogger } from "log4js";
configure({
    appenders: [{ type: "console", layout: { type: "basic" } }]
});
let logger = getLogger();

if (process.env.GITTER_ROOM == null
    || process.env.GITTER_TOKEN == null
    || process.env.TWITTER_CONSUMER_TOKEN == null
    || process.env.TWITTER_CONSUMER_SECRET == null
    || process.env.TWITTER_ACCESS_TOKEN_KEY == null
    || process.env.TWITTER_ACCESS_TOKEN_SECRET == null) {
    logger.fatal("Tokens not found.");
    process.exit(1);
}

http.createServer((req, res) => {
    const gitterToken = process.env.GITTER_TOKEN;
    const twitterTokens = {
        consumerKey: process.env.TWITTER_CONSUMER_TOKEN,
        consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
        accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
        accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET
    };
    let roomPath = process.env.GITTER_ROOM;
    fs.readFile("/tmp/maxId", "utf8", async (err, data) => {
        if (err) {
            if (err.code === "ENOENT") {
                const { maxId, since } = await getSince(twitterTokens);
                fs.writeFile("/tmp/maxId", maxId);
                let gitter = new Gitter(gitterToken);
                let room = await gitter.rooms.join(roomPath);
                logger.info(await room.send(`Since ${since}.`));
                res.statusCode = 200;
                res.end();
                return;
            }
            res.statusCode = 500;
            res.end(JSON.stringify(err));
            return;
        }
        const { maxId, statuses } = await getLatests(twitterTokens, data);
        statuses.forEach((status) => {
            logger.info("Found. " + JSON.stringify(status));
            postStatus(status, gitterToken, roomPath);
        });
        fs.writeFile("/tmp/maxId", maxId);
        res.statusCode = 200;
        res.end();
    });
}).listen(3000);
