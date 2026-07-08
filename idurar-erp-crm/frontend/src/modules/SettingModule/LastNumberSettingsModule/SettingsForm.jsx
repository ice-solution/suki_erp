import { Divider, Form, InputNumber, Select } from 'antd';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { mergeLastNumberSettings } from '@/utils/lastNumberSettings';
import { request } from '@/request';

const quoteNumberItems = [
  { label: 'last_sml_number', settingKey: 'last_sml_number' },
  { label: 'last_qu_number', settingKey: 'last_qu_number' },
];

const invoiceNumberItems = [
  { label: 'last_smi_number', settingKey: 'last_smi_number' },
  { label: 'last_wse_number', settingKey: 'last_wse_number' },
  { label: 'last_sp_number', settingKey: 'last_sp_number' },
];

const supplierNumberItems = [
  { label: 'supplier_last_number_no', settingKey: 'last_supplier_quote_number_no' },
  { label: 'supplier_last_number_po', settingKey: 'last_supplier_quote_number_po' },
  { label: 'supplier_last_number_s', settingKey: 'last_supplier_quote_number_s' },
  { label: 'supplier_last_number_swp', settingKey: 'last_supplier_quote_number_swp' },
  { label: 'supplier_last_number_e', settingKey: 'last_supplier_quote_number_e' },
  { label: 'supplier_last_number_y', settingKey: 'last_supplier_quote_number_y' },
];

function NumberFields({ items, translate }) {
  return items.map((item) => (
    <Form.Item
      key={item.settingKey}
      label={translate(item.label)}
      name={item.settingKey}
      rules={[{ required: true }]}
    >
      <InputNumber min={0} style={{ width: '100%' }} />
    </Form.Item>
  ));
}

export default function LastNumberSettingsForm() {
  const translate = useLanguage();
  const form = Form.useFormInstance();
  const settingsResult = useSelector((state) => state.settings?.result);
  const [supplierOptions, setSupplierOptions] = useState([]);

  useEffect(() => {
    const merged = mergeLastNumberSettings({
      lastNumberSettings: settingsResult?.last_number_settings,
      financeSettings: settingsResult?.finance_settings,
      supplierQuoteSettings: settingsResult?.supplier_quote_settings,
    });
    form.setFieldsValue(merged);
  }, [settingsResult, form]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await request.listAll({ entity: 'supplier' });
        if (cancelled) return;
        const list = Array.isArray(response?.result) ? response.result : [];
        setSupplierOptions(
          list.map((s) => ({
            value: s._id,
            label: s.name || s.company || s._id,
          }))
        );
      } catch {
        if (!cancelled) setSupplierOptions([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      <Divider orientation="left">{translate('quote_numbers_section')}</Divider>
      <NumberFields items={quoteNumberItems} translate={translate} />

      <Divider orientation="left">{translate('invoice_numbers_section')}</Divider>
      <NumberFields items={invoiceNumberItems} translate={translate} />

      <Divider orientation="left">{translate('supplier_numbers_section')}</Divider>
      <NumberFields items={supplierNumberItems} translate={translate} />

      <Divider orientation="left">{translate('quote_default_supplier_section')}</Divider>
      <Form.Item
        label={translate('default_quote_supplier_id')}
        name="default_quote_supplier_id"
        tooltip={translate('default_quote_supplier_id_hint')}
      >
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          placeholder={translate('select_supplier')}
          options={supplierOptions}
        />
      </Form.Item>
    </div>
  );
}
