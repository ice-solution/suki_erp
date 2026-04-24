import { useState, useEffect } from 'react';
import { Divider } from 'antd';
import dayjs from 'dayjs';

import { Button, Row, Col, Descriptions, Statistic, Tag, Modal, message, Select, Table } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  MailOutlined,
  ArrowUpOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { generate as uniqueId } from 'shortid';

import { selectCurrentItem } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL, API_BASE_URL } from '@/config/serverApiConfig';
import { useMoney, useDate } from '@/settings';
import useMail from '@/hooks/useMail';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '@/request';
import { multilineStyle, renderMultilineText } from '@/utils/renderMultilineText';
import axios from 'axios';
import storePersist from '@/redux/storePersist';
import { DEFAULT_SHIP_RENTAL_EXTRA_ITEMS } from '@/modules/ShipQuoteModule/Forms/ShipQuoteTableForm';

// 表格欄位順序：項目, Description, 數量, 單價, 總計
const Item = ({ item, currentErp }) => {
  const { moneyFormatter } = useMoney();
  return (
    <Row gutter={[12, 0]} key={item._id}>
      <Col className="gutter-row" span={5}>
        <p style={{ marginBottom: 0 }}>{item.itemName || '-'}</p>
      </Col>
      <Col className="gutter-row" span={8}>
        <p style={{ marginBottom: 0, ...multilineStyle }}>{item.description || '-'}</p>
      </Col>
      <Col className="gutter-row" span={3}>
        <p style={{ textAlign: 'right', marginBottom: 0 }}>{item.quantity ?? '-'}</p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p style={{ textAlign: 'right', marginBottom: 0 }}>
          {item.price != null ? moneyFormatter({ amount: item.price, currency_code: currentErp.currency }) : '-'}
        </p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p style={{ textAlign: 'right', fontWeight: '700', marginBottom: 0 }}>
          {item.total != null ? moneyFormatter({ amount: item.total, currency_code: currentErp.currency }) : '-'}
        </p>
      </Col>
      <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
    </Row>
  );
};

