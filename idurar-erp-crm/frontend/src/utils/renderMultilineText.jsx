import React from 'react';

const multilineStyle = { whiteSpace: 'pre-wrap', wordBreak: 'break-word' };

/** 表格／列表顯示：與 PDF `pre-wrap` 一致，保留 textarea 換行與空格 */
export function renderMultilineText(text) {
  return <span style={multilineStyle}>{text ?? ''}</span>;
}

export { multilineStyle };
