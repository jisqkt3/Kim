var app = angular.module('reportingApp', []);

//<editor-fold desc="global helpers">

var isValueAnArray = function (val) {
    return Array.isArray(val);
};

var getSpec = function (str) {
    var describes = str.split('|');
    return describes[describes.length - 1];
};
var checkIfShouldDisplaySpecName = function (prevItem, item) {
    if (!prevItem) {
        item.displaySpecName = true;
    } else if (getSpec(item.description) !== getSpec(prevItem.description)) {
        item.displaySpecName = true;
    }
};

var getParent = function (str) {
    var arr = str.split('|');
    str = "";
    for (var i = arr.length - 2; i > 0; i--) {
        str += arr[i] + " > ";
    }
    return str.slice(0, -3);
};

var getShortDescription = function (str) {
    return str.split('|')[0];
};

var countLogMessages = function (item) {
    if ((!item.logWarnings || !item.logErrors) && item.browserLogs && item.browserLogs.length > 0) {
        item.logWarnings = 0;
        item.logErrors = 0;
        for (var logNumber = 0; logNumber < item.browserLogs.length; logNumber++) {
            var logEntry = item.browserLogs[logNumber];
            if (logEntry.level === 'SEVERE') {
                item.logErrors++;
            }
            if (logEntry.level === 'WARNING') {
                item.logWarnings++;
            }
        }
    }
};

var defaultSortFunction = function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) {
        return -1;
    }
    else if (a.sessionId > b.sessionId) {
        return 1;
    }

    if (a.timestamp < b.timestamp) {
        return -1;
    }
    else if (a.timestamp > b.timestamp) {
        return 1;
    }

    return 0;
};


//</editor-fold>

