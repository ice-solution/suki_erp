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
      if (fieldsValue.date || fieldsValue.expiredDate) {
        if (fieldsValue.date) {
          dataToUpdate.date = dayjs(fieldsValue.date).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        }
        if (fieldsValue.expiredDate) {
          dataToUpdate.expiredDate = dayjs(fieldsValue.expiredDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        }
      }
      
      // Handle Invoice-specific date fields
      if (fieldsValue.invoiceDate || fieldsValue.paymentDueDate) {
        if (fieldsValue.invoiceDate) {
          dataToUpdate.invoiceDate = dayjs(fieldsValue.invoiceDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        }
        if (fieldsValue.paymentDueDate) {
          dataToUpdate.paymentDueDate = dayjs(fieldsValue.paymentDueDate).format('YYYY-MM-DDTHH:mm:ss.SSSZ');
        }
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
        let newList = [];
        fieldsValue.items.map((item) => {
          const { quantity, price, itemName, description } = item;
          const total = item.quantity * item.price;
          newList.push({ total, quantity, price, itemName, description });
        });
        dataToUpdate.items = newList;
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
      const poNumber = form.getFieldValue('poNumber');
      
      if (shouldSyncProject && ['quote', 'supplierquote', 'invoice'].includes(entity.toLowerCase())) {
        handleProjectSync(shouldSyncProject);
      } else if (poNumber && ['quote', 'supplierquote', 'invoice'].includes(entity.toLowerCase())) {
        // 如果有P.O Number，檢查是否需要自動同步項目
        handleAutoProjectSync(poNumber);
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
  const handleAutoProjectSync = async (poNumber) => {
    try {
      const result = await request.checkProject({ poNumber: poNumber.trim() });
      if (result.success && result.result) {
        // 找到匹配的項目，自動同步
        const project = result.result;
        console.log(`🔗 Auto-syncing ${entity} to project:`, project.poNumber);
        
        const syncResult = await request.sync({ entity: 'project', id: project._id });
        if (syncResult.success) {
          message.success(`${entity}已自動關聯到項目 ${project.poNumber}！`);
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
      if (formData.invoiceDate) {
        formData.invoiceDate = dayjs(formData.invoiceDate);
      }
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
