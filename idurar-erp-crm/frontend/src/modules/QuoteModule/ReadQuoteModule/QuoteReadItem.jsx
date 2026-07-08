import { useState, useEffect } from 'react';
import { Divider } from 'antd';
import dayjs from 'dayjs';

import {
  Button,
  Row,
  Col,
  Descriptions,
  Statistic,
  Tag,
  Modal,
  message,
  Select,
  Space,
  Input,
  Table,
  InputNumber,
  Radio,
} from 'antd';
import { PageHeader } from '@ant-design/pro-layout';
import {
  EditOutlined,
  FilePdfOutlined,
  CloseCircleOutlined,
  RetweetOutlined,
  ArrowUpOutlined,
  SyncOutlined,
} from '@ant-design/icons';

import { useSelector, useDispatch } from 'react-redux';
import useLanguage from '@/locale/useLanguage';
import { erp } from '@/redux/erp/actions';

import { generate as uniqueId } from 'shortid';

import { selectCurrentItem, selectListItems } from '@/redux/erp/selectors';

import { DOWNLOAD_BASE_URL, API_BASE_URL } from '@/config/serverApiConfig';
import { useMoney, useDate } from '@/settings';
import { useNavigate, useLocation } from 'react-router-dom';
import { request } from '@/request';
import { multilineStyle } from '@/utils/renderMultilineText';
import axios from 'axios';
import storePersist from '@/redux/storePersist';
import { selectLastNumberSettings } from '@/redux/settings/selectors';
import { getSuggestedNextNumber } from '@/utils/lastNumberSettings';
import SupplierOrderNumberFields from '@/components/SupplierOrderNumberFields';
import PoNumberSyncModal from '@/components/PoNumberSyncModal';

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

/** 合併報價單 header（poNumbers / poNumber）與各行項目 poNumber，去重且保留順序 */
function collectQuotePoNumbers(erp) {
  const out = [];
  const push = (v) => {
    const s = v == null ? '' : String(v).trim();
    if (s && !out.includes(s)) out.push(s);
  };
  if (Array.isArray(erp?.poNumbers)) {
    erp.poNumbers.forEach(push);
  }
  if (erp?.poNumber != null && String(erp.poNumber).trim()) {
    const raw = String(erp.poNumber).trim();
    if (raw.includes(',')) {
      raw.split(',').forEach((x) => push(x));
    } else {
      push(raw);
    }
  }
  if (erp?.items?.length) {
    erp.items.forEach((item) => push(item?.poNumber));
  }
  return out;
}

