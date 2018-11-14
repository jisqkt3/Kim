"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const protractor_1 = require("protractor");
//let using = require('jasmine-data-provider');
let jsd = require('../data/testData');
describe('bankmanager', function () {
    it('launch and enter value in Bankmanager', () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield protractor_1.browser.get(jsd.CustomerData1.url);
        }
        catch (error) {
            console.log(error);
        }
    }));
    it('Click on Bank manager Login button', () => __awaiter(this, void 0, void 0, function* () {
        const loginBtn = protractor_1.element(protractor_1.by.xpath("//button[contains(text(),'Bank Manager Login')]"));
        if (loginBtn.isDisplayed()) {
            yield loginBtn.click();
        }
    }));
    it('Click on Add customer button', () => __awaiter(this, void 0, void 0, function* () {
        const custbtn = protractor_1.element(protractor_1.by.xpath("//button[@ng-class='btnClass1']"));
        if (custbtn) {
            yield custbtn.click();
        }
    }));
    it('enter the first name value', () => __awaiter(this, void 0, void 0, function* () {
        const frstname = protractor_1.element(protractor_1.by.xpath("//input[@ng-model='fName']"));
        if (frstname.isDisplayed()) {
            frstname.sendKeys(jsd.CustomerData1.firstname);
        }
        else {
            console.log("first name field is not displaying");
        }
    }));
    it('enter the last name value', () => __awaiter(this, void 0, void 0, function* () {
        const lstname = protractor_1.element(protractor_1.by.xpath("//input[@ng-model='lName']"));
        if (lstname.isDisplayed()) {
            lstname.sendKeys(jsd.CustomerData1.lastname);
        }
        else {
            console.log("last name field is not displayed");
        }
    }));
    it('Click on postal code', () => __awaiter(this, void 0, void 0, function* () {
        const pstlcode = protractor_1.element(protractor_1.by.xpath("//input[@ng-model='postCd']"));
        if (pstlcode.isDisplayed()) {
            yield pstlcode.sendKeys(jsd.CustomerData1.Code);
        }
        else {
            console.log("postal code field is not displayed");
        }
    }));
    it('Click on add customer submit button', () => __awaiter(this, void 0, void 0, function* () {
        const custbtn = protractor_1.element(protractor_1.by.xpath("//button[@type = 'submit']"));
        if (custbtn.isDisplayed()) {
            custbtn.click();
        }
        else {
            console.log("submit button not displayed");
        }
        const alertDialog = protractor_1.browser.switchTo().alert();
        alertDialog.accept();
        var text = alertDialog.getText();
        console.log(text);
    }));
});
//# sourceMappingURL=Homework2.js.map