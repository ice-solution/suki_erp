import { useEffect } from 'react';
import dayjs from 'dayjs';

import { useDispatch, useSelector } from 'react-redux';
import { crud } from '@/redux/crud/actions';
import { useCrudContext } from '@/context/crud';
import { selectCreatedItem } from '@/redux/crud/selectors';

import useLanguage from '@/locale/useLanguage';

import { Button, Form } from 'antd';
import Loading from '@/components/Loading';

export default function CreateForm({ config, formElements, withUpload = false }) {
  let { entity } = config;
  const dispatch = useDispatch();
  const { isLoading, isSuccess } = useSelector(selectCreatedItem);
  const { crudContextAction } = useCrudContext();
  const { panel, collapsedBox, readBox } = crudContextAction;
  const [form] = Form.useForm();
  const translate = useLanguage();
  const onSubmit = (fieldsValue) => {
    // Manually trim values before submission

    if (fieldsValue.file && withUpload) {
      fieldsValue.file = fieldsValue.file[0].originFileObj;
    }

    const payload = { ...fieldsValue };
    if (['ship', 'winch'].includes(entity)) {
      ['installationDate', 'dismantlingDate', 'returnDate', 'expiredDate'].forEach((field) => {
        if (payload[field]) {
          payload[field] = dayjs(payload[field]).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        } else if (Object.prototype.hasOwnProperty.call(payload, field)) {
          payload[field] = null;
        }
      });
    }

    dispatch(crud.create({ entity, jsonData: payload, withUpload }));
  };

  useEffect(() => {
    if (isSuccess) {
      readBox.open();
      collapsedBox.open();
      panel.open();
      form.resetFields();
      dispatch(crud.resetAction({ actionType: 'create' }));
      dispatch(crud.list({ entity }));
    }
  }, [isSuccess]);

  return (
    <Loading isLoading={isLoading}>
      <Form form={form} layout="vertical" onFinish={onSubmit}>
        {formElements}
        <Form.Item>
          <Button type="primary" htmlType="submit">
            {translate('Submit')}
          </Button>
        </Form.Item>
      </Form>
    </Loading>
  );
}
