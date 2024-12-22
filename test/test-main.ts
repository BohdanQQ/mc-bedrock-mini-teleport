import { testSuite } from "./test";
import { summary } from "./test-lib";
import { parserSuite } from "./test-parser";

parserSuite();
testSuite();

summary();