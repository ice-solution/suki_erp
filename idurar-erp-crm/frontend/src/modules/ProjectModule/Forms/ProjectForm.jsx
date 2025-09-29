import { useState, useEffect } from 'react';
import dayjs from 'dayjs';
import { Form, Input, InputNumber, Button, Select, Divider, Row, Col, DatePicker, Card, Typography, AutoComplete, Modal, message } from 'antd';
import { PlusOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';

import { useDate, useMoney } from '@/settings';
import useLanguage from '@/locale/useLanguage';
import calculate from '@/utils/calculate';
import { request } from '@/request';

const { Title, Text } = Typography;

export default function ProjectForm({ current = null }) {
  const translate = useLanguage();
  const { dateFormat } = useDate();
  const { moneyFormatter } = useMoney();

  const form = Form.useFormInstance(); // 使用父組件的form實例
  const [poNumber, setPoNumber] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [poOptions, setPoOptions] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [contractors, setContractors] = useState([]);
  const [contractorsLoading, setContractorsLoading] = useState(false);
  const [poNumberChangeWarning, setPoNumberChangeWarning] = useState(null);
  const [originalPoNumber, setOriginalPoNumber] = useState('');

  // 檢查 P.O Number 變更
  const checkPoNumberChange = async (newPoNumber) => {
    if (!current || !newPoNumber || newPoNumber === originalPoNumber) {
      setPoNumberChangeWarning(null);
      return;
    }

    try {
      const response = await request.get({ 
        entity: `project/check-po-change?projectId=${current._id}&newPoNumber=${newPoNumber}` 
      });
      
      if (response.success && response.poNumberChanged) {
        setPoNumberChangeWarning(response);
      } else {
        setPoNumberChangeWarning(null);
      }
    } catch (error) {
      console.error('Error checking P.O Number change:', error);
    }
  };

  // 搜索P.O Numbers
  const searchPoNumbers = async (searchText) => {
    if (!searchText || searchText.length < 1) {
      setPoOptions([]);
      return;
    }

    setSearchLoading(true);
    try {
      // 從Quote和SupplierQuote中搜索P.O numbers
      const [quoteResponse, supplierQuoteResponse] = await Promise.all([
        request.search({ 
          entity: 'quote', 
          options: { q: searchText, fields: 'poNumber' } 
        }),
        request.search({ 
          entity: 'supplierquote', 
          options: { q: searchText, fields: 'poNumber' } 
        })
      ]);

      const poNumbers = new Set();
      
      // 從quotations收集P.O numbers
      if (quoteResponse?.result) {
        quoteResponse.result.forEach(quote => {
          if (quote.poNumber) {
            poNumbers.add(quote.poNumber);
          }
        });
      }

      // 從supplier quotations收集P.O numbers
      if (supplierQuoteResponse?.result) {
        supplierQuoteResponse.result.forEach(supplierQuote => {
          if (supplierQuote.poNumber) {
            poNumbers.add(supplierQuote.poNumber);
          }
        });
      }

      // 轉換為AutoComplete選項格式
      const options = Array.from(poNumbers).map(poNum => ({
        value: poNum,
        label: poNum,
      }));

      setPoOptions(options);
    } catch (error) {
      console.error('搜索P.O Number失敗:', error);
      setPoOptions([]);
    } finally {
      setSearchLoading(false);
    }
  };

  // 預覽P.O Number相關的quotations
  const previewPoNumber = async (poNum) => {
    if (!poNum) {
      setPreviewData(null);
      return;
    }

    setLoading(true);
    try {
      // 查找相關的quotations和supplier quotations
      const [quotations, supplierQuotations, invoices] = await Promise.all([
        request.search({ 
          entity: 'quote', 
          options: { q: poNum, fields: 'poNumber' } 
        }),
        request.search({ 
          entity: 'supplierquote', 
          options: { q: poNum, fields: 'poNumber' } 
        }),
        request.search({ 
          entity: 'invoice', 
          options: { q: poNum, fields: 'poNumber' } 
        })
      ]);

      // 計算總額
      let totalCost = 0;
      let totalSupplierCost = 0;
      const suppliers = new Set();

      if (quotations?.result) {
        quotations.result.forEach(quote => {
          if (quote.poNumber === poNum && quote.total) {
            totalCost = calculate.add(totalCost, quote.total);
          }
          // 收集供應商
          if (quote.clients) {
            quote.clients.forEach(client => {
              if (client.name) suppliers.add(client.name);
            });
          }
        });
      }

      if (supplierQuotations?.result) {
        supplierQuotations.result.forEach(sq => {
          if (sq.poNumber === poNum && sq.total) {
            totalSupplierCost = calculate.add(totalSupplierCost, sq.total);
          }
          // 收集供應商
          if (sq.clients) {
            sq.clients.forEach(client => {
              if (client.name) suppliers.add(client.name);
            });
          }
        });
      }

      const estimatedProfit = calculate.sub(totalCost, totalSupplierCost);

      const previewData = {
        quotations: quotations?.result?.filter(q => q.poNumber === poNum) || [],
        supplierQuotations: supplierQuotations?.result?.filter(sq => sq.poNumber === poNum) || [],
        invoices: invoices?.result?.filter(i => i.poNumber === poNum) || [],
        totalCost,
        totalSupplierCost,
        estimatedProfit,
        suppliers: Array.from(suppliers)
      };
      
      setPreviewData(previewData);
    } catch (error) {
      console.error('預覽失敗:', error);
      setPreviewData(null);
    } finally {
      setLoading(false);
    }
  };


  // 獲取承包商列表
  const fetchContractors = async () => {
    try {
      setContractorsLoading(true);
      console.log('🔍 Project: 開始獲取承包商列表...');
      const response = await request.listAll({ entity: 'contractor' });
      console.log('📋 Project: 承包商API響應:', response);
      
      const contractorData = response?.result;
      if (Array.isArray(contractorData)) {
        const contractorOptions = contractorData.map(contractor => ({
          value: contractor._id,
          label: contractor.name,
        }));
        console.log('✅ Project: 承包商選項:', contractorOptions);
        setContractors(contractorOptions);
      } else {
        console.warn('⚠️ Project: 承包商數據不是數組格式:', contractorData);
        setContractors([]);
      }
    } catch (error) {
      console.error('❌ Project: 獲取承包商列表失敗:', error);
      setContractors([]);
    } finally {
      setContractorsLoading(false);
    }
  };

  // 計算毛利
  const calculateGrossProfit = (costPrice, sPrice, contractorFee) => {
    const profit = calculate.sub(calculate.sub(costPrice, sPrice), contractorFee || 0);
    return Number.parseFloat(profit);
  };


  useEffect(() => {
    // 載入承包商列表
    fetchContractors();
  }, []);

  // 處理現有項目的承包商數據，確保選項正確顯示
  useEffect(() => {
    if (current && current.contractors && Array.isArray(current.contractors)) {
      console.log('🔧 Project: 處理現有承包商數據:', current.contractors);
      // 添加現有承包商到選項列表中（如果還沒有的話）
      const contractorsToAdd = [];
      
      current.contractors.forEach(contractor => {
        if (contractor && contractor._id && contractor.name) {
          contractorsToAdd.push({
            value: contractor._id,
            label: contractor.name
          });
        }
      });
      
      console.log('📝 Project: 需要添加的承包商:', contractorsToAdd);
      
      // 如果有需要添加的承包商選項，合併到現有選項中
      if (contractorsToAdd.length > 0) {
        setContractors(prevContractors => {
          const existingIds = prevContractors.map(c => c.value);
          const newContractors = contractorsToAdd.filter(c => !existingIds.includes(c.value));
          console.log('🔄 Project: 合併後的承包商選項:', [...prevContractors, ...newContractors]);
          return [...prevContractors, ...newContractors];
        });
      }
    }
  }, [current]);

  // 延遲設置表單值，確保contractors選項已經載入
  useEffect(() => {
    if (current && contractors.length > 0) {
      console.log('💾 Project: 設置表單值，contractors選項數量:', contractors.length);
      console.log('📄 Project: 當前項目數據:', current);
      
      const timer = setTimeout(() => {
        // 處理contractors字段 - 需要轉換為ID數組
        let contractorIds = [];
        if (current.contractors && Array.isArray(current.contractors)) {
          contractorIds = current.contractors.map(contractor => contractor._id || contractor);
        }
        
        const formData = {
          ...current,
          contractors: contractorIds,  // 確保使用ID數組
          startDate: current.startDate ? dayjs(current.startDate) : null,
          endDate: current.endDate ? dayjs(current.endDate) : null,
        };
        
        console.log('📝 Project: 設置的表單數據:', formData);
        console.log('👥 Project: Contractors IDs:', contractorIds);
        console.log('🏷️ Project: 當前承包商選項:', contractors);
        
        // 檢查ID是否在選項中存在
        contractorIds.forEach(id => {
          const found = contractors.find(opt => opt.value === id);
          console.log(`🔍 Project: ID ${id} 在選項中${found ? '存在' : '不存在'}:`, found);
        });
        
        form.setFieldsValue(formData);
        setPoNumber(current.poNumber || '');
        setOriginalPoNumber(current.poNumber || '');
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [current, form, contractors]);

  // P.O Number 變更警告模態框
  const showPoNumberChangeWarning = () => {
    if (!poNumberChangeWarning) return null;

    const { affectedRecords } = poNumberChangeWarning;
    const totalAffected = affectedRecords.quotes.count + affectedRecords.supplierQuotes.count + affectedRecords.invoices.count;

    return (
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ExclamationCircleOutlined style={{ color: '#faad14' }} />
            <span>P.O Number 變更警告</span>
          </div>
        }
        open={!!poNumberChangeWarning}
        onCancel={() => setPoNumberChangeWarning(null)}
        footer={[
          <Button key="cancel" onClick={() => setPoNumberChangeWarning(null)}>
            取消
          </Button>,
          <Button 
            key="confirm" 
            type="primary" 
            danger
            onClick={() => {
              setPoNumberChangeWarning(null);
              // 這裡可以觸發表單提交
            }}
          >
            確認變更並同步相關記錄
          </Button>
        ]}
        width={600}
      >
        <div style={{ marginBottom: '16px' }}>
          <p>
            <strong>您正在將 P.O Number 從 "{poNumberChangeWarning.oldPoNumber}" 更改為 "{poNumberChangeWarning.newPoNumber}"</strong>
          </p>
          <p style={{ color: '#666' }}>
            此變更將自動同步更新以下相關記錄：
          </p>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <h4>受影響的記錄 ({totalAffected} 項)：</h4>
          
          {affectedRecords.quotes.count > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong>報價單 ({affectedRecords.quotes.count} 項)：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {affectedRecords.quotes.records.map((quote, index) => (
                  <li key={index}>
                    {quote.number} - {quote.status} ({dayjs(quote.date).format('YYYY-MM-DD')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {affectedRecords.supplierQuotes.count > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong>供應商報價 ({affectedRecords.supplierQuotes.count} 項)：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {affectedRecords.supplierQuotes.records.map((sq, index) => (
                  <li key={index}>
                    {sq.number} - {sq.status} ({dayjs(sq.date).format('YYYY-MM-DD')})
                  </li>
                ))}
              </ul>
            </div>
          )}

          {affectedRecords.invoices.count > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <strong>發票 ({affectedRecords.invoices.count} 項)：</strong>
              <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                {affectedRecords.invoices.records.map((invoice, index) => (
                  <li key={index}>
                    {invoice.number} - {invoice.status} ({dayjs(invoice.date).format('YYYY-MM-DD')})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fff7e6', 
          border: '1px solid #ffd591',
          borderRadius: '6px'
        }}>
          <p style={{ margin: 0, color: '#d46b08' }}>
            ⚠️ 請確認您要繼續此操作。所有相關記錄的 P.O Number 將被自動更新。
          </p>
        </div>
      </Modal>
    );
  };

  return (
    <>
      {showPoNumberChangeWarning()}
      <Row gutter={[16, 16]}>
        <Col span={12}>
          <Card title="項目基本信息" size="small">
            <Row gutter={[12, 0]}>
              <Col span={24}>
                <Form.Item
                  label={translate('P.O Number')}
                  name="poNumber"
                  rules={[{ required: true, message: 'P.O Number is required' }]}
                >
                  <AutoComplete
                    placeholder="輸入或搜索P.O Number"
                    value={poNumber}
                    options={poOptions}
                    onSearch={searchPoNumbers}
                    onSelect={(value) => {
                      setPoNumber(value);
                      previewPoNumber(value);
                      form.setFieldsValue({ poNumber: value });
                    }}
                    onChange={(value) => {
                      setPoNumber(value);
                      if (!value) {
                        setPreviewData(null);
                        setPoNumberChangeWarning(null);
                      } else {
                        // 檢查 P.O Number 變更
                        checkPoNumberChange(value);
                      }
                    }}
                    style={{ width: '100%' }}
                    filterOption={false}
                    notFoundContent={searchLoading ? "搜索中..." : "無匹配的P.O Number"}
                  />
                </Form.Item>
              </Col>
              
              <Col span={12}>
                <Form.Item
                  label={translate('Cost By')}
                  name="costBy"
                  rules={[{ required: true }]}
                  initialValue="對方"
                >
                  <Select
                    options={[
                      { value: '對方', label: '對方' },
                      { value: '我方', label: '我方' },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('Status')}
                  name="status"
                  initialValue="draft"
                >
                  <Select
                    options={[
                      { value: 'draft', label: translate('Draft') },
                      { value: 'pending', label: translate('Pending') },
                      { value: 'in_progress', label: translate('In Progress') },
                      { value: 'completed', label: translate('Completed') },
                      { value: 'cancelled', label: translate('Cancelled') },
                      { value: 'on hold', label: translate('On Hold') },
                    ]}
                  />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('Start Date')}
                  name="startDate"
                >
                  <DatePicker style={{ width: '100%' }} format={dateFormat} />
                </Form.Item>
              </Col>

              <Col span={12}>
                <Form.Item
                  label={translate('End Date')}
                  name="endDate"
                >
                  <DatePicker style={{ width: '100%' }} format={dateFormat} />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label={translate('Description')}
                  name="description"
                >
                  <Input.TextArea rows={3} placeholder="項目描述" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label={translate('Address')}
                  name="address"
                >
                  <Input placeholder="項目地址" />
                </Form.Item>
              </Col>

              <Col span={24}>
                <Form.Item
                  label={translate('Contractors')}
                  name="contractors"
                  rules={[{ required: false }]}
                >
                  <Select
                    mode="multiple"
                    placeholder="選擇承包商"
                    showSearch
                    filterOption={(input, option) =>
                      option?.label?.toLowerCase().indexOf(input.toLowerCase()) >= 0
                    }
                    options={contractors}
                    loading={contractorsLoading}
                    style={{ width: '100%' }}
                    notFoundContent="無承包商資料"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>
        </Col>

        <Col span={12}>
          <Card title="財務信息" size="small">
            <Row gutter={[12, 0]}>
              <Col span={24}>
                <Form.Item
                  label="判頭費"
                  name="contractorFee"
                  initialValue={0}
                >
                  <InputNumber
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    addonBefore="$"
                    placeholder="0.00"
                  />
                </Form.Item>
              </Col>

              {previewData && (
                <>
                  <Col span={24}>
                    <Divider>預覽數據</Divider>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>Quotations: </Text>
                    <Text>{previewData.quotations.length}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>Supplier Quotations: </Text>
                    <Text>{previewData.supplierQuotations.length}</Text>
                  </Col>
                  
                  <Col span={8}>
                    <Text strong>Invoices: </Text>
                    <Text>{previewData.invoices.length}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>成本價: </Text>
                    <Text>{moneyFormatter({ amount: previewData.totalCost })}</Text>
                  </Col>
                  
                  <Col span={12}>
                    <Text strong>S_price: </Text>
                    <Text>{moneyFormatter({ amount: previewData.totalSupplierCost })}</Text>
                  </Col>
                  
                  <Col span={24}>
                    <Text strong>預計毛利: </Text>
                    <span style={{ color: previewData.estimatedProfit >= 0 ? '#52c41a' : '#ff4d4f' }}>
                      {moneyFormatter({ amount: previewData.estimatedProfit || 0 })}
                    </span>
                  </Col>
                  
                  {previewData.suppliers.length > 0 && (
                    <Col span={24}>
                      <Text strong>相關供應商: </Text>
                      <Text>{previewData.suppliers.join(', ')}</Text>
                    </Col>
                  )}
                </>
              )}
            </Row>
          </Card>
        </Col>
      </Row>

      <Row style={{ marginTop: 16 }}>
        <Col span={24}>
          <Form.Item>
            <Button type="primary" htmlType="submit" icon={<PlusOutlined />} block>
              {current ? translate('Update Project') : translate('Create Project')}
            </Button>
          </Form.Item>
        </Col>
      </Row>
    </>
  );
}
