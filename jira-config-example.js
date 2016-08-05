var JiraSlackBot = require('./lib/jiraSlackBot');

var config = {
    /*
     Script settings
     */
    verbose: true,

    /*
     Slack and Slack Bot settings
     */
    token: '',

    /*
     API and connection settings
     */
    jira_project_details: {
        // The "DEFAULT" node is required.
        "DEFAULT": {
            baseUrl: "http://jira.url.com/",
            browsePath: "browse/",
            developmentInformationPath: "rest/dev-status/latest/issue/detail?issueId=%issueId%&applicationType=stash&dataType=pullrequest",
            api: {
                user: '',
                password: '',
                host: 'jira.url.com',
                protocol: 'http',
                port: 8080,
                version: '2',
                verbose: true,
                strictSSL: false
            }
        }
    },
    projects: ["REL", "HOT", "GUI", "CA", "ZA", "EMR", "MHCLC", "MPPS"],
    confluence_details: {
        user: '',
        password: ''
    },

    /*
     Message settings
     */
    custom_texts: {
        issuePrefix: "",
        issueLinksText: "ISSUE LINKS",
        issuePullRequestsText: "PULL REQUESTS",
        issueLinksNotAvailable: "No links available.",
        issuePullRequestsNotAvailable: "No pull requests available."
    },
    custom_images: {
        issueLinksImage: "https://cdn1.iconfinder.com/data/icons/silk2/page_white_link.png",
        issuePullRequestsImage: "http://icons.iconarchive.com/icons/fatcow/farm-fresh/16/page-white-code-icon.png"
    },

    /*
     Post and output settings
     */
    bot_name: "Medicore",
    bot_emoji: ":medicore:",

    /*
     JIRA story status matrix, THIS IS AN EXAMPLE!
     */
    statusSubtaskColumns: {
        // These are your sprint lanes.
        // Empty if not using sprint board.
        1: 'Open',
        2: 'In Progress',
        3: 'Review',
        4: 'Closed'
    },
    statusStoryOnHold: { // You can indicate that a full story is on hold when match to value
        statusText: 'On hold',
        hasSubString: ['*', '[ON HOLD]']
    },
    statusSubtaskConversions: [
        // When a subtask is in a certain lane, and contains a certain substring.
        // Empty when not using sprint board.
        {
            statusText: 'Bugfixing',
            contains: {
                column: 2,
                hasSubTaskWith: ['bug']
            }
        },
        {
            statusText: 'In Design',
            contains: {
                column: 2,
                hasSubTaskWith: ['documentation', 'design']
            }
        },
        {
            statusText: 'Implementing',
            contains: {
                column: 2,
                hasSubTaskWith: ['implement', 'fix']
            }
        },
        {
            statusText: 'Unit testing',
            contains: {
                column: 2,
                hasSubTaskWith: ['unit']
            }
        },
        {
            statusText: 'Testing',
            contains: {
                column: 2,
                hasSubTaskWith: ['test', 'testing']
            }
        },
        {
            statusText: 'Review documentation',
            contains: {
                column: 3,
                hasSubTaskWith: ['documentation', 'design']
            }
        },
        {
            statusText: 'Review testscript',
            contains: {
                column: 3,
                hasSubTaskWith: ['script']
            }
        },
        {
            statusText: 'In review',
            contains: {
                column: 3,
                hasSubTaskWith: ['*']
            }
        },
        {
            statusText: 'To implement',
            contains: {
                column: 1,
                hasSubTaskWith: ['implement', 'fix']
            }
        },
        {
            statusText: 'Bugs logged',
            contains: {
                column: 1,
                hasSubTaskWith: ['bug']
            }
        },
        {
            statusText: 'Ready to test',
            contains: {
                column: 1,
                hasSubTaskWith: ['test']
            }
        },
        {
            statusText: 'Ready for QA/FD demo',
            contains: {
                column: 1,
                hasSubTaskWith: ['qa']
            }
        },
        {
            statusText: 'Ready for demo to PO',
            contains: {
                column: 1,
                hasSubTaskWith: ['demo']
            }
        },
        {
            statusText: 'Ready for merge',
            contains: {
                column: 1,
                hasSubTaskWith: ['merge']
            }
        },
        {
            statusText: 'Done',
            contains: {
                column: 4,
                hasSubTaskWith: ['*']
            }
        }
    ]
};

var jiraSlackBot = new JiraSlackBot.Bot(config);
jiraSlackBot.run();
