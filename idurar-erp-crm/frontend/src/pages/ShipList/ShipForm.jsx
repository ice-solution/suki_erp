import { Form, Input, Select, DatePicker } from 'antd';
import DynamicForm from '@/forms/DynamicForm';
import { fields } from './config';
import useLanguage from '@/locale/useLanguage';

export default function ShipForm({ isUpdateForm = false }) {
  const translate = useLanguage();

  // 獲取基本字段（除了 status 和 supplierNumber，因為需要條件顯示）
  const { status, supplierNumber, ...baseFields } = fields;

  return (
    <>
      <DynamicForm fields={baseFields} isUpdateForm={isUpdateForm} />
      
      {/* Status 字段 */}
      <Form.Item
        label={translate('status') || 'Status'}
        name="status"
        rules={[{ required: false }]}
      >
        <Select
          style={{ width: '100%' }}
          placeholder="請選擇狀態"
        >
          {status.options.map((option) => (
            <Select.Option key={option.value} value={option.value}>
              {option.label}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>

      {/* Supplier Number 字段 - 只在 status 為 'in_use' 時顯示 */}
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}>
        {({ getFieldValue }) => {
          const statusValue = getFieldValue('status');
          if (statusValue === 'in_use') {
            return (
              <Form.Item
                label={translate('Supplier Quote Number') || 'Supplier Quote Number'}
                name="supplierNumber"
                rules={[{ required: false }]}
              >
                <Input placeholder="輸入 Supplier Quote Number" />
              </Form.Item>
            );
          }
          return null;
        }}
      </Form.Item>

      {/* 安裝／拆卸日期 - 使用中時可填 */}
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}>
        {({ getFieldValue }) => {
          const statusValue = getFieldValue('status');
          if (statusValue === 'in_use') {
            return (
              <>
                <Form.Item label="安裝日期" name="installationDate" rules={[{ required: false }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
                <Form.Item label="拆卸日期" name="dismantlingDate" rules={[{ required: false }]}>
                  <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
                </Form.Item>
              </>
            );
          }
          return null;
        }}
      </Form.Item>

      {/* 回廠日期 - 僅在狀態為「待保養」時顯示且必填 */}
      <Form.Item noStyle shouldUpdate={(prevValues, currentValues) => prevValues.status !== currentValues.status}>
        {({ getFieldValue }) => {
          const statusValue = getFieldValue('status');
          if (statusValue === 'pending_maintenance') {
            return (
              <Form.Item
                label="回廠日期"
                name="returnDate"
                rules={[{ required: true, message: '請填寫回廠日期' }]}
              >
                <DatePicker style={{ width: '100%' }} format="YYYY-MM-DD" />
              </Form.Item>
            );
          }
          return null;
        }}
      </Form.Item>
    </>
  );
}

