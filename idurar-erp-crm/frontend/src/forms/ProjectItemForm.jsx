import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Switch, Select, Row, Col, Divider } from 'antd';

import { SelectAsync } from '@/components/SelectAsync';
import useLanguage from '@/locale/useLanguage';

const { TextArea } = Input;

export default function ProjectItemForm({ current = null }) {
  const translate = useLanguage();
  const [form] = Form.useForm();

  useEffect(() => {
    if (current) {
      // 設置表單初始值
      form.setFieldsValue({
        itemName: current.itemName,
        description: current.description,
        price: current.price,
        unit: current.unit,
        category: current.category,
        isFrequent: current.isFrequent,
        supplier: current.supplier?._id,
        notes: current.notes,
      });
    }
  }, [current, form]);

  return (
    <>
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={12}>
          <Form.Item
            label="項目名稱"
            name="itemName"
            rules={[
              {
                required: true,
                message: '請輸入項目名稱',
              },
            ]}
          >
            <Input placeholder="輸入項目名稱" />
          </Form.Item>
        </Col>
        
        <Col className="gutter-row" span={6}>
          <Form.Item
            label="價格"
            name="price"
            rules={[
              {
                required: true,
                message: '請輸入價格',
              },
            ]}
          >
            <InputNumber
              min={0}
              step={0.01}
              style={{ width: '100%' }}
              placeholder="0.00"
              formatter={value => `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
              parser={value => value.replace(/\$\s?|(,*)/g, '')}
            />
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={6}>
          <Form.Item
            label="單位"
            name="unit"
            initialValue="個"
          >
            <Select>
              <Select.Option value="個">個</Select.Option>
              <Select.Option value="件">件</Select.Option>
              <Select.Option value="套">套</Select.Option>
              <Select.Option value="米">米</Select.Option>
              <Select.Option value="平方米">平方米</Select.Option>
              <Select.Option value="立方米">立方米</Select.Option>
              <Select.Option value="公斤">公斤</Select.Option>
              <Select.Option value="噸">噸</Select.Option>
              <Select.Option value="小時">小時</Select.Option>
              <Select.Option value="天">天</Select.Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={8}>
          <Form.Item
            label="分類"
            name="category"
            initialValue="建材"
          >
            <Select>
              <Select.Option value="建材">建材</Select.Option>
              <Select.Option value="人工">人工</Select.Option>
              <Select.Option value="服務">服務</Select.Option>
              <Select.Option value="設備">設備</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={8}>
          <Form.Item
            label="供應商"
            name="supplier"
          >
            <SelectAsync
              entity={'supplier'}
              displayLabels={['name']}
              searchFields={'name'}
              redirectLabel={'Add New Supplier'}
              withRedirect
              urlToRedirect={'/supplier'}
            />
          </Form.Item>
        </Col>

        <Col className="gutter-row" span={8}>
          <Form.Item
            label="常用項目"
            name="isFrequent"
            valuePropName="checked"
            initialValue={false}
          >
            <Switch 
              checkedChildren="是" 
              unCheckedChildren="否" 
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col span={24}>
          <Form.Item
            label="描述"
            name="description"
          >
            <TextArea 
              rows={3} 
              placeholder="輸入項目詳細描述..."
            />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={[12, 0]}>
        <Col span={24}>
          <Form.Item
            label="備註"
            name="notes"
          >
            <TextArea 
              rows={2} 
              placeholder="輸入備註信息..."
            />
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}


