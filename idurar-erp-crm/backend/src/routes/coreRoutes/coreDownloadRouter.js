const downloadPdf = require('@/handlers/downloadHandler/downloadPdf');
const express = require('express');

const router = express.Router();

router.route('/:directory/:file').get(function (req, res) {
  try {
    const { directory, file } = req.params;
    let id;
    let variant;

    if (directory === 'supplierquote' && file.startsWith('supplierquote-finish-') && file.endsWith('.pdf')) {
      id = file.slice('supplierquote-finish-'.length, -4);
      variant = 'finish';
    } else {
      id = file.slice(directory.length + 1).slice(0, -4);
    }

    downloadPdf(req, res, { directory, id, variant });
  } catch (error) {
    return res.status(503).json({
      success: false,
      result: null,
      message: error.message,
      error: error,
    });
  }
});

module.exports = router;
