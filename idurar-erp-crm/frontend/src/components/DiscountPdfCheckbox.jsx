import { Checkbox, Col, Form } from 'antd';

const colStyle = { display: 'flex', alignItems: 'flex-start', paddingTop: 4 };

export function discountPdfFieldsFromRecord(record) {
  return {
    showDiscountPercentOnPdf: record?.showDiscountPercentOnPdf !== false,
    showDiscountAmountOnPdf: record?.showDiscountAmountOnPdf !== false,
  };
}

export function DiscountPercentPdfCheckboxCol() {
  return (
    <Col className="gutter-row" span={1} style={colStyle}>
      <Form.Item
        name="showDiscountPercentOnPdf"
        valuePropName="checked"
        initialValue={true}
        style={{ marginBottom: 0 }}
      >
        <Checkbox title="顯示於 PDF">PDF</Checkbox>
      </Form.Item>
    </Col>
  );
}

export function DiscountAmountPdfCheckboxCol() {
  return (
    <Col className="gutter-row" span={1} style={colStyle}>
      <Form.Item
        name="showDiscountAmountOnPdf"
        valuePropName="checked"
        initialValue={true}
        style={{ marginBottom: 0 }}
      >
        <Checkbox title="顯示於 PDF">PDF</Checkbox>
      </Form.Item>
    </Col>
  );
}
