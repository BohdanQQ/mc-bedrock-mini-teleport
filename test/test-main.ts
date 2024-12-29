import { locationsSuite } from "./test-locations";
import { summary } from "./test-lib";
import { parserSuite } from "./test-parser";

parserSuite();
locationsSuite();

summary();