import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Form, Input, InputNumber, Button, Select, DatePicker, Card, message, Row, Col, Descriptions, Tag } from 'antd';
import { ArrowLeftOutlined, SaveOutlined } from '@ant-design/icons';
import { PageHeader } from '@ant-design/pro-layout';
import dayjs from 'dayjs';

import { ErpLayout } from '@/layout';
import useLanguage from '@/locale/useLanguage';
import { useMoney, useDate } from '@/settings';
import { request } from '@/request';

const { TextArea } = Input;

export default function WorkProgressUpdate() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const translate = useLanguage();
  const { moneyFormatter } = useMoney();
  const { dateFormat } = useDate();

  const [workProgress, setWorkProgress] = useState(null);
  const [contractorEmployees, setContractorEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchWorkProgress();
    fetchContractorEmployees();
  }, [id]);

  const fetchWorkProgress = async () => {
    try {
      const response = await request.read({ entity: 'workprogress', id });
      
      if (response.success) {
        const data = response.result;
        setWorkProgress(data);
        
        // 設置表單初始值
        form.setFieldsValue({
          days: data.days,
          progress: data.progress,
          status: data.status,
          notes: data.notes,
          contractorEmployee: data.contractorEmployee?._id,
          startDate: data.startDate ? dayjs(data.startDate) : null,
          expectedEndDate: data.expectedEndDate ? dayjs(data.expectedEndDate) : null,
          completionDate: data.completionDate ? dayjs(data.completionDate) : null,
          actualEndDate: data.actualEndDate ? dayjs(data.actualEndDate) : null,
        });
      } else {
        message.error('載入WorkProgress失敗');
      }
    } catch (error) {
      console.error('Error fetching WorkProgress:', error);
      message.error('載入WorkProgress時發生錯誤');
    } finally {
      setLoading(false);
    }
  };

  const fetchContractorEmployees = async () => {
    try {
      // 獲取所有承包商員工
      const response = await request.list({ 
        entity: 'contractoremployee',
        options: { items: 100 }
      });
      
      if (response.success) {
        const employees = Array.isArray(response.result) 
          ? response.result 
          : response.result.items || [];
        setContractorEmployees(employees);
      }
    } catch (error) {
      console.error('Error fetching contractor employees:', error);
    }
  };

  const onSubmit = async (values) => {
    try {
      setSubmitting(true);
      
      const submitData = {
        ...values,
        startDate: values.startDate ? values.startDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null,
        expectedEndDate: values.expectedEndDate ? values.expectedEndDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null,
        completionDate: values.completionDate ? values.completionDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null,
        actualEndDate: values.actualEndDate ? values.actualEndDate.format('YYYY-MM-DDTHH:mm:ss.SSSZ') : null,
      };

      const response = await request.update({ 
        entity: 'workprogress', 
        id, 
        jsonData: submitData 
      });

      if (response.success) {
        message.success('WorkProgress更新成功！');
        navigate(`/workprogress/read/${id}`);
      } else {
        message.error('更新失敗：' + (response?.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('更新WorkProgress錯誤:', error);
      message.error('更新過程中發生錯誤');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'default',
      in_progress: 'processing',
      completed: 'success',
      cancelled: 'error'
    };
    return colors[status] || 'default';
  };

  const getStatusText = (status) => {
    const texts = {
      pending: '待開始',
      in_progress: '進行中',
      completed: '已完成',
      cancelled: '已取消'
    };
    return texts[status] || status;
  };

  if (loading) {
    return (
      <ErpLayout>
        <div style={{ padding: '50px', textAlign: 'center' }}>載入中...</div>
      </ErpLayout>
    );
  }

  if (!workProgress) {
    return (
      <ErpLayout>
        <div style={{ padding: '50px', textAlign: 'center' }}>WorkProgress not found</div>
      </ErpLayout>
    );
  }

  return (
    <ErpLayout>
      <PageHeader
        onBack={() => navigate(`/workprogress/read/${id}`)}
        title={`編輯 WorkProgress: ${workProgress.item?.itemName || 'Unknown'}`}
        ghost={false}
        tags={[
          <Tag key="status" color={getStatusColor(workProgress.status)}>
            {getStatusText(workProgress.status)}
          </Tag>
        ]}
        extra={[
          <Button key="cancel" onClick={() => navigate(`/workprogress/read/${id}`)}>
            取消
          </Button>,
          <Button key="back-to-project" onClick={() => {
            // 返回到相關的Project頁面
            if (workProgress?.project?._id) {
              navigate(`/project/read/${workProgress.project._id}`);
            } else {
              navigate(-1);
            }
          }}>
            返回項目
          </Button>,
          <Button 
            key="save" 
            type="primary" 
            icon={<SaveOutlined />}
            onClick={() => form.submit()} 
            loading={submitting}
          >
            保存
          </Button>
        ]}
      />

      <div style={{ padding: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col span={24}>
            <Card title="工作項目信息（只讀）" size="small">
              <Descriptions column={2} size="small">
                <Descriptions.Item label="項目名稱">{workProgress.item?.itemName}</Descriptions.Item>
                <Descriptions.Item label="P.O Number">{workProgress.poNumber}</Descriptions.Item>
                <Descriptions.Item label="描述">{workProgress.item?.description || '-'}</Descriptions.Item>
                <Descriptions.Item label="數量">{workProgress.item?.quantity}</Descriptions.Item>
                <Descriptions.Item label="單價">
                  {moneyFormatter({ amount: workProgress.item?.price || 0 })}
                </Descriptions.Item>
                <Descriptions.Item label="總計">
                  {moneyFormatter({ amount: workProgress.item?.total || 0 })}
                </Descriptions.Item>
                <Descriptions.Item label="來源Quote">{workProgress.item?.sourceQuote || '-'}</Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>

          <Col span={24}>
            <Card title="編輯WorkProgress" size="small">
              <Form
                form={form}
                layout="vertical"
                onFinish={onSubmit}
                initialValues={{
                  status: 'pending',
                  progress: 0,
                  days: 1
                }}
              >
                <Row gutter={[16, 0]}>
                  <Col span={8}>
                    <Form.Item
                      label="負責承包商員工"
                      name="contractorEmployee"
                      rules={[{ required: true, message: '請選擇負責員工' }]}
                    >
                      <Select
                        placeholder="選擇承包商員工"
                        showSearch
                        filterOption={(input, option) =>
                          option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                        }
                        options={contractorEmployees.map(employee => ({
                          value: employee._id,
                          label: `${employee.name} (${employee.contractor?.name || '未知承包商'})`
                        }))}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      label="狀態"
                      name="status"
                      rules={[{ required: true, message: '請選擇狀態' }]}
                    >
                      <Select
                        options={[
                          { value: 'pending', label: '待開始' },
                          { value: 'in_progress', label: '進行中' },
                          { value: 'completed', label: '已完成' },
                          { value: 'cancelled', label: '已取消' }
                        ]}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      label="進度 (%)"
                      name="progress"
                      rules={[{ required: true, message: '請輸入進度' }]}
                    >
                      <InputNumber 
                        min={0} 
                        max={100} 
                        style={{ width: '100%' }}
                        formatter={value => `${value}%`}
                        parser={value => value.replace('%', '')}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item
                      label="預計工作天數"
                      name="days"
                      rules={[{ required: true, message: '請輸入工作天數' }]}
                    >
                      <InputNumber min={1} style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item label="開始日期" name="startDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item label="預期結束日期" name="expectedEndDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item 
                      label="完工日期" 
                      name="completionDate"
                      rules={[{ required: true, message: '請選擇完工日期' }]}
                    >
                      <DatePicker 
                        style={{ width: '100%' }}
                        onChange={(date) => {
                          if (date) {
                            const today = dayjs();
                            const diffDays = date.diff(today, 'days');
                            
                            if (diffDays >= 0 && diffDays <= 3) {
                              message.warning(`⚠️ 完工日期距離今天只有${diffDays}天，請注意時間安排！`);
                            }
                          }
                        }}
                      />
                    </Form.Item>
                  </Col>

                  <Col span={8}>
                    <Form.Item label="實際結束日期" name="actualEndDate">
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>

                  <Col span={24}>
                    <Form.Item label="備註" name="notes">
                      <TextArea rows={4} placeholder="工作備註..." />
                    </Form.Item>
                  </Col>
                </Row>
              </Form>
            </Card>
          </Col>
        </Row>
      </div>
    </ErpLayout>
  );
}
