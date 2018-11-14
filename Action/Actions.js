"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protractor_1 = require("protractor");
class Actions {
    myClick(locator, logname) {
        let ele = protractor_1.element(protractor_1.by.xpath(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf(ele), 2000).then(() => {
            ele.click().then(() => {
                console.log("Clicking " + logname);
            }, function (err) {
                console.log("Issue while Clicking" + logname);
            });
        }, function (err) {
            console.log("Issue while finding" + logname);
        });
    }
    sendKey(locator, logname, keys) {
        let name = protractor_1.element(protractor_1.by.model(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf(name), 5000).then(function () {
            name.sendKeys(keys).then(function () {
                console.log("search for text box: " + logname);
            }, function (err) {
                console.log("issue in sending keys: " + logname);
            });
        }, function (err) {
            console.log("Issue in senKeys path: " + locator);
        });
    }
    dropDown(locator, logname) {
        let ele = protractor_1.element(protractor_1.by.xpath(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.elementToBeClickable(ele), 2000).then(function () {
            ele.click().then(function () {
                console.log("clicked " + logname);
            }, function (err) {
                console.log("Issue while clicking" + logname);
            });
        }, function () {
            console.log("Issue while finding" + logname);
        });
    }
    validateText(locator, logname, keys1) {
        let ele = protractor_1.element(protractor_1.by.xpath(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf(ele), 2000).then(() => {
            ele.getText().then((text) => {
                console.log("Verifying " + text);
                expect(text).toEqual(keys1);
            }, function (err) {
                console.log("Issue while verifying " + logname);
            });
        }, function (err) {
            console.log("Issue while Text to be Valid" + locator);
        });
    }
    mySendKeys(locator, firstName, keys) {
        var ele = protractor_1.element(protractor_1.by.xpath(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf(ele), 2000).then(function () {
            ele.sendKeys(keys).then(function () {
                console.log("Entered Text in " + firstName);
            }, function (err) {
                console.log("Issue while sending Keys at " + firstName);
            });
        }, function (err) {
            console.log("Issue while presence of locator " + locator);
        });
    }
    GetText(locator, logname) {
        protractor_1.element(protractor_1.by.xpath(locator)).getText().then(function (text) {
            console.log(text);
        });
    }
    mouseHoverClick(mousePoint, locator) {
        var eleme = protractor_1.element(protractor_1.by.xpath(mousePoint));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf(eleme), 2000).then(function () {
            protractor_1.browser.actions().mouseMove(eleme).click().perform().then(function () {
                console.log("Click Mouse " + locator);
            }, function (err) {
                console.log("Issue while clicking" + locator);
            });
        }, function (err) {
            console.log("issue whle click " + mousePoint);
        });
    }
}
exports.Actions = Actions;
//# sourceMappingURL=Actions.js.map