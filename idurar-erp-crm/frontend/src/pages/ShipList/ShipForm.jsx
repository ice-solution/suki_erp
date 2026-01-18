import { Form, Input, Select } from 'antd';
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
    </>
  );
}

