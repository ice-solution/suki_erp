import { Form, Input, InputNumber, Select, Row, Col, Button } from 'antd';
import useLanguage from '@/locale/useLanguage';
import {
  SUPPLIER_QUOTE_PREFIX_OPTIONS,
  getSuggestedNextNumber,
} from '@/utils/lastNumberSettings';

export default function SupplierOrderNumberFields({
  prefix,
  number,
  onPrefixChange,
  onNumberChange,
  mergedLastNumbers,
}) {
  const translate = useLanguage();
  const suggested = getSuggestedNextNumber(mergedLastNumbers, prefix, 'supplier');

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
            placeholder={String(suggested)}
          />
        </Col>
        <Col span={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
          <Button
            type="link"
            onClick={() => onNumberChange(String(suggested))}
            style={{ padding: 0, marginBottom: 4 }}
          >
            使用建議 {suggested}
          </Button>
        </Col>
      </Row>
      <p style={{ color: '#888', fontSize: 12, margin: '8px 0 0' }}>
        須大於最後號碼，且不可與現有 S 單重複。
      </p>
    </div>
  );
}
