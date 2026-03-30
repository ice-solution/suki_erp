import { AutoComplete, Input } from 'antd';
import { useMemo } from 'react';

/**
 * 依表單已選客戶（clients）的 contacts，用 AutoComplete 選填聯絡人；仍可自由輸入。
 */
export default function ContactPersonAutoComplete({ clientIds, clientRecords, placeholder, ...rest }) {
  const options = useMemo(() => {
    if (!clientIds?.length || !clientRecords?.length) return [];
    const idSet = new Set(clientIds.map((id) => String(id)));
    const out = [];
    const seen = new Set();
    for (const c of clientRecords) {
      if (!c?._id || !idSet.has(String(c._id))) continue;
      for (const ct of c.contacts || []) {
        const name = (ct?.name || '').trim();
        const phone = (ct?.phone || '').trim();
        if (!name && !phone) continue;
        const value = name && phone ? `${name} · ${phone}` : name || phone;
        if (seen.has(value)) continue;
        seen.add(value);
        out.push({ value, label: value });
      }
    }
    return out;
  }, [clientIds, clientRecords]);

  return (
    <AutoComplete
      options={options}
      allowClear
      filterOption={(input, option) =>
        String(option?.value ?? '')
          .toLowerCase()
          .includes(String(input ?? '').toLowerCase())
      }
      placeholder={placeholder}
      {...rest}
    >
      <Input />
    </AutoComplete>
  );
}
