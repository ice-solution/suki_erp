import { useState, useEffect } from 'react';
import { Divider } from 'antd';
import dayjs from 'dayjs';

import { Button, Row, Col, Descriptions, Statistic, Tag, Input, Space } from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { generate as uniqueId } from 'shortid';

import { selectCurrentItem, selectListItems } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL } from '@/config/serverApiConfig';
import { useMoney, useDate } from '@/settings';
import { useNavigate, useLocation } from 'react-router-dom';
import { multilineStyle } from '@/utils/renderMultilineText';
import { request } from '@/request';

/** 舊條款「一／二／三個月」改以 30／60／90 日顯示（與編輯表單一致） */
function displayInvoicePaymentTerms(terms) {
  if (terms == null || terms === '') return '-';
  const t = String(terms);
  if (t === '一個月') return '30日';
  if (t === '兩個月') return '60日';
  if (t === '三個月') return '90日';
  return t;
}

const Item = ({ item, currentErp }) => {
  const { moneyFormatter } = useMoney();
  return (
    <Row gutter={[12, 0]} key={item._id}>
      <Col className="gutter-row" span={11}>
        <p style={{ marginBottom: 5 }}>
          <strong>{item.itemName}</strong>
        </p>
        <p style={multilineStyle}>{item.description}</p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p
          style={{
            textAlign: 'right',
          }}
        >
          {moneyFormatter({ amount: item.price, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Col className="gutter-row" span={4}>
        <p
          style={{
            textAlign: 'right',
          }}
        >
          {item.quantity}
        </p>
      </Col>
      <Col className="gutter-row" span={5}>
        <p
          style={{
            textAlign: 'right',
            fontWeight: '700',
          }}
        >
          {moneyFormatter({ amount: item.total, currency_code: currentErp.currency })}
        </p>
      </Col>
      <Divider dashed style={{ marginTop: 0, marginBottom: 15 }} />
    </Row>
  );
};

export default function InvoiceReadItem({ config, selectedItem }) {
  const translate = useLanguage();
  const { entity, ENTITY_NAME } = config;
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const fromProject = location.state?.fromProject;

  const { moneyFormatter } = useMoney();
  const { result: currentResult } = useSelector(selectCurrentItem);
  const { result: listResult } = useSelector(selectListItems);
  const { result: searchResult } = useSelector((state) => state.erp?.search || {});

  const resetErp = {
    status: '',
    clients: [],
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

  let storedCtx = null;
  try {
    storedCtx = JSON.parse(sessionStorage.getItem(`nav_ctx_${String(entity || '').toLowerCase()}`) || 'null');
  } catch (e) {
    storedCtx = null;
  }
  const params = new URLSearchParams(location.search || '');
  const navQ = (params.get('q') != null ? String(params.get('q')) : (storedCtx?.q || '')).trim();
  const navIsSearchMode = !!(navQ || storedCtx?.isSearchMode);
  const navIdsFromRedux = (navIsSearchMode ? (Array.isArray(searchResult) ? searchResult : []) : (Array.isArray(listResult?.items) ? listResult.items : []))
    .map((x) => x?._id)
    .filter(Boolean)
    .map((x) => String(x));
  const navIds = navIdsFromRedux.length ? navIdsFromRedux : (Array.isArray(storedCtx?.ids) ? storedCtx.ids : []);
  const navIndex = navIds.findIndex((id) => String(id) === String(currentErp?._id));
  const [neighborPrevId, setNeighborPrevId] = useState(null);
  const [neighborNextId, setNeighborNextId] = useState(null);
  const prevId = neighborPrevId != null ? neighborPrevId : (navIndex > 0 ? navIds[navIndex - 1] : null);
  const nextId =
    neighborNextId != null ? neighborNextId : (navIndex >= 0 && navIndex < navIds.length - 1 ? navIds[navIndex + 1] : null);

  useEffect(() => {
    // 直接貼 read URL 進來時，補撈 list/search 結果以計算上一頁/下一頁
    if (!currentErp?._id) return;
    if (navIdsFromRedux.length > 0) return;
    if (Array.isArray(storedCtx?.ids) && storedCtx.ids.length > 0) return;
    if (navQ) {
      dispatch(
        erp.search({
          entity,
          options: {
            q: navQ,
            fields: 'address,invoiceNumber,contactPerson',
          },
        })
      );
      return;
    }
    dispatch(erp.list({ entity, options: { page: 1, items: 500 } }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentErp?._id, navQ]);

  useEffect(() => {
    if (!currentErp?._id) return;
    (async () => {
      try {
        const data = await request.get({
          entity: `${entity}/neighbors/${currentErp._id}`,
          params: navQ ? { q: navQ } : {},
        });
        setNeighborPrevId(data?.result?.prevId ?? null);
        setNeighborNextId(data?.result?.nextId ?? null);
      } catch (e) {
        // ignore
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentErp?._id, navQ]);

  const displayNumber = currentErp?.numberPrefix && currentErp?.number
    ? `${currentErp.numberPrefix}-${currentErp.number}`
    : ((currentErp?.numberPrefix || 'SMI') && currentErp?.number != null
      ? `${currentErp.numberPrefix || 'SMI'}-${currentErp.number}`
      : '-');

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

  return (
    <>
      <div
        className="read-prevnext-search-bar"
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          marginBottom: 8,
        }}
      >
        <div style={{ minWidth: 120 }}>
          <Button
            disabled={!prevId}
            onClick={() => {
              if (!prevId) return;
              navigate(`/${entity.toLowerCase()}/read/${prevId}`, {
                state: { isSearchMode: navIsSearchMode, q: navQ },
              });
            }}
          >
            上一頁
          </Button>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <Input.Search
            allowClear
            placeholder="搜尋並返回列表"
            defaultValue={navQ}
            style={{ width: 360, maxWidth: '100%' }}
            onSearch={(value) => {
              const q = value != null ? String(value).trim() : '';
              navigate(`/${entity.toLowerCase()}${q ? `?q=${encodeURIComponent(q)}` : ''}`);
            }}
          />
        </div>
        <div style={{ minWidth: 120, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            disabled={!nextId}
            onClick={() => {
              if (!nextId) return;
              navigate(`/${entity.toLowerCase()}/read/${nextId}`, {
                state: { isSearchMode: navIsSearchMode, q: navQ },
              });
            }}
          >
            下一頁
          </Button>
        </div>
      </div>
      <PageHeader
        onBack={() => {
          if (fromProject) {
            navigate(-1);
          } else {
            navigate(`/${entity.toLowerCase()}`);
          }
        }}
        title={`發票 # ${displayNumber}`}
        ghost={false}
        tags={[
          <Tag key="status" color={currentErp.status === 'paid' ? 'green' : 'blue'}>
            {currentErp.status && translate(currentErp.status)}
          </Tag>,
          <Tag key="paymentStatus" color={currentErp.paymentStatus === 'paid' ? 'green' : 'red'}>
            {currentErp.paymentStatus && translate(currentErp.paymentStatus)}
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
              const v = encodeURIComponent(
                String(currentErp?.modified_at || currentErp?.updated || Date.now())
              );
              window.open(
                `${DOWNLOAD_BASE_URL}${entity}/${entity}-${currentErp._id}.pdf?v=${v}`,
                '_blank'
              );
            }}
            icon={<FilePdfOutlined />}
          >
            {translate('Download PDF')}
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
              // 使用table form的編輯URL
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
        <Row gutter={[24, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Status" value={currentErp.status} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic title="Payment Status" value={currentErp.paymentStatus} />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={translate('SubTotal')}
              value={moneyFormatter({
                amount: currentErp.subTotal,
                currency_code: currentErp.currency,
              })}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={translate('Total')}
              value={moneyFormatter({ amount: currentErp.total, currency_code: currentErp.currency })}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title={translate('Paid')}
              value={moneyFormatter({
                amount: currentErp.credit,
                currency_code: currentErp.currency,
              })}
            />
          </Col>
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
      
      <Descriptions title={translate('Invoice Details')}>
        <Descriptions.Item label="Invoice Type">{currentErp.numberPrefix}</Descriptions.Item>
        <Descriptions.Item label={translate('Number')}>{currentErp.number}</Descriptions.Item>
        <Descriptions.Item label="日期">{currentErp.date ? dayjs(currentErp.date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Type')}>{currentErp.type}</Descriptions.Item>
        {currentErp.type === '吊船' && currentErp.shipType && (
          <Descriptions.Item label={translate('Ship Type')}>{currentErp.shipType}</Descriptions.Item>
        )}
        <Descriptions.Item label="Quote Number">{currentErp.invoiceNumber}</Descriptions.Item>
        <Descriptions.Item label={translate('Contact Person')}>{currentErp.contactPerson}</Descriptions.Item>
        <Descriptions.Item label={translate('Subcontractor Count')}>{currentErp.subcontractorCount || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Cost Price')}>{currentErp.costPrice ? `$${currentErp.costPrice}` : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('project_percentage')}>
          {currentErp.projectPercentage != null && currentErp.projectPercentage !== ''
            ? `${currentErp.projectPercentage}%`
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={translate('Completed')}>{currentErp.isCompleted ? translate('Yes') : translate('No')}</Descriptions.Item>
        <Descriptions.Item label={translate('Payment Due Date')}>{currentErp.paymentDueDate ? dayjs(currentErp.paymentDueDate).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('paid_date')}>
          {currentErp.paidDate ? dayjs(currentErp.paidDate).format('YYYY-MM-DD') : '-'}
        </Descriptions.Item>
        <Descriptions.Item label={translate('Payment Terms')}>
          {displayInvoicePaymentTerms(currentErp.paymentTerms)}
        </Descriptions.Item>
        <Descriptions.Item label="部份付款 (Partially paid)">{currentErp.credit != null ? moneyFormatter({ amount: currentErp.credit, currency_code: currentErp.currency }) : '-'}</Descriptions.Item>
        <Descriptions.Item label="Full paid">{currentErp.fullPaid === true ? translate('Yes') : translate('No')}</Descriptions.Item>
        <Descriptions.Item label="制單人">
          {currentErp.createdBy
            ? ((currentErp.createdBy.name + (currentErp.createdBy.surname ? ' ' + currentErp.createdBy.surname : '')).trim() ||
                currentErp.createdBy.email ||
                '-')
            : '-'}
        </Descriptions.Item>
        <Descriptions.Item label="修改時間">{currentErp.modified_at ? dayjs(currentErp.modified_at).format('YYYY-MM-DD HH:mm') : '-'}</Descriptions.Item>
        <Descriptions.Item label="修改人">{currentErp.updatedBy ? (currentErp.updatedBy.name + (currentErp.updatedBy.surname ? ' ' + currentErp.updatedBy.surname : '') || currentErp.updatedBy.email || '-') : '-'}</Descriptions.Item>
      </Descriptions>
      
      <Row gutter={[12, 0]} style={{ marginTop: 16, marginBottom: 16 }}>
        <Col span={12}>
          <p><strong>{translate('Project Address')}:</strong></p>
          <p>{currentErp.address || '-'}</p>
        </Col>
      </Row>
      <Divider />
      <Row gutter={[12, 0]}>
        <Col className="gutter-row" span={11}>
          <p>
            <strong>{translate('Product')}</strong>
          </p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p
            style={{
              textAlign: 'right',
            }}
          >
            <strong>{translate('Price')}</strong>
          </p>
        </Col>
        <Col className="gutter-row" span={4}>
          <p
            style={{
              textAlign: 'right',
            }}
          >
            <strong>{translate('Quantity')}</strong>
          </p>
        </Col>
        <Col className="gutter-row" span={5}>
          <p
            style={{
              textAlign: 'right',
            }}
          >
            <strong>{translate('Total')}</strong>
          </p>
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
          <Col className="gutter-row" span={12}>
            <p>{translate('Paid')} :</p>
          </Col>
          <Col className="gutter-row" span={12}>
            <p>
              {moneyFormatter({ amount: currentErp.credit, currency_code: currentErp.currency })}
            </p>
          </Col>
        </Row>
      </div>
    </>
  );
}
