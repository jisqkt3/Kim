"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const Action1_1 = require("../../Action/Action1");
class OpenAccount extends Action1_1.Action1 {
    constructor(name, value1) {
        super();
        this.clickOpenAccount = "//button[@ng-click='openAccount()']";
        this.customername = "//*[contains(text(),'" + name + "')]";
        this.currency = "//*[contains(text(),'" + value1 + "')]";
        this.processClick = "//button[@type='submit']";
    }
    clickonOpenAccountbutton() {
        this.myClick(this.clickOpenAccount, "click on open account");
    }
    selectCustomerName() {
        this.dropdown(this.customername, "select customer name");
    }
    selectCurrency() {
        this.dropdown(this.currency, "select currency name");
    }
    clickOnProcessButton() {
        this.myClick(this.processClick, "click on process button");
    }
}
exports.OpenAccount = OpenAccount;
//# sourceMappingURL=OpenAccount.js.map