import * as path from 'path';

export interface TestDataConfig {
  excelDirectory: string;
  defaultWorkbook: string;
  cacheEnabled: boolean;
}

export const testDataConfig: TestDataConfig = {
  excelDirectory: path.join(__dirname, '../../src/test-data/excel'),
  defaultWorkbook: 'TestData.xlsx',
  cacheEnabled: true,
};

