import { Given } from '@cucumber/cucumber';

import { AutomationWorld } from '../../hooks/world';

/**
 * PP-391 / PP-392 feature files use a Background "configuration loaded" hook so draft
 * scenarios can share a no-op anchor. Runnable Lloyd's scenarios add their own Given steps
 * (sanity plan, Service Bus send, etc.).
 */
Given('the PP-391 test configuration is loaded', function (this: AutomationWorld) {
  void this;
});

Given('the PP-392 test configuration is loaded', function (this: AutomationWorld) {
  void this;
});

Given('the PP-429 test configuration is loaded', function (this: AutomationWorld) {
  void this;
});

Given('the PP-393 test configuration is loaded', function (this: AutomationWorld) {
  void this;
});

Given('the PP-394 test configuration is loaded', function (this: AutomationWorld) {
  void this;
});

Given('the PP-395 test configuration is loaded', function (this: AutomationWorld) {
  void this;
});
