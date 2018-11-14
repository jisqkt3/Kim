import { element, by, browser,ExpectedConditions } from "protractor";
import {AddCustomer} from '../pages/BankManagerTest/bankmanager';
import {async} from "q" ;
let jds =require ('../Data/testData');

//*Object creation for BankManagerAddCustomer class**//
var customerdetails = new AddCustomer();


