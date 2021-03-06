import { config } from 'dotenv';
import Twitter from 'twitter';

import topicalTwitterSearchPhrases from './config/topicalTwitterSearchPhrases';
import models from './models';

// provide access to env variables
config();

// I want to write a tweet every 12 hours.
const EVERY_12_HOURS = 43200000

const { Tweet = {} } = models;

const client = new Twitter({
  consumer_key: process.env.CONSUMER_KEY,
  consumer_secret: process.env.CONSUMER_SECRET,
  access_token_key: process.env.ACCESS_TOKEN_KEY,
  access_token_secret: process.env.ACCESS_TOKEN_SECRET,
});

function getRandomElementIndex(arr) {
  let randomElementIndex = Math.floor(Math.random() * (arr.length - 1));
  // a check for edge cases where randomSearchElement equals 0 then minuses to -1
  if (randomElementIndex < 0) return randomElementIndex++;
  return randomElementIndex;
}

function getSearchPhrase() {
  // this is the random element used to select a possible search query
  const randomTopicalTwitterSearchIndex = getRandomElementIndex(topicalTwitterSearchPhrases);
  const topicalTweetPhrase = topicalTwitterSearchPhrases[randomTopicalTwitterSearchIndex];
  return topicalTweetPhrase;
}

const twitterBotEngine = async function() {
  // make a search for the topic of choice
  const { statuses: tweets } = await client.get('search/tweets', {
    q: getSearchPhrase(),
    count: 200,
  });

  const foundTweets = tweets.map(({ id: tweet_id, text, user: { name, screen_name } }) => ({
    tweet_id,
    text,
    name,
    screen_name,
  }));

  if (foundTweets.length === 0) return twitterBotEngine();

  const randomIndexOfFoundTweet = getRandomElementIndex(foundTweets);
  const foundTweet = foundTweets[randomIndexOfFoundTweet];
  if (foundTweet.text.includes('…')) return twitterBotEngine();

  const resolvedTweet = await Tweet.findByPk(foundTweet.tweet_id);
  if (resolvedTweet || foundTweet.screen_name === 'FreeCodeMine') return twitterBotEngine();

  Tweet.create(foundTweet)

  try {
    await client.post('statuses/update', {
      status: foundTweet.text,
    });
  } catch (e) {
    return 'Something went horribly wrong... but no worries!';
  }
};

models.sequelize.sync().then(() => {
  twitterBotEngine();
  setInterval(twitterBotEngine, EVERY_12_HOURS);
})

