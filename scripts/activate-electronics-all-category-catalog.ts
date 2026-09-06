import { executeAllCategoryActivation } from "../features/electronics/allCategoryCatalogActivation";

void executeAllCategoryActivation(process.cwd()).then(result => console.log(JSON.stringify(result, null, 2)));