app.controller('ScreenshotReportController', function ($scope, $http) {
    var that = this;
    var clientDefaults = undefined;

    $scope.searchSettings = Object.assign({
        description: '',
        allselected: true,
        passed: true,
        failed: true,
        pending: true,
        withLog: true
    }, clientDefaults.searchSettings || {}); // enable customisation of search settings on first page hit

    var initialColumnSettings = clientDefaults.columnSettings; // enable customisation of visible columns on first page hit
    if (initialColumnSettings) {
        if (initialColumnSettings.displayTime !== undefined) {
            // initial settings have be inverted because the html bindings are inverted (e.g. !ctrl.displayTime)
            this.displayTime = !initialColumnSettings.displayTime;
        }
        if (initialColumnSettings.displayBrowser !== undefined) {
            this.displayBrowser = !initialColumnSettings.displayBrowser; // same as above
        }
        if (initialColumnSettings.displaySessionId !== undefined) {
            this.displaySessionId = !initialColumnSettings.displaySessionId; // same as above
        }
        if (initialColumnSettings.displayOS !== undefined) {
            this.displayOS = !initialColumnSettings.displayOS; // same as above
        }
        if (initialColumnSettings.inlineScreenshots !== undefined) {
            this.inlineScreenshots = initialColumnSettings.inlineScreenshots; // this setting does not have to be inverted
        } else {
            this.inlineScreenshots = false;
        }
    }

    this.showSmartStackTraceHighlight = true;

    this.chooseAllTypes = function () {
        var value = true;
        $scope.searchSettings.allselected = !$scope.searchSettings.allselected;
        if (!$scope.searchSettings.allselected) {
            value = false;
        }

        $scope.searchSettings.passed = value;
        $scope.searchSettings.failed = value;
        $scope.searchSettings.pending = value;
        $scope.searchSettings.withLog = value;
    };

    this.isValueAnArray = function (val) {
        return isValueAnArray(val);
    };

    this.getParent = function (str) {
        return getParent(str);
    };

    this.getSpec = function (str) {
        return getSpec(str);
    };

    this.getShortDescription = function (str) {
        return getShortDescription(str);
    };

    this.convertTimestamp = function (timestamp) {
        var d = new Date(timestamp),
            yyyy = d.getFullYear(),
            mm = ('0' + (d.getMonth() + 1)).slice(-2),
            dd = ('0' + d.getDate()).slice(-2),
            hh = d.getHours(),
            h = hh,
            min = ('0' + d.getMinutes()).slice(-2),
            ampm = 'AM',
            time;

        if (hh > 12) {
            h = hh - 12;
            ampm = 'PM';
        } else if (hh === 12) {
            h = 12;
            ampm = 'PM';
        } else if (hh === 0) {
            h = 12;
        }

        // ie: 2013-02-18, 8:35 AM
        time = yyyy + '-' + mm + '-' + dd + ', ' + h + ':' + min + ' ' + ampm;

        return time;
    };


    this.round = function (number, roundVal) {
        return (parseFloat(number) / 1000).toFixed(roundVal);
    };


    this.passCount = function () {
        var passCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.passed) {
                passCount++;
            }
        }
        return passCount;
    };


    this.pendingCount = function () {
        var pendingCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (result.pending) {
                pendingCount++;
            }
        }
        return pendingCount;
    };


    this.failCount = function () {
        var failCount = 0;
        for (var i in this.results) {
            var result = this.results[i];
            if (!result.passed && !result.pending) {
                failCount++;
            }
        }
        return failCount;
    };

    this.passPerc = function () {
        return (this.passCount() / this.totalCount()) * 100;
    };
    this.pendingPerc = function () {
        return (this.pendingCount() / this.totalCount()) * 100;
    };
    this.failPerc = function () {
        return (this.failCount() / this.totalCount()) * 100;
    };
    this.totalCount = function () {
        return this.passCount() + this.failCount() + this.pendingCount();
    };

    this.applySmartHighlight = function (line) {
        if (this.showSmartStackTraceHighlight) {
            if (line.indexOf('node_modules') > -1) {
                return 'greyout';
            }
            if (line.indexOf('  at ') === -1) {
                return '';
            }

            return 'highlight';
        }
        return true;
    };

    var results = [
    {
        "description": "Open the xyz bank url|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d500c5-00ae-0065-0066-00d9003e0085.png",
        "timestamp": 1539687006654,
        "duration": 35581
    },
    {
        "description": "click on bank manager button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003400fd-0040-009d-0031-00d700060046.png",
        "timestamp": 1539687047560,
        "duration": 1277
    },
    {
        "description": "Click on Add Customer button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008f0016-0047-0066-0084-001d000500f6.png",
        "timestamp": 1539687049535,
        "duration": 172
    },
    {
        "description": "Enter the first name|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009e009c-00ed-0057-004e-0074004f0087.png",
        "timestamp": 1539687050525,
        "duration": 1205
    },
    {
        "description": "Enter the last name|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b10019-000b-00f9-0035-00860088007b.png",
        "timestamp": 1539687052225,
        "duration": 190
    },
    {
        "description": "Enter the post code|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a60014-0073-00b7-00cd-003d00a0005a.png",
        "timestamp": 1539687052827,
        "duration": 225
    },
    {
        "description": "Click on Add Customer Button to generte Customer ID|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008100d2-00a6-00ca-00dd-00c3004b00b0.png",
        "timestamp": 1539687053482,
        "duration": 623
    },
    {
        "description": "Go to homePage|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ce00f1-0082-00cf-0042-000c008000d9.png",
        "timestamp": 1539687054862,
        "duration": 153
    },
    {
        "description": "Click on Bank Manager Button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ce004c-0002-0027-00f0-00f7003c0085.png",
        "timestamp": 1539687055915,
        "duration": 170
    },
    {
        "description": "click on open account button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ca000d-0078-0095-00f6-0028007f00d5.png",
        "timestamp": 1539687056427,
        "duration": 183
    },
    {
        "description": "select customer name|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008a0010-000d-0092-00e0-00bf00d000ff.png",
        "timestamp": 1539687056975,
        "duration": 210
    },
    {
        "description": "select currency |BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009d0029-00e9-008f-0012-003a000d00be.png",
        "timestamp": 1539687057675,
        "duration": 290
    },
    {
        "description": "click on Process button to generate account no|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00130007-00c6-000d-00e0-00ee00ab00a6.png",
        "timestamp": 1539687058407,
        "duration": 210
    },
    {
        "description": "After generating account number go to homePage|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008300c7-00cc-00c6-0011-0089008100bd.png",
        "timestamp": 1539687059367,
        "duration": 158
    },
    {
        "description": "Click on Bank Manager Button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b600e6-0048-0018-0021-00ee00d60004.png",
        "timestamp": 1539687059990,
        "duration": 175
    },
    {
        "description": "Click on Customer Button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009f004c-00b7-0013-004e-002300d000a1.png",
        "timestamp": 1539687060582,
        "duration": 145
    },
    {
        "description": "Click on Customer Button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00750074-0003-00ae-0084-008f00060058.png",
        "timestamp": 1539687061077,
        "duration": 253
    },
    {
        "description": "Click on Customer Button|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b800ee-001a-00bd-0078-005800a300db.png",
        "timestamp": 1539687061800,
        "duration": 215
    },
    {
        "description": "Go to homePage|BANK MANAGER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7880,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007c00bd-00b7-00fa-000c-002b0078004f.png",
        "timestamp": 1539687062425,
        "duration": 157
    },
    {
        "description": "Launch XYZ|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2024,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008c0033-0049-009c-0089-005b00ab0037.png",
        "timestamp": 1539773809870,
        "duration": 4898
    },
    {
        "description": "Launch XYZ|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12244,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e5002f-00d8-007b-006d-00bf007e00bf.png",
        "timestamp": 1539774957883,
        "duration": 4569
    },
    {
        "description": "Open the browser|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12244,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00840048-00e9-00e4-00e5-00f800c9008d.png",
        "timestamp": 1539774966062,
        "duration": 2461
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12244,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Failed: name.split is not a function",
        "trace": "TypeError: name.split is not a function\n    at className (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\by.js:138:22)\n    at call (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1068:28)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:907:19\n    at ManagedPromise.invokeCallback_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.call(function)\n    at Driver.call (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:901:23)\n    at Driver.findElementsInternal_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1068:17)\n    at Driver.findElements (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1043:19)\n    at ptor.waitForAngular.then (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as getText] (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as getText] (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at UserContext.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:14:21)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\nFrom: Task: Run it(\"Verify Title\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:12:5)\n    at addSpecsToSuite (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)",
        "browserLogs": [],
        "screenShotFile": "00e60031-00d3-00dc-00e6-00d7001600d9.png",
        "timestamp": 1539774970648,
        "duration": 60
    },
    {
        "description": "Launch XYZ|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9000,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00060038-00bc-00b3-00cf-00e300980049.png",
        "timestamp": 1539775562778,
        "duration": 3408
    },
    {
        "description": "Open the browser|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9000,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ca0009-009f-0097-00d5-001d00300089.png",
        "timestamp": 1539775567314,
        "duration": 3882
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9000,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Expected 'XYZ Bank' to be 'mainHeading'.",
        "trace": "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:14:32)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
        "browserLogs": [],
        "screenShotFile": "00b90047-004a-00ee-007e-0043008100e2.png",
        "timestamp": 1539775571806,
        "duration": 145
    },
    {
        "description": "Launch XYZ|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8272,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a0003d-004d-00bb-0043-0036004300ed.png",
        "timestamp": 1539775830589,
        "duration": 2967
    },
    {
        "description": "Open the browser|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8272,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004d002f-00b9-003a-000d-00c500d900cd.png",
        "timestamp": 1539775834049,
        "duration": 6341
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8272,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Expected 'XYZ Bank' to be 'mainHeading'.",
        "trace": "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:16:32)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
        "browserLogs": [],
        "screenShotFile": "000400f5-0015-00c6-00ff-0000006c009e.png",
        "timestamp": 1539775840823,
        "duration": 2196
    },
    {
        "description": "Launch XYZ|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9608,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003100c5-00c5-002d-00aa-00f8009800bd.png",
        "timestamp": 1539776011457,
        "duration": 2310
    },
    {
        "description": "Open the browser|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9608,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003f0074-0004-0025-000c-002900240058.png",
        "timestamp": 1539776014544,
        "duration": 6699
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9608,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Expected 'XYZ Bank' to be 'mainHeading'.",
        "trace": "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:19:32)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
        "browserLogs": [],
        "screenShotFile": "00e300e2-00f0-00ac-0047-00f200ac002f.png",
        "timestamp": 1539776021680,
        "duration": 1219
    },
    {
        "description": "Launch XYZ|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006f0088-000d-000e-0019-00cf00e1006f.png",
        "timestamp": 1539776173880,
        "duration": 2880
    },
    {
        "description": "Open the browser|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00180068-002f-00c9-0069-009b00ca0097.png",
        "timestamp": 1539776177595,
        "duration": 6303
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009a00cc-007a-006b-0052-00c600f90051.png",
        "timestamp": 1539776184265,
        "duration": 1079
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11664,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00db006f-001a-00eb-0059-004200a30019.png",
        "timestamp": 1539776349257,
        "duration": 1756
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2524,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.54"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b500bd-00ab-00c9-0085-0047002800fa.png",
        "timestamp": 1539776544821,
        "duration": 1552
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6612,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.67"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008100bc-0041-00ec-000e-00c9005c002f.png",
        "timestamp": 1539787319382,
        "duration": 2749
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10344,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.67"
        },
        "message": "Expected 'XYZ Bank' to be 'XYZ1 Bank'.",
        "trace": "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\E001105.CIGNITIGLOBAL\\Desktop\\JbHunt\\Protractor_typeScriptProject (1)\\Protractor_typeScriptProject\\xyz_bank\\Specs\\test.js:17:32)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\E001105.CIGNITIGLOBAL\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
        "browserLogs": [],
        "screenShotFile": "006200eb-0003-0037-00c3-00d000480016.png",
        "timestamp": 1539788347685,
        "duration": 4663
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19832,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Expected 'XYZ Bank' to be 'XYZ1 Bank'.",
        "trace": "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\jisasa4\\Desktop\\JBhunt\\Code\\xyz_bank\\xyz_bank\\Specs\\test.js:17:32)\n    at C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
        "browserLogs": [],
        "screenShotFile": "00620040-00dd-0071-003f-00fe007500bd.png",
        "timestamp": 1541050797453,
        "duration": 4194
    },
    {
        "description": "Verify Title|Launch URL",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 680,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Expected 'XYZ Bank' to be 'XYZ1 Bank'.",
        "trace": "Error: Failed expectation\n    at UserContext.<anonymous> (C:\\Users\\jisasa4\\Desktop\\JBhunt\\Code\\xyz_bank\\xyz_bank\\Specs\\test.js:17:32)\n    at C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\jisasa4\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7",
        "browserLogs": [],
        "screenShotFile": "00ff00a6-0045-00f2-0045-003900aa007e.png",
        "timestamp": 1541053299096,
        "duration": 3738
    },
    {
        "description": "Open the browser|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0064000f-00bf-00a0-007d-000c00550069.png",
        "timestamp": 1541053603758,
        "duration": 3725
    },
    {
        "description": "Verify Title|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001b007f-009f-00c0-0096-00b800690073.png",
        "timestamp": 1541053607849,
        "duration": 633
    },
    {
        "description": "Color of Customer Login before MouseOver|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "009400d1-0059-0036-0098-00bb00bb001c.png",
        "timestamp": 1541053608832,
        "duration": 40
    },
    {
        "description": "click customer login button|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00bc0095-001b-006b-0045-009f00580084.png",
        "timestamp": 1541053609191,
        "duration": 90
    },
    {
        "description": "Select Customer from Drop Down|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007b007e-000e-00a6-00e9-004900b1008c.png",
        "timestamp": 1541053609621,
        "duration": 657
    },
    {
        "description": "Click on Login button|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009d00b6-00aa-00a1-00fa-001a000200f2.png",
        "timestamp": 1541053610619,
        "duration": 100
    },
    {
        "description": "verify customer title|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "008c00ed-004d-0047-0009-00e200ad00ba.png",
        "timestamp": 1541053611062,
        "duration": 176
    },
    {
        "description": "Click on Deposit Button|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0043008e-003f-009d-004d-009d001d00d1.png",
        "timestamp": 1541053611514,
        "duration": 2099
    },
    {
        "description": "Deposit amount|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00520023-00a7-0087-0033-004900790003.png",
        "timestamp": 1541053613891,
        "duration": 105
    },
    {
        "description": "Click deposit button after entering amount|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ef00c4-0011-00d5-001e-0016005b008d.png",
        "timestamp": 1541053614361,
        "duration": 96
    },
    {
        "description": "Verify Deposit Amount Message|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00690051-0088-0018-002a-008f00b300b1.png",
        "timestamp": 1541053614778,
        "duration": 102
    },
    {
        "description": "Amount deposited Value is: |CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004300ce-0085-009f-001b-00c5002b0037.png",
        "timestamp": 1541053615245,
        "duration": 68
    },
    {
        "description": "Click on WithDrawl Button|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004f0096-0041-00e2-0028-004f000500b8.png",
        "timestamp": 1541053615751,
        "duration": 226
    },
    {
        "description": "WithDraw Amount|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000d00f2-00ec-0015-00bc-003e00c000ba.png",
        "timestamp": 1541053616474,
        "duration": 151
    },
    {
        "description": "Click on WithDrawl Button after Entering Amount|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007f0072-00e2-0058-0090-0017006800d5.png",
        "timestamp": 1541053616944,
        "duration": 139
    },
    {
        "description": "Verify Withdraw Amount Message|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "0083004a-0092-00ab-00bc-00a800f9009f.png",
        "timestamp": 1541053617515,
        "duration": 204
    },
    {
        "description": "Remaining Balance is |CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0023004b-000e-0043-000b-00b3009f00dd.png",
        "timestamp": 1541053618047,
        "duration": 1060
    },
    {
        "description": "Amount Debited in Transactions page|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001f0019-003c-0017-0056-00d900040008.png",
        "timestamp": 1541053619482,
        "duration": 4116
    },
    {
        "description": "Credited Amount is |CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001300ce-0090-0009-00d2-00f200d100b1.png",
        "timestamp": 1541053623950,
        "duration": 69
    },
    {
        "description": "Debited Amount is |CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00df0046-00fa-00a8-0037-009b00c400cc.png",
        "timestamp": 1541053624350,
        "duration": 50
    },
    {
        "description": "Click On Logout Button|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00eb005b-004c-004e-0000-007800570038.png",
        "timestamp": 1541053624743,
        "duration": 185
    },
    {
        "description": "Click on Home Button|CUSTOMER LOGIN",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8396,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00360064-001d-00d5-004b-00e200990061.png",
        "timestamp": 1541053625278,
        "duration": 1625
    },
    {
        "description": "verify title|launch XYZ",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 13460,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: text.gettext is not a function"
        ],
        "trace": [
            "TypeError: text.gettext is not a function\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\testlaunch.js:9:21)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\n    at ControlFlow.promise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2505:12)\n    at schedulerExecute (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:95:18)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2974:25)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\nFrom: Task: Run it(\"verify title\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\testlaunch.js:5:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\testlaunch.js:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007500cd-0010-00a8-0038-000700910031.png",
        "timestamp": 1541099922237,
        "duration": 11
    },
    {
        "description": "verify title|launch XYZ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6768,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "001a00dd-000a-004d-00ea-00df00b1009e.png",
        "timestamp": 1541100431895,
        "duration": 6927
    },
    {
        "description": "verify title|launch XYZ",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16756,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed.",
        "trace": "",
        "browserLogs": [],
        "screenShotFile": "00be00c9-004e-0005-005e-00f100af009f.png",
        "timestamp": 1541535425443,
        "duration": 8659
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004b0028-00a4-0090-00a6-008300950070.png",
        "timestamp": 1541541144370,
        "duration": 4299
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007b00ca-005a-00c1-006f-003c005f00a7.png",
        "timestamp": 1541541149021,
        "duration": 190
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //button[@ng-class1'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@ng-class1']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //button[@ng-class1'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@ng-class1']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //button[@ng-class1']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:15:58)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:14:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on Add customer button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:14:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007d003d-00ee-006f-003f-008c00ea0098.png",
        "timestamp": 1541541149640,
        "duration": 54
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = fName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = fName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = fName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = fName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@ng-model = fName']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:19:64)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:18:47)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:18:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00fd008a-0033-0047-009c-00fe00690054.png",
        "timestamp": 1541541149984,
        "duration": 53
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = lName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = lName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = lName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = lName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@ng-model = lName']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:23:64)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:22:46)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the last name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:22:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00a80010-0087-00fd-00eb-0027007e004f.png",
        "timestamp": 1541541150354,
        "duration": 44
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = postCd'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = postCd']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = postCd'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = postCd']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@ng-model = postCd']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:27:65)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:26:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:26:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00de00e8-00b2-0062-00fb-00fe00870065.png",
        "timestamp": 1541541150697,
        "duration": 55
    },
    {
        "description": "Click the Add customer button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 2868,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //button[@type 'submit'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@type 'submit']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //button[@type 'submit'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@type 'submit']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //button[@type 'submit']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:31:61)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:30:50)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click the Add customer button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:30:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00500090-00e0-0019-003a-00c200b900cc.png",
        "timestamp": 1541541151384,
        "duration": 59
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f30076-0001-00c4-00f0-00e6004400a8.png",
        "timestamp": 1541541320977,
        "duration": 4942
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ae00a4-001f-00d0-00a4-008900d40040.png",
        "timestamp": 1541541326414,
        "duration": 137
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //button[@ng-class1'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@ng-class1']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //button[@ng-class1'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@ng-class1']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //button[@ng-class1']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:15:58)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:14:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on Add customer button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:14:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b70024-0041-0043-002f-00380007002e.png",
        "timestamp": 1541541326899,
        "duration": 55
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = fName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = fName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = fName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = fName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@ng-model = fName']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:19:64)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:18:47)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:18:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "003f0077-0070-008f-00eb-00e900c700cc.png",
        "timestamp": 1541541327260,
        "duration": 46
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = lName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = lName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = lName'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = lName']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@ng-model = lName']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:23:64)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:22:46)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the last name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:22:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0004003c-0016-00a3-009f-009f0097008a.png",
        "timestamp": 1541541327626,
        "duration": 43
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = postCd'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = postCd']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //input[@ng-model = postCd'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//input[@ng-model = postCd']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //input[@ng-model = postCd']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:27:65)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:26:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:26:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004c0099-0011-0061-0021-00c600d00075.png",
        "timestamp": 1541541327979,
        "duration": 33
    },
    {
        "description": "Click the Add customer button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17096,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //button[@type 'submit'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@type 'submit']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //button[@type 'submit'] because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@type 'submit']' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //button[@type 'submit']))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:31:61)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:30:50)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click the Add customer button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:30:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008100f5-00a5-002f-0016-002600e90009.png",
        "timestamp": 1541541328296,
        "duration": 54
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20512,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e300b5-0094-00a4-0077-0016006500b9.png",
        "timestamp": 1541541554042,
        "duration": 3239
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19500,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006e0072-00dd-0028-0082-00d700860027.png",
        "timestamp": 1541541613468,
        "duration": 5545
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15684,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fa00d8-0017-008d-009d-007100b300ce.png",
        "timestamp": 1541541641503,
        "duration": 3979
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5304,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00df00d4-0016-0017-0027-00cc004e00e6.png",
        "timestamp": 1541541702503,
        "duration": 2875
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f20044-0009-009b-00cb-004c002e0013.png",
        "timestamp": 1541541928356,
        "duration": 1769
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c30075-001f-00f9-007d-006100da008a.png",
        "timestamp": 1541541930507,
        "duration": 140
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00af00d9-0054-008b-00de-00a1006b000e.png",
        "timestamp": 1541541931180,
        "duration": 114
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0093008f-00d2-0058-00e9-001300540073.png",
        "timestamp": 1541541931730,
        "duration": 249
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d1008d-00c6-003a-0038-0055002b0074.png",
        "timestamp": 1541541932559,
        "duration": 204
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 17180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00da0098-00c1-0068-00fe-00ef000d007a.png",
        "timestamp": 1541541933175,
        "duration": 106
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20348,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003900b9-0014-00fc-00dc-00fa002300b7.png",
        "timestamp": 1541541944308,
        "duration": 1963
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20348,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002200d3-0055-003c-002a-008d00aa006e.png",
        "timestamp": 1541541946770,
        "duration": 185
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20348,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d10023-0036-00bd-00a2-007200890023.png",
        "timestamp": 1541541947741,
        "duration": 146
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20348,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00110008-0053-0030-0023-006800fe00ec.png",
        "timestamp": 1541541948349,
        "duration": 249
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20348,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0025001f-00a9-0010-007d-003500f200fc.png",
        "timestamp": 1541541949054,
        "duration": 189
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20348,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f40010-00bf-00d2-000e-00f500e50060.png",
        "timestamp": 1541541949671,
        "duration": 278
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ed0030-0088-000f-0066-00ac006e004a.png",
        "timestamp": 1541606345785,
        "duration": 8258
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000700da-004e-00ef-0030-00d5005900ca.png",
        "timestamp": 1541606354567,
        "duration": 120
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a5004f-006a-0002-00a8-00fc0000000e.png",
        "timestamp": 1541606355014,
        "duration": 124
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d00047-0029-0090-00a9-004200fb0093.png",
        "timestamp": 1541606355609,
        "duration": 226
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008600d8-00c7-001b-00ee-0012008b004a.png",
        "timestamp": 1541606356335,
        "duration": 276
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008d00b1-00a0-0069-005e-0057001800b0.png",
        "timestamp": 1541606356984,
        "duration": 138
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6920,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008000c7-0050-00ac-006d-007e00ce0089.png",
        "timestamp": 1541606357508,
        "duration": 153
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002800ea-0027-00cd-00d5-00a700d20070.png",
        "timestamp": 1541606493450,
        "duration": 5769
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00340077-0050-0065-00b0-002000b6006d.png",
        "timestamp": 1541606499616,
        "duration": 118
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0082008a-0086-0007-00a3-00f4000100ad.png",
        "timestamp": 1541606500283,
        "duration": 137
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001d000b-00f6-002c-00fd-00b8004000c1.png",
        "timestamp": 1541606500837,
        "duration": 245
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001300f7-0068-00d6-003e-006e00aa005f.png",
        "timestamp": 1541606501617,
        "duration": 232
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006600ab-0025-0073-003c-00bc00e3000e.png",
        "timestamp": 1541606502177,
        "duration": 138
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16432,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f600ea-002e-0056-0002-00eb00bd001e.png",
        "timestamp": 1541606502654,
        "duration": 143
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00660051-00ba-0004-008a-003100fe0019.png",
        "timestamp": 1541609214085,
        "duration": 5713
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001200cf-00c2-001a-0063-00ea00440056.png",
        "timestamp": 1541609220175,
        "duration": 121
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00730039-0060-008e-00cc-00b700bf0057.png",
        "timestamp": 1541609220685,
        "duration": 125
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007200a6-005f-0017-000c-00cf009c006e.png",
        "timestamp": 1541609221260,
        "duration": 197
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001d00af-00d4-0096-0087-00c300bc00dc.png",
        "timestamp": 1541609221924,
        "duration": 190
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000c00fa-00d9-007a-0055-001300d40006.png",
        "timestamp": 1541609222553,
        "duration": 147
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009500f5-00db-007c-00ae-003400b400df.png",
        "timestamp": 1541609223016,
        "duration": 116
    },
    {
        "description": "Read Alerts|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:89:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:87:28)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Read Alerts\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:87:1)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "009a00bb-0062-00fa-0015-00bf005f0033.png",
        "timestamp": 1541609223783,
        "duration": 38
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f3000b-004a-0054-0019-002900d9004a.png",
        "timestamp": 1541609303237,
        "duration": 11595
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00590086-0035-009a-0038-0095007300ef.png",
        "timestamp": 1541609315335,
        "duration": 107
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009a00c2-00cc-0070-00d8-002f00ef0096.png",
        "timestamp": 1541609315918,
        "duration": 130
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e80034-00f9-00d4-00cf-00ee00a700c3.png",
        "timestamp": 1541609316448,
        "duration": 199
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007100fc-009b-0013-0087-007c00af00d4.png",
        "timestamp": 1541609317251,
        "duration": 251
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00410030-008a-0092-00b2-007c005e005d.png",
        "timestamp": 1541609317902,
        "duration": 119
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00480029-00fc-007b-0050-00ca000f003b.png",
        "timestamp": 1541609318395,
        "duration": 153
    },
    {
        "description": "Read Alerts|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 20364,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:89:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:87:28)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Read Alerts\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:87:1)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00550038-008c-0027-005b-00e4005800f2.png",
        "timestamp": 1541609319121,
        "duration": 28
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005900b4-00e9-00c4-0000-004300e500f2.png",
        "timestamp": 1541609768194,
        "duration": 4303
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ad0013-0086-0019-00b5-003f0094004e.png",
        "timestamp": 1541609773016,
        "duration": 119
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f40089-0097-0098-008c-00eb005400b4.png",
        "timestamp": 1541609773546,
        "duration": 108
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00140026-0065-007a-0073-001e002c00ec.png",
        "timestamp": 1541609774075,
        "duration": 183
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00160044-00ce-0000-0002-003c00dd007e.png",
        "timestamp": 1541609774849,
        "duration": 292
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a3003d-0051-00cc-0092-00a0000600d9.png",
        "timestamp": 1541609775542,
        "duration": 156
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00cc0019-00fc-00d0-0046-000000ed00f2.png",
        "timestamp": 1541609776375,
        "duration": 153
    },
    {
        "description": "Read Alerts|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 9180,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:89:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:87:28)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Read Alerts\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:87:1)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "008800d0-0051-000a-002a-00b8002a006e.png",
        "timestamp": 1541609777242,
        "duration": 72
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ed00d0-00d1-0099-000f-00310056009a.png",
        "timestamp": 1541610479913,
        "duration": 4520
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007100df-0036-00e4-00f6-006600c800bc.png",
        "timestamp": 1541610484803,
        "duration": 111
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009c00b4-00dc-008b-006d-003400e0004a.png",
        "timestamp": 1541610485301,
        "duration": 106
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001800fa-0011-0005-0023-000c008100c1.png",
        "timestamp": 1541610485861,
        "duration": 182
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e600d5-0038-0067-00ea-001a00db000e.png",
        "timestamp": 1541610486481,
        "duration": 176
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008000fd-00ec-00e8-00a2-005e009e0090.png",
        "timestamp": 1541610487045,
        "duration": 108
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6996,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:85:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007e00d6-00c0-00de-00ae-001b007400b1.png",
        "timestamp": 1541610487670,
        "duration": 291
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d000e0-0060-005d-00b4-0085008500f7.png",
        "timestamp": 1541614921650,
        "duration": 6047
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006d003f-00c3-00c3-00fb-001b00ad00ba.png",
        "timestamp": 1541614928088,
        "duration": 113
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008000f4-001c-0058-00e1-009c0053001c.png",
        "timestamp": 1541614928560,
        "duration": 105
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00da0043-0071-0094-0078-00ae001400ed.png",
        "timestamp": 1541614929124,
        "duration": 260
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c000a9-006d-00a8-0024-009000930038.png",
        "timestamp": 1541614929830,
        "duration": 198
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006a00f5-00e0-0026-0012-0090000d007e.png",
        "timestamp": 1541614930441,
        "duration": 137
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 15508,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:85:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007700e6-001f-006c-00a0-00f000fe0008.png",
        "timestamp": 1541614930926,
        "duration": 226
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00de00da-00e2-009b-0082-0077007b0044.png",
        "timestamp": 1541615036129,
        "duration": 2710
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00af000f-004e-004d-0019-0026003a007f.png",
        "timestamp": 1541615039293,
        "duration": 131
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0096005a-00e3-00e5-005a-008c004c00ad.png",
        "timestamp": 1541615039900,
        "duration": 160
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000e006a-00bc-00ae-004e-00a300ed00b5.png",
        "timestamp": 1541615040421,
        "duration": 560
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008c00e4-00fa-0072-008b-00e600510027.png",
        "timestamp": 1541615041486,
        "duration": 210
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: invalid selector: Unable to locate an element with the xpath expression //button[@type='submit because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@type='submit' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "InvalidSelectorError: invalid selector: Unable to locate an element with the xpath expression //button[@type='submit because of the following error:\nSyntaxError: Failed to execute 'evaluate' on 'Document': The string '//button[@type='submit' is not a valid XPath expression.\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.findElements(By(xpath, //button[@type='submit))\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at Driver.findElements (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1048:19)\n    at ptor.waitForAngular.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:159:44)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:62:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004c0018-0049-0050-00bd-009c002a003e.png",
        "timestamp": 1541615042139,
        "duration": 69
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6652,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:85:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "002c001e-0007-00ae-00e8-00b4000900e1.png",
        "timestamp": 1541615042559,
        "duration": 153
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0077007d-0016-00ed-00c6-00aa00130042.png",
        "timestamp": 1541618360146,
        "duration": 4225
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00060059-001d-00c7-007c-00f60016004f.png",
        "timestamp": 1541618364812,
        "duration": 161
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00dc00f5-009e-0044-0052-008f00140084.png",
        "timestamp": 1541618365419,
        "duration": 178
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008800fa-0070-00e0-00f1-00cd0079009c.png",
        "timestamp": 1541618365944,
        "duration": 394
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c300dc-0028-003c-0071-00af00b000d7.png",
        "timestamp": 1541618366727,
        "duration": 240
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //button[@type='pstCd'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //button[@type='pstCd'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:62:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "001400e8-0045-0003-0093-00ea002200a3.png",
        "timestamp": 1541618367304,
        "duration": 50
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 7100,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:85:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "004b00f7-00b1-00e9-00ff-002c009b0017.png",
        "timestamp": 1541618367867,
        "duration": 395
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009f0000-00dd-00a1-0090-00610085006f.png",
        "timestamp": 1541618622732,
        "duration": 5932
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00e40056-00ed-008d-002a-00be008d00af.png",
        "timestamp": 1541618629005,
        "duration": 103
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f30022-00ec-00e5-00cd-006000250065.png",
        "timestamp": 1541618629400,
        "duration": 129
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00840017-0044-0073-005d-00860080000a.png",
        "timestamp": 1541618629952,
        "duration": 230
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fb00e3-0085-0036-00dd-00de0021000e.png",
        "timestamp": 1541618630604,
        "duration": 244
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //button[@ng-model='postCd'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //button[@ng-model='postCd'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:62:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00b50067-00d0-0001-0028-00a2002100d2.png",
        "timestamp": 1541618631126,
        "duration": 53
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12124,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:85:52)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:73:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006f004c-0051-008b-00d0-00cc008e0078.png",
        "timestamp": 1541618631456,
        "duration": 186
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00390091-001b-003e-00f6-002700be002a.png",
        "timestamp": 1541618722656,
        "duration": 3860
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0062006a-00a6-00ed-0046-00530077008e.png",
        "timestamp": 1541618726809,
        "duration": 105
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00bd0001-0070-0044-00c8-007e00660083.png",
        "timestamp": 1541618727278,
        "duration": 103
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009000f1-0069-00e5-0081-00f400b50086.png",
        "timestamp": 1541618727682,
        "duration": 168
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00960065-002c-006f-0022-00ec006100f2.png",
        "timestamp": 1541618728260,
        "duration": 165
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006f0040-0058-0024-0028-0015005e0019.png",
        "timestamp": 1541618728738,
        "duration": 109
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 21340,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ac0064-00cc-0024-00bb-00220024002b.png",
        "timestamp": 1541618729131,
        "duration": 191
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f80035-00e0-00e7-00d3-00e8003800d6.png",
        "timestamp": 1541703513569,
        "duration": 5480
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008d0050-0007-0084-000a-006e00b8001d.png",
        "timestamp": 1541703519737,
        "duration": 305
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fc00b5-0074-0066-003d-00e200630000.png",
        "timestamp": 1541703520568,
        "duration": 307
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009e0026-003b-009d-00e1-00b0003b0089.png",
        "timestamp": 1541703521536,
        "duration": 428
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c200c9-008e-00f2-0010-0007006b008b.png",
        "timestamp": 1541703522582,
        "duration": 328
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00340012-001c-001a-00c6-00ca00970069.png",
        "timestamp": 1541703523417,
        "duration": 354
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8888,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00d1000c-00fc-0057-000b-006f004a00da.png",
        "timestamp": 1541703524174,
        "duration": 305
    },
    {
        "description": "launch and enter value in Bankmanger|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a90035-00a9-0022-0008-00a3002b0044.png",
        "timestamp": 1541708551517,
        "duration": 3429
    },
    {
        "description": "click on Bank manger Login button|bankmanager testing",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //button[contains(text(),'Bank Manager Login')])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //button[contains(text(),'Bank Manager Login')])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:22:21)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:15:54)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"click on Bank manger Login button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:15:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:4:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "007c00c0-0066-005a-0042-000f007f0065.png",
        "timestamp": 1541708555364,
        "duration": 338
    },
    {
        "description": "Click on Add customer button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009a001f-00d9-00bf-001e-00c7004d00b8.png",
        "timestamp": 1541708556050,
        "duration": 131
    },
    {
        "description": "enter the first name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c200ee-0014-008a-0049-0095004a007f.png",
        "timestamp": 1541708556806,
        "duration": 280
    },
    {
        "description": "enter the last name value|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009e0054-00bc-0050-0099-005200b50092.png",
        "timestamp": 1541708557582,
        "duration": 636
    },
    {
        "description": "Click on postal code|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f900fc-0018-0022-00d3-00e800bb00b7.png",
        "timestamp": 1541708558681,
        "duration": 211
    },
    {
        "description": "Click on add customer submit button|bankmanager testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16168,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a400ec-0049-00bf-0028-00ad00510081.png",
        "timestamp": 1541708559258,
        "duration": 288
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00db0094-00a7-003f-004a-0040009c0043.png",
        "timestamp": 1541711842396,
        "duration": 4763
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //button[@ng-class='btnClass1'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //button[@ng-class='btnClass1'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:22:17)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:20:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on Add customer button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:20:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:8:1\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0013004d-0090-00d3-0015-00df009a00ad.png",
        "timestamp": 1541711847641,
        "duration": 42
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //input[@ng-model='fName'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //input[@ng-model='fName'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:28:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:26:47)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:26:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:8:1\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00ab0042-0043-00eb-00d4-004600c9003f.png",
        "timestamp": 1541711848010,
        "duration": 41
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //input[@ng-model='lName'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //input[@ng-model='lName'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:40:21)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:38:46)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the last name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:38:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:8:1\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e4005f-0072-0073-0056-007d00a300f8.png",
        "timestamp": 1541711848387,
        "duration": 45
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //input[@ng-model='postCd'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //input[@ng-model='postCd'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:54:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:51:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:51:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:8:1\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00660071-0071-0048-00ad-0079005e0040.png",
        "timestamp": 1541711848781,
        "duration": 58
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 8672,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: No element found using locator: By(xpath, //button[@type = 'submit'])"
        ],
        "trace": [
            "NoSuchElementError: No element found using locator: By(xpath, //button[@type = 'submit'])\n    at elementArrayFinder.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:814:27)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:69:20)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:65:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:65:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:8:1\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "0039003e-0052-0050-00e4-005300e9006d.png",
        "timestamp": 1541711849167,
        "duration": 104
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00fc00d6-00f7-001c-0012-00de000d0037.png",
        "timestamp": 1541712209862,
        "duration": 11025
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002a0092-0081-0094-00fc-008d004e0045.png",
        "timestamp": 1541712221297,
        "duration": 168
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001800b8-00c1-003f-0008-00fd00ab0063.png",
        "timestamp": 1541712221983,
        "duration": 159
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0040009d-00e9-00a9-00af-0002002d002f.png",
        "timestamp": 1541712222622,
        "duration": 224
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001f0070-00d3-00d2-008b-005d0043007a.png",
        "timestamp": 1541712223272,
        "duration": 241
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005c00c5-00b0-00a9-0058-00a4009900e2.png",
        "timestamp": 1541712223928,
        "duration": 155
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 12588,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00aa00a7-0091-0067-0022-0046006a0072.png",
        "timestamp": 1541712224414,
        "duration": 223
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [
            {
                "level": "SEVERE",
                "message": "http://www.way2automation.com/angularjs.-protractor/banking/#/login - Failed to load resource: the server responded with a status of 404 (Not Found)",
                "timestamp": 1541715616578,
                "type": ""
            }
        ],
        "screenShotFile": "00830052-00db-00d1-0073-005c00f90060.png",
        "timestamp": 1541715615781,
        "duration": 11049
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:20:75)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:19:54)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on Bank manager Login button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:19:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "006d006e-00a9-0049-009a-00630067004c.png",
        "timestamp": 1541715627258,
        "duration": 26
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as click] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:27:17)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:24:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on Add customer button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:24:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e700bb-00d3-0042-0040-0019007a0087.png",
        "timestamp": 1541715627621,
        "duration": 58
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:33:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:31:47)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:31:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005d00f6-0095-0015-0050-007000cd004e.png",
        "timestamp": 1541715627986,
        "duration": 11
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:45:21)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:43:46)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the last name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:43:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e8007d-0075-00aa-0047-00d10034003a.png",
        "timestamp": 1541715628327,
        "duration": 43
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:59:18)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:56:41)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on postal code\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:56:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00480031-004d-001a-005c-00f40028005e.png",
        "timestamp": 1541715628714,
        "duration": 14
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 11092,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\""
        ],
        "trace": [
            "Error: Error while waiting for Protractor to sync with the page: \"both angularJS testability and angular testability are undefined.  This could be either because this is a non-angular page or because your test involves client-side navigation, which can interfere with Protractor's bootstrapping.  See http://git.io/v4gXM for details\"\n    at runWaitForAngularScript.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\browser.js:463:23)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:668:7\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as isDisplayed] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:74:20)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:70:56)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:70:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00fa0004-0000-0079-00d2-003d00a50027.png",
        "timestamp": 1541715629040,
        "duration": 54
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003f003b-0019-0039-0093-002200e40028.png",
        "timestamp": 1541716627150,
        "duration": 2314
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001200c0-00e4-00cd-006c-0089004f00a5.png",
        "timestamp": 1541716629872,
        "duration": 138
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00db0050-00dc-00e6-008e-0065006300a9.png",
        "timestamp": 1541716630356,
        "duration": 491
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:32:22)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:29:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:29:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bc00e9-005e-009c-0074-00d8000a00f4.png",
        "timestamp": 1541716631426,
        "duration": 89
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "003e0078-003a-0011-00ff-0041001f0032.png",
        "timestamp": 1541716631816,
        "duration": 173
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a5006b-009a-0038-0042-00c60075002e.png",
        "timestamp": 1541716632458,
        "duration": 154
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 10640,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:71:50)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:61:59)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:61:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00bf0092-00c7-00eb-004c-006000a5002f.png",
        "timestamp": 1541716633040,
        "duration": 227
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ea0025-0059-009c-001b-00f100b5005d.png",
        "timestamp": 1541716734265,
        "duration": 1527
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00da00bd-006a-006a-00b6-0084008c0027.png",
        "timestamp": 1541716736165,
        "duration": 121
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0019001e-0028-00b1-0011-002a009d00d4.png",
        "timestamp": 1541716736690,
        "duration": 144
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:32:22)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:29:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:29:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "005e005e-007e-009a-0051-005400c00095.png",
        "timestamp": 1541716737218,
        "duration": 103
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008f0045-0057-00ce-00a3-007d0077008f.png",
        "timestamp": 1541716737630,
        "duration": 193
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ef0040-00ab-002c-0064-005800ee00a3.png",
        "timestamp": 1541716738330,
        "duration": 135
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 4048,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:71:50)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:61:59)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:61:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e400c7-004d-002f-003a-0061009300ba.png",
        "timestamp": 1541716738811,
        "duration": 177
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00510038-0001-0097-005b-00d900e7006d.png",
        "timestamp": 1541716916446,
        "duration": 1499
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "004a00a1-008e-004b-0035-006100fc00bf.png",
        "timestamp": 1541716918313,
        "duration": 127
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "005100e5-001f-000f-00f2-007600c60041.png",
        "timestamp": 1541716918993,
        "duration": 89
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: each key must be a number of string; got undefined"
        ],
        "trace": [
            "TypeError: each key must be a number of string; got undefined\n    at keys.forEach.key (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2162:21)\n    at Array.forEach (<anonymous>)\n    at Promise.all.then.keys (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2157:16)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebElement.sendKeys()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at WebElement.schedule_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2010:25)\n    at WebElement.sendKeys (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:2174:19)\n    at actionFn (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:89:44)\n    at Array.map (<anonymous>)\n    at actionResults.getWebElements.then (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:461:65)\n    at ManagedPromise.invokeCallback_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1376:14)\n    at TaskQueue.execute_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3084:14)\n    at TaskQueue.executeNext_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:3067:27)\n    at asyncRun (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2927:27)Error\n    at ElementArrayFinder.applyAction_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:459:27)\n    at ElementArrayFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:91:29)\n    at ElementFinder.(anonymous function).args [as sendKeys] (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\built\\element.js:831:22)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:36:22)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:33:49)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\nFrom: Task: Run it(\"enter the first name value\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:33:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00e400f1-0081-0079-0007-00cd0011003b.png",
        "timestamp": 1541716919494,
        "duration": 73
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001c0047-002f-0072-0016-00b300e500ea.png",
        "timestamp": 1541716919871,
        "duration": 185
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00ea0069-00fb-0040-00d3-00a700a900b5.png",
        "timestamp": 1541716920517,
        "duration": 115
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": false,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 14688,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": [
            "Failed: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)"
        ],
        "trace": [
            "NoSuchAlertError: no such alert\n  (Session info: chrome=70.0.3538.77)\n  (Driver info: chromedriver=2.43.600210 (68dcf5eebde37173d4027fa8635e332711d2874a),platform=Windows NT 10.0.16299 x86_64)\n    at Object.checkLegacyResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\error.js:546:15)\n    at parseHttpResponse (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:509:13)\n    at doSend.then.response (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\http.js:441:30)\n    at <anonymous>\n    at process._tickCallback (internal/process/next_tick.js:189:7)\nFrom: Task: WebDriver.switchTo().alert()\n    at Driver.schedule (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:807:17)\n    at TargetLocator.alert (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\webdriver.js:1862:29)\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:75:50)\n    at Generator.next (<anonymous>)\n    at C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:7:71\n    at new Promise (<anonymous>)\n    at __awaiter (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.js:3:12)\n    at UserContext.it (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:65:59)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:112:25\n    at new ManagedPromise (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:1077:7)\nFrom: Task: Run it(\"Click on add customer submit button\") in control flow\n    at UserContext.<anonymous> (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:94:19)\n    at attempt (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4297:26)\n    at QueueRunner.run (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4217:20)\n    at runNext (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4257:20)\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4264:13\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4172:9\n    at C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasminewd2\\index.js:64:48\n    at ControlFlow.emit (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\events.js:62:21)\n    at ControlFlow.shutdown_ (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2674:10)\n    at shutdownTask_.MicroTask (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\selenium-webdriver\\lib\\promise.js:2599:53)\nFrom asynchronous test: \nError\n    at Suite.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:65:5)\n    at addSpecsToSuite (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1107:25)\n    at Env.describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:1074:7)\n    at describe (C:\\Users\\jisqkt3\\AppData\\Roaming\\npm\\node_modules\\protractor\\node_modules\\jasmine-core\\lib\\jasmine-core\\jasmine.js:4399:18)\n    at Object.<anonymous> (C:\\Users\\jisqkt3\\Desktop\\xyz_bank\\xyz_bank\\xyz_bank\\specs\\Homework2.ts:7:1)\n    at Module._compile (module.js:653:30)\n    at Object.Module._extensions..js (module.js:664:10)\n    at Module.load (module.js:566:32)\n    at tryModuleLoad (module.js:506:12)"
        ],
        "browserLogs": [],
        "screenShotFile": "00250091-00d3-000f-00c2-00210030000b.png",
        "timestamp": 1541716921049,
        "duration": 199
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "007900e2-0065-000a-00d8-00a5000400b0.png",
        "timestamp": 1541716969266,
        "duration": 1561
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0093009b-0051-0057-0051-009700a700da.png",
        "timestamp": 1541716971267,
        "duration": 157
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002d00a6-002f-005e-00b4-00b6004d0049.png",
        "timestamp": 1541716971771,
        "duration": 92
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "009800c6-0037-00b8-0004-00f200b70079.png",
        "timestamp": 1541716972178,
        "duration": 196
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "000d005b-00a0-00e9-00b9-00b900bb00da.png",
        "timestamp": 1541716972892,
        "duration": 166
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00c20068-00c5-00f7-00b9-0090005600d2.png",
        "timestamp": 1541716973428,
        "duration": 138
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 19452,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006b0051-0073-00ae-0081-00f7003200d0.png",
        "timestamp": 1541716973899,
        "duration": 181
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00010037-0090-0020-006f-002900b300a5.png",
        "timestamp": 1542039156900,
        "duration": 6690
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001400d4-00dc-00b1-002e-004e00f70089.png",
        "timestamp": 1542039164012,
        "duration": 137
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00de007c-0010-00ce-00cd-002500610022.png",
        "timestamp": 1542039164454,
        "duration": 121
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001c0061-009c-0015-0082-00c700620054.png",
        "timestamp": 1542039164880,
        "duration": 195
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0051001b-00af-0060-00b7-00ff001700d9.png",
        "timestamp": 1542039165597,
        "duration": 242
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00220023-00ea-00a2-0087-0012003500fd.png",
        "timestamp": 1542039166149,
        "duration": 113
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 6600,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00580089-0029-0076-00b5-009f00d20043.png",
        "timestamp": 1542039166563,
        "duration": 164
    },
    {
        "description": "launch and enter value in Bankmanager|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00430041-00ac-003d-0007-008500ee00f8.png",
        "timestamp": 1542040655086,
        "duration": 7291
    },
    {
        "description": "Click on Bank manager Login button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00640032-00de-00bd-00be-00890061003b.png",
        "timestamp": 1542040662747,
        "duration": 285
    },
    {
        "description": "Click on Add customer button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f300e0-0046-000d-0075-008600b500df.png",
        "timestamp": 1542040663464,
        "duration": 109
    },
    {
        "description": "enter the first name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00940068-0042-005f-00a0-0055001200fe.png",
        "timestamp": 1542040663892,
        "duration": 309
    },
    {
        "description": "enter the last name value|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002200eb-0041-00be-00e0-00c2007d0005.png",
        "timestamp": 1542040664660,
        "duration": 116
    },
    {
        "description": "Click on postal code|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0012009e-0047-0017-009a-00ff00750062.png",
        "timestamp": 1542040665045,
        "duration": 150
    },
    {
        "description": "Click on add customer submit button|bankmanager",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 16752,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.77"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001000dc-00c0-00b5-00f0-003f000c00e9.png",
        "timestamp": 1542040665499,
        "duration": 140
    },
    {
        "description": "Launch browser|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "006000c6-0045-00bf-00bf-008600810020.png",
        "timestamp": 1542223943556,
        "duration": 3827
    },
    {
        "description": "Click Login button|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00b800dd-00aa-00f4-00b4-00e000b10081.png",
        "timestamp": 1542223948074,
        "duration": 225
    },
    {
        "description": "Click on Add Customer tab|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008e0082-00a2-0078-0069-001e00f80084.png",
        "timestamp": 1542223948819,
        "duration": 275
    },
    {
        "description": "Enter the first name value|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0072009c-0029-00c3-006c-006a00b40071.png",
        "timestamp": 1542223949631,
        "duration": 267
    },
    {
        "description": "Enter the last name value|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00140031-00a0-00a0-0031-00df00f60079.png",
        "timestamp": 1542223950404,
        "duration": 610
    },
    {
        "description": "Enter the postal code|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00030037-00e2-00cd-0028-004e001a0010.png",
        "timestamp": 1542223951462,
        "duration": 262
    },
    {
        "description": "Click on Add Customer button|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 5036,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "0006000a-0061-00b7-009d-00de006f0045.png",
        "timestamp": 1542223952164,
        "duration": 435
    },
    {
        "description": "Launch browser|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "001e00e0-00a9-0095-0009-007100280008.png",
        "timestamp": 1542223983973,
        "duration": 2306
    },
    {
        "description": "Click Login button|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00a900c7-0002-003b-004d-0094006900d9.png",
        "timestamp": 1542223986865,
        "duration": 1004
    },
    {
        "description": "Click on Add Customer tab|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "002200ed-008a-0078-00eb-00a7007300a1.png",
        "timestamp": 1542223988441,
        "duration": 358
    },
    {
        "description": "Enter the first name value|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "008f0056-0043-0092-009c-004600fc0020.png",
        "timestamp": 1542223989192,
        "duration": 183
    },
    {
        "description": "Enter the last name value|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00f70045-00e2-000a-005f-007f00c600dc.png",
        "timestamp": 1542223989875,
        "duration": 370
    },
    {
        "description": "Enter the postal code|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00770023-006c-0061-000b-0007001c0090.png",
        "timestamp": 1542223990771,
        "duration": 417
    },
    {
        "description": "Click on Add Customer button|Bankmanager Testing",
        "passed": true,
        "pending": false,
        "os": "Windows NT",
        "instanceId": 224,
        "browser": {
            "name": "chrome",
            "version": "70.0.3538.102"
        },
        "message": "Passed",
        "browserLogs": [],
        "screenShotFile": "00710005-007a-0055-0081-001000ec0007.png",
        "timestamp": 1542223991640,
        "duration": 692
    }
];

    this.sortSpecs = function () {
        this.results = results.sort(function sortFunction(a, b) {
    if (a.sessionId < b.sessionId) return -1;else if (a.sessionId > b.sessionId) return 1;

    if (a.timestamp < b.timestamp) return -1;else if (a.timestamp > b.timestamp) return 1;

    return 0;
});
    };

    this.loadResultsViaAjax = function () {

        $http({
            url: './combined.json',
            method: 'GET'
        }).then(function (response) {
                var data = null;
                if (response && response.data) {
                    if (typeof response.data === 'object') {
                        data = response.data;
                    } else if (response.data[0] === '"') { //detect super escaped file (from circular json)
                        data = CircularJSON.parse(response.data); //the file is escaped in a weird way (with circular json)
                    }
                    else
                    {
                        data = JSON.parse(response.data);
                    }
                }
                if (data) {
                    results = data;
                    that.sortSpecs();
                }
            },
            function (error) {
                console.error(error);
            });
    };


    if (clientDefaults.useAjax) {
        this.loadResultsViaAjax();
    } else {
        this.sortSpecs();
    }


});

app.filter('bySearchSettings', function () {
    return function (items, searchSettings) {
        var filtered = [];
        if (!items) {
            return filtered; // to avoid crashing in where results might be empty
        }
        var prevItem = null;

        for (var i = 0; i < items.length; i++) {
            var item = items[i];
            item.displaySpecName = false;

            var isHit = false; //is set to true if any of the search criteria matched
            countLogMessages(item); // modifies item contents

            var hasLog = searchSettings.withLog && item.browserLogs && item.browserLogs.length > 0;
            if (searchSettings.description === '' ||
                (item.description && item.description.toLowerCase().indexOf(searchSettings.description.toLowerCase()) > -1)) {

                if (searchSettings.passed && item.passed || hasLog) {
                    isHit = true;
                } else if (searchSettings.failed && !item.passed && !item.pending || hasLog) {
                    isHit = true;
                } else if (searchSettings.pending && item.pending || hasLog) {
                    isHit = true;
                }
            }
            if (isHit) {
                checkIfShouldDisplaySpecName(prevItem, item);

                filtered.push(item);
                prevItem = item;
            }
        }

        return filtered;
    };
});

