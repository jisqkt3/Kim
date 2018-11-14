var HtmlReporter = require('protractor-beautiful-reporter');
// An example configuration file.
exports.config = {
    //SELENIUM_PROMISE_MANAGER: false,
    directConnect: true,
    // seleniumAddress: 'http://localhost:4444/wd/hub',
    // Capabilities to be passed to the webdriver instance.
    capabilities: {
        'browserName': 'chrome',
        shardTestFiles: true,
        maxInstances: 1
    },
    // Framework to use. Jasmine 2 is recommended.
    framework: 'jasmine2',
    // Spec patterns are relative to the current working directly when
    // protractor is called.
    specs: ['Homework3.js'],
    // Options to be passed to Jasmine.
    jasmineNodeOpts: {
        defaultTimeoutInterval: 2500000
    },
    onPrepare: function () {
        // Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
        //  browser.manage().window().maximize();
        jasmine.getEnv().addReporter(new HtmlReporter({
            baseDirectory: './../Reports/screenshots',
            docTitle: 'XYZ Bank',
        }).getJasmine2Reporter());
    }
};
//# sourceMappingURL=conf.js.map