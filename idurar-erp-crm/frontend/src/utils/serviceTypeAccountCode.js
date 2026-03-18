/**
 * Service type 對應的 Xero / 會計 account code
 * 安裝 = 4-1100, 人工 = 4-1101, 服務 = 4-1102, 材料 = 4-1103, 服務及材料 = 4-1104, 吊船 = 4-1105
 */
export const SERVICE_TYPE_ACCOUNT_CODE = {
  安裝: '4-1100',
  人工: '4-1101',
  服務: '4-1102',
  材料: '4-1103',
  '服務&材料': '4-1104',
  吊船: '4-1105',
};

export const SERVICE_TYPE_OPTIONS = [
  { value: '安裝', label: '安裝', accountCode: '4-1100' },
  { value: '人工', label: '人工', accountCode: '4-1101' },
  { value: '服務', label: '服務', accountCode: '4-1102' },
  { value: '材料', label: '材料', accountCode: '4-1103' },
  { value: '服務&材料', label: '服務及材料', accountCode: '4-1104' },
  { value: '吊船', label: '吊船', accountCode: '4-1105' },
];

/** 依發票/報價的 type 取得 AccountCode，無則回傳空字串 */
export function getAccountCodeByServiceType(type) {
  return (type && SERVICE_TYPE_ACCOUNT_CODE[type]) || '';
}
