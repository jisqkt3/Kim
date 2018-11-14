import { element, by, browser, ExpectedConditions } from "protractor";
import { AddCustomer } from '../pages/BankManagerTest/bankmanager';
import { OpenAccount } from "../pages/OpenAccount/openaccount";
import {async} from "q" ;

let jsd= require('../data/testData');

var customerDetail = new AddCustomer();
var openaccountdetails = new OpenAccount
(jsd.CustomerData1.firstname+" "+jsd.CustomerData1.lastname,jsd.CustomerData1.currency);

describe('Bankmanager Testing', function () {

    it('Launch browser', async () => {
        try {
            await browser.get(jsd.CustomerData1.url);
        } catch (error) {
            console.log(error);
        }
    });

    it('Click Login button', async () => {
        await customerDetail.clickOnBankManagerButton();
    });

    it('Click on Add Customer tab', async () => {
        await customerDetail.clickOnAddCustomerTab();
    });

    it('Enter the first name value', async () => {
        await customerDetail.enterFirstName(jsd.CustomerData1.firstname);
    });

    it('Enter the last name value', async () => {
        await customerDetail.enterLastName(jsd.CustomerData1.lastname);
    });

    it('Enter the postal code', async () => {
        await customerDetail.enterPostalCode(jsd.CustomerData1.Code);
    });

    it('Click on Add Customer button', async () => {
        await customerDetail.addCustomerButtonClick();

    it ('Click on open Customer button', async () => {
        await openaccountdetails.clickonOpenAccountbutton();   
    });

    it ('Click and select customer dropdown', async () => {
        await openaccountdetails.selectCustomerName();  
     });

     it ('select currency', () => {
        openaccountdetails.selectCurrency();  
     });

     it("click on Process button to generate account no", () => { 
        openaccountdetails.clickOnProcessButton();
        var alertValidate = browser.switchTo().alert();
        expect(alertValidate.accept).toBeDefined();
        alertValidate.getText().then((text) => { 
            console.log(text);
            alertValidate.accept();
        });


        
    })

});

   
});