export default function ShipQuoteReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = location.state?.fromProject;

  const { moneyFormatter } = useMoney();
  const { send, isLoading: mailInProgress } = useMail({ entity });

  const { result: currentResult } = useSelector(selectCurrentItem);

  const resetErp = {
    status: '',
    client: {
      name: '',
      email: '',
      phone: '',
      address: '',
    },
    subTotal: 0,
    discountTotal: 0,
    discount: 0,
    total: 0,
    credit: 0,
    number: 0,
    year: 0,
  };

  const [itemslist, setItemsList] = useState([]);
  const [currentErp, setCurrentErp] = useState(selectedItem ?? resetErp);
  const [client, setClient] = useState({});
  const [convertLoading, setConvertLoading] = useState(false);
  const [convertToSupplierQuoteLoading, setConvertToSupplierQuoteLoading] = useState(false);
  const [convertShipQuoteToSLoading, setConvertShipQuoteToSLoading] = useState(false);
  const [poNumberModalVisible, setPoNumberModalVisible] = useState(false);
  const [selectedPoNumber, setSelectedPoNumber] = useState(null);
  const [availablePoNumbers, setAvailablePoNumbers] = useState([]);

  useEffect(() => {
    const controller = new AbortController();
    if (currentResult) {
      const { invoice, _id, ...others } = currentResult;
      setCurrentErp({ ...others, ...invoice, _id });
    }
    return () => controller.abort();
  }, [currentResult]);

  useEffect(() => {
    if (currentErp?.clients && currentErp.clients.length > 0) {
      // 設置第一個客戶作為主要客戶，用於顯示聯絡信息
      setClient(currentErp.clients[0]);
    } else if (currentErp?.client) {
      // 向後兼容，如果還有舊的client字段
      setClient(currentErp.client);
    }
  }, [currentErp]);

  useEffect(() => {
    if (currentErp?.items) {
      setItemsList(currentErp.items);
    }
  }, [currentErp]);

  // 處理Quote轉Invoice
  const handleConvertToInvoice = () => {
    // 檢查是否已經轉換
    if (currentErp.converted && currentErp.converted.to === 'invoice') {
      message.warning('此Quote已經轉換成Invoice');
      return;
    }

    Modal.confirm({
      title: '確認轉換',
      content: (
        <div>
          <p>您確定要將此Quote轉換成Invoice嗎？</p>
          <p><strong>Quote編號：</strong>{`${currentErp.numberPrefix || 'SML'}-${currentErp.number}`}</p>
          <p><strong>總金額：</strong>{moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}</p>
          <p style={{ color: '#ff4d4f', marginTop: 12 }}>⚠️ 轉換後將創建新的Invoice，此操作不可撤銷</p>
        </div>
      ),
      okText: '確認轉換',
      cancelText: '取消',
      okType: 'primary',
      onOk: async () => {
        setConvertLoading(true);
        try {
          const response = await request.convert({ entity: 'quote', id: currentErp._id });
          if (response && response.success) {
            message.success('Quote成功轉換成Invoice！');
            // 跳轉到新創建的Invoice
            navigate(`/invoice/read/${response.result._id}`);
          } else {
            message.error('轉換失敗：' + (response?.message || '未知錯誤'));
          }
        } catch (error) {
          console.error('轉換錯誤:', error);
          message.error('轉換過程中發生錯誤');
        } finally {
          setConvertLoading(false);
        }
      },
    });
  };

  // 處理Quote轉Supplier Quote（上單）
  const handleConvertToSupplierQuote = () => {
    // 檢查是否已經轉換（檢查 converted.supplierQuote 是否存在）
    if (currentErp.converted && currentErp.converted.supplierQuote) {
      message.warning('此Quote已經轉換成Supplier Quote');
      return;
    }

    // 提取所有唯一的 P.O numbers
    const poNumbers = [];
    if (currentErp.items && currentErp.items.length > 0) {
      currentErp.items.forEach(item => {
        if (item.poNumber && !poNumbers.includes(item.poNumber)) {
          poNumbers.push(item.poNumber);
        }
      });
    }

    if (poNumbers.length === 0) {
      message.warning('此Quote沒有包含任何 P.O number 的 items');
      return;
    }

    // 顯示 P.O number 選擇 Modal
    setAvailablePoNumbers(poNumbers);
    setSelectedPoNumber(null);
    setPoNumberModalVisible(true);
  };

  // Ship Quote 轉 S單（整單轉換，無需選 P.O，可重覆上單）
  const handleConvertShipQuoteToS = async () => {
    // 與 Quote 上單一致：須先在 Project Management 建立對應 SML 編號
    const quoteNumber =
      currentErp.numberPrefix && currentErp.number
        ? `${currentErp.numberPrefix}-${currentErp.number}`
        : currentErp.invoiceNumber;
    if (!quoteNumber) {
      message.warning('無法取得 Quote 編號');
      return;
    }
    try {
      const checkResult = await request.checkProject({ invoiceNumber: quoteNumber });
      if (!checkResult?.success || !checkResult?.result) {
        message.error('請先在 Project Management 建立此 Quote Number 的項目，方可上單');
        return;
      }
    } catch {
      message.error('請先在 Project Management 建立此 Quote Number 的項目，方可上單');
      return;
    }

    Modal.confirm({
      title: '確認轉換到 S單',
      content: (
        <div>
          <p>您確定要將此 Ship Quote 轉換成 S單（Supplier Quote）嗎？</p>
          <p><strong>編號：</strong>{`${currentErp.numberPrefix || ''}-${currentErp.number}/${currentErp.year || ''}`}</p>
          <p><strong>總金額：</strong>{moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}</p>
          <p style={{ color: '#ff4d4f', marginTop: 12 }}>轉換後將建立新的 S單，此操作不可撤銷</p>
        </div>
      ),
      okText: '確認轉換',
      cancelText: '取消',
      okType: 'primary',
      onOk: async () => {
        setConvertShipQuoteToSLoading(true);
        try {
          axios.defaults.baseURL = API_BASE_URL;
          axios.defaults.withCredentials = true;
          const auth = storePersist.get('auth');
          if (auth) {
            axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
          }
          const response = await axios.get(`shipquote/convertToSupplierQuote/${currentErp._id}`);
          if (response?.data?.success) {
            message.success('Ship Quote 已成功轉換成 S單！');
            navigate(`/supplierquote/read/${response.data.result._id}`);
          } else {
            message.error('轉換失敗：' + (response?.data?.message || '未知錯誤'));
          }
        } catch (error) {
          console.error('轉換錯誤:', error);
          message.error('轉換過程中發生錯誤：' + (error.response?.data?.message || error.message));
        } finally {
          setConvertShipQuoteToSLoading(false);
        }
      },
    });
  };

  // 執行轉換
  const executeConvertToSupplierQuote = async () => {
    if (!selectedPoNumber) {
      message.warning('請選擇 P.O number');
      return;
    }

    setPoNumberModalVisible(false);
    setConvertToSupplierQuoteLoading(true);
    try {
      // 設置 axios 配置
      axios.defaults.baseURL = API_BASE_URL;
      axios.defaults.withCredentials = true;
      const auth = storePersist.get('auth');
      if (auth) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
      }
      
      const response = await axios.get(`quote/convertToSupplierQuote/${currentErp._id}?poNumber=${encodeURIComponent(selectedPoNumber)}`);
      if (response && response.data && response.data.success) {
        message.success('Quote成功轉換成Supplier Quote！');
        // 跳轉到新創建的Supplier Quote
        navigate(`/supplierquote/read/${response.data.result._id}`);
      } else {
        message.error('轉換失敗：' + (response?.data?.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('轉換錯誤:', error);
      message.error('轉換過程中發生錯誤：' + (error.response?.data?.message || error.message));
    } finally {
      setConvertToSupplierQuoteLoading(false);
    }
  };

  return (
    <>
      <PageHeader
        onBack={() => {
          if (fromProject) {
            navigate(-1);
          } else {
            navigate(`/${entity.toLowerCase()}`);
          }
        }}
        title={`${ENTITY_NAME} # ${currentErp.number}/${currentErp.year || ''}`}
        ghost={false}
        tags={[
          <Tag key="status" color={currentErp.status === 'draft' ? 'blue' : 'green'}>
            {currentErp.status && translate(currentErp.status)}
          </Tag>,
        ]}
        extra={[
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              if (fromProject) {
                navigate(-1);
              } else {
                navigate(`/${entity.toLowerCase()}`);
              }
            }}
            icon={<CloseCircleOutlined />}
          >
            {translate('Close')}
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              window.open(
                `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp._id}.pdf`,
                '_blank'
              );
            }}
            icon={<FilePdfOutlined />}
          >
            {translate('Download PDF')}
          </Button>,
          <Button
            key={`${uniqueId()}`}
            loading={mailInProgress}
            onClick={() => {
              send(currentErp._id);
            }}
            icon={<MailOutlined />}
          >
            {translate('Send by Email')}
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={handleConvertToSupplierQuote}
            loading={convertToSupplierQuoteLoading}
            icon={<ArrowUpOutlined />}
            style={{ 
              display: entity === 'quote' ? 'inline-block' : 'none',
              backgroundColor: currentErp.converted && currentErp.converted.supplierQuote ? '#52c41a' : undefined,
              borderColor: currentErp.converted && currentErp.converted.supplierQuote ? '#52c41a' : undefined,
              color: currentErp.converted && currentErp.converted.supplierQuote ? '#fff' : undefined,
            }}
            disabled={currentErp.converted && currentErp.converted.supplierQuote}
          >
            {currentErp.converted && currentErp.converted.supplierQuote 
              ? '已上單' 
              : '上單'
            }
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={handleConvertShipQuoteToS}
            loading={convertShipQuoteToSLoading}
            icon={<ArrowUpOutlined />}
            style={{ 
              display: entity === 'shipquote' ? 'inline-block' : 'none',
              backgroundColor: currentErp.converted && currentErp.converted.supplierQuote ? '#52c41a' : undefined,
              borderColor: currentErp.converted && currentErp.converted.supplierQuote ? '#52c41a' : undefined,
              color: currentErp.converted && currentErp.converted.supplierQuote ? '#fff' : undefined,
            }}
          >
            {currentErp.converted && currentErp.converted.supplierQuote ? '已轉S單 / 重覆上單' : '轉換到S單'}
          </Button>,
          <Button
            key={`${uniqueId()}`}
            onClick={handleConvertToInvoice}
            loading={convertLoading}
            icon={<RetweetOutlined />}
            style={{ 
              display: entity === 'quote' ? 'inline-block' : 'none',
              backgroundColor: currentErp.converted && currentErp.converted.to === 'invoice' ? '#52c41a' : undefined,
              borderColor: currentErp.converted && currentErp.converted.to === 'invoice' ? '#52c41a' : undefined,
              color: currentErp.converted && currentErp.converted.to === 'invoice' ? '#fff' : undefined,
            }}
            disabled={currentErp.converted && currentErp.converted.to === 'invoice'}
          >
            {currentErp.converted && currentErp.converted.to === 'invoice' 
              ? '已轉換成Invoice' 
              : translate('Convert to Invoice')
            }
          </Button>,

          <Button
            key={`${uniqueId()}`}
            onClick={() => {
              dispatch(
                erp.currentAction({
                  actionType: 'update',
                  data: currentErp,
                })
              );
              // 修改這裡：使用table form的編輯URL
              navigate(`/${entity.toLowerCase()}/table/update/${currentErp._id}`);
            }}
            type="primary"
            icon={<EditOutlined />}
          >
            {translate('Edit')}
          </Button>,
        ]}
        style={{
          padding: '20px 0px',
        }}
      >
        <Row>
          <Statistic title="Status" value={currentErp.status} />
          <Statistic
            title={translate('SubTotal')}
            value={moneyFormatter({
              amount: currentErp.subTotal,
              currency_code: currentErp.currency,
            })}
            style={{
              margin: '0 32px',
            }}
          />
          <Statistic
            title={translate('Total')}
            value={moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            style={{
              margin: '0 32px',
            }}
          />
          <Statistic
            title={translate('Paid')}
            value={moneyFormatter({
              amount: currentErp.credit,
              currency_code: currentErp.currency,
            })}
            style={{
              margin: '0 32px',
            }}
          />
        </Row>
      </PageHeader>
      <Divider dashed />
      <Descriptions title={translate('Clients Information')}>
        <Descriptions.Item label={translate('Clients')} span={3}>
          {currentErp.clients && currentErp.clients.length > 0 ? (
            <div>
              {currentErp.clients.map((client, index) => (
                <Tag key={client._id || index} style={{ marginBottom: 4, marginRight: 4 }}>
                  {client.name}
                </Tag>
              ))}
            </div>
          ) : (
            currentErp.client?.name || '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={translate('suppliers')}>{currentErp.supplier?.name || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Address')}>{client.address}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Email')}>{client.email}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Phone')}>{client.phone}</Descriptions.Item>
      </Descriptions>
      
      <Descriptions title={translate('Quote Details')}>
        <Descriptions.Item label="Quote Type">{currentErp.numberPrefix}</Descriptions.Item>
        <Descriptions.Item label={translate('Number')}>{currentErp.number}</Descriptions.Item>
        <Descriptions.Item label={translate('Year')}>{currentErp.year}</Descriptions.Item>
        <Descriptions.Item label={translate('Type')}>{currentErp.type}</Descriptions.Item>
        {currentErp.type === '吊船' && currentErp.shipType && (
          <Descriptions.Item label={translate('Ship Type')}>{currentErp.shipType}</Descriptions.Item>
        )}
        <Descriptions.Item label="Quote Number">{currentErp.invoiceNumber}</Descriptions.Item>
        <Descriptions.Item label={translate('Contact Person')}>{currentErp.contactPerson || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Subcontractor Count')}>{currentErp.subcontractorCount || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Cost Price')}>{currentErp.costPrice ? `$${currentErp.costPrice}` : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Completed')}>{currentErp.isCompleted ? translate('Yes') : translate('No')}</Descriptions.Item>
        <Descriptions.Item label="修改時間">{currentErp.modified_at ? dayjs(currentErp.modified_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
        <Descriptions.Item label="修改人">{currentErp.updatedBy ? (currentErp.updatedBy.name + (currentErp.updatedBy.surname ? ' ' + currentErp.updatedBy.surname : '') || currentErp.updatedBy.email || '-') : '-'}</Descriptions.Item>
      </Descriptions>
      
      <Row gutter={[12, 0]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col span={12}>
          <p><strong>{translate('Project Address')}:</strong></p>
          <p>{currentErp.address || '-'}</p>
        </Col>
      </Row>

      {currentErp.shipType === '租賃' && (
        <>
          <Divider orientation="left">租賃附加項目（PDF「附加項目」）</Divider>
          <Table
            size="small"
            pagination={false}
            rowKey={(_, i) => `rental-extra-${i}`}
            style={{ marginBottom: 16 }}
            columns={[
              {
                title: '摘要',
                dataIndex: 'description',
                ellipsis: false,
                render: (t) => (t ? renderMultilineText(t) : '-'),
              },
              {
                title: '單價 HKD',
                dataIndex: 'unitPrice',
                width: 160,
                align: 'right',
                render: (v, row) =>
                  v != null && v !== '' && !Number.isNaN(Number(v))
                    ? moneyFormatter({ amount: Number(v), currency_code: currentErp.currency })
                    : '-',
              },
            ]}
            dataSource={
              currentErp.rentalExtraItems && currentErp.rentalExtraItems.length > 0
                ? currentErp.rentalExtraItems
                : DEFAULT_SHIP_RENTAL_EXTRA_ITEMS
            }
          />
          {(!currentErp.rentalExtraItems || currentErp.rentalExtraItems.length === 0) && (
            <p style={{ color: '#888', fontSize: 12, marginTop: -8, marginBottom: 16 }}>
              （尚未儲存自訂列時，PDF 使用與系統預設相同之附加項目表）
            </p>
          )}
        </>
      )}

      <Divider />
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={5}>
          <p><strong>項目</strong></p>
        </Col>
        <Col className="gutter-row" span={8}>
          <p><strong>Description</strong></p>
        </Col>
        <Col className="gutter-row" span={3}>
          <p style={{ textAlign: 'right' }}><strong>數量</strong></p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p style={{ textAlign: 'right' }}><strong>單價</strong></p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p style={{ textAlign: 'right' }}><strong>總計</strong></p>
        </Col>
      </Row>
      {itemslist.map((item) => (
        <Item key={item._id} item={item} currentErp={currentErp} />
      ))}
      <div
        style={{
          width: '300px',
          float: 'right',
          textAlign: 'right',
          fontWeight: '700',
        }}
      >
        <Row gutter={[12, -5]}>
          <Col className="gutter-row" span={12}>
            <p>{translate('Sub Total')} :</p>
          </Col>

          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.subTotal, currency_code: currentErp.currency })}
            </p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {translate('Discount')} ({Math.round(currentErp.discount || 0)} %) :
            </p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.discountTotal, currency_code: currentErp.currency })}
            </p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>{translate('Total')} :</p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            </p>
          </Col>
        </Row>
      </div>

      {/* P.O Number 選擇 Modal */}
      <Modal
        title="選擇 P.O Number"
        open={poNumberModalVisible}
        onOk={executeConvertToSupplierQuote}
        onCancel={() => {
          setPoNumberModalVisible(false);
          setSelectedPoNumber(null);
        }}
        okText="確認上單"
        cancelText="取消"
        okButtonProps={{ disabled: !selectedPoNumber }}
      >
        <div style={{ marginBottom: 16 }}>
          <p>請選擇要上單的 P.O Number：</p>
          <Select
            style={{ width: '100%' }}
            placeholder="選擇 P.O Number"
            value={selectedPoNumber}
            onChange={setSelectedPoNumber}
          >
            {availablePoNumbers.map(po => (
              <Select.Option key={po} value={po}>
                {po}
              </Select.Option>
            ))}
          </Select>
        </div>
        <p style={{ color: '#1890ff', fontSize: '12px' }}>
          ℹ️ 只會轉換所選 P.O Number 的 items 到 Supplier Quote
        </p>
      </Modal>
    </>
  );
}
