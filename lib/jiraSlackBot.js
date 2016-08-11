var _ = require('underscore');
var JiraApi = require('jira').JiraApi;
var JiraApiService = require('./jiraApiService');
var Logger = require('./logger');
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

    var self = this;

    Logger.setConfig({verbose: self.config.verbose});

    /**
     * Create a JIRA API instance per URL node in the config file.
     *
     * @returns {Array}
     */
    this.getApiPerNode = function () {
        var apiNodes = [];

        if (!self.config.jira_project_details) {
            Logger.logError('No configuration for JIRA projects found, no DEFAULT node found.');
        }

        _.each(self.config.jira_project_details, function (value, key) {

            if (value.api) {

                Logger.logInfo('Creating API for config node: ' + key);
                if (self.config.verbose) {
                    _.each(value.api, function (value, key) {
                        Logger.log(key + ": " + value);
                    });
                }

                apiNodes[key] = new JiraApi(
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

        return apiNodes;
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
        Logger.logInfo('Pattern for matching project issues');
        Logger.log(pattern);

        return pattern;
    };

    /**
     * Get match data and config for project.
     *
     * @param {Array} apiNodes
     * @param {Array} issueMatch
     *
     * @returns {object}
     */
    this.getMatchAndMatchingConfig = function (apiNodes, issueMatch) {
        // if the PROJECT-# can be followed by a character (match[3]) for extra functionality. todo!
        var matchData = {
            jiraIssue: issueMatch[1].trim(),
            projectName: issueMatch[2],
            extender: issueMatch[3],
            jiraApi: apiNodes[issueMatch[2]]
        };

        // Use DEFAULT config node, when not specific config node is found for the project.
        if (!matchData.jiraApi) {
            matchData.projectName = 'DEFAULT';
            matchData.jiraApi = apiNodes[matchData.projectName];
        }

        return matchData;
    };

    /**
     * Build uri for calling JIRA API to get basic issue data.
     *
     * @param {object} matchDetails
     * @param {object} projectConfig
     *
     * @returns {string}
     */
    this.getJiraIssueUri = function (matchDetails, projectConfig) {
        return self.config.jira_project_details[matchDetails.projectName].baseUrl + projectConfig.browsePath;
    };

    /**
     * Check if found message (post in channel) is a bot message for processing.
     *
     * @param {object} message
     *
     * @returns {boolean}
     */
    this.isMessageValidBot = function (message) {
        return (self.config.tokenForAdminUserToInterceptJiraPushMessages &&
        'bot_message' === message.subtype &&
        message.attachments &&
        message.attachments[0] &&
        message.attachments[0].title_link);
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

        Logger.logSuccess('Message sent');
        Logger.log(message + JSON.stringify(attachment));
    };

    /**
     * Delete message from Slack channel.
     *
     * @param {string} channel
     * @param {string} timeStamp
     */
    this.deleteChat = function (channel, timeStamp) {
        self.slacker.send('chat.delete', {
            token: self.config.tokenForAdminUserToInterceptJiraPushMessages,
            ts: timeStamp,
            channel: channel,
            as_user: true,
        });
    };

    /*
     ===================
     Setup bot, and keep listening for posted messages.
     ===================
     */
    Logger.logSuccess('JIRA Slackbot started!');

    var bot = new Slackbot(self.config.token),
        apiNodes = self.getApiPerNode(),
        pattern = self.getMatchingPattern(),
        matchDetails = {},
        projectConfig = {};

    bot.use(function (message, botCallback) {

        var regexp = new RegExp(pattern, "gi"),
            match;

        /*
         ===================
         Process bot message from JIRA.
         ===================
         */
        if (self.isMessageValidBot(message)) {
            var matchingIssue = regexp.exec(message.attachments[0].title_link);
            if (matchingIssue) {
                // JIRA app integration found.
                self.deleteChat(message.channel, message.ts);

                matchDetails = self.getMatchAndMatchingConfig(apiNodes, matchingIssue);
                projectConfig = self.config.jira_project_details[matchDetails.projectName];
                var jiraUrl = self.getJiraIssueUri(matchDetails, projectConfig);

                JiraApiService.setOptions(matchDetails.jiraApi, projectConfig, self.config);
                var getJiraIssueResult = JiraApiService.getIssue(
                    jiraUrl,
                    matchDetails.jiraIssue
                );
                getJiraIssueResult.done(function (jiraIssueResult) {
                    if (!jiraIssueResult) {
                        Logger.logError('Jira API call failed, could not resolve issue.');
                    } else {
                        var messageBag = JiraApiService.interceptJiraApp(jiraIssueResult, jiraUrl, message);
                        self.sendChat(messageBag.channel, messageBag.message, messageBag.attachment);
                    }
                });
            }
        }

        /*
         ===================
         Process non-bot message.
         ===================
         */
        if (!self.isMessageValid(message)) {
            return;
        }

        /*
         ===================
         If message contains match to an issue number, process it.
         ===================
         */
        while (match = regexp.exec(message.text)) {
            Logger.line();
            Logger.logInfo('Found message to work with:');
            Logger.log(message.text);
            Logger.logInfo("Match found in message:");
            Logger.log(match);

            matchDetails = self.getMatchAndMatchingConfig(apiNodes, match);

            Logger.logInfo("Working with project: " + matchDetails.projectName);
            Logger.logInfo("Working with issue: " + matchDetails.jiraIssue);
            Logger.logInfo("Working with extender: " + matchDetails.extender);

            /*
             ===================
             Find the JIRA issue.
             ===================
             */
            projectConfig = self.config.jira_project_details[matchDetails.projectName];
            JiraApiService.setOptions(matchDetails.jiraApi, projectConfig, self.config);

            getJiraIssueResult = JiraApiService.getIssue(
                self.getJiraIssueUri(matchDetails, projectConfig),
                matchDetails.jiraIssue
            );
            getJiraIssueResult.done(function (jiraIssueResult) {
                if (null === jiraIssueResult) {
                    Logger.logError('Jira API call failed, could not resolve issue.');
                } else {
                    Logger.logInfo('Base message');
                    Logger.log(jiraIssueResult.message);
                }
            });

            /*
             ===================
             If post is a request, handle it.
             ===================
             */
            

            /*
             ===================
             Find links (and mentions) for the JIRA issue.
             ===================
             */
            var getJiraIssueLinks = JiraApiService.getIssueLinks(matchDetails.jiraIssue);

            // If Issue and Issue Links promises are fulfilled.
            Promise.all([getJiraIssueResult, getJiraIssueLinks]).then(function (messageSet) {

                /*
                 ===================
                 Find Pull Requests for the JIRA issue.
                 ===================
                 */
                JiraApiService.getIssuePullRequests(messageSet[0].id).done(function (pullRequestResult) {
                    var attachment = [];
                    if (pullRequestResult) {
                        attachment = [
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
                    }

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
