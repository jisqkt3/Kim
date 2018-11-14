import { browser, element,by} from "protractor";
describe ('launch XYZ',function() {
    it('verify title',()=> {
browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
browser.sleep(3000);
var text: any= element(by.className('mainHeading'));
expect(text.getText()).toBe('XYZ Bank');
})
});


