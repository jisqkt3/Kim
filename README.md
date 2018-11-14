Preprequsites and settings to run in IE Browser with protractor:

1) IE in your local system should be of version 11

2) Change settings of IE as per" Step-4" in this post:
http://elgalu.github.io/2014/run-protractor-against-internet-explorer-vm/
3) package.json file should be having following dipendencies
------------------------
Package.Json:
{
"name": "protractor",
"author": "Goutham",
"description": "Webdriver E2E test wrapper for Angular.",
"version": "1.0.0",
"dependencies": {
"protractor-beautiful-reporter": "^1.2.1",
"protractor-jasmine2-screenshot-reporter": "^0.5.0",
"selenium-standalone": "^6.5.0",
"protractor": "^5.3.0",
"selenium-webdriver": "^2.53.3",
"jasmine": "3.1.0"
},
"devDependencies": {
"@types/jasmine": "^2.8.6",
"protractor-jasmine2-html-reporter": "0.0.7"
}
}
---------------------
4) Insatll all dipendencies mentioned in package.json by running :
"npm install" in command prompt.(project level )
You can see "node_modules" folder gets displayed under project
5) Update webdriver IE by running:
"webdriver-manager update --ie" command
it unzipps and update the ie browser.
6) Start Webdriver manager by running:
"webdriver-manager start" command
 Selenium Server gets started and run's on given port
7)set config file as shown below,
-----------------------
Config.js:
var HtmlReporter = require('protractor-beautiful-reporter');

// An example configuration file.
exports.config = {
//directConnect: true,
seleniumAddress: 'http://localhost:4444/wd/hub',
// Capabilities to be passed to the webdriver instance.
capabilities: {
'browserName': 'internet explorer',
shardTestFiles: true,
maxInstances: 1
},
// Framework to use. Jasmine 2 is recommended.
framework: 'jasmine2',
// Spec patterns are relative to the current working directly when
// protractor is called.
specs: ['BankManagerTC.js','CustomerTC.js'],
// Options to be passed to Jasmine.
jasmineNodeOpts: {
defaultTimeoutInterval: 2500000
},
onPrepare: function() {
// Add a screenshot reporter and store screenshots to `/tmp/screenshots`:
// browser.manage().window().maximize();
jasmine.getEnv().addReporter(new HtmlReporter({
baseDirectory: './../Reports/screenshots',
docTitle: 'XYZ Bank',

}).getJasmine2Reporter());
}
}

----------------------------
8)Run config file
Go to folder containing config file and run command "protractor conf.js"
you should be able to run the test cases in IE browser with above settings.
9) To check reports, go to reports folder which generates after executing the scripts
open xyz_bank\Reports\screenshots\report.html
open report.html in chrome browser.



