import { useEffect, useState } from 'react';
import { Card, Col, Row, Spin, Statistic } from 'antd';
import { request } from '@/request';

const STATUS_ROWS = [
  { key: 'pending_maintenance', title: '待保養總數' },
  { key: 'normal', title: '正常總數' },
  { key: 'returned_warehouse_cn', title: '待回廠總數' },
  { key: 'returned_warehouse_hk', title: '香港倉總數' },
  { key: 'in_use', title: '使用中總數' },
];

/**
 * 爬攬器／船隻列表頂部：依 status 彙總全庫筆數（listAll，不受表格分頁／搜尋影響）
 * @param {string} entity - 'winch' | 'ship'
 * @param {number} refreshKey - 變更時重新拉取（例如使用者按「重新整理」）
 */
export default function AssetStatusSummary({ entity, refreshKey = 0 }) {
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState(() =>
    STATUS_ROWS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {})
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await request.listAll({ entity });
        if (cancelled) return;
        const raw = res?.result;
        const items = Array.isArray(raw) ? raw : raw?.items || [];
        const next = STATUS_ROWS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {});
        items.forEach((row) => {
          const s = row?.status;
          if (s && Object.prototype.hasOwnProperty.call(next, s)) {
            next[s] += 1;
          }
        });
        setCounts(next);
      } catch {
        if (!cancelled) {
          setCounts(STATUS_ROWS.reduce((acc, { key }) => ({ ...acc, [key]: 0 }), {}));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [entity, refreshKey]);

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
