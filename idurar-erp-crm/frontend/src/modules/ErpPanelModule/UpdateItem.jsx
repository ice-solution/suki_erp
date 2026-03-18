import { useState, useEffect } from 'react';
import { Form, Divider } from 'antd';
import dayjs from 'dayjs';
import { Button, Tag } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import calculate from '@/utils/calculate';
import { generate as uniqueId } from 'shortid';
import { selectUpdatedItem } from '@/redux/erp/selectors';
import Loading from '@/components/Loading';

import { CloseCircleOutlined, PlusOutlined } from '@ant-design/icons';
import { useNavigate, useParams } from 'react-router-dom';

import { settingsAction } from '@/redux/settings/actions';
import { request } from '@/request';
import { message } from 'antd';
// import { StatusTag } from '@/components/Tag';

function SaveForm({ form, translate }) {
  const handelClick = () => {
    form.submit();
  };

  return (
    <Button onClick={handelClick} type="primary" icon={<PlusOutlined />}>
      {translate('update')}
    </Button>
  );
}

export default function UpdateItem({ config, UpdateForm }) {
  const translate = useLanguage();
  let { entity } = config;

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { current, isLoading, isSuccess } = useSelector(selectUpdatedItem);
  const [form] = Form.useForm();
  const [subTotal, setSubTotal] = useState(0);

  const resetErp = {
    status: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    subTotal: 0,
    taxTotal: 0,
    taxRate: 0,
    total: 0,
    credit: 0,
    number: 0,
    year: 0,
  };

  const [currentErp, setCurrentErp] = useState(current ?? resetErp);

  const { id } = useParams();

  const handelValuesChange = (changedValues, values) => {
    const items = values['items'];
    let subTotal = 0;

    if (items) {
      items.map((item) => {
        if (item) {
          if (item.quantity && item.price) {
            let total = calculate.multiply(item['quantity'], item['price']);
            //sub total
            subTotal = calculate.add(subTotal, total);
          }
        }
      });
      setSubTotal(subTotal);
    }
  };

  const onSubmit = (fieldsValue) => {
    let dataToUpdate = { ...fieldsValue };
    if (fieldsValue) {
      // Handle different date field names for different entities
      if (fieldsValue.date) {
        dataToUpdate.date = dayjs(fieldsValue.date).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
      }
      // expiredDate 僅對 Quote、吊船Quote、S單：不傳給 Invoice
      const entitiesWithExpiredDate = ['quote', 'shipquote', 'supplierquote'];
      if (entitiesWithExpiredDate.includes((entity || '').toLowerCase())) {
        if (fieldsValue.expiredDate) {
          dataToUpdate.expiredDate = dayjs(fieldsValue.expiredDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        } else {
          dataToUpdate.expiredDate = null;
        }
      }
      
      // Handle Invoice-specific date fields
      if (fieldsValue.paymentDueDate) {
        dataToUpdate.paymentDueDate = dayjs(fieldsValue.paymentDueDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
      }
      
      // Handle Project-specific date fields
      if (fieldsValue.startDate || fieldsValue.endDate) {
        if (fieldsValue.startDate) {
          dataToUpdate.startDate = dayjs(fieldsValue.startDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        }
        if (fieldsValue.endDate) {
          dataToUpdate.endDate = dayjs(fieldsValue.endDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        }
      }
      
      if (fieldsValue.items) {
        const newList = fieldsValue.items.map(({ key, ...rest }) => ({
          ...rest,
          total: (rest.quantity || 0) * (rest.price || 0),
        }));
        dataToUpdate.items = newList;
      }
      
      // 處理 P.O Numbers：將 poNumbers 數組轉換為 poNumber 字符串（用逗號分隔）
      if (fieldsValue.poNumbers && Array.isArray(fieldsValue.poNumbers) && fieldsValue.poNumbers.length > 0) {
        dataToUpdate.poNumber = fieldsValue.poNumbers.join(', ');
        delete dataToUpdate.poNumbers; // 移除 poNumbers，只保留 poNumber
      } else if (fieldsValue.poNumbers && fieldsValue.poNumbers.length === 0) {
        // 如果 poNumbers 為空數組，設置 poNumber 為空字符串
        dataToUpdate.poNumber = '';
        delete dataToUpdate.poNumbers;
      }
    }

    // Check if this is a supplierquote with actual file objects (not just empty arrays)
    const hasActualFiles = (dataToUpdate.dmFiles && dataToUpdate.dmFiles.length > 0 && 
                           dataToUpdate.dmFiles.some(file => file.originFileObj)) || 
                          (dataToUpdate.invoiceFiles && dataToUpdate.invoiceFiles.length > 0 && 
                           dataToUpdate.invoiceFiles.some(file => file.originFileObj));
    
    if (entity === 'supplierquote' && hasActualFiles) {
      // Use file upload API for supplierquote with actual files
      console.log('🔄 Using file upload API');
      dispatch(erp.updateWithFiles({ entity, id, jsonData: dataToUpdate }));
    } else {
      // Use regular API for other entities or supplierquote without files
      console.log('🔄 Using regular API');
      dispatch(erp.update({ entity, id, jsonData: dataToUpdate }));
    }
  };
  useEffect(() => {
    if (isSuccess) {
      // 檢查是否需要同步項目（對於Quote、SupplierQuote、Invoice）
      const shouldSyncProject = form.getFieldValue('shouldLinkToProject');
      const invoiceNumber = form.getFieldValue('invoiceNumber');
      
      if (shouldSyncProject && ['quote', 'supplierquote', 'shipquote', 'invoice'].includes(entity.toLowerCase())) {
        handleProjectSync(shouldSyncProject);
      } else if (invoiceNumber && ['quote', 'supplierquote', 'shipquote', 'invoice'].includes(entity.toLowerCase())) {
        // 如果有 Invoice Number，檢查是否需要自動同步項目
        handleAutoProjectSync(invoiceNumber);
      }
      
      form.resetFields();
      setSubTotal(0);
      dispatch(erp.resetAction({ actionType: 'update' }));
      
      // Force refresh the data to get updated file information
      dispatch(erp.read({ entity, id }));
      navigate(`/${entity.toLowerCase()}/read/${id}`);
    }
  }, [isSuccess]);

  // 處理項目同步
  const handleProjectSync = async (projectId) => {
    try {
      const syncResult = await request.sync({ entity: 'project', id: projectId });
      if (syncResult.success) {
        message.success(`${entity}已成功關聯到項目！`);
      }
    } catch (error) {
      console.error('項目同步失敗:', error);
      message.warning(`${entity}更新成功，但關聯到項目時出錯`);
    }
  };

  // 處理自動項目同步
  const handleAutoProjectSync = async (invoiceNumber) => {
    try {
      const result = await request.checkProject({ invoiceNumber: invoiceNumber.trim() });
      if (result.success && result.result) {
        // 找到匹配的項目，自動同步
        const project = result.result;
        console.log(`🔗 Auto-syncing ${entity} to project:`, project.invoiceNumber);
        
        const syncResult = await request.sync({ entity: 'project', id: project._id });
        if (syncResult.success) {
          message.success(`${entity}已自動關聯到項目 ${project.invoiceNumber}！`);
        }
      }
    } catch (error) {
      console.error('自動項目同步失敗:', error);
      // 不顯示錯誤，因為這是自動功能
    }
  };

  useEffect(() => {
    if (current) {
      setCurrentErp(current);
      let formData = { ...current };
      
      // Handle Quote/Invoice date fields
      if (formData.date) {
        formData.date = dayjs(formData.date);
      }
      if (formData.expiredDate) {
        formData.expiredDate = dayjs(formData.expiredDate);
      }
      
      // Handle Invoice-specific date fields
      if (formData.paymentDueDate) {
        formData.paymentDueDate = dayjs(formData.paymentDueDate);
      }
      
      // Handle Project date fields
      if (formData.startDate) {
        formData.startDate = dayjs(formData.startDate);
      }
      if (formData.endDate) {
        formData.endDate = dayjs(formData.endDate);
      }
      
      if (!formData.taxRate) {
        formData.taxRate = 0;
      }

      const { subTotal } = formData;

      form.resetFields();
      form.setFieldsValue(formData);
      setSubTotal(subTotal);
    }
  }, [current]);

  return (
    <>
      <PageHeader
        onBack={() => {
          navigate(`/${entity.toLowerCase()}`);
        }}
        title={translate('update')}
        ghost={false}
        tags={[
          <span key="status">{currentErp.status && translate(currentErp.status)}</span>,
          currentErp.paymentStatus && (
            <span key="paymentStatus">
              {currentErp.paymentStatus && translate(currentErp.paymentStatus)}
            </span>
          ),
        ]}
        extra={[
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              navigate(`/${entity.toLowerCase()}`);
            }}
            icon={<CloseCircleOutlined />}
          >
            {translate('Cancel')}
          </Button>,
          <SaveForm translate={translate} form={form} key={`${uniqueId()}`} />,
        ]}
        style={{
          padding: '20px 0px',
        }}
      ></PageHeader>
      <Divider dashed />
      <Loading isLoading={isLoading}>
        <Form form={form} layout="vertical" onFinish={onSubmit} onValuesChange={handelValuesChange}>
          <UpdateForm subTotal={subTotal} current={current} />
        </Form>
      </Loading>
    </>
  );
}
