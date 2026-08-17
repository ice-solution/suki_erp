import { useEffect, useState } from 'react';
import { Form, Select } from 'antd';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { adminDisplayName } from '@/utils/adminDisplayName';

function toOption(admin) {
  return {
    value: String(admin._id),
    label: adminDisplayName(admin) || admin.email || String(admin._id),
  };
}

export default function FollowUpBySelect({ current = null }) {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const form = Form.useFormInstance();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadAdmins = async () => {
    setLoading(true);
    try {
      const res = await request.get({ entity: 'admin' });
      const rows = (res?.result || [])
        .filter((a) => a && a.enabled !== false)
        .map(toOption);
      setOptions(rows);
    } catch (e) {
      console.error(e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAdmins();
  }, []);

  useEffect(() => {
    const existing = current?.followUpBy;
    const existingId =
      existing && typeof existing === 'object' ? existing._id : existing;
    const createdBy = current?.createdBy;
    const createdById =
      createdBy && typeof createdBy === 'object' ? createdBy._id : createdBy;
    const nextId = existingId || (current?._id ? createdById : currentAdmin?._id);
    if (nextId) {
      form.setFieldsValue({ followUpBy: String(nextId) });
    }
  }, [current?._id, current?.followUpBy, current?.createdBy, currentAdmin?._id, form]);

  return (
    <Form.Item
      label="跟單人"
      name="followUpBy"
      rules={[{ required: true, message: '請選擇跟單人' }]}
    >
      <Select
        showSearch
        optionFilterProp="label"
        placeholder="選擇跟單人"
        loading={loading}
        options={options}
        allowClear={false}
        onDropdownVisibleChange={(open) => {
          if (open && options.length === 0) loadAdmins();
        }}
      />
    </Form.Item>
  );
}
