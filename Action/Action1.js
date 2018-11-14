"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protractor_1 = require("protractor");
class Action1 {
    //**Dropdown click only */  
    dropdown(locator, logname) {
        let ele = protractor_1.element(protractor_1.by.xpath(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.elementToBeClickable(ele), 2000).then(function () {
            ele.click().then(function () {
                console.log("clicked" + logname);
            }, function (err) {
                console.log("issue while clicking" + logname);
            });
        });
    }
    //**Myclick -clicking with some validation */ 
    myClick(locator, logname) {
        let ele = protractor_1.element(protractor_1.by.xpath(locator));
        protractor_1.browser.wait(protractor_1.ExpectedConditions.presenceOf(ele), 2000).then(function () {
            ele.click().then(function () {
                console.log("clicked" + logname);
            }, function (err) {
                console.log("issue while clicking" + logname);
            });
        });
    }
    //Dropdown select by value */
    selectByValue(optionElements, name, logName) {
        let dropDownXpath = protractor_1.element.all(protractor_1.by.xpath(optionElements));
        let size = dropDownXpath.count();
        for (let index = 1; index <= size; index++) {
            let optionElement = protractor_1.element(protractor_1.by.xpath(optionElements + "[" + index + "]"));
            let text = optionElement.getAttribute("value");
            if (text.trim() === name.trim()) {
                optionElement.click();
                console.log("able to select" + logName);
            }
            else {
                console.log("Unable to select" + logName);
            }
        }
    }
}
exports.Action1 = Action1;
//# sourceMappingURL=Action1.js.map