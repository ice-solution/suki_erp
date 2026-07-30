import { useState } from 'react';
import { Input, Select, Row, Col, Button, message } from 'antd';
import useLanguage from '@/locale/useLanguage';
import {
  SUPPLIER_QUOTE_PREFIX_OPTIONS,
  getSuggestedNextNumber,
} from '@/utils/lastNumberSettings';
import { fetchSuggestedNextNumber } from '@/utils/fetchSuggestedNextNumber';

export default function SupplierOrderNumberFields({
  prefix,
  number,
  onPrefixChange,
  onNumberChange,
  mergedLastNumbers,
}) {
  const translate = useLanguage();
  const cachedSuggested = getSuggestedNextNumber(mergedLastNumbers, prefix, 'supplier');
  const [loading, setLoading] = useState(false);

  const applyLiveSuggested = async () => {
    try {
      setLoading(true);
      const next = await fetchSuggestedNextNumber('supplier', prefix);
      if (next == null) {
        onNumberChange(String(cachedSuggested));
        message.warning('無法即時取得建議編號，已用本機快取');
        return;
      }
      onNumberChange(String(next));
      message.success(`已套用建議編號：${next}`);
    } catch (e) {
      message.error(e?.message || '無法取得建議編號');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginBottom: 16, padding: 12, background: '#fafafa', borderRadius: 6 }}>
      <div style={{ marginBottom: 8, fontWeight: 500 }}>S 單編號</div>
      <Row gutter={12}>
        <Col span={8}>
          <div style={{ marginBottom: 4, fontSize: 12 }}>Supplier Type</div>
          <Select
            style={{ width: '100%' }}
            value={prefix}
            options={SUPPLIER_QUOTE_PREFIX_OPTIONS}
            onChange={onPrefixChange}
          />
        </Col>
        <Col span={10}>
          <div style={{ marginBottom: 4, fontSize: 12 }}>{translate('number')}</div>
          <Input
            value={number}
            onChange={(e) => onNumberChange(e.target.value)}
            placeholder={String(cachedSuggested)}
          />
        </Col>
        <Col span={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            type="link"
            loading={loading}
            onClick={() => void applyLiveSuggested()}
            style={{ padding: 0, marginBottom: 4 }}
          >
            使用建議編號
          </Button>
        </Col>
      </Row>
      <p style={{ color: '#888', fontSize: 12, margin: '8px 0 0' }}>
        按一下向伺服器查詢目前最後號碼 +1。須大於最後號碼，且不可與現有 S 單重複。
      </p>
    </div>
  );
}
