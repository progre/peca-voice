import { configure, getLogger } from 'log4js';
configure({
  appenders: { console: { type: 'console', layout: { type: 'basic' } } },
  categories: { default: { appenders: ['console'], level: 'debug' } },
});
const logger = getLogger();
import * as fs from 'fs';
import * as http from 'http';
// tslint:disable-next-line:variable-name
const Gitter = require('node-gitter');
import { postStatus } from './gitterinterface';
import { getLatests, getSince } from './twitterinterface';

if (process.env.GITTER_ROOM == null
  || process.env.GITTER_TOKEN == null
  || process.env.TWITTER_CONSUMER_TOKEN == null
  || process.env.TWITTER_CONSUMER_SECRET == null
  || process.env.TWITTER_ACCESS_TOKEN_KEY == null
  || process.env.TWITTER_ACCESS_TOKEN_SECRET == null) {
  logger.fatal('Tokens not found.');
  process.exit(1);
}

http.createServer((_, res) => {
  const gitterToken = process.env.GITTER_TOKEN!;
  const twitterTokens = {
    consumerKey: process.env.TWITTER_CONSUMER_TOKEN,
    consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
    accessTokenKey: process.env.TWITTER_ACCESS_TOKEN_KEY,
    accessTokenSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
  };
  const roomPath = process.env.GITTER_ROOM!;
  fs.readFile('/tmp/maxId', 'utf8', async (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        const { maxId: maxIdOnFirstTime, since } = await getSince(twitterTokens);
        fs.writeFile(
          '/tmp/maxId',
          maxIdOnFirstTime,
          (err1) => { logger.fatal('writeFile failed', err1); },
        );
        const gitter = new Gitter(gitterToken);
        const room = await gitter.rooms.join(roomPath);
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
      logger.info(`Found. ${JSON.stringify(status)}`);
      postStatus(status, gitterToken, roomPath)
        .catch((e) => { logger.fatal('post failed', e); });
    });
    fs.writeFile('/tmp/maxId', maxId, (e) => { logger.fatal('write failed', e); });
    res.statusCode = 200;
    res.end();
  });
}).listen(3000);
logger.info('Listening 3000');
