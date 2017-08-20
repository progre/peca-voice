import { getLogger } from "log4js";
const logger = getLogger();
const Gitter = require("node-gitter");
import * as RequestStatic from "request";
const request: typeof RequestStatic = require("request");
import { BOLD_KEYWORDS } from "./twitterinterface";

export async function postSince(since: Date, gitterToken: string, roomPath: string) {
  let gitter = new Gitter(gitterToken);
  let room = await gitter.rooms.join(roomPath);
  logger.info(await room.send(`Since ${since}.`));
}

export async function postStatus(status: any, gitterToken: string, roomPath: string) {
  let gitter = new Gitter(gitterToken);
  let room = await gitter.rooms.join(roomPath);
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
  text = text.replace(/_/g, "＿");
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
      text = text.replace(new RegExp(`(?!\\*\\*)(${keyword})`, "gi"), "**$1**");
    });
  return text;
}