export default function QuoteReadItem({ config, selectedItem }) {
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
  /** null | 'supplier'（上單）| 'invoice'（轉發票） */
  const [poModalMode, setPoModalMode] = useState(null);
  const [selectedPoNumber, setSelectedPoNumber] = useState(null);
  const [availablePoNumbers, setAvailablePoNumbers] = useState([]);
  const [poPreviewLines, setPoPreviewLines] = useState([]);
  const [poPreviewLoading, setPoPreviewLoading] = useState(false);
  /** itemIndex -> 本次數量 */
  const [poOrderQtyByIndex, setPoOrderQtyByIndex] = useState({});
  /** 轉發票：A=按行數量 B=專案佔比 */
  const [invoiceConversionMode, setInvoiceConversionMode] = useState('A');
  const [poLinePctByIndex, setPoLinePctByIndex] = useState({});
  const [poInvoiceMeta, setPoInvoiceMeta] = useState(null);
  const lastNumberSettings = useSelector(selectLastNumberSettings);
  const [supplierOrderPrefix, setSupplierOrderPrefix] = useState('S');
  const [supplierOrderNumber, setSupplierOrderNumber] = useState('');
  const [poSyncOpen, setPoSyncOpen] = useState(false);

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
            fields: 'address,invoiceNumber,number,numberPrefix,contactPerson',
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
    : (currentErp?.number != null ? String(currentErp.number) : '-');

  const quotePoLines = collectQuotePoNumbers(currentErp);

  const convertedInvoiceIds = new Set();
  (currentErp?.converted?.invoices || []).forEach((id) => {
    if (id) convertedInvoiceIds.add(String(id));
  });
  const invRef = currentErp?.converted?.invoice;
  if (invRef) convertedInvoiceIds.add(String(invRef._id || invRef));
  const convertedInvoiceCount = convertedInvoiceIds.size;

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

  useEffect(() => {
    if (!poModalMode || !selectedPoNumber || !currentErp?._id) {
      return undefined;
    }
    const statusEntity =
      poModalMode === 'invoice'
        ? `${entity}/po-invoice-status/${currentErp._id}`
        : `${entity}/po-order-status/${currentErp._id}`;
    let cancelled = false;
    (async () => {
      setPoPreviewLoading(true);
      try {
        const data = await request.get({
          entity: statusEntity,
          params: { poNumber: selectedPoNumber },
        });
        if (cancelled) return;
        if (data?.success && Array.isArray(data?.result?.lines)) {
          setPoPreviewLines(data.result.lines);
          const init = {};
          data.result.lines.forEach((row) => {
            init[row.itemIndex] = row.remainingQty;
          });
          setPoOrderQtyByIndex(init);
          if (poModalMode === 'invoice') {
            setPoInvoiceMeta({
              lockedConversionMode: data.result.lockedConversionMode || null,
            });
            const locked = data.result.lockedConversionMode;
            if (locked === 'A' || locked === 'B') {
              setInvoiceConversionMode(locked);
            }
          }
        } else {
          setPoPreviewLines([]);
          setPoOrderQtyByIndex({});
          setPoInvoiceMeta(null);
          if (data?.message) {
            message.error(data.message);
          }
        }
      } catch (e) {
        if (!cancelled) {
          setPoPreviewLines([]);
          setPoOrderQtyByIndex({});
        }
      } finally {
        if (!cancelled) setPoPreviewLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [poModalMode, selectedPoNumber, currentErp?._id, entity]);

  useEffect(() => {
    if (poModalMode !== 'supplier') return;
    const suggested = getSuggestedNextNumber(lastNumberSettings, supplierOrderPrefix, 'supplier');
    setSupplierOrderNumber(String(suggested));
  }, [poModalMode, supplierOrderPrefix, lastNumberSettings]);

  const closePoModal = () => {
    setPoModalMode(null);
    setSelectedPoNumber(null);
    setPoPreviewLines([]);
    setPoOrderQtyByIndex({});
    setPoPreviewLoading(false);
    setInvoiceConversionMode('A');
    setPoLinePctByIndex({});
    setPoInvoiceMeta(null);
    setSupplierOrderPrefix('S');
    setSupplierOrderNumber('');
  };

  const openPoModal = (mode) => {
    const poNumbers = collectQuotePoNumbers(currentErp);
    if (poNumbers.length === 0) {
      message.warning('沒有 P.O number：請在單頭或項目填寫 P.O 後再操作');
      return;
    }
    setPoModalMode(mode);
    setAvailablePoNumbers(poNumbers);
    setSelectedPoNumber(null);
    setPoPreviewLines([]);
    setPoOrderQtyByIndex({});
  };

  // 轉發票：與上單相同，須先有 Project Management，再選 P.O、拆量
  const handleConvertToInvoice = async () => {
    if (!currentErp.items || currentErp.items.length === 0) {
      message.warning('此 Quote 沒有項目，無法轉換');
      return;
    }
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
        message.error('請先在 Project Management 建立此 Quote Number 的項目，方可開發票');
        return;
      }
    } catch {
      message.error('請先在 Project Management 建立此 Quote Number 的項目，方可開發票');
      return;
    }
    openPoModal('invoice');
  };

  const executeConvertToInvoice = async () => {
    if (!selectedPoNumber) {
      message.warning('請選擇 P.O number');
      return;
    }

    const poNumber = selectedPoNumber;
    const payload = { poNumber, conversionMode: invoiceConversionMode };

    if (invoiceConversionMode === 'B') {
      const lines = poPreviewLines
        .map((row) => ({
          itemIndex: row.itemIndex,
          percentage: Number(poLinePctByIndex[row.itemIndex]) || 0,
        }))
        .filter((l) => l.percentage > 0);

      if (lines.length === 0) {
        message.warning('請至少一行填寫大於 0 的專案佔比 (%)');
        return;
      }

      for (const line of lines) {
        const row = poPreviewLines.find((r) => r.itemIndex === line.itemIndex);
        const remaining = row?.remainingPercentage ?? 100;
        if (line.percentage > remaining) {
          message.warning(`第 ${line.itemIndex + 1} 行專案佔比不可超過餘額 ${remaining}%`);
          return;
        }
      }
      payload.lines = lines;
    } else {
      const lines = poPreviewLines
        .map((row) => ({
          itemIndex: row.itemIndex,
          quantity: Math.floor(Number(poOrderQtyByIndex[row.itemIndex]) || 0),
        }))
        .filter((l) => l.quantity > 0);

      if (lines.length === 0) {
        message.warning('請至少一行填寫大於 0 的本次轉發票數量');
        return;
      }
      payload.lines = lines;
    }

    closePoModal();
    setConvertLoading(true);
    try {
      axios.defaults.baseURL = API_BASE_URL;
      axios.defaults.withCredentials = true;
      const auth = storePersist.get('auth');
      if (auth) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
      }
      const response = await axios.post(`quote/convert/${currentErp._id}`, payload);
      if (response?.data?.success) {
        message.success('Quote 已成功轉換成 Invoice！');
        navigate(`/invoice/read/${response.data.result._id}`);
        dispatch(erp.read({ entity, id: currentErp._id }));
      } else {
        message.error('轉換失敗：' + (response?.data?.message || '未知錯誤'));
      }
    } catch (error) {
      console.error('轉換錯誤:', error);
      message.error('轉換過程中發生錯誤：' + (error.response?.data?.message || error.message));
    } finally {
      setConvertLoading(false);
    }
  };

  // 處理Quote轉Supplier Quote（上單）
  const handleConvertToSupplierQuote = async () => {
    // 檢查 Project Management 是否已建立此 Quote Number
    const quoteNumber = currentErp.numberPrefix && currentErp.number
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
    } catch (err) {
      message.error('請先在 Project Management 建立此 Quote Number 的項目，方可上單');
      return;
    }

    openPoModal('supplier');
  };

  // 執行轉換
  const executeConvertToSupplierQuote = async () => {
    if (!selectedPoNumber) {
      message.warning('請選擇 P.O number');
      return;
    }

    const lines = poPreviewLines
      .map((row) => ({
        itemIndex: row.itemIndex,
        quantity: Math.floor(Number(poOrderQtyByIndex[row.itemIndex]) || 0),
      }))
      .filter((l) => l.quantity > 0);

    if (lines.length === 0) {
      message.warning('請至少一行填寫大於 0 的本次上單數量');
      return;
    }

    if (!String(supplierOrderNumber || '').trim()) {
      message.warning('請填寫 S 單編號');
      return;
    }

    const poNumber = selectedPoNumber;
    closePoModal();
    setConvertToSupplierQuoteLoading(true);
    try {
      axios.defaults.baseURL = API_BASE_URL;
      axios.defaults.withCredentials = true;
      const auth = storePersist.get('auth');
      if (auth) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${auth.current.token}`;
      }

      const response = await axios.post(`${entity}/convertToSupplierQuote/${currentErp._id}`, {
        poNumber,
        lines,
        numberPrefix: supplierOrderPrefix,
        number: String(supplierOrderNumber).trim(),
      });
      if (response && response.data && response.data.success) {
        message.success('Quote 已成功上單（Supplier Quote）！');
        dispatch(erp.read({ entity, id: currentErp._id }));
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
        title={`報價單 # ${displayNumber}`}
        ghost={false}
        tags={[
          <Tag key="status" color={currentErp.status === 'draft' ? 'blue' : 'green'}>
            {currentErp.status && translate(currentErp.status)}
          </Tag>,
        ]}
        extra={
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              gap: 8,
            }}
          >
            <Space wrap size="small">
              <Button
                key="quote-close"
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
              </Button>
              <Button
                key="quote-pdf"
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
              </Button>
            </Space>
            <Space wrap size="small">
              <Button
                key="quote-sync-po"
                onClick={() => {
                  if (quotePoLines.length === 0) {
                    message.warning('沒有 P.O number：請在單頭或項目填寫 P.O 後再操作');
                    return;
                  }
                  setPoSyncOpen(true);
                }}
                icon={<SyncOutlined />}
              >
                同步更新 P.O
              </Button>
              <Button
                key="quote-upload-s"
                onClick={handleConvertToSupplierQuote}
                loading={convertToSupplierQuoteLoading}
                icon={<ArrowUpOutlined />}
                style={{
                  display: entity === 'quote' ? 'inline-flex' : 'none',
                }}
              >
                上單
              </Button>
              <Button
                key="quote-convert-inv"
                onClick={handleConvertToInvoice}
                loading={convertLoading}
                icon={<RetweetOutlined />}
                style={{
                  display: entity === 'quote' ? 'inline-flex' : 'none',
                  backgroundColor: convertedInvoiceCount > 0 ? '#52c41a' : undefined,
                  borderColor: convertedInvoiceCount > 0 ? '#52c41a' : undefined,
                  color: convertedInvoiceCount > 0 ? '#fff' : undefined,
                }}
              >
                {translate('Convert to Invoice')}
              </Button>
              <Button
                key="quote-edit"
                onClick={() => {
                  dispatch(
                    erp.currentAction({
                      actionType: 'update',
                      data: currentErp,
                    })
                  );
                  navigate(`/${entity.toLowerCase()}/table/update/${currentErp._id}`);
                }}
                type="primary"
                icon={<EditOutlined />}
              >
                {translate('Edit')}
              </Button>
            </Space>
          </div>
        }
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
        <Descriptions.Item label={translate('Primary Contact Address')}>{client.address}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Email')}>{client.email}</Descriptions.Item>
        <Descriptions.Item label={translate('Primary Contact Phone')}>{client.phone}</Descriptions.Item>
      </Descriptions>
      
      <Descriptions title={translate('Quote Details')}>
        <Descriptions.Item label="Quote Type">{currentErp.numberPrefix}</Descriptions.Item>
        <Descriptions.Item label={translate('Number')}>{currentErp.number}</Descriptions.Item>
        <Descriptions.Item label="日期">{currentErp.date ? dayjs(currentErp.date).format('YYYY-MM-DD') : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Type')}>{currentErp.type}</Descriptions.Item>
        <Descriptions.Item label={translate('Contact Person')}>{currentErp.contactPerson}</Descriptions.Item>
        <Descriptions.Item label={translate('P.O Number')} span={3}>
          {quotePoLines.length > 0 ? (
            <span style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{quotePoLines.join('\n')}</span>
          ) : (
            '-'
          )}
        </Descriptions.Item>
        <Descriptions.Item label={translate('Subcontractor Count')}>{currentErp.subcontractorCount || '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Cost Price')}>{currentErp.costPrice ? `$${currentErp.costPrice}` : '-'}</Descriptions.Item>
        <Descriptions.Item label={translate('Completed')}>{currentErp.isCompleted ? translate('Yes') : translate('No')}</Descriptions.Item>
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
      <Row gutter={[12, 0]} style={{ marginBottom: 16 }}>
        <Col span={12}>
          <p><strong>{translate('notes')}:</strong></p>
          <p style={{ whiteSpace: 'pre-wrap' }}>{currentErp.notes || '-'}</p>
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
        </Row>
      </div>

      {/* P.O 選擇 Modal（上單 / 轉發票） */}
      <Modal
        title={
          poModalMode === 'invoice'
            ? '選擇 P.O Number 與轉發票方式'
            : '選擇 P.O Number 與本次上單數量'
        }
        open={poModalMode != null}
        onOk={poModalMode === 'invoice' ? executeConvertToInvoice : executeConvertToSupplierQuote}
        onCancel={closePoModal}
        okText={poModalMode === 'invoice' ? '確認轉換' : '確認上單'}
        cancelText="取消"
        width={800}
        okButtonProps={{
          disabled:
            !selectedPoNumber ||
            poPreviewLoading ||
            (poModalMode === 'supplier' && !String(supplierOrderNumber || '').trim()) ||
            (poModalMode === 'invoice'
              ? invoiceConversionMode === 'B'
                ? !poPreviewLines.some((row) => {
                    const pct = Number(poLinePctByIndex[row.itemIndex]) || 0;
                    return pct > 0 && pct <= (row.remainingPercentage ?? 100);
                  })
                : !poPreviewLines.some(
                    (row) =>
                      row.remainingQty > 0 &&
                      Math.floor(Number(poOrderQtyByIndex[row.itemIndex]) || 0) > 0
                  )
              : !poPreviewLines.some(
                  (row) =>
                    row.remainingQty > 0 &&
                    Math.floor(Number(poOrderQtyByIndex[row.itemIndex]) || 0) > 0
                )),
        }}
      >
        <div style={{ marginBottom: 16 }}>
          <p>
            {poModalMode === 'invoice'
              ? '請選擇 P.O Number，再選擇轉發票方式：A 按行數量拆量；B 逐項專案佔比（全數 items 帶去發票，請自行填寫每行 %）。Project 列表的整個佔比% 將依發票總額÷專案總額自動顯示。'
              : '請選擇 P.O Number，將列出該 P.O 的項目、已上單量與餘額；請填寫「本次上單」數量（不可超過餘額）。'}
          </p>
          {poModalMode === 'supplier' ? (
            <SupplierOrderNumberFields
              prefix={supplierOrderPrefix}
              number={supplierOrderNumber}
              onPrefixChange={setSupplierOrderPrefix}
              onNumberChange={setSupplierOrderNumber}
              mergedLastNumbers={lastNumberSettings}
            />
          ) : null}
          <Select
            style={{ width: '100%' }}
            placeholder="選擇 P.O Number"
            value={selectedPoNumber}
            onChange={(v) => {
              setSelectedPoNumber(v);
              setPoPreviewLines([]);
              setPoOrderQtyByIndex({});
              setPoInvoiceMeta(null);
              setPoLinePctByIndex({});
            }}
          >
            {availablePoNumbers.map((po) => (
              <Select.Option key={po} value={po}>
                {po}
              </Select.Option>
            ))}
          </Select>
        </div>
        {poModalMode === 'invoice' && selectedPoNumber ? (
          <div style={{ marginBottom: 16 }}>
            <div style={{ marginBottom: 8, fontWeight: 500 }}>轉發票方式</div>
            <Radio.Group
              value={invoiceConversionMode}
              onChange={(e) => {
                setInvoiceConversionMode(e.target.value);
                setPoLinePctByIndex({});
              }}
            >
              <Radio value="A" disabled={poInvoiceMeta?.lockedConversionMode === 'B'}>
                A — 按 P.O 行數量（拆量）
              </Radio>
              <Radio value="B" disabled={poInvoiceMeta?.lockedConversionMode === 'A'}>
                B — 逐項專案佔比
              </Radio>
            </Radio.Group>
            {poInvoiceMeta?.lockedConversionMode ? (
              <div style={{ marginTop: 8, color: '#888', fontSize: 12 }}>
                此報價已鎖定為方式 {poInvoiceMeta.lockedConversionMode}，不可改用其他方式。
              </div>
            ) : null}
          </div>
        ) : null}
        {selectedPoNumber &&
        (poModalMode === 'supplier' ||
          (poModalMode === 'invoice' && invoiceConversionMode === 'A')) ? (
          <Table
            size="small"
            loading={poPreviewLoading}
            pagination={false}
            rowKey={(r) => String(r.itemIndex)}
            dataSource={poPreviewLines}
            columns={[
              { title: '品名', dataIndex: 'itemName', key: 'itemName', width: 120, ellipsis: true },
              {
                title: '說明',
                dataIndex: 'description',
                key: 'description',
                ellipsis: true,
                render: (t) => <span style={multilineStyle}>{t || '-'}</span>,
              },
              { title: '報價數量', dataIndex: 'quoteQuantity', key: 'quoteQuantity', width: 88 },
              {
                title: poModalMode === 'invoice' ? '已開票' : '已上單',
                dataIndex: 'orderedQty',
                key: 'orderedQty',
                width: 72,
              },
              { title: '餘額', dataIndex: 'remainingQty', key: 'remainingQty', width: 72 },
              {
                title: poModalMode === 'invoice' ? '本次轉發票' : '本次上單',
                key: 'thisQty',
                width: 120,
                render: (_, row) => (
                  <InputNumber
                    min={0}
                    max={row.remainingQty}
                    precision={0}
                    value={poOrderQtyByIndex[row.itemIndex]}
                    onChange={(v) => {
                      const n = Math.floor(Number(v) || 0);
                      setPoOrderQtyByIndex((prev) => ({
                        ...prev,
                        [row.itemIndex]: Math.min(Math.max(0, n), row.remainingQty),
                      }));
                    }}
                  />
                ),
              },
            ]}
          />
        ) : null}
        {selectedPoNumber && poModalMode === 'invoice' && invoiceConversionMode === 'B' ? (
          <Table
            size="small"
            loading={poPreviewLoading}
            pagination={false}
            rowKey={(r) => String(r.itemIndex)}
            dataSource={poPreviewLines}
            columns={[
              { title: '品名', dataIndex: 'itemName', key: 'itemName', width: 120, ellipsis: true },
              {
                title: '說明',
                dataIndex: 'description',
                key: 'description',
                ellipsis: true,
                render: (t) => <span style={multilineStyle}>{t || '-'}</span>,
              },
              { title: '已轉 %', dataIndex: 'invoicedPercentage', key: 'invoicedPercentage', width: 72 },
              { title: '餘額 %', dataIndex: 'remainingPercentage', key: 'remainingPercentage', width: 72 },
              {
                title: '本次專案佔比 (%)',
                key: 'thisPct',
                width: 140,
                render: (_, row) => (
                  <InputNumber
                    min={0}
                    max={row.remainingPercentage ?? 100}
                    precision={2}
                    value={poLinePctByIndex[row.itemIndex]}
                    onChange={(v) => {
                      const n = Number(v) || 0;
                      setPoLinePctByIndex((prev) => ({
                        ...prev,
                        [row.itemIndex]: Math.min(Math.max(0, n), row.remainingPercentage ?? 100),
                      }));
                    }}
                  />
                ),
              },
            ]}
          />
        ) : null}
        {selectedPoNumber && poModalMode === 'invoice' && invoiceConversionMode === 'B' ? (
          <p style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
            B 模式：每行填寫專案佔比 (%)，數量不變；餘額 % = 100 − 該行已轉 % 總和，不可超過餘額。Project「整個佔比%」= 發票總額 ÷ 專案總額。
          </p>
        ) : null}
        {selectedPoNumber && poModalMode === 'invoice' && invoiceConversionMode === 'A' ? (
          <p style={{ color: '#1890ff', fontSize: '12px', marginTop: 12 }}>
            ℹ️ 餘額 = 報價數量 − 此 P.O 已開票數量總和。可多次轉發票。
          </p>
        ) : null}
        {selectedPoNumber && poModalMode === 'supplier' ? (
          <p style={{ color: '#1890ff', fontSize: '12px', marginTop: 12 }}>
            ℹ️ 餘額 = 報價數量 − 此 P.O 已上單數量總和。可多次上單。
          </p>
        ) : null}
      </Modal>

      <PoNumberSyncModal
        open={poSyncOpen}
        onClose={() => setPoSyncOpen(false)}
        entity={entity}
        documentId={currentErp?._id}
        poOptions={quotePoLines}
        onSuccess={() => dispatch(erp.read({ entity, id: currentErp._id }))}
      />
    </>
  );
}
