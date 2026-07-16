import { useEffect, useState } from 'react';
import { Card, Col, Row, Spin, Statistic } from 'antd';
import { request } from '@/request';

const STATUS_ROWS = [
  { key: 'pending_maintenance', title: '待保養總數' },
  { key: 'normal', title: '正常總數' },
  { key: 'returned_warehouse_cn', title: '待回廠總數' },
  { key: 'returned_warehouse_hk', title: '香港倉總數' },
  { key: 'in_use', title: '使用中總數' },
  { key: 'unavailable', title: '不可用總數' },
];

const emptyCounts = () => STATUS_ROWS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {});

/**
 * 爬纜器／船隻列表頂部：依 status 彙總（與列表相同搜尋條件；列表更新時同步刷新）
 * @param {string} entity - 'winch' | 'ship'
 * @param {number} refreshKey - 變更時重新拉取
 * @param {string} searchQuery - 與 DataTable 搜尋框相同
 * @param {string} searchFields - 搜尋欄位（逗號分隔）
 * @param {string} statusFilter - 狀態篩選值
 * @param {string} statusFilterField - 狀態篩選欄位名（預設 status）
 */
export default function AssetStatusSummary({
  entity,
  refreshKey = 0,
  searchQuery = '',
  searchFields = '',
  statusFilter = '',
  statusFilterField = 'status',
}) {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState(emptyCounts);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const q = String(searchQuery || '').trim();
        const params = {};
        if (q && searchFields) {
          params.q = q;
          params.fields = searchFields;
        }
        if (statusFilter) {
          params.filter = statusFilterField;
          params.equal = statusFilter;
        }
        const res = await request.get({
          entity: `${entity}/statusSummary`,
          params,
        });
        if (cancelled) return;
        const next = emptyCounts();
        const raw = res?.result;
        if (raw && typeof raw === 'object') {
          STATUS_ROWS.forEach(({ key }) => {
            if (typeof raw[key] === 'number') next[key] = raw[key];
          });
        }
        setCounts(next);
      } catch {
        if (!cancelled) setCounts(emptyCounts());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, refreshKey, searchQuery, searchFields, statusFilter, statusFilterField]);

  return (
    <Card size="small" bordered style={{ marginBottom: 16 }} bodyStyle={{ padding: '12px 16px' }}>
      {loading ? (
        <Spin size="small" />
      ) : (
        <Row gutter={[12, 12]}>
          {STATUS_ROWS.map(({ key, title }) => (
            <Col key={key} xs={12} sm={8} md={6} lg={5} xl={4}>
              <Statistic title={title} value={counts[key] ?? 0} valueStyle={{ fontSize: 18 }} />
            </Col>
          ))}
        </Row>
      )}
    </Card>
  );
}
