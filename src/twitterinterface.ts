import Jaco from 'jaco';
// tslint:disable-next-line:variable-name
const Twitter = require('twitter');

const HIRAGANA_KEYWORDS = [
  'ぴあきゃす',
  'ぴあきゃすと',
  'ぴあかす',
  'ぺかすて',
  'ぺか界隈',
];
const KATAKANA_KEYWORDS
  = HIRAGANA_KEYWORDS.map(x => new Jaco(x).toKatakana().toString());
export const ALPHABET_KEYWORDS = [
  'peercast',
  'peercaststation',
  'pecast',
  'pecastarter',
  'peca界隈',
];
const SEARCH_KEYWORDS = ALPHABET_KEYWORDS
  .concat(HIRAGANA_KEYWORDS.map(x => `"${x}"`))
  .concat(KATAKANA_KEYWORDS.map(x => `"${x}"`));
export const BOLD_KEYWORDS = ALPHABET_KEYWORDS
  .concat(HIRAGANA_KEYWORDS)
  .concat(KATAKANA_KEYWORDS);

const SCREEN_NAME_BLACK_LIST = [
  'Atarubot',
  'aquari_bot',
  'bestyasuhirojp',
  'inatami_bot',
  'sapioshan',
  'skc_anniversary',
  'SKC_nmcm_bot',
  'Takayasikibot',
  'tks_kool_bot',
  'yukkuri_livech',
];

const PECASTARTER_CONSTANT_MESSAGE = 'PeerCastで配信中！';

const mention = /(^|\W)@?(\w){1,15}$/;

export async function getSince(tokens: any) {
  const client = new Twitter({
    consumer_key: tokens.consumerKey,
    consumer_secret: tokens.consumerSecret,
    access_token_key: tokens.accessTokenKey,
    access_token_secret: tokens.accessTokenSecret,
  });
  const latest = await getLatest(client);
  return {
    maxId: latest.id_str,
    since: new Date(latest.created_at),
  };
}

export async function getLatests(tokens: any, currentMaxId: string) {
  const client = new Twitter({
    consumer_key: tokens.consumerKey,
    consumer_secret: tokens.consumerSecret,
    access_token_key: tokens.accessTokenKey,
    access_token_secret: tokens.accessTokenSecret,
  });
  const tweets = await getTweets(client, currentMaxId);
  if (tweets.errors != null) {
    throw new Error(JSON.stringify(tweets));
  }
  const maxId: string = tweets.search_metadata.max_id_str;
  return {
    maxId,
    statuses: (<any[]>tweets.statuses)
      .reverse()
      .filter(isValid),
  };
}

function isValid(status: { user: { screen_name: string; }; text: string; }) {
  const screenName: string = status.user.screen_name;
  if (SCREEN_NAME_BLACK_LIST.indexOf(screenName) >= 0) {
    return false;
  }
  if (status.text.indexOf(PECASTARTER_CONSTANT_MESSAGE) === 0) { // 先頭の場合のみマッチ
    return false;
  }
  if (BOLD_KEYWORDS.every(x => !removeMention(status.text).includes(x))) {
    return false;
  }
  return true;
}

function removeMention(text: string) {
  return text.replace(mention, '');
}

async function getLatest(client: any) {
  const params = {
    q: SEARCH_KEYWORDS.join(' OR '),
    count: 1,
  };
  const tweets = await get(client, 'search/tweets', params);
  return tweets.statuses[0];
}

async function getTweets(client: any, sinceId: string) {
  const params = {
    q: SEARCH_KEYWORDS.join(' OR '),
    count: 100,
    since_id: sinceId,
  };
  return get(client, 'search/tweets', params);
}

async function get(client: any, path: string, params: any) {
  return new Promise<any>((resolve, reject) => {
    client.get(path, params, (e: any, tweets: any, _: any) => {
      if (e != null) {
        reject(e);
        return;
      }
      resolve(tweets);
    });
  });
}
