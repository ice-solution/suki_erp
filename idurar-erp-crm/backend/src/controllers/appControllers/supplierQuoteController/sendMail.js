const mongoose = require('mongoose');

const Model = mongoose.model('SupplierQuote');

const { SendEmailTemplate } = require('@/emailTemplate/SendEmailTemplate');

const sendMail = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Find the supplier quote
    const supplierQuote = await Model.findById(id).populate('clients');
    
    if (!supplierQuote) {
      return res.status(404).json({
        success: false,
        result: null,
        message: 'Supplier Quote not found',
      });
    }

    // Get the first client's email
    const primaryClient = supplierQuote.clients && supplierQuote.clients[0];
    if (!primaryClient || !primaryClient.email) {
      return res.status(400).json({
        success: false,
        result: null,
        message: 'No client email found',
      });
    }

    const { email } = primaryClient;
    const { number, year } = supplierQuote;
    
    const emailData = {
      to: email,
      subject: `Supplier Quote ${number}/${year}`,
      text: `Please find attached your supplier quote ${number}/${year}.`,
      html: `
        <h2>Supplier Quote ${number}/${year}</h2>
        <p>Dear ${primaryClient.name},</p>
        <p>Please find attached your supplier quote.</p>
        <p>Thank you for your business.</p>
      `,
      attachments: [
        {
          filename: `supplier-quote-${id}.pdf`,
          path: `${process.cwd()}/public/download/supplier-quote-${id}.pdf`,
        },
      ],
    };

    await SendEmailTemplate(emailData);

    return res.status(200).json({
      success: true,
      result: null,
      message: 'Supplier Quote sent successfully',
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Error sending supplier quote: ' + error.message,
    });
  }
};

module.exports = sendMail;
