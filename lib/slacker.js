var request = require('request');

/**
 * Slack API wrapper.
 *
 * @param {object} config (Slacker configuration)
 *
 * @returns Slacker
 */
var Slacker = function (config) {
  this.token = config.token;

  return this;
};

/**
 * Send Slack API request, get information.
 *
 * @param {string} method (Slack API method)
 * @param {object} paramString (The GET params)
 *
 * @returns {object}
 */
Slacker.prototype.get = function (method, paramString, callback) {
  if (!paramString){
    paramString = "?";
  }
  paramString += "&token=" + this.token;

  request.get({
    url: 'https://slack.com/api/' + method + paramString,
    json: true
  }, callback);
};

/**
 * Send Slack API request, post message.
 *
 * @param {string} method
 * @param {object} args
 */
Slacker.prototype.send = function (method, args) {
  args = args || {};
  if (!args.token) {
    args.token = this.token;
  }

  request.post({
    url: 'https://slack.com/api/' + method,
    json: true,
    form: args
  }, function (error, response, body) {
    if (error || !body.ok) {
      //Logger.setConfig({verbose: this.verbose});
      //Logger.logError('Error posting to Slack: ' + error + body.error + '\n');
    }
  });
};

exports.Slacker = Slacker;
