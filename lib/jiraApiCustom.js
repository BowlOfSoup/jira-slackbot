var self = {
    /**
     * Handle response for a custom jiraApi findIssue call.
     *
     * @param {string}   error
     * @param {object}   response
     * @param {string}   body
     */
    handleResponse: function(error, response, body) {
        if (error) {
            return {
                error: error
            };
        }
        if (response.statusCode === 404) {
            return {
                error: 'Invalid issue number.'
            };
        }
        if (response.statusCode !== 200) {
            return {
                error: response.statusCode + ': Unable to connect to JIRA.'
            };
        }
        if (body === undefined) {
            return {
                error: 'Response body was undefined.'
            };
        }

        return {};
    },

    /**
     * Custom method to find an issue, able to use additional api paths.
     *
     * @param {object}   jiraApi
     * @param {string}   issueNumber
     * @param {string}   apiPath
     * @param {function} callback
     */
    findIssue: function (jiraApi, issueNumber, apiPath, callback) {
        var uri = jiraApi.makeUri('/issue/' + issueNumber);

        switch(apiPath) {
            case 'links':
                uri = uri + '/remotelink';
                break;
            default:
                callback('No valid api path given.');
        }

        var options = {
            rejectUnauthorized: jiraApi.strictSSL,
            uri: uri,
            method: 'GET'
        };

        var responseResult = {};
        jiraApi.doRequest(options, function(error, response, body) {
            responseResult = self.handleResponse(error, response, body);
            if (responseResult.error) {
                callback(responseResult.error);
                return;
            }

            body = JSON.parse(body);
            if (body && body.errorMessages) {
                callback(body.errorMessages[0]);
            }

            callback(null, body);
        });
    }
};

module.exports = self;
