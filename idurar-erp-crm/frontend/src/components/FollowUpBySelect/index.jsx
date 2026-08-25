import { useEffect, useState } from 'react';
import { Form, Select } from 'antd';
import { useSelector } from 'react-redux';
import { request } from '@/request';
import { selectCurrentAdmin } from '@/redux/auth/selectors';
import { selectFollowUpPersonList } from '@/redux/settings/selectors';
import { adminDisplayName, followUpCustomName } from '@/utils/adminDisplayName';

function toAdminOption(admin, followUpPersonList) {
  const id = String(admin._id);
  const custom = followUpCustomName(id, followUpPersonList);
  const account = adminDisplayName(admin) || admin.email || id;
  return {
    value: id,
    label: custom || account,
  };
}

export default function FollowUpBySelect({ current = null }) {
  const currentAdmin = useSelector(selectCurrentAdmin);
  const followUpPersonList = useSelector(selectFollowUpPersonList);
  const form = Form.useFormInstance();
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);

  const loadOptions = async () => {
    setLoading(true);
    try {
      const res = await request.get({ entity: 'admin' });
      const admins = (res?.result || []).filter((a) => a && a.enabled !== false);

      if (Array.isArray(followUpPersonList) && followUpPersonList.length > 0) {
        const byId = new Map(admins.map((a) => [String(a._id), a]));
        const rows = followUpPersonList
          .map((p) => {
            const admin = byId.get(String(p.adminId));
            if (!admin) {
              // 帳號已刪／停用：仍顯示自訂名以便舊單可選
              return {
                value: String(p.adminId),
                label: p.displayName || String(p.adminId),
              };
            }
            return toAdminOption(admin, followUpPersonList);
          })
          .filter(Boolean);
        setOptions(rows);
      } else {
        // 尚未設定跟單人列表：後備用全部啟用帳號
        setOptions(admins.map((a) => toAdminOption(a, followUpPersonList)));
      }
    } catch (e) {
      console.error(e);
      setOptions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOptions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [followUpPersonList]);

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
          if (open && options.length === 0) loadOptions();
        }}
      />
    </Form.Item>
  );
}
