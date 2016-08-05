var self = {
    /**
     * Custom method to find an issue.
     *
     * @param {object}   jiraApi
     * @param {string}   issueNumber
     * @param {object}   settings
     * @param {function} callback
     */
    findIssue: function (jiraApi, issueNumber, settings, callback) {

        var uri = jiraApi.makeUri('/issue/' + issueNumber);

        if (settings.postFix && settings.postFix === 'links') {
            uri = uri + '/remotelink';
        }

        var options = {
            rejectUnauthorized: jiraApi.strictSSL,
            uri: uri,
            method: 'GET'
        };

        jiraApi.doRequest(options, function(error, response, body) {
            if (error) {
                callback(error, null);
                return;
            }
            if (response.statusCode === 404) {
                callback('Invalid issue number.');
                return;
            }
            if (response.statusCode !== 200) {
                callback(response.statusCode + ': Unable to connect to JIRA during findIssueStatus.');
                return;
            }
            if (body === undefined) {
                callback('Response body was undefined.');
                return;
            }

            callback(null, JSON.parse(body));
        });
    }
};

module.exports = self;
