import { useState, useEffect } from 'react';
import { Form, Input, InputNumber, Row, Col, AutoComplete } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import { useMoney, useDate } from '@/settings';
import calculate from '@/utils/calculate';
import axios from 'axios';

export default function ItemRow({ field, remove, current = null }) {
  const [totalState, setTotal] = useState(undefined);
  const [price, setPrice] = useState(0);
  const [quantity, setQuantity] = useState(0);
  const [projectItems, setProjectItems] = useState([]);
  const [loading, setLoading] = useState(false);

  const money = useMoney();
  const form = Form.useFormInstance();

  // 獲取工程項目列表
  useEffect(() => {
    fetchProjectItems();
  }, []);

  const fetchProjectItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/project-item');
      setProjectItems(response.data || []);
    } catch (error) {
      console.error('獲取工程項目失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateQt = (value) => {
    setQuantity(value);
  };

  const updatePrice = (value) => {
    setPrice(value);
  };

  // 處理項目選擇
  const handleItemSelect = (value, option) => {
    const selectedItem = projectItems.find(item => item.item_name === value);
    if (selectedItem) {
      console.log('選擇項目:', selectedItem); // 調試信息
      
      // 直接設置表單值，使用正確的字段路徑
      form.setFieldsValue({
        [`items.${field.name}.itemName`]: selectedItem.item_name,
        [`items.${field.name}.price`]: selectedItem.price || 0,
        [`items.${field.name}.quantity`]: 1
      });
      
      // 更新本地狀態以觸發重新渲染
      setPrice(selectedItem.price || 0);
      setQuantity(1);
      
      console.log('設置表單值:', {
        itemName: selectedItem.item_name,
        price: selectedItem.price || 0,
        quantity: 1,
        fieldName: field.name,
        fieldPath: `items.${field.name}`
      }); // 調試信息
      
      // 強制觸發重新渲染
      setTimeout(() => {
        form.validateFields([`items.${field.name}.price`, `items.${field.name}.quantity`]);
      }, 100);
    }
  };

  // 搜索工程項目
  const handleSearch = (searchText) => {
    if (!searchText) {
      return projectItems.map(item => ({
        value: item.item_name,
        label: `${item.item_name} - ${item.price ? `$${item.price}` : '無價格'}`
      }));
    }
    
    return projectItems
      .filter(item => 
        item.item_name.toLowerCase().includes(searchText.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchText.toLowerCase()))
      )
      .map(item => ({
        value: item.item_name,
        label: `${item.item_name} - ${item.price ? `$${item.price}` : '無價格'}`
      }));
  };

  useEffect(() => {
    if (current) {
      // When it accesses the /payment/ endpoint,
      // it receives an invoice.item instead of just item
      // and breaks the code, but now we can check if items exists,
      // and if it doesn't we can access invoice.items.

      const { items, invoice } = current;

      if (invoice) {
        const item = invoice[field.fieldKey];

        if (item) {
          setQuantity(item.quantity);
          setPrice(item.price);
        }
      } else {
        const item = items[field.fieldKey];

        if (item) {
          setQuantity(item.quantity);
          setPrice(item.price);
        }
      }
    }
  }, [current]);

  useEffect(() => {
    const currentTotal = calculate.multiply(price, quantity);
    setTotal(currentTotal);
  }, [price, quantity]);

  return (
    <Row gutter={[12, 12]} style={{ position: 'relative' }}>
      <Col className="gutter-row" span={5}>
        <Form.Item
          name={[field.name, 'itemName']}
          rules={[
            {
              required: true,
              message: 'Missing itemName name',
            },
            {
              pattern: /^(?!\s*$)[\s\S]+$/, // Regular expression to allow spaces, alphanumeric, and special characters, but not just spaces
              message: 'Item Name must contain alphanumeric or special characters',
            },
          ]}
        >
          <AutoComplete
            placeholder="輸入項目名稱搜索..."
            onSearch={handleSearch}
            onSelect={handleItemSelect}
            loading={loading}
            showSearch
            filterOption={false}
            options={handleSearch('')}
            style={{ width: '100%' }}
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={7}>
        <Form.Item name={[field.name, 'description']}>
          <Input placeholder="description Name" />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={3}>
        <Form.Item name={[field.name, 'quantity']} rules={[{ required: true }]}>
          <InputNumber 
            style={{ width: '100%' }} 
            min={0} 
            onChange={updateQt}
            value={quantity}
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={4}>
        <Form.Item name={[field.name, 'price']} rules={[{ required: true }]}>
          <InputNumber
            className="moneyInput"
            onChange={updatePrice}
            min={0}
            controls={false}
            value={price}
            addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
            addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
          />
        </Form.Item>
      </Col>
      <Col className="gutter-row" span={5}>
        <Form.Item name={[field.name, 'total']}>
          <Form.Item>
            <InputNumber
              readOnly
              className="moneyInput"
              value={totalState}
              min={0}
              controls={false}
              addonAfter={money.currency_position === 'after' ? money.currency_symbol : undefined}
              addonBefore={money.currency_position === 'before' ? money.currency_symbol : undefined}
              formatter={(value) =>
                money.amountFormatter({ amount: value, currency_code: money.currency_code })
              }
            />
          </Form.Item>
        </Form.Item>
      </Col>

      <div style={{ position: 'absolute', right: '-20px', top: ' 5px' }}>
        <DeleteOutlined onClick={() => remove(field.name)} />
      </div>
    </Row>
  );
}
