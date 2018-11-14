"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protractor_1 = require("protractor");
class AddCustomer {
    constructor() {
        this.bankManagerLoginBtn = "//button[contains(text(),'Bank Manager Login')]";
        this.addCustomerBtnString = "//button[@ng-click='addCust()']";
        this.firstName = "//input[@ng-model='fName']";
        this.lastName = "//input[@ng-model='lName']";
        this.postCode = "//input[@ng-model='postCd']";
        this.generateCustomerID = "//button[@type='submit']";
    }
    clickOnBankManagerButton() {
        const loginBtn = protractor_1.element(protractor_1.by.xpath(this.bankManagerLoginBtn));
        if (loginBtn.isDisplayed()) {
            loginBtn.click();
        }
        else {
            console.log("login button not displayed");
        }
    }
    clickOnAddCustomerTab() {
        const addCustBtn = protractor_1.element(protractor_1.by.xpath(this.addCustomerBtnString));
        if (addCustBtn.isDisplayed()) {
            addCustBtn.click();
        }
        else {
            console.log("add customer button not displayed");
        }
    }
    enterFirstName(keys) {
        const firstname = protractor_1.element(protractor_1.by.xpath(this.firstName));
        if (firstname.isDisplayed()) {
            firstname.sendKeys(keys);
        }
        else {
            console.log("first name field is not displayed");
        }
    }
    enterLastName(keys) {
        const lastname = protractor_1.element(protractor_1.by.xpath(this.lastName));
        if (lastname.isDisplayed()) {
            lastname.sendKeys(keys);
        }
        else {
            console.log("last name field is not displayed");
        }
    }
    enterPostalCode(keys) {
        const postcode = protractor_1.element(protractor_1.by.xpath(this.postCode));
        if (postcode.isDisplayed()) {
            postcode.sendKeys(keys);
        }
        else {
            console.log("post code field is not displayed");
        }
    }
    addCustomerButtonClick() {
        const submitBtn = protractor_1.element(protractor_1.by.xpath(this.generateCustomerID));
        if (submitBtn.isDisplayed()) {
            submitBtn.click();
        }
        else {
            console.log("submit button is not displayed");
        }
        const alertDialog = protractor_1.browser.switchTo().alert();
        alertDialog.accept();
        var text = alertDialog.getText();
        console.log(text);
    }
}
exports.AddCustomer = AddCustomer;
//# sourceMappingURL=bankmanager.js.map