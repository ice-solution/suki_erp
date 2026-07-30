import { useState } from 'react';
import { Button, message } from 'antd';
import { fetchSuggestedNextNumber } from '@/utils/fetchSuggestedNextNumber';

/**
 * 按一下即向伺服器查該 type 的最後號碼 +1，寫入表單。
 * @param {{ kind: 'quote'|'invoice'|'supplier', prefix: string, onApply: (next: string) => void, label?: string }} props
 */
export default function SuggestedNextNumberButton({
  kind,
  prefix,
  onApply,
  label = '使用建議編號',
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    try {
      setLoading(true);
      const next = await fetchSuggestedNextNumber(kind, prefix);
      if (next == null) {
        message.error('無法取得建議編號，請稍後再試');
        return;
      }
      onApply(String(next));
      message.success(`已套用建議編號：${next}`);
    } catch (e) {
      message.error(e?.message || '無法取得建議編號');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="link"
      size="small"
      loading={loading}
      style={{ padding: 0, height: 'auto', marginLeft: 4 }}
      onClick={() => void handleClick()}
    >
      {label}
    </Button>
  );
}
