import { useState, useEffect } from 'react';

import { Button, Tag, Form, Divider } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import { useSelector, useDispatch } from 'react-redux';

import useLanguage from '@/locale/useLanguage';

import { settingsAction } from '@/redux/settings/actions';
import { erp } from '@/redux/erp/actions';
import { selectCreatedItem } from '@/redux/erp/selectors';

import calculate from '@/utils/calculate';
import { generate as uniqueId } from 'shortid';

import Loading from '@/components/Loading';
import {
  ArrowLeftOutlined,
  ArrowRightOutlined,
  CloseCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons';

import { useNavigate } from 'react-router-dom';
import { request } from '@/request';
import { message } from 'antd';
import dayjs from 'dayjs';

function SaveForm({ form }) {
  const translate = useLanguage();
  const handelClick = () => {
    form.submit();
  };

  return (
    <Button onClick={handelClick} type="primary" icon={<PlusOutlined />}>
      {translate('Save')}
    </Button>
  );
}

export default function CreateItem({ config, CreateForm }) {
  const translate = useLanguage();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    dispatch(settingsAction.list({ entity: 'setting' }));
  }, []);
  let { entity } = config;

  const { isLoading, isSuccess, result } = useSelector(selectCreatedItem);
  const [form] = Form.useForm();
  const [subTotal, setSubTotal] = useState(0);
  const [offerSubTotal, setOfferSubTotal] = useState(0);
  const handelValuesChange = (changedValues, values) => {
    const items = values['items'];
    let subTotal = 0;
    let subOfferTotal = 0;

    if (items) {
      items.map((item) => {
        if (item) {
          if (item.offerPrice && item.quantity) {
            let offerTotal = calculate.multiply(item['quantity'], item['offerPrice']);
            subOfferTotal = calculate.add(subOfferTotal, offerTotal);
          }
          if (item.quantity && item.price) {
            let total = calculate.multiply(item['quantity'], item['price']);
            //sub total
            subTotal = calculate.add(subTotal, total);
          }
        }
      });
      setSubTotal(subTotal);
      setOfferSubTotal(subOfferTotal);
    }
  };

  useEffect(() => {
    if (isSuccess && result) {
      // 檢查是否需要關聯到項目
      const shouldLinkToProject = form.getFieldValue('shouldLinkToProject');
      console.log('🔗 shouldLinkToProject:', shouldLinkToProject);
      console.log('📄 Created document:', result);
      
      if (shouldLinkToProject) {
        console.log('🚀 Starting project sync...');
        // 執行項目同步以關聯新創建的文檔
        handleProjectSync(shouldLinkToProject, result);
      }
      
      form.resetFields();
      dispatch(erp.resetAction({ actionType: 'create' }));
      setSubTotal(0);
      setOfferSubTotal(0);
      navigate(`/${entity.toLowerCase()}/read/${result._id}`);
    }
    return () => {};
  }, [isSuccess, result]);

  // 處理項目同步
  const handleProjectSync = async (projectId, createdDocument) => {
    try {
      const syncResult = await request.sync({ entity: 'project', id: projectId });
      if (syncResult.success) {
        message.success(`${entity}已成功關聯到項目！`);
      }
    } catch (error) {
      console.error('項目同步失敗:', error);
      message.warning(`${entity}創建成功，但關聯到項目時出錯`);
    }
  };

  const onSubmit = (fieldsValue) => {
    console.log('🚀 ~ onSubmit ~ fieldsValue:', fieldsValue);
    if (fieldsValue) {
      // 移除shouldLinkToProject字段，這個字段只用於前端邏輯
      const { shouldLinkToProject, ...dataToSubmit } = fieldsValue;
      
      if (dataToSubmit.items) {
        const newList = dataToSubmit.items.map(({ key, ...rest }) => ({
          ...rest,
          total: calculate.multiply(rest.quantity || 0, rest.price || 0),
        }));
        dataToSubmit.items = newList;
      }
      
      // 處理 P.O Numbers：將 poNumbers 數組轉換為 poNumber 字符串（用逗號分隔）
      if (dataToSubmit.poNumbers && Array.isArray(dataToSubmit.poNumbers) && dataToSubmit.poNumbers.length > 0) {
        dataToSubmit.poNumber = dataToSubmit.poNumbers.join(', ');
        delete dataToSubmit.poNumbers; // 移除 poNumbers，只保留 poNumber
      } else if (dataToSubmit.poNumbers && dataToSubmit.poNumbers.length === 0) {
        // 如果 poNumbers 為空數組，設置 poNumber 為空字符串
        dataToSubmit.poNumber = '';
        delete dataToSubmit.poNumbers;
      }

      if (entity === 'invoice') {
        if (dataToSubmit.paidDate) {
          dataToSubmit.paidDate = dayjs(dataToSubmit.paidDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        } else {
          dataToSubmit.paidDate = null;
        }
      }
      
      // Check if this is a supplierquote with actual file objects (not just empty arrays)
      const hasActualFiles = (dataToSubmit.dmFiles && dataToSubmit.dmFiles.length > 0 && 
                             dataToSubmit.dmFiles.some(file => file.originFileObj)) || 
                            (dataToSubmit.invoiceFiles && dataToSubmit.invoiceFiles.length > 0 && 
                             dataToSubmit.invoiceFiles.some(file => file.originFileObj));
      
      if (entity === 'supplierquote' && hasActualFiles) {
        // Use file upload API for supplierquote with actual files
        console.log('🔄 Using file upload API');
        dispatch(erp.createWithFiles({ entity, jsonData: dataToSubmit }));
      } else {
        // Use regular API for other entities or supplierquote without files
        console.log('🔄 Using regular API');
        dispatch(erp.create({ entity, jsonData: dataToSubmit }));
      }
    } else {
      dispatch(erp.create({ entity, jsonData: fieldsValue }));
    }
  };

  return (
    <>
      <PageHeader
        onBack={() => {
          navigate(`/${entity.toLowerCase()}`);
        }}
        backIcon={<ArrowLeftOutlined />}
        title={translate('New')}
        ghost={false}
        tags={<Tag>{translate('Draft')}</Tag>}
        // subTitle="This is create page"
        extra={[
          <Button
            key={`${uniqueId()}`}
            onClick={() => navigate(`/${entity.toLowerCase()}`)}
            icon={<CloseCircleOutlined />}
          >
            {translate('Cancel')}
          </Button>,
          <SaveForm form={form} key={`${uniqueId()}`} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>
      <Divider dashed />
      <Loading isLoading={isLoading}>
        <Form form={form} layout="vertical" onFinish={onSubmit} onValuesChange={handelValuesChange}>
          <CreateForm subTotal={subTotal} offerTotal={offerSubTotal} />
        </Form>
      </Loading>
    </>
  );
}
