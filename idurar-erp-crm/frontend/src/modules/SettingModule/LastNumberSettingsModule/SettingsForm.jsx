import { Form, InputNumber } from 'antd';
import { useEffect } from 'react';
import { useSelector } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { mergeLastNumberSettings } from '@/utils/lastNumberSettings';

const formItems = [
  { label: 'last_sml_number', settingKey: 'last_sml_number' },
  { label: 'last_qu_number', settingKey: 'last_qu_number' },
  { label: 'supplier_last_number_no', settingKey: 'last_supplier_quote_number_no' },
  { label: 'supplier_last_number_po', settingKey: 'last_supplier_quote_number_po' },
  { label: 'supplier_last_number_s', settingKey: 'last_supplier_quote_number_s' },
  { label: 'supplier_last_number_swp', settingKey: 'last_supplier_quote_number_swp' },
  { label: 'supplier_last_number_e', settingKey: 'last_supplier_quote_number_e' },
  { label: 'supplier_last_number_y', settingKey: 'last_supplier_quote_number_y' },
];

export default function LastNumberSettingsForm() {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const settingsResult = useSelector((state) => state.settings?.result);

  useEffect(() => {
    const merged = mergeLastNumberSettings({
      lastNumberSettings: settingsResult?.last_number_settings,
      financeSettings: settingsResult?.finance_settings,
      supplierQuoteSettings: settingsResult?.supplier_quote_settings,
    });
    form.setFieldsValue(merged);
  }, [settingsResult, form]);

  return (
    <div>
      {formItems.map((item) => (
        <Form.Item
          key={item.settingKey}
          label={translate(item.label)}
          name={item.settingKey}
          rules={[{ required: true }]}
        >
          <InputNumber min={0} style={{ width: '100%' }} />
        </Form.Item>
      ))}
    </div>
  );
}
