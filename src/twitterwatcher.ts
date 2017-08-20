import { EventEmitter } from "events";
import { getLogger } from "log4js";
const logger = getLogger();
import { getLatests, getSince } from "./twitterinterface";

export default class TwitterWatcher extends EventEmitter {
    constructor(statusListener?: (status: any) => void) {
        super();
        if (statusListener != null) {
            super.addListener("status", statusListener);
        }
    }

    async watch(tokens: Tokens) {
        let maxId: string;
        try {
            const result = await getSince(tokens);
            maxId = result.maxId;
            this.emit("since", result.since);
        } catch (e) {
            logger.error(e.stack != null ? e.stack : e);
        }
        logger.debug(`maxId: ${maxId}`);
        setInterval(async () => {
            try {
                const result = await getLatests(tokens, maxId);
                maxId = result.maxId;
                result.statuses.forEach((status) => {
                    this.emit("status", status);
                });
            } catch (e) {
                logger.error(e.stack != null ? e.stack : e);
            }
        }, 60 * 1000);
    }
}

interface Tokens {
    consumerKey: string;
    consumerSecret: string;
    accessTokenKey: string;
    accessTokenSecret: string;
}
