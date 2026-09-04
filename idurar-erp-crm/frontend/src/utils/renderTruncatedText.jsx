import { Tooltip } from 'antd';

/** 列表地址等欄位：超過 maxLen 字顯示 …，完整內容放 Tooltip */
export function renderTruncatedText(text, maxLen = 24) {
  if (text == null || text === '') return '-';
  const value = String(text);
  if (value.length <= maxLen) return value;
  const short = `${value.slice(0, maxLen)}...`;
  return <Tooltip title={value}>{short}</Tooltip>;
}
