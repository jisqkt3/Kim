import { element, by, browser } from "protractor";
//import {DataProvider } from '../dataprovider/dataprovider';
import { async } from "q";
//let using = require('jasmine-data-provider');
let jsd = require('../data/testData');

describe('bankmanager', function () {
    it('launch and enter value in Bankmanager', async () => {
        try {
            await browser.get(jsd.CustomerData1.url);
        }
        catch(error){
            console.log(error);
        }
    });

    it('Click on Bank manager Login button', async () => {
        const loginBtn = element(by.xpath("//button[contains(text(),'Bank Manager Login')]"));
        if(loginBtn.isDisplayed()){
            await loginBtn.click();
        }

    });

    it('Click on Add customer button', async () => {
        const custbtn = element(by.xpath("//button[@ng-class='btnClass1']"));
        if(custbtn){
            
            await custbtn.click();
        }

    });

    it('enter the first name value', async () => {
        const frstname = element(by.xpath("//input[@ng-model='fName']"));
        if (frstname.isDisplayed()) {
            frstname.sendKeys(jsd.CustomerData1.firstname);
        }
        else {
            console.log("first name field is not displaying");
        }
    });

    it('enter the last name value', async () => {
        const lstname = element(by.xpath("//input[@ng-model='lName']"));
        if (lstname.isDisplayed()) {
            lstname.sendKeys(jsd.CustomerData1.lastname);
        }
        else {
            console.log("last name field is not displayed");
        }

    });

    it('Click on postal code', async () => {
        const pstlcode = element(by.xpath("//input[@ng-model='postCd']"));
        if (pstlcode.isDisplayed()) {
            await pstlcode.sendKeys(jsd.CustomerData1.Code);
        }
        else {
            console.log("postal code field is not displayed");
        }
    });


    it('Click on add customer submit button',  async () => {

        const  custbtn  =  element(by.xpath("//button[@type = 'submit']"));

        if (custbtn.isDisplayed()) {
            custbtn.click();
        }  else {
            console.log("submit button not displayed");
        }

        const alertDialog  =  browser.switchTo().alert();
        alertDialog.accept();
        var text: any = alertDialog.getText();
        console.log(text);


    });

});


