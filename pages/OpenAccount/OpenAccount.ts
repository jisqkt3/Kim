import {browser,by,element} from 'protractor';
import {Action1} from '../../Action/Action1';

export class OpenAccount extends Action1 {
    clickOpenAccount: string;
    customername: string;
    currency: string;
    processClick: string;
    
    constructor(name, value1) {
        super();
        this.clickOpenAccount = "//button[@ng-click='openAccount()']"
        this.customername = "//*[contains(text(),'"+name+"')]"
        this.currency = "//*[contains(text(),'"+value1+"')]"
        this.processClick = "//button[@type='submit']"
    }


public clickonOpenAccountbutton(){
    this.myClick(this.clickOpenAccount,"click on open account");
}

selectCustomerName() {
    this.dropdown(this.customername,"select customer name");
}

selectCurrency() {
    this.dropdown(this.currency,"select currency name");
}

clickOnProcessButton() {
    this.myClick(this.processClick,"click on process button");
}
  
}

