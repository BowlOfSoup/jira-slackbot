var colors = require('colors');

var self = {
    config: {},

    /**
     * Inject configuration.
     *
     * @param {object} config
     */
    setConfig: function(config) {
        self.config = config;

        if (!config.verbose) {
            self.config.verbose = false;
        }
    },

    /**
     * Split message on colon, e.g. split description and value.
     *
     * @param {string} message
     *
     * @returns {object}
     */
    splitByColon: function (message) {
        var messageSplit = message.split(": ");
        if (messageSplit.length === 1 || messageSplit.length > 2) {
            return {
                message: message,
                value: ''
            }
        }

        return {
            message: messageSplit[0] + ': ',
            value: messageSplit[1]
        };
    },

    /**
     * Output the logstring to the console.
     *
     * @param {string} logString
     */
    consoleLog: function(logString) {
        console.log(logString);
    },

    /**
     * Draw a line.
     */
    line: function() {
        if (!self.config.verbose) {
            return;
        }

        self.consoleLog('\n----------------------------------------\n');
    },

    /**
     * Normal logging.
     *
     * @param {string} message
     */
    log: function(message) {
        if (!self.config.verbose) {
            return;
        }

        self.consoleLog(message);
    },

    /**
     * Log info strings.
     *
     * @param {string} message
     */
    logInfo: function(message) {
        if (!self.config.verbose) {
            return;
        }

        var messageBag = self.splitByColon('-- ' + message);
        self.consoleLog(messageBag.message.cyan + messageBag.value);
    },

    /**
     * Log string which indicates a success.
     *
     * @param {string} message
     */
    logSuccess: function(message) {
        if (!self.config.verbose) {
            return;
        }

        var successMessage = '-- ' + message;
        self.consoleLog(successMessage.green);
    },

    /**
     * Log string which indicates a warning.
     *
     * @param {string} message
     */
    logWarning: function(message) {
        if (!self.config.verbose) {
            return;
        }

        var messageBag = self.splitByColon('-- Warning! ' + message);
        self.consoleLog(messageBag.message.yellow + messageBag.value);
    },

    /**
     * Log string which indicates errors.
     *
     * @param {string} message
     */
    logError: function(message) {
        if (!self.config.verbose) {
            return;
        }

        var errorMessage = '\nError! ' + message + '\n';
        self.consoleLog(errorMessage.red);
    }
}

module.exports = self;
