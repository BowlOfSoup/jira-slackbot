# JIRA Slackbot

Get information about a [JIRA](https://www.atlassian.com/software/jira) issue directly in you [Slack](http://slack.com) channel.

It does the following:

- Appends a link to the mentioned JIRA issues, including the summary of the issue.
- Calculates the status of the JIRA issue from it's subtasks. This is customizable.
- Can resolve the issue links (or mentions), so references made from [Confluence](https://www.atlassian.com/software/confluence) to the issue will also be displayed as links. 
- Can resolve pull requests in [Bitbucket](https://www.atlassian.com/software/bitbucket) (or Stash) and displays their status and reviewers.
- Intercepts the JIRA app (webhook from JIRA itself) and improves the messages (adds parent issue if available).

Other features:

- You need to specify the project keys the bot will try to match on, this also means you can configure JIRA connection details per project.
- Posted texts and images can be fully customized to your likings.

## Installation

This *bot* can run on any environment with [NodeJS](https://nodejs.org) installed. 
If you want to run it in the background see paragraph _Run in background_ below.

```
git clone https://github.com/BowlOfSoup/jira-slackbot.git
cd jira-slackbot
npm install
```

You should copy the jira-config-example.js to e.g. your-config-file.js and run:

    node your-config-file.js

If the verbose option is set in the config, output information will be given.

## Configuration in Slack
TL;DR If you have JIRA webhook integration with Slack choose option **3**, else option **2**.

1. For this plugin to work you can either get a test API token from Slack [here](https://api.slack.com/docs/oauth-test-tokens),
but this will only make it work for your user, and only for channels you are part of.

2. The best way is to create a bot [here](https://medicoredevelopment.slack.com/apps/A0F7YS25R-bots) and configure it to your liking.
You actually need to **invite the created bot to a channel** where you want the bot to listen to posts. 
Downside of a bot, that it does not have access to private channels but the 'test token' does. Guess that is a Slack thingy.

3. **But**, if you want support for the JIRA app integration, that is, replacing the default JIRA app (webhook from JIRA) messages with a better message, 
you will need to create a seperate user (log in with it) and generate a test API token from Slack [here](https://api.slack.com/docs/oauth-test-tokens). Place the token in the config file, grant the user admin rights in Slack and invite it to the channel in which you want to use the functionality.
If you use this method (and thus use the JIRA Slack app integration) you don't need step 2 (a seperate bot).

The newly created bot or user has nothing to do with the bot who does the **post** in a channel, which you can configure in the config file.

## Run in background
Install _forever_.

    npm install forever -g
    forever start -w -c node your-config-file.js

You can watch the scripts verbose output in a logfile by running:

    forever start -l /path/to/logfile -a -w -c node your-config-file.js
    tail -f /path/to/logfile

Stop the script by running:

    forever stopall

**To be even more safe, run with nodemon**:

    forever start -l /path/to/logfile -a -c node_modules/nodemon/bin/nodemon.js  jira.js --exitcrash

## Todo

- Implement configuration on what to output for an issue (actual API fields)
- Add support for bamboo _(EMR-4610)_
- Implement error channel
- Implement creation of subtasks trough bot.

## Special thanks

[slack-jira-plugin](https://github.com/gsingers/slack-jira-plugin), the initial version I used to come up with this.
