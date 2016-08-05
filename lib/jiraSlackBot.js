var _ = require('underscore');
var JiraApi = require('jira').JiraApi;
var JiraApiService = require('./jiraApiService');
var Promise = require('promise');
var Slack = require('./slacker');
var Slackbot = require('node-slackbot');

/**
 * Construct and set default config values.
 *
 * @param {object} config
 *
 * @returns {Bot}
 *
 * @constructor
 */
var Bot = function (config) {
    this.config = _.defaults(config, {
        bot_name: "JiraBot",
        emoji: ":bookmark_tabs:",
        post: true
    });

    this.slacker = new Slack.Slacker({
        token: this.config.token
    });

    return this;
};

/**
 * Listener for messages posted in Slack channels
 */
Bot.prototype.run = function () {

    var self = this,
        verbose = self.config.verbose;

    /**
     * Create a JIRA API instance per URL node in the config file.
     *
     * @returns {Array}
     */
    this.getApiPerNode = function () {
        var apis = [];

        _.each(self.config.jira_project_details, function (value, key) {

            if (value.api) {
                if (verbose) {
                    console.log("\n-- Creating API for config node: " + key);
                    _.each(value.api, function (value, key) {
                        console.log(key + ": " + value);
                    });
                }

                apis[key] = new JiraApi(
                    value.api.protocol,
                    value.api.host,
                    value.api.port,
                    value.api.user,
                    value.api.password,
                    value.api.version,
                    value.api.verbose,
                    value.api.strictSSL,
                    value.api.oauth
                );
            }
        });

        return apis;
    };

    /**
     * Concat project shortnames, and make pattern.
     *
     * @returns {string}
     */
    this.getMatchingPattern = function () {
        var pattern = "(?:\\W|^)((",
            projectNames = "";

        _.each(self.config.projects, function (project, index, list) {
            pattern += project;
            projectNames += project;
            if (index != list.length - 1) {
                pattern += "|";
                projectNames += "|";
            }
        });

        pattern += ")-\\d+)(\\+)?(?:(?=\\W)|$)";
        if (verbose) {
            console.log("\n-- Pattern for matching project issues:\n" + pattern);
        }

        return pattern;
    };

    /**
     * Post message to Slack channel.
     *
     * @param {string} chan
     * @param {string} message
     * @param {Array}  attachment
     */
    this.sendChat = function (chan, message, attachment) {
        self.slacker.send('chat.postMessage', {
            channel: chan,
            parse: "all",
            text: message,
            attachments: JSON.stringify(attachment),
            username: self.config.bot_name,
            unfurl_links: false,
            link_names: 1,
            icon_emoji: self.config.bot_emoji
        });
    };

    /**
     * Check if found message (post in channel) is valid for further processing.
     *
     * @param {string} message
     *
     * @returns {boolean}
     */
    this.isMessageValid = function (message) {
        return ('message' === message.type &&
            null !== message.text &&
            undefined !== message.text &&
            'bot_message' !== message.subtype
        );
    };

    /*
     ===================
     Setup bot, and keep listening for posted messages.
     ===================
     */
    var bot = new Slackbot(self.config.token),
        apis = self.getApiPerNode(),
        pattern = self.getMatchingPattern();

    bot.use(function (message, botCallback) {
        if (!self.isMessageValid(message)) {
            return;
        }

        var regexp = new RegExp(pattern, "gi"),
            match;

        /*
         ===================
         If message contains match to an issue number, process it.
         ===================
         */
        while (match = regexp.exec(message.text)) {
            if (verbose) {
                console.log('\n----------------------------------------\n');
                console.log('-- Found message to work with: \n' + message.text);

                console.log("-- Match found in message:\n" + match);
            }

            // if the PROJECT-# can be followed by a character (match[3]) for extra functionality. todo!
            var jiraIssue = match[1].trim(),
                projectName = match[2],
                extender = match[3];

            if (verbose) {
                console.log("-- Working with project: " + projectName);
                console.log("-- Working with issue: " + jiraIssue);
                console.log("-- Working with extender: " + extender);
            }

            if (self.config.showDetailsByDefault) {
                expandInfo = true;
            }

            var jiraApi = apis[projectName];
            // Use DEFAULT config node, when not specific config node is found for the project. todo!
            if (jiraApi == null) {
                projectName = 'DEFAULT';
                jiraApi = apis["DEFAULT"];
            }

            /*
            ===================
             Find the JIRA issue.
            ===================
             */
            var projectConfig = self.config.jira_project_details[projectName];
            JiraApiService.setOptions(jiraApi, projectConfig, self.config);

            var getJiraIssueResult = JiraApiService.getIssue(
                self.config.jira_project_details[projectName].baseUrl + projectConfig.browsePath,
                jiraIssue
            );
            getJiraIssueResult.done(function (jiraIssueResult) {
                if (verbose) {
                    if (null === jiraIssueResult) {
                        console.log("-- Jira API call failed. Possible error:\n" + error);
                    } else {
                        console.log("-- Base message:\n" + jiraIssueResult.message);
                    }
                }
            });

            /*
             ===================
             Find links (and mentions) for the JIRA issue.
             ===================
             */
            var getJiraIssueLinks = JiraApiService.getIssueLinks(jiraIssue);

            // If Issue and Issue Links promises are fulfilled.
            Promise.all([getJiraIssueResult, getJiraIssueLinks]).then(function(messageSet) {

                /*
                 ===================
                 Find Pull Requests for the JIRA issue.
                 ===================
                 */
                JiraApiService.getIssuePullRequests(messageSet[0].id).done(function (pullRequestResult) {
                    var attachment = [
                        {
                            "mrkdwn_in": ["text"],
                            "author_name": self.config.custom_texts.issueLinksText,
                            "author_icon": self.config.custom_images.issueLinksImage,
                            "text": messageSet[1].join(' ')
                        },
                        {
                            "author_name": self.config.custom_texts.issuePullRequestsText,
                            "author_icon": self.config.custom_images.issuePullRequestsImage
                        }
                    ];

                    _.forEach(pullRequestResult, function (pullRequestBag) {
                        attachment.push(
                            {
                                "color": pullRequestBag.color,
                                "mrkdwn_in": ["text"],
                                "text": pullRequestBag.text
                            }
                        );
                    });

                    self.sendChat(
                        message.channel,
                        messageSet[0].message.join(' '),
                        attachment
                    );
                });

            });
        }

        botCallback();
    });
    bot.connect(self.config.verbose);
};

exports = module.exports.Bot = Bot;