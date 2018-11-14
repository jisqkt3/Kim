"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const protractor_1 = require("protractor");
describe('launch XYZ', function () {
    it('verify title', () => {
        protractor_1.browser.get("http://www.way2automation.com/angularjs-protractor/banking/#/login");
        protractor_1.browser.sleep(3000);
        var text = protractor_1.element(protractor_1.by.className('mainHeading'));
        expect(text.getText()).toBe('XYZ Bank');
    });
});
//# sourceMappingURL=testlaunch.js.map