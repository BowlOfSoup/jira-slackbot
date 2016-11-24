var JiraSlackBot = require('./lib/jiraSlackBot');

var config = {
    /*
     * --- Global script settings
     */
    // Indicates verbose level, debugging script flow
    verbose: true,
    // Indicates verbose level for API calls, good for debugging responses
    verboseApi: false,

    /*
     * --- Slack and Slack Bot settings
     */
    // Put your bot(user) token here
    token: '',
    // Put token for bot(user) which intercepts message from the JIRA webhook. If not sure, use same token as above
    tokenForAdminUserToInterceptJiraPushMessages: '',

    /*
     * --- API and connection settings
     */
    jira_project_details: {
        // The "DEFAULT" node is required.
        "DEFAULT": {
            // You JIRA URL. (e.g. "http://jira.company.com/")
            baseUrl: "http://jira.url.com/",
            // The JIRA path to lookup issues (e.g. "browse/")
            // Normally when looking up an issue its behing the baseURL (e.g. http://jira.company.com/browse/)
            // If not sure, keep "browse/" value
            browsePath: "browse/",
            // the JIRA path for looking up technical data (Bitbucket integration) If not sure, keep default value
            developmentInformationPath: "rest/dev-status/latest/issue/detail?issueId=%issueId%&applicationType=stash&dataType=pullrequest",
            api: {
                // The details you use to connect to your JIRA instance
                user: '',
                password: '',
                host: 'jira.url.com',
                // Below, change only if you are really sure
                protocol: 'http',
                port: 8080,
                version: '2',
                verbose: true,
                strictSSL: false
            }
        }
    },

    // Indicate the possible project keys you want intercept
    // (a project keys is usually the part before the - in KEY-1234 (issuenumber)
    projects: ["REL", "HOT", "GUI", "CA", "ZA", "EMR", "MHCLC", "MPPS"],

    // Enable Confluence support in issue links (When an issue link (or mention) is found referring to Confluence)
    jira_issue_links_scrape_confluence: true,
    // The details you use to connect to you Confluence instance
    confluence_details: {
        user: '',
        password: ''
    },

    /*
     * --- Message settings, customize the level of detail.
     */
    // Show by default, the status of an issue
    showIssueStatus: true,

    // Indicate you want to use the extender character (see next setting)
    useIssueExtender: true,
    // When this character is put behind the issue (e.g. KEY-1234+) (where + is the character)
    // more output will be given, which you can enable/disable below (IssueStatus/IssueLinks).
    // Make empty when you always want to display the full information.
    issueExtenderChar: "+",

    // Show by default, the issue links (e.g. Confluence mentions)
    showIssueLinks: true,
    // Show by default, technical information (Bitbucket)
    showIssueDevelopmentInformation: true,

    // Translations for used strings.
    custom_texts: {
        issuePrefix: "",
        issueLinksText: "ISSUE LINKS",
        issuePullRequestsText: "PULL REQUESTS",
        issueLinksNotAvailable: "No links available.",
        issuePullRequestsNotAvailable: "No pull requests available."
    },
    // Custom images used for displaying sections (blank if no image)
    custom_images: {
        issueLinksImage: "https://cdn1.iconfinder.com/data/icons/silk2/page_white_link.png",
        issuePullRequestsImage: "http://icons.iconarchive.com/icons/fatcow/farm-fresh/16/page-white-code-icon.png"
    },

    /*
     * --- Post and output settings
     */
    // Name of the bot you want to use to output the information in a channel
    // This does not have to be the actual bot name
    bot_name: "JiraBot",
    // The emoji you want to use for the posts. Refer to Slack to see which icons you can use.
    bot_emoji: ":bookmark_tabs:",

    /*
     * --- JIRA story status matrix, THIS IS AN EXAMPLE!
     */
    statusSubtaskColumns: {
        // These are your sprint lanes
        // Empty if not using sprint board
        1: 'Open',
        2: 'In Progress',
        3: 'Review',
        4: 'Closed'
    },
    // You can indicate that a full story is on hold when match is found in issue title to a certain substring
    statusStoryOnHold: {
        statusText: 'On hold',
        hasSubString: ['*', '[ON HOLD]']
    },
    // When a subtask is in a certain lane, and contains a certain substring
    // Make empty (uncomment next line and remove everything below) when not using an agile board (JIRA GreenHopper)
    // statusSubtaskConversions: []
    statusSubtaskConversions: [
        {
            // StatusText (status) displayed as the status
            statusText: 'Bugfixing',
            contains: {
                // In which board column should the issue be to be indicated with this status
                column: 2,
                // Which substring should the issue title have to be indicated with this status
                // Match multiple substrings with: ['documentation', 'design']
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

// Initializing the actual script
var jiraSlackBot = new JiraSlackBot.Bot(config);
jiraSlackBot.run();
