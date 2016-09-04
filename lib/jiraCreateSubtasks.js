var self = {
    config: {
        taskSet: 1
    },

    hasValidCommand: function(message) {
        var result,
            regex = /--(\w+)="([^"]+)|--(\w+)/g;

        while ((result = regex.exec(message.text)) !== null) {
            if (result.index === regex.lastIndex) {
                regex.lastIndex++;
            }



            console.log('\n');
            console.log(result);
            console.log('\n');
        }
    }
};

module.exports = self;
