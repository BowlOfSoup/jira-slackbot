var _ = require('underscore');
var JiraApiCustom = require('./jiraApiCustom');
var Logger = require('./logger');
var Promise = require('promise');
var request = require('request');

var self = {
    jiraApi: [],
    projectConfig: {},
    config: {},
    logger: Logger,

    /**
     * Inject dependency options.
     *
     * @param {object} jiraApi
     * @param {object} projectConfig
     * @param {object} config
     */
    setOptions: function(jiraApi, projectConfig, config) {
        self.jiraApi = jiraApi;
        self.projectConfig = projectConfig;
        self.config = config;

        if (self.config.verbose) {
            Logger.setConfig(self.config);
            self.logger = Logger;
        }
    },

    /**
     * Get JIRA issue from API, return as Promise
     *
     * @param {string} uri
     * @param {string} issue
     *
     * @returns {Promise}
     */
    getIssue: function(uri, issue) {
        return new Promise(function (fulfill) {
            self.jiraApi.findIssue(issue, function (error, issueResult) {
                if (error || !issueResult) {
                    self.logger.logWarning('[Jira API]: ' + error);
                    fulfill(null);

                    return;
                }

                if (self.config.verboseApi) {
                    Logger.logInfo('JIRA API Result (' +uri+ ')');
                    Logger.log(issueResult);
                }

                var issueMessage = [];

                if (self.config.showIssueStatus) {
                    var issueStatus = self.getIssueStatus(issueResult);
                    if (issueStatus) {
                        issueMessage.push('`' + issueStatus + '`\n');
                    }
                }

                if (issueResult && issueResult.fields) {
                    issueMessage.push(
                        self.config.custom_texts.issuePrefix +
                        '<' + uri +
                        issueResult.key + '|' +
                        issueResult.key + ' - ' +
                        issueResult.fields.summary + '>'
                    );
                }

                var issueResultBag = {
                    id: issueResult.id,
                    message: issueMessage
                }

                fulfill(issueResultBag);
            });
        });
    },

    /**
     * Get the status of a story trough subtask, fallback to story status itself.
     *
     * @param {object} apiResultIssue
     *
     * @returns {string}
     */
    getIssueStatus: function (apiResultIssue) {

        var status = '',
            hasStatus = false;

        if (!apiResultIssue.fields.subtasks[0] ||
            !self.config.statusSubtaskColumns ||
            !self.config.statusSubtaskColumns[1] ||
            !self.config.statusSubtaskConversions[0]) {
            return apiResultIssue.fields.status.name;
        }

        _.forEach(self.config.statusStoryOnHold.hasSubString, function (onHoldValue) {
            if (apiResultIssue.fields.summary.indexOf(onHoldValue) !== -1) {
                hasStatus = true;
                status = self.config.statusStoryOnHold.statusText;
            }
        });
        if (hasStatus) {
            return status;
        }

        _.forEach(self.config.statusSubtaskConversions, function (statusSubtaskConversion) {
            if (hasStatus) {
                return;
            }

            // loop all subtasks for subtaskStatusConversion
            _.forEach(apiResultIssue.fields.subtasks, function (subtask) {
                if (subtask.fields.status.name !== self.config.statusSubtaskColumns[statusSubtaskConversion.contains.column]) {
                    return;
                }

                // subtask contains part of string
                _.forEach(statusSubtaskConversion.contains.hasSubTaskWith, function (stringToMatch) {
                    if ('*' === stringToMatch) {
                        hasStatus = true;
                    }

                    if (subtask.fields.summary.toLowerCase().indexOf(stringToMatch.toLowerCase()) !== -1) {
                        hasStatus = true;
                    }
                });
            });

            if (hasStatus) {
                status = statusSubtaskConversion.statusText;
            }
        });

        return status;
    },

    /**
     * Get JIRA issue links (mentions), return as Promise.
     *
     * @param {string} issue
     *
     * @returns {Promise}
     */
    getIssueLinks: function (issue) {
       return new Promise(function (fulfill) {
           if (!self.config.showIssueLinks) {
               fulfill(null);
           }

           JiraApiCustom.findIssue(self.jiraApi, issue, 'links', function (error, results) {
               if (!results || error) {
                   self.logger.logWarning('[Jira API links]: ' + error);
                   fulfill(null);
                   return;
               }

               if (self.config.verboseApi) {
                   Logger.logInfo('JIRA API Result for issue links');
                   Logger.log(results);
               }

                var jiraGetLinkPromises = [];
                var linkMessage = [];

                for (var i = 0; i < results.length; i++) {
                    var titleMessage = {};

                    jiraGetLinkPromises[i] = new Promise(function (fulfill) {
                        if (!self.config.jira_issue_links_scrape_confluence) {
                            titleMessage = {
                                url: results[i].object.url,
                                title: results[i].object.url
                            };
                            fulfill(titleMessage);
                        }

                        request.get(results[i].object.url, {
                            auth: {
                                user: self.config.confluence_details.user,
                                pass: self.config.confluence_details.password,
                                sendImmediately: true
                            }
                        }, function (error, response, body) {
                            var startTitle = body.indexOf("<title>");
                            var endTitle = body.indexOf("</title>");

                            var authFailedCheck = body.indexOf("AUTHENTICATED_FAILED");
                            if (authFailedCheck != -1) {
                                self.logger.logWarning('[Confluence scraping] authentication failed for issue link. Proceeded using full url.');
                                titleMessage = {
                                    url: response.request.uri.href,
                                    title: response.request.uri.href
                                };
                                fulfill(titleMessage);
                            }

                            if (startTitle != -1 && endTitle != -1) {
                                var title = body.substring(startTitle + 7/*length of <title>*/, endTitle);
                                titleMessage = {
                                    url: response.request.uri.href,
                                    title: title
                                };

                                fulfill(titleMessage);
                            } else {
                                self.logger.logWarning('[Confluence scraping] No title element found for: ' + issue);
                                return;
                            }
                        });
                    });

                    jiraGetLinkPromises[i].done(function (result) {
                        var title = result.title;
                        if(result.title.length > 70) {
                            title = result.title.substring(0, 50)+"...";
                        }

                        linkMessage.push('\n<' + result.url + '| - ' + title + '>');
                    });
                }

                Promise.all(jiraGetLinkPromises).then(function() {

                    if (linkMessage.length < 1) {
                        linkMessage.push(self.config.custom_texts.issueLinksNotAvailable);
                    }

                    fulfill(linkMessage);
                });
            });
        });
    },

    /**
     * Get Pull Request(s) for JIRA issue, return as Promise.
     *
     * @param {string} issueId
     *
     * @returns {Promise}
     */
    getIssuePullRequests: function (issueId) {
        return new Promise(function (fulfill) {
            if (!self.config.showIssueDevelopmentInformation) {
                fulfill(null);
            }

            var options = {
                rejectUnauthorized: self.jiraApi.strictSSL,
                uri: self.projectConfig.baseUrl + self.projectConfig.developmentInformationPath.replace("%issueId%", issueId),
                method: 'GET'
            };
            self.jiraApi.doRequest(options, function(error, response, body) {
                var responseResult = JiraApiCustom.handleResponse(error, response, body);
                if (responseResult.error) {
                    self.logger.logWarning('Getting development information: ' + responseResult.error);
                    fulfill(null);
                    return;
                }

                if (self.config.verboseApi) {
                    Logger.logInfo('JIRA API Result for development information (' +options.uri+ ')');
                    Logger.log(body);
                }

                var result = JSON.parse(body);
                if (!result.detail) {
                    self.logger.logWarning('No development information (or not authorized) for issueId: ' + issueId);

                    fulfill(null);
                    return;
                }

                var pullRequestMessage = [];
                _.forEach(result.detail[0].pullRequests, function (pullRequest) {

                    var pullRequestType = '`Backend`';
                    if (pullRequest.url.indexOf('mc-app') !== -1) {
                        pullRequestType = '`Frontend`';
                    }

                    var pullRequestName = pullRequest.name;
                    if(pullRequest.name.length > 30) {
                        pullRequestName = pullRequest.name.substring(0, 30)+"...";
                    }

                    var reviewerText = '\n';
                    var reviewersApproved = 0;
                    _.forEach(pullRequest.reviewers, function (reviewer) {

                        var reviewerName = reviewer.name.split(" ");
                        reviewerName = reviewerName[0];
                        if (reviewer.approved) {
                            reviewersApproved = ++reviewersApproved;
                            reviewerName = '~' + reviewerName + '~';
                        }
                        if (reviewerText.length < 3) {
                            reviewerText = reviewerText + reviewerName;
                        } else {
                            reviewerText = reviewerText + ' | ' + reviewerName;
                        }
                    });

                    var color = '#E3E4E6';
                    if (pullRequest.status === 'MERGED' || reviewersApproved >= 2) {
                        color = 'good';
                    }

                    if (pullRequest.status === 'OPEN' || reviewersApproved < 2) {
                        color = 'warning';
                    }

                    if (pullRequest.status === 'DECLINED') {
                        color = 'danger';
                    }

                    pullRequestMessage.push({
                        color: color,
                        status: pullRequest.status,
                        text: pullRequestType + ' `' + pullRequest.status + '` <' + pullRequest.url + '| ' + pullRequestName + '>' + reviewerText
                    });
                });

                if (pullRequestMessage.length < 1) {
                    pullRequestMessage.push({
                        color: '#E3E4E6',
                        text: self.config.custom_texts.issuePullRequestsNotAvailable
                    });
                }

                fulfill(pullRequestMessage);
            });
        });
    }
};

module.exports = self;
