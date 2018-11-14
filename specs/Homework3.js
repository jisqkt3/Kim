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
const bankmanager_1 = require("../pages/BankManagerTest/bankmanager");
const openaccount_1 = require("../pages/OpenAccount/openaccount");
let jsd = require('../data/testData');
var customerDetail = new bankmanager_1.AddCustomer();
var openaccountdetails = new openaccount_1.OpenAccount(jsd.CustomerData1.firstname + " " + jsd.CustomerData1.lastname, jsd.CustomerData1.currency);
describe('Bankmanager Testing', function () {
    it('Launch browser', () => __awaiter(this, void 0, void 0, function* () {
        try {
            yield protractor_1.browser.get(jsd.CustomerData1.url);
        }
        catch (error) {
            console.log(error);
        }
    }));
    it('Click Login button', () => __awaiter(this, void 0, void 0, function* () {
        yield customerDetail.clickOnBankManagerButton();
    }));
    it('Click on Add Customer tab', () => __awaiter(this, void 0, void 0, function* () {
        yield customerDetail.clickOnAddCustomerTab();
    }));
    it('Enter the first name value', () => __awaiter(this, void 0, void 0, function* () {
        yield customerDetail.enterFirstName(jsd.CustomerData1.firstname);
    }));
    it('Enter the last name value', () => __awaiter(this, void 0, void 0, function* () {
        yield customerDetail.enterLastName(jsd.CustomerData1.lastname);
    }));
    it('Enter the postal code', () => __awaiter(this, void 0, void 0, function* () {
        yield customerDetail.enterPostalCode(jsd.CustomerData1.Code);
    }));
    it('Click on Add Customer button', () => __awaiter(this, void 0, void 0, function* () {
        yield customerDetail.addCustomerButtonClick();
        it('Click on open Customer button', () => __awaiter(this, void 0, void 0, function* () {
            yield openaccountdetails.clickonOpenAccountbutton();
        }));
        it('Click and select customer dropdown', () => __awaiter(this, void 0, void 0, function* () {
            yield openaccountdetails.selectCustomerName();
        }));
        it('select currency', () => {
            openaccountdetails.selectCurrency();
        });
        it("click on Process button to generate account no", () => {
            openaccountdetails.clickOnProcessButton();
            var alertValidate = protractor_1.browser.switchTo().alert();
            expect(alertValidate.accept).toBeDefined();
            alertValidate.getText().then((text) => {
                console.log(text);
                alertValidate.accept();
            });
        });
    }));
});
//# sourceMappingURL=Homework3.js.map