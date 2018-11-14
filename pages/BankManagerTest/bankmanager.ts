import { browser, by, element } from 'protractor';

export class AddCustomer{
    bankManagerLoginBtn: string;
    addCustomerBtnString: string;
    firstName: string;
    lastName: string;
    postCode: string;
    generateCustomerID: string;

    constructor(){
        this.bankManagerLoginBtn = "//button[contains(text(),'Bank Manager Login')]";
        this.addCustomerBtnString = "//button[@ng-click='addCust()']";
        this.firstName = "//input[@ng-model='fName']";
        this.lastName = "//input[@ng-model='lName']";
        this.postCode = "//input[@ng-model='postCd']";
        this.generateCustomerID = "//button[@type='submit']";

    }

    public clickOnBankManagerButton(){
        const loginBtn = element(by.xpath(this.bankManagerLoginBtn));
            if (loginBtn.isDisplayed()) {
                loginBtn.click();
            }
            else {
                console.log("login button not displayed");
            }
    }

    public clickOnAddCustomerTab(){
        const addCustBtn = element(by.xpath(this.addCustomerBtnString));
        if (addCustBtn.isDisplayed()) {
            addCustBtn.click();
        }
        else {
            console.log("add customer button not displayed");
        }
    }

    public enterFirstName(keys){
        const firstname = element(by.xpath(this.firstName));
        if (firstname.isDisplayed()) {
            firstname.sendKeys(keys);
        }
        else {
            console.log("first name field is not displayed");
        }
    }

    public enterLastName(keys){
        const lastname = element(by.xpath(this.lastName));
        if (lastname.isDisplayed()) {
            lastname.sendKeys(keys);
        }
        else {
            console.log("last name field is not displayed");
        }
    }

    public enterPostalCode(keys){
        const postcode = element(by.xpath(this.postCode));
        if (postcode.isDisplayed()) {
            postcode.sendKeys(keys);
        }
        else {
            console.log("post code field is not displayed");
        }
    }

    public addCustomerButtonClick(){
        const submitBtn = element(by.xpath(this.generateCustomerID));
        if (submitBtn.isDisplayed()) {
            submitBtn.click();
        }
        else {
            console.log("submit button is not displayed");
        }

        const alertDialog = browser.switchTo().alert();
        alertDialog.accept();
        var text: any = alertDialog.getText();
        console.log(text);
    }

}