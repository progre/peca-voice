import {EventEmitter} from "events";
const Twitter = require("twitter");
const jaco = require("jaco");
import {getLogger} from "log4js";
const logger = getLogger();

const HIRAGANA_KEYWORDS = [
    `"ぴあきゃす"`,
    `"ぴあきゃすと"`,
    `"ぴあかす"`,
    `"ぺかすて"`,
];
const KEYWORDS = [
    "peercast",
    "peercaststation",
    "pecast",
    "pecastarter"
]
    .concat(HIRAGANA_KEYWORDS)
    .concat(HIRAGANA_KEYWORDS.map(x => jaco.katakanize(x)));

export default class TwitterWatcher extends EventEmitter {
    constructor(statusListener?: (status: any) => void) {
        super();
        if (statusListener != null) {
            super.addListener("status", statusListener);
        }
    }

    async watch(tokens: Tokens) {
        let client = new Twitter({
            consumer_key: tokens.consumerKey,
            consumer_secret: tokens.consumerSecret,
            access_token_key: tokens.accessTokenKey,
            access_token_secret: tokens.accessTokenSecret
        });
        let maxId: string;
        try {
            let latest = await getLatest(client);
            maxId = latest.id_str;
            this.emit("since", new Date(latest.created_at));
        } catch (e) {
            logger.error(e.stack != null ? e.stack : e);
        }
        logger.debug(`maxId: ${maxId}`);
        setInterval(async () => {
            try {
                let tweets = await getTweets(client, maxId);
                maxId = tweets.search_metadata.max_id_str;
                tweets.statuses.reverse().forEach((status: any) => {
                    this.emit("status", status);
                });
            } catch (e) {
                logger.error(e.stack != null ? e.stack : e);
            }
        }, 60 * 1000);
    }
}

async function getLatest(client: any) {
    let params = {
        q: KEYWORDS.join(" OR "),
        count: 1
    };
    let tweets = await get(client, "search/tweets", params);
    return tweets.statuses[0];
}

function getTweets(client: any, sinceId: string) {
    let params = {
        q: KEYWORDS.join(" OR "),
        count: 100,
        since_id: sinceId
    };
    return get(client, "search/tweets", params);
}

function get(client: any, path: string, params: any) {
    return new Promise<any>((resolve, reject) => {
        client.get(path, params, (e: any, tweets: any, response: any) => {
            if (e != null) {
                reject(e);
                return;
            }
            resolve(tweets);
        });
    });
}

interface Tokens {
    consumerKey: string;
    consumerSecret: string;
    accessTokenKey: string;
    accessTokenSecret: string;
}
